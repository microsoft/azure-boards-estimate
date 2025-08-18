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

const CardTitle: React.FC<{ children: React.ReactNode }> = props => (
    <h2 className="session-card--title flex-grow" {...props} />
);

const CardMode: React.FC<{ children: React.ReactNode }> = props => (
    <div className="session-card--mode">{props.children}</div>
);

const CardInfo: React.FC<{
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
    sessions: ISessionDisplay[];
}

export class SessionCard extends React.Component<ICardProps> {
    private isEndSessionDialogOpen = new ObservableValue<boolean>(false);
    private isRestDialogOpen = new ObservableValue<boolean>(false);

    render(): JSX.Element {
        const {
            hideContextMenu,

            session: {
                session: { id, mode, name, source, sourceData },
                sessionInfo
            },
            onEndSession,
            sessions
        } = this.props;

        const onDismiss = () => {
            this.isEndSessionDialogOpen.value = false;
        };

        const resetExt = () => {
            this.isRestDialogOpen.value = false;
        };

        const onDismissAndEndSession = () => {
            onDismiss();
            onEndSession(id);
        };

        return (
            <div className="session-card">
                <div className="session-card--content">
                    <div className="flex-row">
                        <CardTitle>
                            <button
                                style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={this.navigate}
                            >
                                {name}
                            </button>
                        </CardTitle>

                        {!hideContextMenu && (
                            <div>
                                <MoreButton
                                    className="session-card--menu"
                                    contextualMenuProps={{
                                        menuProps: {
                                            onActivate: (menuItem, ev: any) =>
                                                ev.stopPropagation(),
                                            id: "card-more",
                                            items: [
                                                {
                                                    id: "session-end",
                                                    text: "End session",
                                                    onActivate: () => {
                                                        this.isEndSessionDialogOpen.value = true;
                                                    }
                                                }
                                            ]
                                        }
                                    }}
                                />

                                <Observer
                                    isEndSessionDialogOpen={
                                        this.isEndSessionDialogOpen
                                    }
                                >
                                    {(props: {
                                        isEndSessionDialogOpen: boolean;
                                    }) => {
                                        return props.isEndSessionDialogOpen ? (
                                            <div
                                                style={{
                                                    position: 'fixed',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    background: 'white',
                                                    border: '1px solid #ccc',
                                                    padding: '20px',
                                                    zIndex: 1000
                                                }}
                                            >
                                                <h3>Confirm</h3>
                                                <p>Are you sure that you want to end this Estimate session? This will end the session for every participant.</p>
                                                <button onClick={onDismiss}>Cancel</button>
                                                <button onClick={onDismissAndEndSession}>End Session</button>
                                            </div>
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
