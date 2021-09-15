import { ILocationService } from "azure-devops-extension-api";
import { IWorkItemFormNavigationService } from "azure-devops-extension-api/WorkItemTracking";
import * as DevOps from "azure-devops-extension-sdk";
import * as React from "react";
import { IWorkItem } from "../../model/workitem";
import { WorkItemTypeIcon } from "./typeIcon";
import "./workItemHeader.scss";

export interface IWorkItemHeaderProps {
    workItem: IWorkItem;
}

export class WorkItemHeader extends React.Component<IWorkItemHeaderProps> {
    private workItemUrl = "#";

    async componentDidMount() {
        const locationService = await DevOps.getService<ILocationService>("ms.vss-features.location-service");
        this.workItemUrl = await locationService.routeUrl(
            "ms.vss-work-web.work-items-form-route-with-id",
            { project: this.props.workItem.project, id: this.props.workItem.id.toString() });
    }

    render(): JSX.Element {
        const {
            workItem: { id, project, title, workItemType, icon, color }
        } = this.props;

        return (
            <div className="work-item-header">
                <div className="work-item-header--header">
                    <a
                        className="work-item-header--info"
                        href={this.workItemUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={async ev => {
                            if (
                                !ev.ctrlKey &&
                                !ev.metaKey &&
                                !ev.altKey &&
                                !ev.shiftKey
                            ) {
                                ev.preventDefault();

                                const service = await DevOps.getService<
                                    IWorkItemFormNavigationService
                                >(
                                    "ms.vss-work-web.work-item-form-navigation-service"
                                );
                                service.openWorkItem(id);
                            }
                        }}
                    >
                        <WorkItemTypeIcon icon={icon} color={color} />
                        {workItemType} {id}
                    </a>
                    <div className="work-item-header--title">{title}</div>
                </div>
            </div>
        );
    }
}
