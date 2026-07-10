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
 * Returns true when an Extension Data Service error indicates that the target
 * collection (or document) simply doesn't exist yet, rather than a real
 * failure. Azure DevOps reports a never-created collection as error 1660002
 * ("The collection does not exist") or a plain HTTP 404. This is expected the
 * first time any session is opened, before the first document is written.
 */
function isCollectionOrDocumentMissing(e: any): boolean {
    const status = e?.status ?? e?.statusCode;
    const message: string = e?.message ?? e?.serverError?.message ?? "";
    const typeKey: string = e?.serverError?.typeKey ?? "";
    return (
        status === 404 ||
        /1660002/.test(message) ||
        /collection does not exist/i.test(message) ||
        /document does not exist/i.test(message) ||
        typeKey === "DocumentCollectionDoesNotExistException" ||
        typeKey === "DocumentDoesNotExistException"
    );
}


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
            console.log(
                `[PollingStorage] getSessionDocument OK (session: ${sessionId}, nextSeq: ${(document as ISessionDocument)?.nextSeq}, activeUsers: ${(document as ISessionDocument)?.activeUsers?.length ?? 0}, actions: ${(document as ISessionDocument)?.actions?.length ?? 0})`
            );
            return document as ISessionDocument;
        } catch (e: any) {
            // The Extension Data Service throws "The collection does not exist"
            // (error 1660002) when reading from a collection that has never had
            // a document written to it. The `defaultValue` option only covers a
            // missing *document*, not a missing *collection*.
            //
            // Because the very first read for any session happens (in start())
            // before the first write (join), the `pollingSessions` collection is
            // never created, so every online session fails to connect. Treat a
            // missing collection/document as an empty session; the first
            // subsequent setDocument() will create the collection.
            if (isCollectionOrDocumentMissing(e)) {
                console.warn(
                    `[PollingStorage] '${PollingCollection}' collection/document not found for session ${sessionId} — bootstrapping empty session. ` +
                        `The next write will create the collection. (status: ${e?.status ?? e?.statusCode ?? "n/a"}, typeKey: ${e?.serverError?.typeKey ?? "n/a"}, message: ${e?.message ?? e?.serverError?.message ?? "n/a"})`
                );
                return defaultValue;
            }
            console.error(
                `[PollingStorage] getSessionDocument FAILED (session: ${sessionId}) with an unexpected error — not treated as missing collection:`,
                e
            );
            throw e;
        }
    }

    /**
     * Atomically fetch, mutate, and save the session document (compare-and-swap).
     * On optimistic-concurrency conflicts the full fetch + mutate is re-applied to
     * the freshly fetched document, preventing stale overwrites (C-4).
     *
     * @param mutate  Called with the latest document.  Return `false` to skip the
     *                save (no-op).  Throw to propagate errors.
     */
    private async modifyDocument(
        sessionId: string,
        mutate: (doc: ISessionDocument) => boolean | void,
        maxRetries: number = 3
    ): Promise<ISessionDocument> {
        const manager = await this.getManager();
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const doc = await this.getSessionDocument(sessionId);
                const changed = mutate(doc);
                if (changed === false) {
                    return doc; // no-op — caller signalled nothing to save
                }
                const saved = await manager.setDocument(PollingCollection, doc);
                console.log(
                    `[PollingStorage] setDocument OK (session: ${sessionId}, attempt: ${attempt}, nextSeq: ${(saved as ISessionDocument)?.nextSeq}) — collection '${PollingCollection}' is now guaranteed to exist`
                );
                return saved as ISessionDocument;
            } catch (e: any) {
                // Azure DevOps signals an OCC etag mismatch as either:
                //   - HTTP 409 (standard conflict), or
                //   - HTTP 400 with typeKey "InvalidDocumentVersionException"
                //     (error 1660003 — "The document version does not match")
                // Both are safe to retry after re-fetching the document.
                // Any other error is not recoverable and must propagate immediately.
                const status = e?.status ?? e?.statusCode;
                const typeKey = e?.serverError?.typeKey ?? "";
                const isConflict =
                    status === 409 ||
                    (status === 400 &&
                        typeKey === "InvalidDocumentVersionException");
                if (attempt >= maxRetries || !isConflict) {
                    console.error(
                        `[PollingStorage] modifyDocument failed (session: ${sessionId}, attempt: ${attempt}, status: ${status ?? "unknown"}):`,
                        e
                    );
                    throw e;
                }
                // Conflict: next iteration re-fetches a fresh document before
                // re-applying the mutation, so no stale content is ever written.
            }
        }
        throw new Error("Failed to modify session document");
    }

    /**
     * Append an action to the session document's action log.
     */
    async appendAction(
        sessionId: string,
        type: ChannelActionType,
        payload: any,
        senderId: string
    ): Promise<ISessionDocument> {
        return this.modifyDocument(sessionId, doc => {
            const action: IChannelAction = {
                seq: doc.nextSeq,
                type,
                payload,
                senderId,
                timestamp: Date.now()
            };
            doc.actions.push(action);
            doc.nextSeq++;
            if (doc.actions.length > MAX_ACTION_LOG_SIZE) {
                doc.actions = doc.actions.slice(
                    doc.actions.length - MAX_ACTION_LOG_SIZE
                );
            }
        });
    }

    /**
     * Register a user as active in the session document.
     */
    async joinSession(
        sessionId: string,
        userInfo: IUserInfo
    ): Promise<ISessionDocument> {
        return this.modifyDocument(sessionId, doc => {
            doc.activeUsers = doc.activeUsers.filter(
                u => u.userInfo.tfId !== userInfo.tfId
            );
            const activeUser: IActiveUser = {
                userInfo,
                lastSeen: Date.now()
            };
            doc.activeUsers.push(activeUser);
        });
    }

    /**
     * Remove a user from the active users list.
     */
    async leaveSession(
        sessionId: string,
        tfId: string
    ): Promise<ISessionDocument> {
        return this.modifyDocument(sessionId, doc => {
            doc.activeUsers = doc.activeUsers.filter(
                u => u.userInfo.tfId !== tfId
            );
        });
    }

    /**
     * Update the heartbeat timestamp for a user, and opportunistically prune
     * any users that have gone stale (no heartbeat within the threshold).
     *
     * Pruning is folded into the heartbeat write so the participant list
     * self-heals after abrupt disconnects (tab close / refresh / network loss)
     * where end()/leaveSession never ran — without incurring an extra write.
     * The current user is always retained, even if its timestamp looks stale.
     */
    async heartbeat(sessionId: string, tfId: string): Promise<void> {
        try {
            await this.modifyDocument(sessionId, doc => {
                const now = Date.now();

                // Prune stale ghosts (keep the current user regardless).
                const before = doc.activeUsers.length;
                doc.activeUsers = doc.activeUsers.filter(
                    u =>
                        u.userInfo.tfId === tfId ||
                        now - u.lastSeen <= STALE_USER_TIMEOUT_MS
                );
                const prunedCount = before - doc.activeUsers.length;
                if (prunedCount > 0) {
                    console.log(
                        `[PollingStorage] heartbeat pruned ${prunedCount} stale user(s) from session ${sessionId}`
                    );
                }

                // Refresh our own heartbeat timestamp.
                const user = doc.activeUsers.find(
                    u => u.userInfo.tfId === tfId
                );
                if (user) {
                    user.lastSeen = now;
                } else if (prunedCount === 0) {
                    // We are no longer in the list and nothing was pruned —
                    // nothing to persist.
                    return false;
                }
            });
        } catch {
            // Heartbeat failure is non-fatal
            console.warn("Heartbeat update failed");
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
