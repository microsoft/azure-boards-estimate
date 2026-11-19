import reducer from "./createReducer";
import * as Actions from "./createActions";
import { isValid } from "./createSelector";
import { SessionSource } from "../../model/session";

describe("create session state", () => {
    it("invalidates a selected iteration when its team changes", () => {
        let state = reducer(undefined, Actions.setTeam("team-a"));
        state = reducer(state, Actions.setIteration("sprint-a"));

        state = reducer(state, Actions.setTeam("team-b"));

        expect(state.team).toBe("team-b");
        expect(state.iteration).toBe("");
        expect(state.iterations).toEqual([]);
        expect(state.session.sourceData).toBe("team-b;");
    });

    it("locks an ID-based session and preserves loaded data after reset", () => {
        const teams = [{ id: "team-a", name: "Team A" }] as any;
        const cardSets = [{ id: "default", name: "Default", cards: [] }] as any;
        let state = reducer(undefined, Actions.setTeams(teams));
        state = reducer(state, Actions.setCardSets(cardSets));
        state = reducer(state, Actions.init([12, 34]));

        expect(state.sourceLocked).toBe(true);
        expect(state.session.source).toBe(SessionSource.Ids);
        expect(state.session.sourceData).toEqual([12, 34]);

        state = reducer(state, Actions.reset());

        expect(state.sourceLocked).toBe(false);
        expect(state.session.name).toBe("");
        expect(state.teams).toBe(teams);
        expect(state.cardSets).toBe(cardSets);
    });

    it("validates name, card set, and each session source", () => {
        let state = reducer(undefined, Actions.setName(" Planning "));
        state = reducer(state, Actions.setCardSet("default"));
        expect(isValid(state)).toBe(false);

        state = reducer(state, Actions.setTeam("team-a"));
        state = reducer(state, Actions.setIteration("sprint-a"));
        expect(isValid(state)).toBe(true);

        state = reducer(state, Actions.setSource(SessionSource.Query));
        state = reducer(state, Actions.setQuery("query-a"));
        expect(isValid(state)).toBe(true);

        state = reducer(state, Actions.setSource(SessionSource.Ids));
        state = reducer(state, Actions.init([]));
        expect(isValid(state)).toBe(false);

        state = reducer(state, Actions.init([99]));
        expect(isValid(state)).toBe(true);
    });

    it("rejects blank names and incomplete source data", () => {
        let state = reducer(undefined, Actions.setName("   "));
        state = reducer(state, Actions.setCardSet("default"));
        expect(isValid(state)).toBe(false);

        state = reducer(state, Actions.setName("Planning"));
        state = reducer(state, Actions.setTeam("team-a"));
        expect(isValid(state)).toBe(false);
    });
});