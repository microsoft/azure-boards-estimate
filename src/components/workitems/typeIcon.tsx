import * as AzureDevOpsAPI from "azure-devops-extension-api";
import {
    WorkItemIcon
} from "azure-devops-extension-api/WorkItemTracking";
import * as WorkItemTrackingClient from "azure-devops-extension-api/WorkItemTracking/WorkItemTrackingClient";

import * as React from "react";
import "./typeIcon.scss";

export interface IWorkItemTypeIconProps {
    icon?: string;
    color?: string;
}

export interface IWorkItemTypeIconState {
    icon?: WorkItemIcon;
}

export class WorkItemTypeIcon extends React.Component<
    IWorkItemTypeIconProps,
    IWorkItemTypeIconState
> {

    state:IWorkItemTypeIconState = {icon: undefined}
    async componentDidMount() {
        const { icon, color } = this.props;

        if (!icon || !color) {
            return;
        }

        const client = AzureDevOpsAPI.getClient(WorkItemTrackingClient.WorkItemTrackingRestClient);
        const allIcons = await client.getWorkItemIcons();
        const iconJson = allIcons.find(i => i.id == icon);

        this.setState({
            icon: iconJson
        });
    }

    render(): JSX.Element | null {
        const { color } = this.props;
        const { icon } = this.state;

        if (!icon || !color) {
            return null;
        }

        return (
            <img
                className="work-item-type-icon"
                alt={`${icon.id} icon`}
                src={`${icon.url}&color=${color}`}
            />
        );
    }
}
