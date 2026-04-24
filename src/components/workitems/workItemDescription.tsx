import "./workItemDescription.scss";
import * as React from "react";
import * as DevOps from "azure-devops-extension-sdk";
import { ILocationService } from "azure-devops-extension-api";
import { IWorkItem } from "../../model/workitem";
import { SubTitle } from "../subtitle";
import { marked } from "marked";

/**
 * If the content contains HTML tags treat it as HTML (standard ADO description),
 * otherwise parse it as markdown.
 */
function renderContent(content: string): string {
    if (!content) {
        return content;
    }
    if (/<[a-z][\s\S]*>/i.test(content)) {
        return content; // already HTML
    }
    return marked.parse(content) as string;
}

/**
 * Rewrites relative src/href paths (e.g. /_apis/...) to absolute using the
 * ADO base URL. This handles cases where the API returns relative URLs.
 */
function rewriteRelativeUrls(html: string, baseUrl: string): string {
    if (!html || !baseUrl) {
        return html;
    }
    const base = baseUrl.replace(/\/$/, "");
    return html.replace(/(src|href)="(\/[^/][^"]*)"/gi, (_, attr, path) => {
        return `${attr}="${base}${path}"`;
    });
}

/**
 * Extracts all image src URLs from an HTML string.
 */
function extractImageUrls(html: string): string[] {
    const matches = html.matchAll(/src="([^"]+)"/gi);
    return Array.from(matches, m => m[1]).filter(
        src => src.startsWith("http://") || src.startsWith("https://")
    );
}

/**
 * Fetches each image URL using an ADO bearer token and replaces the src
 * attributes with local blob: URLs so they load correctly inside the
 * cross-origin extension iframe.
 */
async function resolveAuthenticatedImages(
    html: string,
    token: string
): Promise<{ html: string; blobUrls: string[] }> {
    const imageUrls = extractImageUrls(html);
    const blobUrls: string[] = [];

    if (imageUrls.length === 0) {
        return { html, blobUrls };
    }

    const replacements = await Promise.all(
        imageUrls.map(async url => {
            try {
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) {
                    return { url, blobUrl: null };
                }
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                blobUrls.push(blobUrl);
                return { url, blobUrl };
            } catch {
                return { url, blobUrl: null };
            }
        })
    );

    let resolved = html;
    for (const { url, blobUrl } of replacements) {
        if (blobUrl) {
            // Escape special regex characters in the original URL
            const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            resolved = resolved.replace(new RegExp(escaped, "g"), blobUrl);
        }
    }

    return { html: resolved, blobUrls };
}

export const WorkItemDescription: React.FC<{
    workItem: IWorkItem;
}> = props => {
    const [description, setDescription] = React.useState<string>(
        props.workItem.description || ""
    );
    const [acceptanceCriteria, setAcceptanceCriteria] = React.useState<string>(
        props.workItem.AcceptanceCriteria || ""
    );

    React.useEffect(() => {
        let cancelled = false;
        const localBlobUrls: string[] = [];

        async function load() {
            const [locationSvc, token] = await Promise.all([
                DevOps.getService<ILocationService>(
                    "ms.vss-features.location-service"
                ),
                DevOps.getAccessToken()
            ]);

            const baseUrl = (await locationSvc.getServiceLocation()).replace(
                /\/$/,
                ""
            );

            let desc = renderContent(rewriteRelativeUrls(
                props.workItem.description || "",
                baseUrl
            ));
            let ac = renderContent(rewriteRelativeUrls(
                props.workItem.AcceptanceCriteria || "",
                baseUrl
            ));

            const [descResult, acResult] = await Promise.all([
                resolveAuthenticatedImages(desc, token),
                resolveAuthenticatedImages(ac, token)
            ]);

            localBlobUrls.push(...descResult.blobUrls, ...acResult.blobUrls);

            if (!cancelled) {
                setDescription(descResult.html);
                setAcceptanceCriteria(acResult.html);
            }
        }

        load();

        return () => {
            cancelled = true;
            // Revoke blob URLs to free memory
            localBlobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [props.workItem.id]);

    const hasDescription = description && description.trim().length > 0;

    return (
        <>
            <div className="work-item">
                {hasDescription ? (
                    <div
                        className="html-content"
                        dangerouslySetInnerHTML={{ __html: description }}
                    />
                ) : (
                    <span className="no-description">No description</span>
                )}
            </div>

            {acceptanceCriteria &&
            acceptanceCriteria.replaceAll("</?(?!br)([^>]+)>", "$1").length >
                0 ? (
                <>
                    <div className="sub-header-warapper">
                        <SubTitle>Acceptance criteria</SubTitle>
                    </div>
                    <div className="work-item-description-bottom">
                        <div
                            className="html-content"
                            dangerouslySetInnerHTML={{
                                __html: acceptanceCriteria
                            }}
                        />
                    </div>
                </>
            ) : null}
        </>
    );
};

