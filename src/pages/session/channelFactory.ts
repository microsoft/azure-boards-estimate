import { SessionMode } from "../../model/session";
import { IChannel } from "../../services/channels/channels";
import { OfflineChannel } from "../../services/channels/offline";
import { PollingChannel } from "../../services/channels/polling";

export async function getChannel(
    sessionId: string,
    mode: SessionMode
): Promise<IChannel> {
    switch (mode) {
        case SessionMode.Online:
            return new PollingChannel();

        case SessionMode.Offline:
            return new OfflineChannel();

        default:
            throw new Error("Unexpected mode");
    }
}
