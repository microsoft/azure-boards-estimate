import { Action, createStore, Reducer } from "redux";
import { IState, rootReducer } from "./reducer";
import * as CreateActions from "./pages/create/createActions";
import * as SessionsActions from "./pages/home/sessionsActions";
import * as SessionActions from "./pages/session/sessionActions";
import { isValid } from "./pages/create/createSelector";
import { SessionMode, SessionSource, ISession } from "./model/session";
import { IUserInfo } from "./model/user";
import { IWorkItem } from "./model/workitem";

describe("root Redux workflow", () => {
    it("keeps creation, session-list, and live-estimation state in sync", () => {
        const testReducer = rootReducer as unknown as Reducer<IState, Action<any>>;
        const store = createStore<IState, Action<any>, {}, {}>(testReducer);
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
            name: "Release planning",
            mode: SessionMode.Online,
            version: 1,
            source: SessionSource.Ids,
            sourceData: [101],
            createdAt: new Date("2024-01-01T00:00:00Z"),
            createdBy: currentUser.tfId,
            cardSet: "default"
        };

        store.dispatch(CreateActions.setName(session.name));
        store.dispatch(CreateActions.setCardSet(session.cardSet));
        store.dispatch(CreateActions.init([workItem.id]));
        expect(isValid(store.getState().create)).toBe(true);

        store.dispatch(SessionsActions.populate({ sessions: [session], legacySessions: [] }));
        store.dispatch(SessionsActions.filter("release"));
        expect(store.getState().sessions.filteredSessions).toEqual([session]);

        store.dispatch(SessionActions.loadedSession({
            session,
            cardSet: { id: "default", name: "Default", type: 0, cards: [] },
            workItems: [workItem],
            estimates: {},
            userInfo: currentUser
        }));
        store.dispatch(SessionActions.estimate({
            identity: { id: currentUser.tfId, displayName: currentUser.name } as any,
            workItemId: workItem.id,
            cardIdentifier: "5"
        }));

        expect(store.getState().session.session).toEqual(session);
        expect(store.getState().session.ownEstimate?.cardIdentifier).toBe("5");
        expect(store.getState().session.estimates[workItem.id]).toHaveLength(1);
        expect(store.getState().sessions.sessions).toEqual([session]);
    });
});