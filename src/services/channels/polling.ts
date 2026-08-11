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
    private errorCount: number = 0;
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    private knownActiveUserIds: Set<string> = new Set();
    private wakeUp: (() => void) | undefined;

    // LT-1: Stored as a field so the same reference can be removed in end()
    private readonly handleVisibilityChange = (): void => {
        if (!document.hidden && this.wakeUp) {
            this.wakeUp();
        }
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
            imageUrl: identity.imageUrl,
            descriptor: identity.descriptor,
            avatarHref: identity.avatarHref
        };

        const maxRetries = 5;
        const retryDelay = 5000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Fetch or create the session document
                const doc = await this.storage.getSessionDocument(sessionId);

                // Set the initial sequence cursor to skip all existing actions
                this.lastSeenSeq = doc.nextSeq - 1;

                // Track currently known active users
                this.knownActiveUserIds = new Set(
                    doc.activeUsers.map(u => u.userInfo.tfId)
                );

                // Register current user
                await this.join({
                    tfId: identity.id,
                    name: identity.displayName,
                    imageUrl: identity.imageUrl,
                    descriptor: identity.descriptor,
                    avatarHref: identity.avatarHref
                });
                this.knownActiveUserIds.add(identity.id);

                // Start polling (CO-1: self-scheduling loop prevents overlapping requests)
                this.alive = true;
                this.errorCount = 0;
                document.addEventListener("visibilitychange", this.handleVisibilityChange);
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
        // C-1: Announce departure immediately; other clients no longer wait up to
        // STALE_USER_TIMEOUT_MS (30 s) to detect this user has gone
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

        // L-1: Signal the poll loop to exit and abort any in-flight sleep
        this.alive = false;
        if (this.wakeUp) {
            this.wakeUp();
        }

        // LT-1: Remove visibility listener
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }

        try {
            await this.storage.leaveSession(
                this.sessionId,
                this.currentUserId
            );
        } catch {
            // Best-effort cleanup
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
     * Detect users who have joined or left by comparing known users to the document.
     */
    private detectUserChanges(doc: ISessionDocument): void {
        const staleIds = new Set(this.storage.getStaleUserIds(doc));
        const currentActiveIds = new Set(
            doc.activeUsers
                .filter(u => !staleIds.has(u.userInfo.tfId))
                .map(u => u.userInfo.tfId)
        );

        // Detect users who have left (were known but are no longer active or are stale)
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
                this.join.incoming(payload);
                break;

            case ChannelActionType.Switch:
                this.setWorkItem.incoming(payload);
                break;

            case ChannelActionType.Left:
                this.left.incoming(payload);
                break;

            case ChannelActionType.Reveal:
                this.revealed.incoming(payload);
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
