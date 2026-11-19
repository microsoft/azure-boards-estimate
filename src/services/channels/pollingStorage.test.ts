import { PollingStorage } from "./pollingStorage";
import { getStorageManager } from "../storage";
import {
    ChannelActionType,
    ISessionDocument,
    MAX_ACTION_LOG_SIZE,
    STALE_USER_TIMEOUT_MS
} from "../../model/sessionDocument";
import { IUserInfo } from "../../model/user";

jest.mock("../storage", () => ({
    getStorageManager: jest.fn()
}));

const user = (tfId: string): IUserInfo => ({ tfId, name: tfId, imageUrl: "" });

describe("polling session storage integration", () => {
    let documents: { [id: string]: ISessionDocument };
    let manager: { getDocument: jest.Mock; setDocument: jest.Mock };

    beforeEach(() => {
        jest.useRealTimers();
        documents = {};
        manager = {
            getDocument: jest.fn(async (_collection, id, options) => {
                if (!documents[id]) {
                    const error: any = new Error("Document does not exist");
                    error.status = 404;
                    throw error;
                }
                return documents[id];
            }),
            setDocument: jest.fn(async (_collection, document) => {
                documents[document.id] = {
                    ...document,
                    activeUsers: [...document.activeUsers],
                    actions: [...document.actions]
                };
                return documents[document.id];
            })
        };
        (getStorageManager as jest.Mock).mockResolvedValue(manager);
        jest.spyOn(console, "warn").mockImplementation(() => undefined);
        jest.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it("bootstraps a missing collection or document as an empty session", async () => {
        const storage = new PollingStorage();

        await expect(storage.getSessionDocument("session-a")).resolves.toEqual({
            id: "session-a",
            activeUsers: [],
            actions: [],
            nextSeq: 1
        });

        expect(manager.getDocument).toHaveBeenCalledWith(
            "pollingSessions",
            "session-a",
            { defaultValue: { id: "session-a", activeUsers: [], actions: [], nextSeq: 1 } }
        );
        expect(console.warn).toHaveBeenCalled();
    });

    it("joins, refreshes, and removes participants without duplicates", async () => {
        const storage = new PollingStorage();

        await storage.joinSession("session-a", user("user-a"));
        await storage.joinSession("session-a", { ...user("user-a"), name: "Updated" });
        await storage.joinSession("session-a", user("user-b"));
        const result = await storage.leaveSession("session-a", "user-a");

        expect(result.activeUsers.map(activeUser => activeUser.userInfo.tfId)).toEqual(["user-b"]);
        expect(result.nextSeq).toBe(1);
    });

    it("appends sequenced actions and bounds the action log", async () => {
        const storage = new PollingStorage();
        let result = await storage.getSessionDocument("session-a");

        for (let index = 0; index < MAX_ACTION_LOG_SIZE + 3; index++) {
            result = await storage.appendAction(
                "session-a",
                ChannelActionType.Estimate,
                { index },
                "user-a"
            );
        }

        expect(result.actions).toHaveLength(MAX_ACTION_LOG_SIZE);
        expect(result.actions[0].seq).toBe(4);
        expect(result.actions[result.actions.length - 1].seq).toBe(MAX_ACTION_LOG_SIZE + 3);
        expect(result.nextSeq).toBe(MAX_ACTION_LOG_SIZE + 4);
    });

    it("re-fetches and reapplies a mutation after an optimistic concurrency conflict", async () => {
        const storage = new PollingStorage();
        const remoteAction = {
            seq: 1,
            type: ChannelActionType.Join,
            payload: user("remote"),
            senderId: "remote",
            timestamp: 1
        };
        jest.spyOn(global, "setTimeout").mockImplementation((
            ((callback: (...args: any[]) => void) => {
                callback();
                return 0;
            }) as any
        ));
        manager.setDocument
            .mockImplementationOnce(async (_collection, document) => {
                documents[document.id] = {
                    ...document,
                    actions: [remoteAction],
                    nextSeq: 2
                };
                const error: any = new Error("version conflict");
                error.status = 409;
                throw error;
            });

        const pending = storage.appendAction(
            "session-a",
            ChannelActionType.Estimate,
            { card: "5" },
            "user-a"
        );
        const result = await pending;

        expect(result.actions.map(action => action.seq)).toEqual([1, 2]);
        expect(result.actions[0]).toEqual(remoteAction);
        expect(result.actions[1].senderId).toBe("user-a");
        expect(manager.setDocument).toHaveBeenCalledTimes(2);
    });

    it("prunes stale participants during heartbeat while retaining the current user", async () => {
        const storage = new PollingStorage();
        const now = 100000;
        jest.spyOn(Date, "now").mockReturnValue(now);
        documents["session-a"] = {
            id: "session-a",
            activeUsers: [
                { userInfo: user("stale"), lastSeen: now - STALE_USER_TIMEOUT_MS - 1 },
                { userInfo: user("user-a"), lastSeen: now - STALE_USER_TIMEOUT_MS - 100 }
            ],
            actions: [],
            nextSeq: 1
        };

        await storage.heartbeat("session-a", "user-a");

        expect(documents["session-a"].activeUsers).toHaveLength(1);
        expect(documents["session-a"].activeUsers[0].userInfo.tfId).toBe("user-a");
        expect(documents["session-a"].activeUsers[0].lastSeen).toBe(now);
    });

    it("does not write a heartbeat when the caller is absent and no users are stale", async () => {
        const storage = new PollingStorage();
        documents["session-a"] = {
            id: "session-a",
            activeUsers: [{ userInfo: user("other"), lastSeen: Date.now() }],
            actions: [],
            nextSeq: 1
        };

        await storage.heartbeat("session-a", "missing-user");

        expect(manager.setDocument).not.toHaveBeenCalled();
    });

    it("propagates unexpected read errors and reports stale IDs", async () => {
        const storage = new PollingStorage();
        const failure = new Error("permission denied");
        manager.getDocument.mockRejectedValue(failure);

        await expect(storage.getSessionDocument("session-a")).rejects.toBe(failure);

        const now = Date.now();
        const document: ISessionDocument = {
            id: "session-b",
            activeUsers: [
                { userInfo: user("active"), lastSeen: now },
                { userInfo: user("stale"), lastSeen: now - STALE_USER_TIMEOUT_MS - 1 }
            ],
            actions: [],
            nextSeq: 1
        };
        expect(storage.getStaleUserIds(document)).toEqual(["stale"]);
    });
});