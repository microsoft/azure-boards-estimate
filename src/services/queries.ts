import * as AzureDevOpsAPI from "azure-devops-extension-api";
import * as WorkItemTrackingClient from "azure-devops-extension-api/WorkItemTracking/WorkItemTrackingClient";
import * as WorkItemTrackingModule from "azure-devops-extension-api/WorkItemTracking/WorkItemTracking";
import { IService } from "./services";
import { IQuery } from "../model/query";

export interface IQueriesService extends IService {
    getQueries(projectId: string, queryIds: string[]): Promise<IQuery[]>;

    runQuery(projectId: string, queryId: string): Promise<number[]>;
}

export const QueriesServiceId = "QueriesService";

export class QueriesService implements IQueriesService {
    async getQueries(projectId: string, queryIds: string[]): Promise<IQuery[]> {
        const client = AzureDevOpsAPI.getClient(WorkItemTrackingClient.WorkItemTrackingRestClient);
        const queries = await client.getQueriesBatch(
            {
                ids: queryIds,
                errorPolicy: (WorkItemTrackingModule as any).QueryErrorPolicy.Omit,
                $expand: (WorkItemTrackingModule as any).QueryExpand.Minimal
            },
            projectId
        );

        return queries.map(q => ({
            id: q.id,
            name: q.name
        }));
    }

    async runQuery(projectId: string, queryId: string): Promise<number[]> {
        const client = AzureDevOpsAPI.getClient(WorkItemTrackingClient.WorkItemTrackingRestClient);
        const result = await client.queryById(queryId, projectId);

        if (result.workItems) {
            return result.workItems.map(x => x.id);
        } else if (result.workItemRelations) {
            return result.workItemRelations.map(x => x.target.id);
        }

        return [];
    }
}
