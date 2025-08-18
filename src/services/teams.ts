import { TeamContext } from "azure-devops-extension-api/Core";
import * as CoreClient from "azure-devops-extension-api/Core/CoreClient";
import * as WorkClient from "azure-devops-extension-api/Work/WorkClient";
import * as AzureDevOpsAPI from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import { IService } from "./services";


export interface ITeam {
    id: string;
    name: string;
}

export interface IIteration {
    id: string;
    name: string;
   
}




export interface ITeamService extends IService {
    getAllTeams(projectId: string): Promise<ITeam[]>;

    getIterationsForTeam(teamId: string): Promise<IIteration[]>;
}


export const TeamServiceId = "TeamService";

export class TeamService implements ITeamService {
    public async getAllTeams(projectId: string): Promise<ITeam[]> {
        const client = AzureDevOpsAPI.getClient(CoreClient.CoreRestClient);
         let LIMIT = true;
        let skip = 0
        const gettingAllTeams = async () =>{
            const allData : any = []
            while (LIMIT) {
             const teams = await client.getTeams(projectId, false, 1000, skip);
              allData.push(teams)
              skip += 1000
              if(!teams.length)  
              return allData.flat()
             }
        }
        const data = await gettingAllTeams()
        const allTeams = data.map(({ id, name }:ITeam) => ({
            id,
            name
        }));
        allTeams.sort((a :any, b:any) => a.name.localeCompare(b.name));
      return allTeams;
    }


  public async getIterationsForTeam(teamId: string): Promise<IIteration[]> {
        const projectService: AzureDevOpsAPI.IProjectPageService = await DevOps.getService<
            AzureDevOpsAPI.IProjectPageService
        >("ms.vss-tfs-web.tfs-page-data-service");
        const project = await projectService.getProject();
        if (!project) {
            throw new Error("Project is required");
        }

        const client = AzureDevOpsAPI.getClient(WorkClient.WorkRestClient);
        const teamIterations = await client.getTeamIterations({
            projectId: project.id,
            teamId
        } as TeamContext);

        return teamIterations.map(({ id, name }) => ({
            id,
            name
        }));
    }
}
