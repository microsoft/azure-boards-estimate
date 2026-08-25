import { IEstimate } from "../../model/estimate";
import {
    ChannelActionType,
    HEARTBEAT_INTERVAL_MS,
    ISessionDocument,
    POLLING_INTERVAL_MS
} from "../../model/sessionDocument";
import { ISnapshot } from "../../model/snapshots";
import { IUserInfo } from "../../model/user";
import { IdentityServiceId, IIdentityService } from "../identity";
import { Services } from "../services";
import { defineIncomingOperation, defineOperation, IChannel } from "./channels";
import { PollingStorage } from "./pollingStorage";

export class PollingChannel implements IChannel {
    onStatus?: (status: { message: string; type?: string }) => void;

    estimate = defineOperation<IEstimate>(async estimate => {
        await this.storage.appendAction(
            this.sessionId,
            ChannelActionType.Estimate,
            estimate,
            this.currentUserId
        );
    });

    estimateUpdated = defineOperation<{
        workItemId: number;
        value: number | string | undefined;
    }>(async payload => {
        await this.storage.appendAction(
            this.sessionId,
            ChannelActionType.EstimateUpdated,
            payload,
            this.currentUserId
        );
    });

    setWorkItem = defineOperation<number>(async workItemId => {
        await this.storage.appendAction(
            this.sessionId,
            ChannelActionType.Switch,
            workItemId,
            this.currentUserId
        );
    });

    revealed = defineOperation<void>(async () => {
        await this.storage.appendAction(
            this.sessionId,
            ChannelActionType.Reveal,
            null,
            this.currentUserId
        );
        // Trigger reveal locally — own actions are filtered out in the poll loop
        await this.revealed.incoming(undefined);
    });

    join = defineOperation<IUserInfo>(async userInfo => {
        await this.storage.joinSession(this.sessionId, userInfo);
        await this.storage.appendAction(
            this.sessionId,
            ChannelActionType.Join,
            userInfo,
            this.currentUserId
        );
    });

    left = defineIncomingOperation<string>();

    snapshot = defineOperation<ISnapshot>(async snapshot => {
        await this.storage.appendAction(
            this.sessionId,
            ChannelActionType.Snapshot,
            snapshot,
            this.currentUserId
        );
    });

    private storage = new PollingStorage();
    private sessionId: string = "";
    private currentUserId: string = "";
    private currentUserInfo: IUserInfo | undefined;
    private lastSeenSeq: number = 0;
    private alive: boolean = false;
    private ended: boolean = false;
    private errorCount: number = 0;
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    private knownActiveUserIds: Set<string> = new Set();
    private initialActiveUsers: IUserInfo[] = [];
    private lastDoc: ISessionDocument | undefined;
    private wakeUp: (() => void) | undefined;

    /**
     * Users already active in the session document when this client connected.
     * The action-log cursor skips their historical Join broadcasts, so the
     * session saga uses this to seed the participant list.
     */
    getKnownUsers(): IUserInfo[] {
        return this.initialActiveUsers;
    }

    // LT-1: Stored as a field so the same reference can be removed in end()
    private readonly handleVisibilityChange = (): void => {
        if (!document.hidden && this.wakeUp) {
            this.wakeUp();
        }
    };

    // Best-effort departure on full page/iframe unload (e.g. switching hubs via
    // the ADO sidebar), where componentWillUnmount and async cleanup can't run.
    // Reuses the last polled document to issue one synchronous fire-and-forget
    // write; the stale timeout is the authoritative fallback.
    private readonly handlePageHide = (): void => {
        if (this.ended || !this.lastDoc || !this.currentUserId) {
            return;
        }
        this.storage.leaveSessionSync(this.lastDoc, this.currentUserId);
    };

    async start(sessionId: string): Promise<void> {
        this.sessionId = sessionId;

        const identityService = Services.getService<IIdentityService>(
            IdentityServiceId
        );
        const identity = identityService.getCurrentIdentity();
        this.currentUserId = identity.id;
        this.currentUserInfo = {
            tfId: identity.id,
            name: identity.displayName,
            imageUrl: identity.imageUrl
        };

        const maxRetries = 5;
        const retryDelay = 5000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Fetch or create the session document
                const doc = await this.storage.getSessionDocument(sessionId);
                console.log(
                    `[PollingChannel] start: fetched session document (session: ${sessionId}, attempt: ${attempt})`
                );

                // Set the initial sequence cursor to skip all existing actions
                this.lastSeenSeq = doc.nextSeq - 1;

                // Track currently known active users
                this.knownActiveUserIds = new Set(
                    doc.activeUsers.map(u => u.userInfo.tfId)
                );

                // Capture participants already in the session so the saga can
                // seed the local participant list — their Join broadcasts are
                // older than our log cursor and would otherwise never be seen.
                this.initialActiveUsers = doc.activeUsers
                    .filter(u => u.userInfo.tfId !== identity.id)
                    .map(u => u.userInfo);

                // Register current user
                await this.join({
                    tfId: identity.id,
                    name: identity.displayName,
                    imageUrl: identity.imageUrl
                });
                this.knownActiveUserIds.add(identity.id);
                console.log(
                    `[PollingChannel] start: joined session and connected (session: ${sessionId}, userId: ${identity.id})`
                );

                // Start polling (CO-1: self-scheduling loop prevents overlapping requests)
                this.alive = true;
                this.errorCount = 0;
                document.addEventListener("visibilitychange", this.handleVisibilityChange);
                window.addEventListener("pagehide", this.handlePageHide);
                window.addEventListener("beforeunload", this.handlePageHide);
                this.pollLoop();

                // Start heartbeat
                this.heartbeatTimer = setInterval(
                    () =>
                        this.storage.heartbeat(
                            this.sessionId,
                            this.currentUserId
                        ),
                    HEARTBEAT_INTERVAL_MS
                );

                if (this.onStatus) {
                    this.onStatus({ message: "", type: "" });
                }

                return;
            } catch (error) {
                if (attempt < maxRetries) {
                    console.warn(
                        `[PollingChannel] start: connection attempt ${attempt + 1}/${maxRetries} failed for session ${sessionId}, retrying in ${retryDelay / 1000}s`,
                        error
                    );
                    if (this.onStatus) {
                        this.onStatus({
                            message: `Connection attempt failed. Retrying ${attempt + 1}/${maxRetries} in ${retryDelay / 1000} seconds...`,
                            type: "retry"
                        });
                    }
                    await new Promise(resolve =>
                        setTimeout(resolve, retryDelay)
                    );
                } else {
                    console.error(
                        `[PollingChannel] start: giving up after ${maxRetries} retries for session ${sessionId}`,
                        error
                    );
                    const failMsg = `If the issue persists, please <a href="https://github.com/microsoft/azure-boards-estimate/issues" target="_blank">report the issue on GitHub</a> or create an offline session.`;
                    if (this.onStatus) {
                        this.onStatus({ message: failMsg, type: "error" });
                    }
                    throw error;
                }
            }
        }
    }

    async end(): Promise<void> {
        // Idempotent: end() may be called both directly on leave and again from
        // the saga's finally teardown.
        if (this.ended) {
            return;
        }
        this.ended = true;

        // Stop the poll loop and heartbeat first so nothing re-adds us after we
        // remove ourselves below.
        this.alive = false;
        if (this.wakeUp) {
            this.wakeUp();
        }

        // LT-1: Remove visibility listener
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        window.removeEventListener("pagehide", this.handlePageHide);
        window.removeEventListener("beforeunload", this.handlePageHide);

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }

        // Remove ourselves from the authoritative active-user list FIRST. Other
        // clients derive presence from doc.activeUsers, so this is what actually
        // makes us leave; doing it first means a teardown/navigation interrupt
        // can't strand us in the list until the stale timeout elapses.
        try {
            await this.storage.leaveSession(
                this.sessionId,
                this.currentUserId
            );
        } catch {
            // Best-effort cleanup
        }

        // C-1: Fast departure hint so other clients don't wait for their next
        // poll. Purely advisory — the removal above is authoritative.
        try {
            await this.storage.appendAction(
                this.sessionId,
                ChannelActionType.Left,
                this.currentUserId,
                this.currentUserId
            );
        } catch {
            // Best-effort; do not block teardown
        }
    }

    /**
     * Self-scheduling poll loop (CO-1). Replaces setInterval to prevent
     * overlapping concurrent requests. Skips while the tab is hidden (LT-1).
     */
    private async pollLoop(): Promise<void> {
        while (this.alive) {
            if (!document.hidden) {
                await this.poll();
            }
            if (!this.alive) break;
            await this.sleep(POLLING_INTERVAL_MS);
        }
    }

    /**
     * Cancellable sleep. Resolves early when end() signals shutdown or a
     * visibility-change event wakes the loop (LT-1, L-1).
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => {
            const id = setTimeout(() => {
                this.wakeUp = undefined;
                resolve();
            }, ms);
            this.wakeUp = () => {
                clearTimeout(id);
                this.wakeUp = undefined;
                resolve();
            };
        });
    }

    /**
     * Poll the session document for new actions from other participants.
     * Guards against stale dispatch after end() (L-1) and applies exponential
     * backoff on repeated failures to avoid hammering a throttled endpoint (R-1).
     */
    private async poll(): Promise<void> {
        if (!this.alive) return;                              // L-1 pre-guard
        try {
            const doc = await this.storage.getSessionDocument(this.sessionId);
            if (!this.alive) return;                          // L-1 post-fetch guard
            this.lastDoc = doc;

            // Self-heal: a delayed teardown from a previous connection (rapid
            // leave + rejoin) can remove us from the active list while we're
            // still here. Re-register so we don't vanish from other clients.
            if (
                this.currentUserInfo &&
                !doc.activeUsers.some(
                    u => u.userInfo.tfId === this.currentUserId
                )
            ) {
                this.storage
                    .joinSession(this.sessionId, this.currentUserInfo)
                    .catch(() => {});
            }

            this.processNewActions(doc);
            this.detectUserChanges(doc);
            this.errorCount = 0;
        } catch (e: any) {
            this.errorCount++;
            const backoffMs =
                Math.min(30000, 1000 * Math.pow(2, this.errorCount)) +
                Math.random() * 1000;
            console.warn(
                `Polling failed (attempt ${this.errorCount}), backing off ${backoffMs.toFixed(0)} ms`,
                e
            );
            if (this.alive) {
                await this.sleep(backoffMs);
            }
        }
    }

    /**
     * Re-announce our presence to trigger a fresh snapshot from other
     * participants. Used when the action log has been pruned past our cursor
     * and we cannot recover by replaying the partial history (C-3).
     */
    private async requestSnapshot(): Promise<void> {
        if (!this.currentUserInfo) return;
        try {
            await this.storage.appendAction(
                this.sessionId,
                ChannelActionType.Join,
                this.currentUserInfo,
                this.currentUserId
            );
        } catch {
            // Best-effort
        }
    }

    /**
     * Process any new actions in the document that we haven't seen yet.
     * Detects log-truncation desync and triggers a snapshot re-sync (C-3).
     */
    private processNewActions(doc: ISessionDocument): void {
        // C-3: If our cursor falls below the oldest surviving entry the log was
        // pruned past us — we have silently missed events.  Request a snapshot.
        if (doc.actions.length > 0) {
            const minSeq = doc.actions[0].seq;
            if (this.lastSeenSeq < minSeq - 1) {
                this.requestSnapshot();
                this.lastSeenSeq = doc.nextSeq - 1;
                return;
            }
        }

        const newActions = doc.actions.filter(
            a => a.seq > this.lastSeenSeq && a.senderId !== this.currentUserId
        );

        for (const action of newActions) {
            this.lastSeenSeq = Math.max(this.lastSeenSeq, action.seq);
            this.dispatchIncoming(action.type, action.payload);
        }

        // Also advance past our own actions
        if (doc.actions.length > 0) {
            const maxSeq = doc.actions[doc.actions.length - 1].seq;
            this.lastSeenSeq = Math.max(this.lastSeenSeq, maxSeq);
        }
    }

    /**
     * Reconcile the local participant list against the authoritative
     * `doc.activeUsers`. Emits joins for users that are active but not yet
     * known locally, and lefts for users no longer active (or gone stale).
     *
     * The active-user list — not the action log — is the source of truth here.
     * Join actions can be pruned out of the bounded log (MAX_ACTION_LOG_SIZE) or
     * missed while a tab is backgrounded, and a transiently stale user (throttled
     * background heartbeat) must be re-added once their heartbeat resumes. Relying
     * on the log alone left the participant count permanently short (e.g. 3/2).
     */
    private detectUserChanges(doc: ISessionDocument): void {
        const staleIds = new Set(this.storage.getStaleUserIds(doc));
        const activeUsers = doc.activeUsers.filter(
            u => !staleIds.has(u.userInfo.tfId)
        );
        const currentActiveIds = new Set(
            activeUsers.map(u => u.userInfo.tfId)
        );

        // Emit joins for active users we don't yet know about (self excluded —
        // the local client is added when the session loads).
        for (const activeUser of activeUsers) {
            const id = activeUser.userInfo.tfId;
            if (id !== this.currentUserId && !this.knownActiveUserIds.has(id)) {
                this.join.incoming(activeUser.userInfo);
            }
        }

        // Emit lefts for users that were known but are no longer active or stale.
        for (const knownId of this.knownActiveUserIds) {
            if (
                knownId !== this.currentUserId &&
                !currentActiveIds.has(knownId)
            ) {
                this.left.incoming(knownId);
            }
        }

        this.knownActiveUserIds = currentActiveIds;
    }

    /**
     * Dispatch an incoming action to the appropriate handler.
     */
    private dispatchIncoming(type: ChannelActionType, payload: any): void {
        switch (type) {
            case ChannelActionType.Estimate:
                this.estimate.incoming(payload);
                break;

            case ChannelActionType.EstimateUpdated:
                this.estimateUpdated.incoming(payload);
                break;

            case ChannelActionType.Join:
                this.knownActiveUserIds.add(payload.tfId);
                this.join.incoming(payload);
                break;

            case ChannelActionType.Switch:
                this.setWorkItem.incoming(payload);
                break;

            case ChannelActionType.Reveal:
                this.revealed.incoming(payload);
                break;

            case ChannelActionType.Left:
                // Fast-path departure hint. leaveSession has already removed the
                // user from doc.activeUsers, so keep knownActiveUserIds in sync
                // to avoid a desync with detectUserChanges on a later rejoin.
                this.knownActiveUserIds.delete(payload);
                this.left.incoming(payload);
                break;

            case ChannelActionType.Snapshot:
                this.snapshot.incoming(payload);
                break;

            default:
                console.error("Unknown action received: " + type);
                break;
        }
    }
}
