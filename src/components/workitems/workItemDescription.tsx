import "./workItemDescription.scss";
import * as React from "react";
import { IWorkItem } from "../../model/workitem";
import { SubTitle } from "../subtitle";

export const WorkItemDescription: React.StatelessComponent<{
    workItem: IWorkItem;
}> = props => (
    <>
        <div className="sub-header-warapper">
            <SubTitle>Description</SubTitle>
        </div>

        <div className="work-item-description">
            <div
                className="html-content"
                dangerouslySetInnerHTML={{
                    __html: props.workItem.description
                }}
            />
        </div>
        {props.workItem.AcceptanceCriteria && props.workItem.AcceptanceCriteria.length !== 55 ?
            <>
                <div className="sub-header-warapper"> <SubTitle> Acceptance criteria</SubTitle></div>
                <div className="work-item-description-bottom">
                    <div
                        className="html-content"
                        dangerouslySetInnerHTML={{
                            __html: props.workItem.AcceptanceCriteria
                        }}
                    />
                </div>
            </>

            : null
        }

    </>
);
