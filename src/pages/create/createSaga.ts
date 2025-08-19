import * as AzureDevOpsAPI from "azure-devops-extension-api";
import { ProjectInfo } from "azure-devops-extension-api/Core";
import { getService } from "azure-devops-extension-sdk";
import { all, call, put, select, take } from "redux-saga/effects";
import history from "../../lib/history";
import { ISession } from "../../model/session";
import { IState } from "../../reducer";
import { CardSetServiceId, ICardSetService } from "../../services/cardSets";
import { Services } from "../../services/services";
import { ISessionService, SessionServiceId } from "../../services/sessions";
import { ITeamService, TeamServiceId } from "../../services/teams";
import { loadSessions } from "../home/sessionsActions";
import * as Actions from "./createActions";
import { IIdentityService, IdentityServiceId } from "../../services/identity";

export function* createSaga() {
    yield all([initSaga(), iterationSaga(), createSessionSaga()]);
}

/** Retrieve data for initial state */
export function* initSaga() {
    yield take(Actions.init.type);

    yield all([loadTeams(), loadCardSets()]);
}

/** Load teams */
export function* loadTeams() {
    console.log('createSaga: loadTeams - Starting');
    
    try {
        const projectService: AzureDevOpsAPI.IProjectPageService = yield call(
            getService,
            "ms.vss-tfs-web.tfs-page-data-service"
        );
        console.log('createSaga: loadTeams - Got project service');
        
        const projectInfo: ProjectInfo = yield call([
            projectService,
            projectService.getProject
        ]);
        console.log('createSaga: loadTeams - Got project info:', projectInfo);

        // TODO: Get source from state?
        const teamService = Services.getService<ITeamService>(TeamServiceId);
        console.log('createSaga: loadTeams - Got team service, fetching teams for project:', projectInfo?.id);
        
        if (!projectInfo || !projectInfo.id) {
            throw new Error('No project information available');
        }
        
        const teams = yield call(
            [teamService, teamService.getAllTeams],
            projectInfo.id
        );
        console.log('createSaga: loadTeams - Teams fetched successfully:', teams);
        yield put(Actions.setTeams(teams));
    } catch (error) {
        console.error('createSaga: loadTeams - Failed to fetch teams:', error);
        // Set empty teams array so UI doesn't stay in loading state
        yield put(Actions.setTeams([]));
    }
}

/**  */
export function* loadCardSets() {
    const cardSetService = Services.getService<ICardSetService>(
        CardSetServiceId
    );
    const cardSets = yield call([cardSetService, cardSetService.getSets]);
    yield put(Actions.setCardSets(cardSets));
}

export function* iterationSaga() {
    const action: ReturnType<typeof Actions.setTeam> = yield take(
        Actions.setTeam.type
    );

    console.log('createSaga: iterationSaga - Starting for team:', action.payload);

    try {
        const teamService = Services.getService<ITeamService>(TeamServiceId);
        console.log('createSaga: iterationSaga - Got team service');
        
        const iterations = yield call(
            [teamService, teamService.getIterationsForTeam],
            action.payload
        );
        console.log('createSaga: iterationSaga - Iterations fetched successfully:', iterations);
        yield put(Actions.setIterations(iterations));
    } catch (error) {
        console.error('createSaga: iterationSaga - Failed to fetch iterations:', error);
        // Set empty iterations array so UI doesn't stay in loading state
        yield put(Actions.setIterations([]));
    }
}

export function* createSessionSaga() {
    while (true) {
        yield take(Actions.create.type);

        let session: ISession = yield select((state: IState) => state.create.session);

        // Generate new id
        session = {
            ...session,
            id: Math.random()
                .toString(36)
                .substr(2, 5)
        };

        // Set creator's identity
        const identityService = Services.getService<IIdentityService>(
            IdentityServiceId
        );
        const identity = identityService.getCurrentIdentity();
        session.createdBy = identity.id;

        // Save session
        const sessionService = Services.getService<ISessionService>(
            SessionServiceId
        );
        yield call([sessionService, sessionService.saveSession], session);

        // Reset creation state
        yield put(Actions.reset());

        // Refresh all sessions
        yield put(loadSessions());

        // Navigate to homepage
        yield call(history.push as any, "/");
    }
}
