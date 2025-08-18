import * as AzureDevOpsAPI from "azure-devops-extension-api";
import * as WorkClient from "azure-devops-extension-api/Work/WorkClient";
import { IService } from "./services";
import { IIteration } from "./teams";

export interface ISprintService extends IService {
    getWorkItems(
        projectId: string,
        teamId: string,
        iterationId: string
    ): Promise<number[]>;

    getIterations(
        projectId: string,
        iterations: [string, string][]
    ): Promise<IIteration[]>;
}

export const SprintServiceId = "SprintService";

export class SprintService implements ISprintService {
    async getIterations(
        projectId: string,
        iterations: [string, string][]
    ): Promise<IIteration[]> {
        const client = AzureDevOpsAPI.getClient(WorkClient.WorkRestClient);

        const result = await Promise.all(
            iterations.map(([teamId, iterationId]) =>
                client
                    .getTeamIteration(
                        {
                            project: "",
                            projectId,
                            team: "",
                            teamId
                        },
                        iterationId
                    )
                    .then(
                        x =>
                            ({
                                id: x.id,
                                name: x.name
                            } as IIteration)
                    )
                    .catch(() => null)
            )
        );

        return result.filter(x => x !== null) as IIteration[];
    }

    async getWorkItems(
        projectId: string,
        teamId: string,
        iterationId: string
    ): Promise<number[]> {
        const teamContext = {
            project: "",
            projectId,
            team: "",
            teamId
        };

        // Get ownership for team
        const client = AzureDevOpsAPI.getClient(WorkClient.WorkRestClient);
        const iterationWorkItems = await client.getIterationWorkItems(
            teamContext,
            iterationId
        );

        return iterationWorkItems.workItemRelations.map(x => x.target.id);
    }
}
