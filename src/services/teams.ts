import { CoreRestClient, TeamContext } from "azure-devops-extension-api/Core";
import { WorkRestClient } from "azure-devops-extension-api/Work";
import { getClient, IProjectPageService } from "azure-devops-extension-api";
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
        const client = getClient(CoreRestClient);
         const LIMIT = 5000;
        let skip = 0
        const gettingAllTeams = async () =>{
            const allData : any = []
            for (let i = 0; i < LIMIT; i++) {
             const teams = await client.getTeams(projectId, false, 1000, skip);
              allData.push(teams)
              skip += 1000
              if( skip === LIMIT || !teams.length)  
              return allData.flat()
            }
        }
        const data = await gettingAllTeams()
         const allTeams = data.map(({ id, name }:ITeam) => ({
            id,
            name
        }));
        allTeams.sort((a :any, b:any) => a.name.localeCompare(b.name));
        console.log(allTeams)
        return allTeams;
    }


  public async getIterationsForTeam(teamId: string): Promise<IIteration[]> {
        const projectService: IProjectPageService = await DevOps.getService<
            IProjectPageService
        >("ms.vss-tfs-web.tfs-page-data-service");
        const project = await projectService.getProject();
        if (!project) {
            throw new Error("Project is required");
        }

        const client = getClient(WorkRestClient);
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
