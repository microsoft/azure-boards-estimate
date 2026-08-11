import * as DevOps from "azure-devops-extension-sdk";

export interface IAvatarIdentity {
    descriptor?: string;
    imageUrl?: string;
    avatarHref?: string;
}

const graphAvatarCache: { [descriptor: string]: string } = {};
const inFlightGraphAvatarRequests: {
    [descriptor: string]: Promise<string | undefined> | undefined;
} = {};

const graphApiVersions = ["7.1", "6.0", "5.1"];

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

function toDataUrlFromBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
                return;
            }
            reject(new Error("Could not read avatar blob"));
        };
        reader.onerror = () => reject(new Error("Could not read avatar blob"));
        reader.readAsDataURL(blob);
    });
}

function getOrganizationName(): string | undefined {
    const host = DevOps.getHost() as any;
    return host && host.name ? host.name : undefined;
}

function getHostBaseUrl(): string | undefined {
    const host = DevOps.getHost() as any;
    if (host && typeof host.uri === "string" && host.uri.length > 0) {
        return trimTrailingSlash(host.uri);
    }

    return undefined;
}

export function resolveIdentityDescriptor(identity: IAvatarIdentity):
    | string
    | undefined {
    if (identity.descriptor) {
        return identity.descriptor;
    }

    const avatarUrl = identity.avatarHref || identity.imageUrl;
    if (!avatarUrl) {
        return undefined;
    }

    const match = /MemberAvatars\/([^\/\?]+)/i.exec(avatarUrl);
    return match && match[1] ? decodeURIComponent(match[1]) : undefined;
}

export function resolveSizedImageUrl(
    imageUrl: string | undefined,
    size: number
): string | undefined {
    if (!imageUrl) {
        return undefined;
    }

    return imageUrl.indexOf("{0}") !== -1
        ? imageUrl.replace("{0}", String(size))
        : imageUrl;
}

async function fetchGraphAvatar(
    url: string,
    accessToken: string
): Promise<string | undefined> {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json, image/*"
        }
    });

    if (!response.ok) {
        return undefined;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (data && typeof data.value === "string") {
            return `data:image/png;base64,${data.value}`;
        }
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
        return undefined;
    }

    return toDataUrlFromBlob(blob);
}

function buildGraphAvatarUrls(
    descriptor: string,
    organization: string | undefined,
    hostBaseUrl: string | undefined,
    avatarHref: string | undefined
): string[] {
    const urls: string[] = [];
    const encodedDescriptor = encodeURIComponent(descriptor);

    if (organization) {
        for (const apiVersion of graphApiVersions) {
            urls.push(
                `https://vssps.dev.azure.com/${encodeURIComponent(
                    organization
                )}/_apis/graph/Subjects/${encodedDescriptor}/avatars?api-version=${encodeURIComponent(
                    apiVersion
                )}`
            );
        }
    }

    if (hostBaseUrl) {
        for (const apiVersion of graphApiVersions) {
            urls.push(
                `${hostBaseUrl}/_apis/graph/Subjects/${encodedDescriptor}/avatars?api-version=${encodeURIComponent(
                    apiVersion
                )}`
            );
        }
    }

    if (avatarHref) {
        urls.push(avatarHref);
    }

    return Array.from(new Set(urls));
}

export async function getGraphAvatarDataUrl(
    identity: IAvatarIdentity
): Promise<string | undefined> {
    const descriptor = resolveIdentityDescriptor(identity);
    if (!descriptor) {
        return undefined;
    }

    if (graphAvatarCache[descriptor]) {
        return graphAvatarCache[descriptor];
    }

    if (inFlightGraphAvatarRequests[descriptor]) {
        return inFlightGraphAvatarRequests[descriptor];
    }

    const organization = getOrganizationName();
    const hostBaseUrl = getHostBaseUrl();
    const avatarUrls = buildGraphAvatarUrls(
        descriptor,
        organization,
        hostBaseUrl,
        identity.avatarHref
    );

    if (avatarUrls.length === 0) {
        return undefined;
    }

    inFlightGraphAvatarRequests[descriptor] = (async () => {
        try {
            const accessToken = await DevOps.getAccessToken();
            for (const url of avatarUrls) {
                const dataUrl = await fetchGraphAvatar(url, accessToken);
                if (dataUrl) {
                    graphAvatarCache[descriptor] = dataUrl;
                    return dataUrl;
                }
            }

            return undefined;
        } catch {
            return undefined;
        } finally {
            delete inFlightGraphAvatarRequests[descriptor];
        }
    })();

    return inFlightGraphAvatarRequests[descriptor];
}
