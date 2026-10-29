import { ILocationService } from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";

// Graph resource area, routes to vssps.dev.azure.com on Service and to the server host on Server 2020+.
const GraphResourceAreaId = "bb1e7ec9-e901-4b68-999a-de7012b920f8";

const cache: { [descriptor: string]: Promise<string | undefined> } = {};

/** Extracts the subject descriptor from ".../_apis/GraphProfile/MemberAvatars/{descriptor}". */
export function descriptorFromImageUrl(
    url: string | undefined
): string | undefined {
    if (!url) {
        return undefined;
    }
    const match = url.match(/MemberAvatars\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

async function fetchAvatar(descriptor: string): Promise<string | undefined> {
    try {
        await DevOps.ready();
        const locationService = await DevOps.getService<ILocationService>(
            "ms.vss-features.location-service"
        );
        const graphBase = await locationService.getResourceAreaLocation(
            GraphResourceAreaId
        );
        if (!graphBase) {
            return undefined;
        }

        const token = await DevOps.getAccessToken();
        // 6.0-preview.1 is the earliest version with this endpoint, so it also works on Server 2020+.
        const response = await fetch(
            `${graphBase}_apis/graph/Subjects/${encodeURIComponent(
                descriptor
            )}/avatars?api-version=6.0-preview.1`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            }
        );
        if (!response.ok) {
            return undefined;
        }

        const data = await response.json();
        return data.value ? `data:image/png;base64,${data.value}` : undefined;
    } catch (e) {
        console.warn("[avatars] Graph avatar API unavailable, falling back", e);
        return undefined;
    }
}

/** Resolves a user's avatar as a data URL, or undefined so callers fall back to the plain image URL. */
export function getAvatarDataUrl(
    descriptor: string | undefined
): Promise<string | undefined> {
    if (!descriptor) {
        return Promise.resolve(undefined);
    }
    if (!(descriptor in cache)) {
        // Share one request between concurrent callers.
        cache[descriptor] = fetchAvatar(descriptor);
    }
    return cache[descriptor];
}
