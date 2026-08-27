import { Channel, eventChannel, SagaIterator } from "redux-saga";
import {
    all,
    call,
    cancelled,
    put,
    select,
    take,
    takeEvery,
    fork
} from "redux-saga/effects";
import { Action } from "typescript-fsa";
import { ISession } from "../../model/session";
import { ISnapshot } from "../../model/snapshots";
import { IUserInfo } from "../../model/user";
import { IChannel } from "../../services/channels/channels";
import { connected } from "./channelActions";
import { getActiveUsers, getSnapshot } from "./selector";
import {
    estimate,
    estimateSet,
    estimateUpdated,
    reveal,
    revealed,
    selectWorkItem,
    snapshotReceived,
    userJoined,
    userLeft,
    workItemSelected,
    updateStatusError
} from "./sessionActions";

export function* channelSaga(session: ISession, channel: IChannel): SagaIterator {
    const statusChannel: Channel<{message: string, type?: string}> = eventChannel(emit => {
        channel.onStatus = (status: { message: string; type?: string }) => {
            emit(status);
        };
        return () => {};
    });

    yield fork(statusHandlerSaga, statusChannel);

    yield call([channel, channel.start], session.id);

    // Seed the participant list with users who were already active before we
    // joined — their Join broadcasts predate our action-log cursor and would
    // otherwise never reach us, leaving the local participant count too low.
    const knownUsers = channel.getKnownUsers ? channel.getKnownUsers() : [];
    for (const userInfo of knownUsers) {
        yield put(userJoined(userInfo));
    }

    yield put(connected());

    try {
        yield all([
            call(channelListenerSaga, channel),
            call(channelSenderSaga, session.id, channel)
        ]);
    } finally {
        if (yield cancelled()) {
            statusChannel.close(); // L-3: Close the status channel on teardown
            yield call([channel, channel.end]);
        }
    }
}

/**
 * Map user actions to outgoing channel calls
 */
export function* channelSenderSaga(sessionId: string, channel: IChannel) {
    yield takeEvery(
        [estimate.type, estimateUpdated.type, selectWorkItem.type, reveal.type],
        function*(action: Action<any>) {
            switch (action.type) {
                case estimate.type:
                    yield call([channel, channel.estimate], action.payload);
                    break;

                case estimateUpdated.type:
                    if (!action.payload.remote) {
                        // Only send if this wasn't a remote action
                        yield call(
                            [channel, channel.estimateUpdated],
                            action.payload
                        );
                    }
                    break;

                case selectWorkItem.type:
                    yield call([channel, channel.setWorkItem], action.payload);
                    break;

                case reveal.type: {
                    yield call([channel, channel.revealed], undefined);
                    break;
                }
            }
        }
    );
}

/**
 * Take channel actions and map them to redux actions
 */
export function* channelListenerSaga(channel: IChannel): Generator {
    const subscription: Channel<{}> = yield call(subscribe, channel);
    while (true) {
        const action = yield take(subscription);

        switch (action.type) {
            case userJoined.type: {
                // C-2: Prevent snapshot write storm — with N connected participants,
                // every client previously responded to each Join with a snapshot
                // write, causing N-1 optimistic-concurrency failures per join.
                // Only the participant with the lexicographically smallest tfId
                // sends the snapshot; all others skip.
                const snapshot: ISnapshot = yield select(getSnapshot);
                const activeUsers: IUserInfo[] = yield select(getActiveUsers);
                const currentUserId: string = snapshot.userInfo.tfId;
                const isSmallestId = !activeUsers.some(
                    u => u.tfId < currentUserId
                );
                if (isSmallestId) {
                    yield call([channel, channel.snapshot], snapshot);
                }
                break;
            }
        }

        yield put(action);
    }
}

export function subscribe(channel: IChannel) {
    return eventChannel(emit => {
        const workItemHandler = (workItemId: number) =>
            emit(workItemSelected(workItemId));
        channel.setWorkItem.attachHandler(workItemHandler);

        const estimateHandler = (e: any) => emit(estimateSet(e));
        channel.estimate.attachHandler(estimateHandler);

        const estimateUpdatedHandler = (e: any) =>
            emit(estimateUpdated({ ...e, remote: true }));
        channel.estimateUpdated.attachHandler(estimateUpdatedHandler);

        const joinHandler = (payload: IUserInfo) => emit(userJoined(payload));
        channel.join.attachHandler(joinHandler);

        const leftHandler = (payload: string) => emit(userLeft(payload));
        channel.left.attachHandler(leftHandler);

        const revealedHandler = () => emit(revealed());
        channel.revealed.attachHandler(revealedHandler);

        const snapshotHandler = (snapshot: ISnapshot) =>
            emit(snapshotReceived(snapshot));
        channel.snapshot.attachHandler(snapshotHandler);

        // L-2: Return a proper cleanup so handlers are detached when the saga's
        // eventChannel is closed, preventing accumulation across reconnections
        return () => {
            channel.setWorkItem.detachHandler(workItemHandler);
            channel.estimate.detachHandler(estimateHandler);
            channel.estimateUpdated.detachHandler(estimateUpdatedHandler);
            channel.join.detachHandler(joinHandler);
            channel.left.detachHandler(leftHandler);
            channel.revealed.detachHandler(revealedHandler);
            channel.snapshot.detachHandler(snapshotHandler);
        };
    });
}

function* statusHandlerSaga(statusChannel: Channel<{ message: string, type?: string }>) {
    while (true) {
        const status: {message: string, type?: string} = yield take(statusChannel);
        yield put(updateStatusError(status));
    }
}
