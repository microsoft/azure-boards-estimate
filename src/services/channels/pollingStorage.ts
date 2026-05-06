import { IExtensionDataManager } from "azure-devops-extension-api";
import { getStorageManager } from "../storage";
import {
    ChannelActionType,
    IActiveUser,
    IChannelAction,
    ISessionDocument,
    MAX_ACTION_LOG_SIZE,
    STALE_USER_TIMEOUT_MS
} from "../../model/sessionDocument";
import { IUserInfo } from "../../model/user";

const PollingCollection = "pollingSessions";

/**
 * Storage helper for the shared session document used by PollingChannel.
 * Encapsulates read/write with optimistic concurrency retry.
 */
export class PollingStorage {
    private manager: IExtensionDataManager | undefined;

    async getManager(): Promise<IExtensionDataManager> {
        if (!this.manager) {
            this.manager = await getStorageManager();
        }
        return this.manager;
    }

    /**
     * Fetch the session document, creating a default one if it doesn't exist.
     */
    async getSessionDocument(
        sessionId: string
    ): Promise<ISessionDocument> {
        const defaultValue: ISessionDocument = {
            id: sessionId,
            activeUsers: [],
            actions: [],
            nextSeq: 1
        };

        const manager = await this.getManager();
        try {
            const document = await manager.getDocument(
                PollingCollection,
                sessionId,
                { defaultValue }
            );
            return document as ISessionDocument;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Save the session document with optimistic concurrency.
     * Retries on conflict up to maxRetries times.
     */
    async saveSessionDocument(
        doc: ISessionDocument,
        maxRetries: number = 3
    ): Promise<ISessionDocument> {
        const manager = await this.getManager();

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const saved = await manager.setDocument(
                    PollingCollection,
                    doc
                );
                return saved as ISessionDocument;
            } catch (e: any) {
                if (attempt < maxRetries) {
                    // Refetch and retry
                    const fresh = await this.getSessionDocument(doc.id);
                    doc = { ...doc, __etag: fresh.__etag };
                } else {
                    throw e;
                }
            }
        }

        // Unreachable, but TypeScript needs this
        throw new Error("Failed to save session document");
    }

    /**
     * Append an action to the session document's action log.
     * Handles optimistic concurrency conflicts by refetching and retrying.
     */
    async appendAction(
        sessionId: string,
        type: ChannelActionType,
        payload: any,
        senderId: string,
        maxRetries: number = 3
    ): Promise<ISessionDocument> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const doc = await this.getSessionDocument(sessionId);
                const action: IChannelAction = {
                    seq: doc.nextSeq,
                    type,
                    payload,
                    senderId,
                    timestamp: Date.now()
                };

                doc.actions.push(action);
                doc.nextSeq = doc.nextSeq + 1;

                // Prune old entries if over the limit
                if (doc.actions.length > MAX_ACTION_LOG_SIZE) {
                    doc.actions = doc.actions.slice(
                        doc.actions.length - MAX_ACTION_LOG_SIZE
                    );
                }

                return await this.saveSessionDocument(doc, 0);
            } catch (e: any) {
                if (attempt >= maxRetries) {
                    throw e;
                }
                // Retry on conflict
            }
        }

        throw new Error("Failed to append action");
    }

    /**
     * Register a user as active in the session document.
     */
    async joinSession(
        sessionId: string,
        userInfo: IUserInfo,
        maxRetries: number = 3
    ): Promise<ISessionDocument> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const doc = await this.getSessionDocument(sessionId);

                // Remove any existing entry for this user
                doc.activeUsers = doc.activeUsers.filter(
                    u => u.userInfo.tfId !== userInfo.tfId
                );

                // Add fresh entry
                const activeUser: IActiveUser = {
                    userInfo,
                    lastSeen: Date.now()
                };
                doc.activeUsers.push(activeUser);

                return await this.saveSessionDocument(doc, 0);
            } catch (e: any) {
                if (attempt >= maxRetries) {
                    throw e;
                }
            }
        }

        throw new Error("Failed to join session");
    }

    /**
     * Remove a user from the active users list.
     */
    async leaveSession(
        sessionId: string,
        tfId: string,
        maxRetries: number = 3
    ): Promise<ISessionDocument> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const doc = await this.getSessionDocument(sessionId);
                doc.activeUsers = doc.activeUsers.filter(
                    u => u.userInfo.tfId !== tfId
                );
                return await this.saveSessionDocument(doc, 0);
            } catch (e: any) {
                if (attempt >= maxRetries) {
                    throw e;
                }
            }
        }

        throw new Error("Failed to leave session");
    }

    /**
     * Update the heartbeat timestamp for a user.
     */
    async heartbeat(
        sessionId: string,
        tfId: string,
        maxRetries: number = 3
    ): Promise<void> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const doc = await this.getSessionDocument(sessionId);
                const user = doc.activeUsers.find(
                    u => u.userInfo.tfId === tfId
                );
                if (user) {
                    user.lastSeen = Date.now();
                    await this.saveSessionDocument(doc, 0);
                }
                return;
            } catch (e: any) {
                if (attempt >= maxRetries) {
                    // Heartbeat failure is non-fatal, just log
                    console.warn("Heartbeat update failed", e);
                    return;
                }
            }
        }
    }

    /**
     * Get the list of user IDs that have gone stale (no heartbeat within threshold).
     */
    getStaleUserIds(doc: ISessionDocument): string[] {
        const now = Date.now();
        return doc.activeUsers
            .filter(u => now - u.lastSeen > STALE_USER_TIMEOUT_MS)
            .map(u => u.userInfo.tfId);
    }
}
