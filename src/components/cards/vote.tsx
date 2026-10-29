import "./vote.scss";
import * as React from "react";
import { ICard } from "../../model/cards";
import { IIdentity } from "../../model/identity";
import { Card } from "./card";
import { Avatar } from "../avatar";
import { Tooltip } from "azure-devops-ui/TooltipEx";

export interface IVoteProps {
    identity: IIdentity;

    card: ICard;

    revealed: boolean;
}

export class Vote extends React.Component<IVoteProps> {
    render(): JSX.Element {
        const { identity, card, revealed } = this.props;
     
        return (
            <div className="vote-container">
                <Card
                    className="vote-card"
                    front={{
                        label: "..."
                    }}
                    back={{
                        label: card && card.identifier
                    }}
                    flipped={revealed}
                    disabled={true}
                />

                <Tooltip text={identity.displayName}>
                    <div className="vote-avatar">
                        <Avatar
                            imageUrl={identity.imageUrl}
                            descriptor={identity.descriptor}
                            displayName={identity.displayName}
                        />
                    </div>
                </Tooltip>
            </div>
        );
    }
}
