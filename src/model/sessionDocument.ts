import { ISessionEstimates } from "./estimate";
import { IUserInfo } from "./user";

/**
 * Action types that can be broadcast between participants
 */
export enum ChannelActionType {
    Join = "join",
    Left = "left",
    Estimate = "estimate",
    EstimateUpdated = "estimate-updated",
    Reveal = "reveal",
    Switch = "switch",
    Snapshot = "snapshot"
}

/**
 * An individual action entry in the shared session document's action log
 */
export interface IChannelAction {
    /** Monotonically increasing sequence number */
    seq: number;

    /** Type of the action */
    type: ChannelActionType;

    /** Action payload (varies by type) */
    payload: any;

    /** Identity ID of the sender */
    senderId: string;

    /** Timestamp when the action was created */
    timestamp: number;
}

/**
 * Active user entry with heartbeat for stale user detection
 */
export interface IActiveUser {
    userInfo: IUserInfo;

    /** Last heartbeat timestamp (Date.now()) */
    lastSeen: number;
}

/**
 * The shared session document stored in Extension Data Service.
 * Acts as a message bus for all participants in an online session.
 */
export interface ISessionDocument {
    /** Session ID (also used as the document ID) */
    id: string;

    /** Active users with heartbeat timestamps */
    activeUsers: IActiveUser[];

    /** Bounded action log (most recent actions) */
    actions: IChannelAction[];

    /** Next sequence number to assign */
    nextSeq: number;

    /** Optimistic concurrency tag */
    __etag?: string;
}

/** Maximum number of actions to keep in the log */
export const MAX_ACTION_LOG_SIZE = 100;

/** Timeout in milliseconds after which a user is considered stale */
export const STALE_USER_TIMEOUT_MS = 30000;

/** Polling interval in milliseconds */
export const POLLING_INTERVAL_MS = 2000;

/** Heartbeat interval in milliseconds */
export const HEARTBEAT_INTERVAL_MS = 10000;
