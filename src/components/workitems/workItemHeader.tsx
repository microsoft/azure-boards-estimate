
import * as React from "react";
import { IWorkItemFormNavigationService, WorkItemQueryResult, WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import * as DevOps from "azure-devops-extension-sdk";
import { IWorkItem } from "../../model/workitem";
import { WorkItemTypeIcon } from "./typeIcon";
import "./workItemHeader.scss";
import { getClient } from "azure-devops-extension-api";



export interface IWorkItemHeaderProps {
    workItem: IWorkItem;

}
export const WorkItemHeader: React.FC<IWorkItemHeaderProps> =  (props) => {

    const { workItem: { id, project, title, workItemType, icon, color, } } = props;
    const [currentHostName, setCurrentHostName] = React.useState<string>("#")

     const getCurrentHost =  () => {
        const locationService = DevOps.getHost()
        setCurrentHostName(locationService.name)
    }

    React.useEffect(() => {
        getCurrentHost()
    }, [])

   
    const openWi = async (ev: any) => {
        if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey) {
            ev.preventDefault();
            const service = await DevOps.getService<IWorkItemFormNavigationService>("ms.vss-work-web.work-item-form-navigation-service");
            service.openWorkItem(id);
       
         
        }
    }




    let currentCustomUrl = `https://dev.azure.com/${currentHostName}/${project}/_workitems/edit/${id}/`

     return (
        <div>
            <div className="work-item-header">
                <div className="work-item-header--header">
                    <a
                        className="work-item-header--info"
                        href={currentCustomUrl ? currentCustomUrl : "#"}
                        target="_blank"

                    >
                        <div onClick={(ev) => openWi(ev)}>
                            <WorkItemTypeIcon icon={icon} color={color} />
                            {workItemType} {id}
                        </div>
                    </a>
                    <div className="work-item-header--title">{title}</div>
                </div>
            </div>
        </div>
    )
}


// export const workItemLinksQuery = (
//     workItemId: number,
//     linkType: string
//   ) => `SELECT [System.Id]
//           FROM WorkItemLinks
//           WHERE ([Source].[System.Id] = ${workItemId}) AND
//           ([System.Links.LinkType] = '${linkType}') AND
//           ([Target].[System.State] <> 'Removed')
//           MODE (MustContain)`;
  
//           export async function wiqlQuery(
//             query: string,
//             projectName: string
//           ): Promise<WorkItemQueryResult> {
//             return getClient(WorkItemTrackingRestClient).queryByWiql(
//               { query },
//               projectName
//             );
//           }
          
          
//           export const getWorkItemLinks = async (
//             workItemId: number,
//             projectName: string,
//             linkType: string
//           ) => {
//             const query = workItemLinksQuery(workItemId, linkType);
//             const queryResponse = await wiqlQuery(query, projectName);
          
//             return queryResponse.workItemRelations
//               .map((w) => w.target.id)
//               .filter((w) => w !== workItemId);
//           };