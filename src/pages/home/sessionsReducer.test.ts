import reducer from "./sessionsReducer";
import * as Actions from "./sessionsActions";
import { SessionMode, SessionSource, ISession } from "../../model/session";
import { getSessions } from "./sessionsSelectors";

const makeSession = (id: string, name: string, source = SessionSource.Ids): ISession => ({
    id,
    name,
    mode: SessionMode.Online,
    version: 1,
    source,
    sourceData: source === SessionSource.Sprint ? "team-a;sprint-a" : [1],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    createdBy: "user-a",
    cardSet: "default"
});

describe("sessions list state", () => {
    it("tracks loading and populates current and legacy sessions", () => {
        const sessions = [makeSession("one", "Sprint planning")];
        const legacySessions = [makeSession("old", "Legacy")];
        let state = reducer(undefined, Actions.loadSessions());

        expect(state.loading).toBe(true);

        state = reducer(state, Actions.populate({ sessions, legacySessions }));
        expect(state.loading).toBe(false);
        expect(state.sessions).toEqual(sessions);
        expect(state.legacySessions).toEqual(legacySessions);
    });

    it("filters names case-insensitively and clears the filter", () => {
        const sessions = [
            makeSession("one", "Sprint Planning"),
            makeSession("two", "Backlog Refinement")
        ];
        let state = reducer(undefined, Actions.populate({ sessions, legacySessions: [] }));

        state = reducer(state, Actions.filter("sprint"));
        expect(state.filteredSessions).toEqual([sessions[0]]);

        state = reducer(state, Actions.filter(""));
        expect(state.filteredSessions).toBeNull();
    });

    it("resolves sprint details for display and keeps missing lookups empty", () => {
        let state = reducer(undefined, Actions.populate({
            sessions: [makeSession("one", "Planning", SessionSource.Sprint)],
            legacySessions: []
        }));
        state = reducer(state, Actions.setTeamLookup({ "team-a": { id: "team-a", name: "Platform" } as any }));
        state = reducer(state, Actions.setIterationLookup({ "sprint-a": { id: "sprint-a", name: "Iteration 7" } as any }));

        expect(getSessions(state)[0].sessionInfo).toEqual([
            { label: "Team", value: "Platform" },
            { label: "Sprint", value: "Iteration 7" }
        ]);

        state = reducer(state, Actions.setIterationLookup({}));
        expect(getSessions(state)[0].sessionInfo[1]).toEqual({ label: "Sprint", value: "" });
    });

    it("sets and clears fatal errors", () => {
        let state = reducer(undefined, Actions.fatalError("failed to load"));
        expect(state.error).toBe("failed to load");

        state = reducer(state, Actions.clearError());
        expect(state.error).toBeNull();
    });
});