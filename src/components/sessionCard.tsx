import { History } from "history";
import * as React from "react";
import { makeUrlSafe } from "../lib/urlSafe";
import { ISessionDisplay, ISessionInfo } from "../model/session";
import { CardIcon } from "./cardIcon";
import "./sessionCard.scss";
import { Link } from "azure-devops-ui/Link";
import { MoreButton } from "azure-devops-ui/Menu";
import { Dialog } from "azure-devops-ui/Dialog";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";

const CardTitle: React.StatelessComponent = props => (
    <h2 className="session-card--title flex-grow" {...props} />
);

const CardMode: React.StatelessComponent = props => (
    <div className="session-card--mode">{props.children}</div>
);

const CardInfo: React.StatelessComponent<{
    sessionInfo: ISessionInfo[];
}> = props => (
    <div className="session-card--info">
        {props.sessionInfo.map(info => (
            <dl key={info.label}>
                <dt>{info.label}</dt>
                <dd>{info.value}</dd>
            </dl>
        ))}
    </div>
);

export interface ICardProps {
    history: History;
    session: ISessionDisplay;
    hideContextMenu?: boolean;

    onEndSession: (id: string) => void;
}

export class SessionCard extends React.Component<ICardProps> {
    private isEndSessionDialogOpen = new ObservableValue<boolean>(false);

    render(): JSX.Element {
        const {
            hideContextMenu,
            session: {
                session: { id, mode, name, source, sourceData },
                sessionInfo
            },
            onEndSession
        } = this.props;

        const onDismiss = () => {
            this.isEndSessionDialogOpen.value = false;
        };

        const onDismissAndEndSession = () => {
            onDismiss();
            onEndSession(id);
        }

        return (
            <div className="session-card">
                <div className="session-card--content">
                    <div className="flex-row">
                        <CardTitle>
                            <Link
                                href={`/session/${id}/${makeUrlSafe(name)}`}
                                onClick={this.navigate}
                            >
                                {name}
                            </Link>
                        </CardTitle>

                        {!hideContextMenu && (
                            <div>
                                <MoreButton
                                    className="session-card--menu"
                                    contextualMenuProps={{
                                        menuProps: {
                                            onActivate: (ev: any) =>
                                                ev.stopPropagation(),
                                            id: "card-more",
                                            items: [
                                                {
                                                    id: "session-end",
                                                    text: "End session",
                                                    onActivate: () => {
                                                        this.isEndSessionDialogOpen.value = true;
                                                        onEndSession(id)
                                                    }
                                                }
                                            ]
                                        }
                                    }}
                                />

                                <Observer isEndSessionDialogOpen={this.isEndSessionDialogOpen}>
                                    {(props: { isEndSessionDialogOpen: boolean }) => {
                                        return props.isEndSessionDialogOpen ? (
                                            <Dialog
                                                titleProps={{ text: "Confirm" }}
                                                footerButtonProps={[
                                                    {
                                                        text: "Cancel",
                                                        onClick: onDismiss,
                                                        primary: true
                                                    },
                                                    {
                                                        text: "End Session",
                                                        onClick: onDismissAndEndSession
                                                    }
                                                ]}
                                                onDismiss={onDismiss}
                                            >
                                                Are you sure that you want to end this Estimate session?
                                                This will end the session for every participant.
                                            </Dialog>
                                        ) : null;
                                    }}
                                </Observer>
                            </div>
                        )}
                    </div>

                    <CardInfo sessionInfo={sessionInfo} />

                    <CardMode>
                        <CardIcon mode={mode} source={source} />
                    </CardMode>
                </div>
            </div>
        );
    }

    private navigate = (e: React.MouseEvent | React.KeyboardEvent) => {
        const {
            history,
            session: {
                session: { id, name }
            }
        } = this.props;

        history.push(`/session/${id}/${makeUrlSafe(name)}`);
        e.preventDefault();
    };
}
