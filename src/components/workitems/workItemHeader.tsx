
import * as React from "react";
import { IWorkItemFormNavigationService} from "azure-devops-extension-api/WorkItemTracking";
import * as DevOps from "azure-devops-extension-sdk";
import { IWorkItem } from "../../model/workitem";
import { WorkItemTypeIcon } from "./typeIcon";
import { Icon } from "azure-devops-ui/Icon";
import "./workItemHeader.scss";
import { ILocationService } from "azure-devops-extension-api";



export interface IWorkItemHeaderProps {
    workItem: IWorkItem;
    estimateDisplay?: string;
}
export const WorkItemHeader: React.FC<IWorkItemHeaderProps> =  (props) => {

    const { workItem: { id, project, title, workItemType, icon, color }, estimateDisplay } = props;
    const [currentUrl ,setCurrentUrl] = React.useState<string>("#")
    
   React.useEffect(() => {
    getBaseURl()
     },[])

   
    const openWi = async (ev: any) => {
      
        if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey) {
            ev.preventDefault();
            const service = await DevOps.getService<IWorkItemFormNavigationService>("ms.vss-work-web.work-item-form-navigation-service");
            service.openWorkItem(id);
        }}


        
 const getBaseURl = async () => {
    const locationService = await DevOps.getService<ILocationService>("ms.vss-features.location-service");
    setCurrentUrl(await locationService.getServiceLocation())
};

let currentCustomUrl = `${currentUrl}/${project}/_workitems/edit/${id}/`
   return (
      <div className="work-item-header">
          <div className="work-item-header--header">
              <a
                  className="work-item-header--info"
                  href={currentCustomUrl ? currentCustomUrl : "#"}
                  target="_blank"
                  title={`Open ${workItemType} ${id} in Azure DevOps`}>
                  <div onClick={(ev) => openWi(ev)}>
                      <WorkItemTypeIcon icon={icon} color={color} />
                      {workItemType} {id}
                      <Icon className="work-item-header--link-icon" iconName="OpenInNewWindow" />
                  </div>
              </a>
              <div className="work-item-header--title">{title}</div>
          </div>
          {estimateDisplay !== undefined && (
              <div className="work-item-header--estimate-badge">
                  <div className="estimate-badge--label">Estimate</div>
                  <div className="estimate-badge--value">{estimateDisplay}</div>
              </div>
          )}
      </div>
  )
}

