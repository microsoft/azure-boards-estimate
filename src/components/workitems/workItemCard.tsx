import { Card } from "azure-devops-ui/Card";
import * as React from "react";
import { css } from "../../lib/css";
import { ICardSet } from "../../model/cards";
import { IWorkItem } from "../../model/workitem";
import { WorkItemTypeIcon } from "./typeIcon";
import "./workItemCard.scss";
import { WorkItemEstimate } from "./workItemEstimate";

export interface IWorkItemCardProps {
    workItem: IWorkItem;

    cardSet: ICardSet;

    selected: boolean;

    onClick?: () => void;
}

export const WorkItemCard: React.SFC<IWorkItemCardProps> = props => {
    const {
        cardSet,
        workItem: { id, title, icon, color, estimate },
        selected,
        onClick
    } = props;

    return (
        <div
            className={css(
                "work-item-card",
                onClick && "clickable",
                selected && "selected"
            )}
            onClick={onClick}
        >
            <Card>


                <div>
                    <div className="card-work-item">
                        <div className="work-item-id-icon">
                            <WorkItemTypeIcon icon={icon} color={color} />
                            <div className="work-item-card--id">{id}</div>
                        </div>

                        <WorkItemEstimate cardSet={cardSet} estimate={estimate} />
                    </div>
                    <div className="work-item-card--title">{title}</div>

                </div>


            </Card>
        </div>
    );
};
