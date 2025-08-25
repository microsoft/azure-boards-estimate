import { getClient, CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import { ProjectInfo, CoreRestClient } from "azure-devops-extension-api/Core";
import * as SDK from "azure-devops-extension-sdk";
import { all, call, put, select, take, apply } from "redux-saga/effects";
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

/** Isolated test for project and team context */
export function* testProjectAndTeamContext() {
  try {
    console.log('⏳ STEP 1: Initializing Azure DevOps SDK...');
    yield call([SDK, SDK.init]);
    yield call([SDK, SDK.ready]);

    // 1) Token check (will hang if handshake/auth isn’t OK)
    const token = yield call([SDK, SDK.getAccessToken]);
    console.log('token length', token?.length);

    console.log('✅ STEP 1: SDK ready');

    console.log('🔍 STEP 2: Getting project service...');
    const projSvc: IProjectPageService = yield call(
      [SDK, SDK.getService],
      // Prefer the constant to avoid typos:
      // CommonServiceIds.ProjectPageService
      "ms.vss-tfs-web.tfs-page-data-service"
    );
    const project = yield call([projSvc, projSvc.getProject]);
        // 2) Raw fetch fallback (bypasses the client to isolate fetch/CORS issues)
    const host = yield call([SDK, SDK.getHost]);
    const base = host?.baseUri ?? host?.uri; // should look like https://dev.azure.com/{org}/
    const resp: Response = yield call(fetch, `${base}_apis/projects/${project.id}/teams?api-version=7.1-preview.3`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    });
    console.log('raw fetch status', resp.status);
    const json = yield call([resp, resp.json]);
    console.log('raw fetch teams count', json?.value?.length);
    if (!project?.id) throw new Error('No project ID');

    console.log('🚀 STEP 3: Getting CoreRestClient for teams...');
    const coreClient: CoreRestClient = yield call(getClient, CoreRestClient);

    console.log('📡 STEP 3: Calling getTeams...');
    const teams = yield apply(coreClient, coreClient.getTeams, [project.id, false, 200, 0]);

    console.log('🎯 Teams:', teams?.map(t => ({ id: t.id, name: t.name })));
    return {
      project: { id: project.id, name: project.name },
      teams: teams?.map(t => ({ id: t.id, name: t.name })) ?? []
    };
  } catch (error) {
    console.error('❌ FAILED', error);
    throw error;
  }
}
/** Load teams */
export function* loadTeams() {
    console.log('🔄 createSaga: loadTeams - Starting teams fetch process...');
    
    try {
        // Run isolated test first
        const testResult = yield call(testProjectAndTeamContext);
        console.log('✅ Isolated test passed, using results for loadTeams');
        
        // Process teams data for Redux store
        const processedTeams = testResult.teams.sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        yield put(Actions.setTeams(processedTeams));
        console.log('✅ createSaga: loadTeams - Teams dispatched to Redux store');
        
    } catch (error) {
        console.error('❌ createSaga: loadTeams - Failed:', error);
        yield put(Actions.setTeams([])); // Set empty array on failure
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

    const teamService = Services.getService<ITeamService>(TeamServiceId);
    const iterations = yield call(
        [teamService, teamService.getIterationsForTeam],
        action.payload
    );

    yield put(Actions.setIterations(iterations));
}

export function* createSessionSaga() {
    while (true) {
        yield take(Actions.create.type);

        let session: ISession = yield select(x => x.create.session);

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