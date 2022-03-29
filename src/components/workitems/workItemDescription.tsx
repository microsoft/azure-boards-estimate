import "./workItemDescription.scss";
import * as React from "react";
import { IWorkItem } from "../../model/workitem";
import { SubTitle } from "../subtitle";
import { withRouter } from "react-router-dom";

export const WorkItemDescription: React.StatelessComponent<{
    workItem: IWorkItem;
}> = props => (
    <>


        <div className="sub-header-warapper">
            <SubTitle>Description</SubTitle>
        </div>

        <div className="work-item">
            <div
                className="html-content"
                dangerouslySetInnerHTML={{
                    __html: props.workItem.description
                }}
            />
        </div>
        <div className="sub-header-warapper"> <SubTitle> Acceptance criteria</SubTitle></div>
         <div className="work-item">
            <div
                className="html-content"
                dangerouslySetInnerHTML={{
                    __html: props.workItem.AcceptanceCriteria
                }}
            />
        </div>
    </>
);
