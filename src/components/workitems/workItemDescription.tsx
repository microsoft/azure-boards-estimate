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
        { props.workItem.AcceptanceCriteria  &&  props.workItem.AcceptanceCriteria.replaceAll("</?(?!br)([^>]+)>", "$1").length > 0 ?
            <>
                <div className="sub-header-warapper"> <SubTitle> Acceptance criteria </SubTitle></div>
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

        <div className="sub-header-warapper">
            <SubTitle> Work Item Details </SubTitle>
        </div>
        <div className="work-item-description-bottom">
            <div className="details-row">
                <div className="details-column">
                    <div className="flex-row">
                        {props.workItem.AssignedTo ? (
                            <>
                                <b>Assigned to: </b>
                                <div
                                    className="vss-Persona extra-small-plus persona-spacing"
                                    role="img"
                                >
                                    <img
                                        className="vss-Persona-content using-image"
                                        src={props.workItem.AssignedTo.imageUrl}
                                        alt=""
                                    />
                                </div>
                                <div className="identity-display-name flex-column displayname-spacing">
                                    <span>
                                        {props.workItem.AssignedTo.displayName}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <b>Assigned to: </b>
                                <div className="identity-display-name flex-column">
                                    <span>
                                        <i>Unassigned</i>
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <br /> <b>Tags: </b>
                    {props.workItem.Tags
                        ? props.workItem.Tags.toString()
                              .split(";")
                              .map((tag: string) => (
                                  <span className="tag-pill">{tag.trim()}</span>
                              ))
                        : null}
                </div>
                <div className="details-column">
                    <b>Area Path: </b> {props.workItem.AreaPath}
                </div>
            </div>
        </div>
    </>
);
