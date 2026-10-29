import { OfflineEstimationService } from "./estimation";
import { getStorageManager } from "./storage";
import { IEstimate } from "../model/estimate";

jest.mock("./storage", () => ({
    getStorageManager: jest.fn()
}));

describe("offline estimation service", () => {
    let documents: { [id: string]: any };
    let manager: { getDocument: jest.Mock; setDocument: jest.Mock };

    beforeEach(() => {
        documents = {};
        manager = {
            getDocument: jest.fn(async (_collection, id, options) =>
                documents[id] || options.defaultValue
            ),
            setDocument: jest.fn(async (_collection, document) => {
                documents[document.id] = document;
                return document;
            })
        };
        (getStorageManager as jest.Mock).mockResolvedValue(manager);
    });

    it("stores estimates by work item and identity", async () => {
        const service = new OfflineEstimationService();
        const firstVote: IEstimate = {
            identity: { id: "user-a", displayName: "A" } as any,
            workItemId: 17,
            cardIdentifier: "3"
        };
        const secondVote: IEstimate = {
            identity: { id: "user-b", displayName: "B" } as any,
            workItemId: 17,
            cardIdentifier: "5"
        };

        await service.estimate("session-a", firstVote);
        await service.estimate("session-a", secondVote);

        expect(await service.getEstimates("session-a")).toEqual({
            17: [firstVote, secondVote]
        });
        expect(manager.setDocument).toHaveBeenCalledTimes(2);
    });

    it("replaces a user's previous estimate instead of adding a duplicate", async () => {
        const service = new OfflineEstimationService();
        const oldVote: IEstimate = {
            identity: { id: "user-a", displayName: "A" } as any,
            workItemId: 17,
            cardIdentifier: "3"
        };
        const newVote = { ...oldVote, cardIdentifier: "8" };

        await service.estimate("session-a", oldVote);
        await service.estimate("session-a", newVote);

        expect(await service.getEstimates("session-a")).toEqual({ 17: [newVote] });
    });

    it("returns empty estimates for a new session", async () => {
        const service = new OfflineEstimationService();
        await expect(service.getEstimates("new-session")).resolves.toEqual({});
        expect(manager.getDocument).toHaveBeenCalledWith(
            "offlineSessions",
            "new-session",
            { defaultValue: { id: "new-session", sessionEstimates: {} } }
        );
    });
});