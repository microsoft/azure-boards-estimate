import { Card } from "azure-devops-ui/Card";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { Header } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Page } from "azure-devops-ui/Page";
import { Tab, TabBar } from "azure-devops-ui/Tabs";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import * as React from "react";
import { connect } from "react-redux";
import CreatePanel from "../../components/create/panel";
import { SessionList } from "../../components/sessionList";
import { ISessionDisplay } from "../../model/session";
import { IState } from "../../reducer";
import { IPageProps } from "../props";
import SettingsPanel from "../settings/settings";
import "./home.scss";
import {
    clearError,
    deleteSession,
    filter,
    loadSessions
} from "./sessionsActions";
import { getDisplaySessions, getLegacySessions } from "./sessionsSelectors";

interface IHomePageParams {
    ids?: string;
}

interface IHomePageProps extends IPageProps<IHomePageParams> {
    sessions: ISessionDisplay[];
    legacySessions: ISessionDisplay[];
    error: string | null;
    history: any;
    match: any;
}

const Actions = {
    onInit: loadSessions,
    filter,
    clearError,
    deleteSession,
};

class HomePage extends React.Component<IHomePageProps & typeof Actions> {
    filter: Filter;
    filterToggled = new ObservableValue<boolean>(false);

    constructor(props: IHomePageProps & typeof Actions) {
        super(props);

        this.filter = new Filter();
        this.filter.subscribe(state => {
            props.filter(state["keyword"] && state["keyword"]!.value);
        });
    }

    componentDidMount() {
        this.props.onInit();
    }

    render(): JSX.Element {
        const {
            clearError,
            error,
            history,
            match,
            sessions,
            legacySessions,
            deleteSession
        } = this.props;


        const a = sessions.map(i=>{  return i.session})

      

    
        return (
            <div className="flex-grow">
                <Header
                    title="Estimate"
                    commandBarItems={[
                        {
                            id: "action-create",
                            isPrimary: true,
                            important: true,
                            text: "Create Session",
                            iconProps: { iconName: "Add" },
                            onActivate: this.create
                        },
                        {
                            id: "end",
                            tooltipProps: { text: "Settings" },
                            iconProps: { iconName: "Settings" },
                            subtle: true,
                            onActivate: this.openSettings
                        }
                    ]}
                />
                <div>
                    <div>Sessions</div>
                </div>

                <div className="page-content page-content-top">
                    {error && (
                        <div
                            style={{
                                background: '#fdf2f2',
                                border: '1px solid #e74c3c',
                                padding: '10px',
                                margin: '10px 0',
                                borderRadius: '4px'
                            }}
                        >
                            <span style={{ color: '#e74c3c' }}>{error}</span>
                            <button
                                onClick={() => clearError()}
                                style={{
                                    float: 'right',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {sessions && sessions.length > 0 && (
                        <Card className="flex-grow">
                            <SessionList
                                history={history}
                                sessions={sessions}
                                onEndSession={deleteSession}
                          
                                
                            />
                        </Card>
                    )}

                    {false && legacySessions && legacySessions.length > 0 && (
                        <Card
                            titleProps={{ text: "Migrated Sessions" }}
                            className="flex-grow legacy-sessions"
                        >
                            <SessionList
                                history={history}
                                sessions={legacySessions}
                                onEndSession={deleteSession}
                                hideContextMenu={true}
                            />
                        </Card>
                    )}
                </div>

                {match && match.path && match.path.indexOf("/create") !== -1 && (
                    <CreatePanel
                        onDismiss={this.closeCreate}
                        workItemIds={
                            (this.props.match && this.props.match.params && this.props.match.params.ids &&
                                this.props.match.params.ids
                                    .split(",")
                                    .map((x: string) => parseInt(x, 10))) ||
                            undefined
                        }
                    />
                )}

                {match && match.path && match.path.indexOf("/settings") !== -1 && (
                    <SettingsPanel onDismiss={this.closeSettings} />
                )}
            </div>
        );
    }

    private onFilterBarDismissClicked = () => {
        this.filter.reset();
        this.filterToggled.value = false;
    };

    private onSelectedTabChanged = () => {};

    private renderTabBarCommands = () => {
        return (
            <>
                <FilterBar
                    className="bolt-filterbar-white depth-8"
                    filter={this.filter}
                    onDismissClicked={this.onFilterBarDismissClicked}
                >
                    <KeywordFilterBarItem filterItemKey="keyword" />
                </FilterBar>
            </>
        );
    };

    private create = () => {
        const { history } = this.props;
        history.push("/create");
    };

    private openSettings = () => {
        const { history } = this.props;
        history.push("/settings");
    };

    private closeCreate = () => {
        const { history } = this.props;
        history.push("/");
    };

    private closeSettings = () => {
        const { history } = this.props;
        history.push("/");
    };
}

export default connect(
    (state: IState) => ({
        sessions: getDisplaySessions(
            state.sessions,
            (state.sessions.filteredSessions &&
                state.sessions.filteredSessions) ||
                state.sessions.sessions
        ),
        legacySessions: getLegacySessions(state.sessions),
        error: state.sessions.error
    }),
    Actions
)(HomePage);
