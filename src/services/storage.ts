import * as AzureDevOpsAPI from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import {
    getAccessToken,
    getExtensionContext,
    getService
} from "azure-devops-extension-sdk";

export async function getStorageManager(): Promise<AzureDevOpsAPI.IExtensionDataManager> {
    await DevOps.ready();
    const context = getExtensionContext();
    const extensionDataService = await getService<AzureDevOpsAPI.IExtensionDataService>(
        "ms.vss-features.extension-data-service"
    );
    const accessToken = await getAccessToken();
    return extensionDataService.getExtensionDataManager(
        context.id,
        accessToken
    );
}
