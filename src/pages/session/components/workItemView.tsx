import { Button } from "azure-devops-ui/Button";
import { Icon } from "azure-devops-ui/Icon";
import * as React from "react";
import { connect } from "react-redux";
import { Card } from "../../../components/cards/card";
import { SubTitle } from "../../../components/subtitle";
import { Votes } from "../../../components/votes";
import { WorkItemDescription } from "../../../components/workitems/workItemDescription";
import { WorkItemHeader } from "../../../components/workitems/workItemHeader";
import { ICard, ICardSet, CardSetType } from "../../../model/cards";
import { IEstimate } from "../../../model/estimate";
import { IIdentity } from "../../../model/identity";
import { IWorkItem } from "../../../model/workitem";
import { IState } from "../../../reducer";
import { commitEstimate, estimate, reveal } from "../sessionActions";
import { CustomEstimate } from "./customEstimate";
import "./workItemView.scss";
import { canPerformAdminActions } from "../selector";
import { IUserInfo } from "../../../model/user";
import { ItemsObserver } from "azure-devops-ui/Observer";

interface IWorkItemProps {
    identity: IIdentity;
    selectedWorkItem: IWorkItem;
    cardSet: ICardSet;

    /** User's selection */
    selectedCardId: string | null;
    estimates: IEstimate[];

    revealed: boolean;
    canReveal: boolean;
    showAverage: boolean;
    canPerformAdminActions: boolean;
    users: IUserInfo[]

}

const Actions = {
    estimate,
    reveal,
    commitEstimate

};

class WorkItemView extends React.Component<IWorkItemProps & typeof Actions, { votingCollapsed: boolean; descriptionCollapsed: boolean; descriptionFullscreen: boolean }> {
    constructor(props: IWorkItemProps & typeof Actions) {
        super(props);
        this.state = { votingCollapsed: false, descriptionCollapsed: false, descriptionFullscreen: false };
    }

    render() {
        const {
            canPerformAdminActions,
            cardSet,
            selectedWorkItem,
            selectedCardId,
            estimates,
            canReveal,
            revealed,
            showAverage,
            users

        } = this.props;




        const checkIfIsEqual = () => {
            if (revealed && estimates && estimates.every((val, i, arr) => val.cardIdentifier === arr[0].cardIdentifier)) {
              return estimates[0].cardIdentifier;
            }
          };
          
          const invalidIdentifiers = ["?", "∞", "☕"];
          const validEstimates = (estimates || []).filter(e => e.cardIdentifier && !invalidIdentifiers.includes(e.cardIdentifier));
          
          const sum = validEstimates.reduce((sum, e) => {
            const card = cardSet.cards.find(x => x.identifier === e.cardIdentifier);
            if (card && card.value !== null) {
              sum += Number(card.value);
            }
            return sum;
          }, 0);

      const average = sum / (validEstimates.length || 1 );


      

        return (
            <div className="work-item-view-container flex-column flex-grow">

                {/* ── Voting section ── */}
                <div className="estimate-section">
                    <div
                        className="estimate-section--header"
                        role="button"
                        tabIndex={0}
                        title={this.state.votingCollapsed ? "Expand voting" : "Collapse voting"}
                        onClick={() => this.setState(s => ({ votingCollapsed: !s.votingCollapsed }))}
                        onKeyDown={e => e.key === "Enter" && this.setState(s => ({ votingCollapsed: !s.votingCollapsed }))}
                    >
                        <span className="estimate-section--title">Voting</span>
                        <div className="estimate-section--icon">
                            <Icon iconName={this.state.votingCollapsed ? "ChevronDown" : "ChevronUp"} />
                        </div>
                    </div>
                    <div className="estimate-section--separator" />

                    <WorkItemHeader
                        workItem={selectedWorkItem}
                        estimateDisplay={(() => {
                            const est = selectedWorkItem.estimate;
                            if (est == null) return "-";
                            const card = cardSet.cards.find(c => c.value == est);
                            return card ? card.identifier : `${est}`;
                        })()}
                    />

                    {!this.state.votingCollapsed && (
                        <div className="card-sub-container">
                            <SubTitle>Your vote </SubTitle>
                            <div className="card-container">
                                {cardSet &&
                                    cardSet.cards.map(card =>
                                        <div className="votes-container">
                                            {this.renderCard(
                                                card,
                                                revealed,
                                                card.identifier === selectedCardId,
                                                this.doEstimate.bind(this, card)
                                            )}
                                        </div>
                                    )}
                            </div>

                            <SubTitle>All votes   {estimates ? estimates.length : 0}/{users.length}</SubTitle>
                            <Votes
                                cardSet={cardSet}
                                estimates={estimates || []}
                                revealed={revealed}
                            />

                            {canPerformAdminActions && (
                                <>
                                    <SubTitle>Actions</SubTitle>
                                    {canReveal && (
                                        <div>
                                            <Button
                                                primary
                                                onClick={this.doReveal}
                                            >
                                                Reveal
                                            </Button>
                                        </div>
                                    )}
                                    {revealed && (
                                        <>
                                            <div>
                                                These were the cards selected,
                                                choose one to commit the value
                                                to the work item:
                                            </div>
                                            <div >
                                                {(estimates || []).map(e => {
                                                    const card = cardSet.cards.find(
                                                        x =>
                                                            x.identifier ===
                                                            e.cardIdentifier
                                                    )!;
                                                    return this.renderCard(
                                                        card,
                                                        false,
                                                        false,
                                                        (canPerformAdminActions &&
                                                            this.doCommitCard.bind(
                                                                this,
                                                                card
                                                            )) ||
                                                        undefined
                                                    );
                                                })}
                                            </div>
                                            {showAverage && (
                                                <>
                                                  <SubTitle>Average</SubTitle>
                                                    <div className="flex-column flex-self-start">
                                                   { average}
                                                    </div>
                                                </>
                                            )}
                                            <div>Or enter a custom value:</div>
                                            <CustomEstimate
                                                checkIfIsEqual={checkIfIsEqual}
                                                commitEstimate={
                                                    this.doCommitValue
                                                }
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Description section ── */}
                <div className={`estimate-section flex-column${this.state.descriptionFullscreen ? " estimate-section--fullscreen" : (!this.state.descriptionCollapsed ? " flex-grow" : "")}`}>
                    <div
                        className="estimate-section--header"
                        role="button"
                        tabIndex={0}
                        title={this.state.descriptionCollapsed ? "Expand description" : "Collapse description"}
                        onClick={() => !this.state.descriptionFullscreen && this.setState(s => ({ descriptionCollapsed: !s.descriptionCollapsed }))}
                        onKeyDown={e => e.key === "Enter" && !this.state.descriptionFullscreen && this.setState(s => ({ descriptionCollapsed: !s.descriptionCollapsed }))}
                    >
                        <span className="estimate-section--title">Description</span>
                        <div className="estimate-section--actions">
                            <div
                                className="estimate-section--icon"
                                role="button"
                                tabIndex={0}
                                title={this.state.descriptionFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
                                onClick={e => { e.stopPropagation(); this.setState(s => ({ descriptionFullscreen: !s.descriptionFullscreen })); }}
                                onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); this.setState(s => ({ descriptionFullscreen: !s.descriptionFullscreen })); } }}
                            >
                                <Icon iconName={this.state.descriptionFullscreen ? "BackToWindow" : "FullScreen"} />
                            </div>
                            {!this.state.descriptionFullscreen && (
                                <div className="estimate-section--icon">
                                    <Icon iconName={this.state.descriptionCollapsed ? "ChevronDown" : "ChevronUp"} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="estimate-section--separator" />

                    {(!this.state.descriptionCollapsed || this.state.descriptionFullscreen) && (
                        <div className="estimate-section--content custom-scrollbar">
                            <WorkItemDescription workItem={selectedWorkItem} />
                        </div>
                    )}
                </div>

            </div>
        );
    }

    private doCommitValue = (value: string | null ) => {
        const { commitEstimate } = this.props;
        commitEstimate(value);
    };

    private renderCard = (
        card: ICard,
        disabled?: boolean,
        selected?: boolean,
        onClick?: () => void
    ): JSX.Element => {
        return (
            <Card
                key={card.identifier}
                front={{
                    label: card.identifier
                }}
                flipped={false}
                onClick={onClick}
                disabled={disabled}
                selected={selected}
            />
        );
    };

    private doReveal = () => {
        this.props.reveal();
    };

    private doEstimate = (card: ICard): void => {
        const {
            estimate,
            identity,
            selectedWorkItem,
            selectedCardId
        } = this.props;

        if (card.identifier === selectedCardId) {
            // Cancel vote
            estimate({
                identity,
                workItemId: selectedWorkItem.id,
                cardIdentifier: null
            });
        } else {
            estimate({
                identity,
                workItemId: selectedWorkItem.id,
                cardIdentifier: card.identifier
            });
        }
    };

    private doCommitCard = (card: ICard): void => {
        const { commitEstimate } = this.props;
        commitEstimate(card.value);
    };
}

export default connect(
    (state: IState) => {
        const { session } = state;

        const estimates = session.estimates[session.selectedWorkItem!.id];

        const admin = canPerformAdminActions(state);

        return {
            identity: state.init.currentIdentity!,
            cardSet: session.cardSet!,
            selectedWorkItem: session.selectedWorkItem!,
            estimates,
            revealed: session.revealed,
            showAverage: session.cardSet!.type === CardSetType.Numeric,
            canReveal:
                admin && !session.revealed && estimates && estimates.length > 0,
            selectedCardId:
                state.session.ownEstimate &&
                state.session.ownEstimate.cardIdentifier,
            canPerformAdminActions: admin
        };
    },
    Actions
)(WorkItemView);
