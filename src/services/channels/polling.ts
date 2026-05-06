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
    private lastSeenSeq: number = 0;
    private pollingTimer: ReturnType<typeof setInterval> | undefined;
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    private knownActiveUserIds: Set<string> = new Set();

    async start(sessionId: string): Promise<void> {
        this.sessionId = sessionId;

        const identityService = Services.getService<IIdentityService>(
            IdentityServiceId
        );
        const identity = identityService.getCurrentIdentity();
        this.currentUserId = identity.id;

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
                    imageUrl: identity.imageUrl
                });
                this.knownActiveUserIds.add(identity.id);

                // Start polling
                this.pollingTimer = setInterval(
                    () => this.poll(),
                    POLLING_INTERVAL_MS
                );

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
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }

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
     * Poll the session document for new actions from other participants.
     */
    private async poll(): Promise<void> {
        try {
            const doc = await this.storage.getSessionDocument(this.sessionId);
            this.processNewActions(doc);
            this.detectUserChanges(doc);
        } catch (e) {
            console.warn("Polling failed", e);
        }
    }

    /**
     * Process any new actions in the document that we haven't seen yet.
     */
    private processNewActions(doc: ISessionDocument): void {
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
