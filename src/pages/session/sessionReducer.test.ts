import reducer from "./sessionReducer";
import * as Actions from "./sessionActions";
import { IEstimate } from "../../model/estimate";
import { SessionMode, SessionSource, ISession } from "../../model/session";
import { IUserInfo } from "../../model/user";
import { IWorkItem } from "../../model/workitem";

const currentUser: IUserInfo = { tfId: "user-a", name: "A", imageUrl: "" };
const workItem: IWorkItem = {
    id: 101,
    title: "Implement feature",
    description: "",
    project: "Project",
    workItemType: "User Story"
};
const session: ISession = {
    id: "session-a",
    name: "Planning",
    mode: SessionMode.Online,
    version: 1,
    source: SessionSource.Ids,
    sourceData: [101],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    createdBy: "user-a",
    cardSet: "default"
};

const makeEstimate = (userId: string, cardIdentifier: string | null): IEstimate => ({
    identity: { id: userId, displayName: userId } as any,
    workItemId: workItem.id,
    cardIdentifier
});

describe("session state lifecycle", () => {
    it("preserves participants reported before the session payload loads", () => {
        const peer: IUserInfo = { tfId: "user-b", name: "B", imageUrl: "" };
        let state = reducer(undefined, Actions.userJoined(peer));

        state = reducer(state, Actions.loadedSession({
            session,
            cardSet: { id: "default", name: "Default", type: 0, cards: [] },
            workItems: [workItem],
            estimates: {},
            userInfo: currentUser
        }));

        expect(state.activeUsers.map(user => user.tfId)).toEqual(["user-a", "user-b"]);
        expect(state.status.loading).toBe(false);
        expect(state.selectedWorkItem).toBeNull();
    });

    it("updates local votes, removes cleared votes, and resets votes on selection", () => {
        let state = reducer(undefined, Actions.loadedSession({
            session,
            cardSet: { id: "default", name: "Default", type: 0, cards: [] },
            workItems: [workItem],
            estimates: {},
            userInfo: currentUser
        }));
        const firstVote = makeEstimate("user-a", "3");
        const changedVote = makeEstimate("user-a", "5");

        state = reducer(state, Actions.estimate(firstVote));
        state = reducer(state, Actions.estimate(changedVote));
        expect(state.ownEstimate).toEqual(changedVote);
        expect(state.estimates[101]).toEqual([changedVote]);

        state = reducer(state, Actions.estimate(makeEstimate("user-a", null)));
        expect(state.ownEstimate).toBeNull();
        expect(state.estimates[101]).toEqual([]);

        state = reducer(state, Actions.estimate(makeEstimate("user-b", "8")));
        state = reducer(state, Actions.selectWorkItem(101));
        expect(state.selectedWorkItem).toBe(workItem);
        expect(state.estimates).toEqual({});
        expect(state.ownEstimate).toBeNull();
        expect(state.revealed).toBe(false);
    });

    it("applies remote estimates and work-item updates", () => {
        let state = reducer(undefined, Actions.loadedSession({
            session,
            cardSet: { id: "default", name: "Default", type: 0, cards: [] },
            workItems: [workItem],
            estimates: {},
            userInfo: currentUser
        }));
        const ownVote = makeEstimate("user-a", "2");
        const peerVote = makeEstimate("user-b", "5");

        state = reducer(state, Actions.estimateSet(ownVote));
        state = reducer(state, Actions.estimateSet(peerVote));
        expect(state.selectedWorkItem).toBe(workItem);
        expect(state.ownEstimate).toEqual(ownVote);
        expect(state.estimates[101]).toEqual([ownVote, peerVote]);

        state = reducer(state, Actions.estimateUpdated({ workItemId: 101, value: 5 }));
        expect(state.workItems[0].estimate).toBe(5);

        state = reducer(state, Actions.leaveSession());
        expect(state.session).toBeNull();
        expect(state.workItems).toEqual([]);
        expect(state.activeUsers).toEqual([]);
        expect(state.currentUser).toBeNull();
    });
});