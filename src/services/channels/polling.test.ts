import { IEstimate } from "../../model/estimate";
import { ChannelActionType, ISessionDocument } from "../../model/sessionDocument";
import { IUserInfo } from "../../model/user";
import { IdentityServiceId } from "../identity";
import { Services } from "../services";
import { PollingChannel } from "./polling";
import { PollingStorage } from "./pollingStorage";

jest.mock("../identity", () => ({
    IdentityServiceId: "IdentityService"
}));

jest.mock("./pollingStorage", () => ({
    PollingStorage: jest.fn().mockImplementation(() => ({
        getSessionDocument: jest.fn(),
        getStaleUserIds: jest.fn(() => []),
        joinSession: jest.fn().mockResolvedValue(undefined),
        leaveSession: jest.fn().mockResolvedValue(undefined),
        leaveSessionSync: jest.fn(),
        appendAction: jest.fn().mockResolvedValue(undefined),
        heartbeat: jest.fn().mockResolvedValue(undefined)
    }))
}));

const currentUser: IUserInfo = {
    tfId: "user-a",
    name: "User A",
    imageUrl: ""
};
const existingUser: IUserInfo = {
    tfId: "user-b",
    name: "User B",
    imageUrl: ""
};

class MockIdentityService {
    getCurrentIdentity() {
        return {
            id: currentUser.tfId,
            displayName: currentUser.name,
            imageUrl: currentUser.imageUrl,
            descriptor: "descriptor-a"
        };
    }
}

describe("polling channel integration", () => {
    let channel: PollingChannel;
    let storage: any;

    beforeEach(() => {
        jest.useRealTimers();
        Services.registerService(IdentityServiceId, MockIdentityService as any);
        channel = new PollingChannel();
        storage = (PollingStorage as any).mock.results[0].value;
    });

    afterEach(async () => {
        await channel.end();
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it("connects, receives peer actions, sends local operations, and ends once", async () => {
        const remoteEstimate: IEstimate = {
            identity: { id: existingUser.tfId, displayName: existingUser.name } as any,
            workItemId: 101,
            cardIdentifier: "8"
        };
        const initialDocument: ISessionDocument = {
            id: "session-a",
            activeUsers: [{ userInfo: existingUser, lastSeen: Date.now() }],
            actions: [],
            nextSeq: 1
        };
        const polledDocument: ISessionDocument = {
            ...initialDocument,
            activeUsers: [
                ...initialDocument.activeUsers,
                { userInfo: currentUser, lastSeen: Date.now() }
            ],
            actions: [{
                seq: 1,
                type: ChannelActionType.Estimate,
                payload: remoteEstimate,
                senderId: existingUser.tfId,
                timestamp: Date.now()
            }],
            nextSeq: 2
        };
        storage.getSessionDocument
            .mockResolvedValueOnce(initialDocument)
            .mockResolvedValueOnce(polledDocument);
        const receivedEstimates: IEstimate[] = [];
        const localReveals: undefined[] = [];
        channel.estimate.attachHandler(estimate => receivedEstimates.push(estimate));
        channel.revealed.attachHandler(() => localReveals.push(undefined));

        await channel.start("session-a");
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(channel.getKnownUsers()).toEqual([existingUser]);
        expect(receivedEstimates).toEqual([remoteEstimate]);
        expect(storage.joinSession).toHaveBeenCalledWith("session-a", {
            ...currentUser,
            descriptor: "descriptor-a"
        });

        await channel.estimate(remoteEstimate);
        await channel.setWorkItem(101);
        await channel.revealed();

        expect(storage.appendAction).toHaveBeenCalledWith(
            "session-a",
            ChannelActionType.Estimate,
            remoteEstimate,
            currentUser.tfId
        );
        expect(storage.appendAction).toHaveBeenCalledWith(
            "session-a",
            ChannelActionType.Switch,
            101,
            currentUser.tfId
        );
        expect(localReveals).toHaveLength(1);

        await channel.end();
        await channel.end();

        expect(storage.leaveSession).toHaveBeenCalledTimes(1);
        expect(storage.appendAction).toHaveBeenCalledWith(
            "session-a",
            ChannelActionType.Left,
            currentUser.tfId,
            currentUser.tfId
        );
    });
});