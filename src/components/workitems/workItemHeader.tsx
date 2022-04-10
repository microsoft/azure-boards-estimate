
import * as React from "react";
import { IWorkItemFormNavigationService} from "azure-devops-extension-api/WorkItemTracking";
import * as DevOps from "azure-devops-extension-sdk";
import { IWorkItem } from "../../model/workitem";
import { WorkItemTypeIcon } from "./typeIcon";
import "./workItemHeader.scss";
import { ILocationService } from "azure-devops-extension-api";




export interface IWorkItemHeaderProps {
    workItem: IWorkItem;

}
export const WorkItemHeader: React.FC<IWorkItemHeaderProps> =  (props) => {

    const { workItem: { id, project, title, workItemType, icon, color, } } = props;
    const [currentUrl ,setCurrentUrl] = React.useState<string>("#")
    const [amin , setamin] =  React.useState<any>("#")
    
    
  

    React.useEffect(() => {
        getLocationUrl()
       
    }, [])

   
    const openWi = async (ev: any) => {
      
        if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey) {
            ev.preventDefault();
            const service = await DevOps.getService<IWorkItemFormNavigationService>("ms.vss-work-web.work-item-form-navigation-service");
            service.openWorkItem(id);
        }}


        
 const getLocationUrl = async () => {
    const locationService = await DevOps.getService<ILocationService>("ms.vss-features.location-service");
    setCurrentUrl(await locationService.getServiceLocation())

    return await locationService.getServiceLocation();
  };



    
    
   let currentCustomUrl = `${currentUrl}/${project}/_workitems/edit/${id}/`
   return (
      <div>
          <div className="work-item-header">
              <div className="work-item-header--header">
                  <a
                      className="work-item-header--info"
                      href={currentCustomUrl ? currentCustomUrl : "#"}
                      target="_blank">
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


