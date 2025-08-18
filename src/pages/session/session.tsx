import {
    CustomHeader,
    HeaderTitle,
    HeaderTitleArea
} from "azure-devops-ui/Header";
import {
    HeaderCommandBar,
    IHeaderCommandBarItem
} from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Dialog } from "azure-devops-ui/Dialog";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Observer } from "azure-devops-ui/Observer";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { VssPersona } from "azure-devops-ui/VssPersona";
import { Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as React from "react";
import { connect } from "react-redux";
import { IWorkItemCardProps, WorkItemCard } from "../../components/workitems/workItemCard";
import { ICardSet } from "../../model/cards";
import { ISessionEstimates } from "../../model/estimate";
import { IIdentity } from "../../model/identity";
import { ISession, SessionMode } from "../../model/session";
import { IUserInfo } from "../../model/user";
import { IWorkItem } from "../../model/workitem";
import { IState } from "../../reducer";
import { IPageProps } from "../props";
import WorkItemView from "./components/workItemView";
import { getActiveUsers, canPerformAdminActions } from "./selector";
import "./session.scss";
import {
    endSession,
    leaveSession,
    loadedSession,
    loadSession,
    selectWorkItem
} from "./sessionActions";

interface ISessionParams {
    id: string;
}

interface ISessionProps extends IPageProps<ISessionParams> {
    identity: IIdentity;
    status: {
        loading: boolean;
        message: string;
    };
    errorStatus: {
        loading: boolean;
        message: string;
        type: string;
    };
    session: ISession;
    workItems: IWorkItem[];
    estimates: ISessionEstimates;
    cardSet: ICardSet;
    selectedWorkItem: IWorkItem | null;
    activeUsers: IUserInfo[];

    canPerformAdminActions: boolean;
    mode: any;
}

const Actions = {
    loadSession,
    loadedSession,
    selectWorkItem,
    leaveSession,
    endSession
};

class Session extends React.Component<
    ISessionProps & typeof Actions,
    { flipped: boolean }
> {
    constructor(props: any) {
        super(props);

        this.state = {
            flipped: false
        };
    }


    private isDialogOpen = new ObservableValue<boolean>(false);

    componentDidMount() {
        this.props.loadSession(this.props.match.params.id);
        if(this.props.errorStatus.type === "error") {
            this.isDialogOpen.value = true;
        }
    }

    componentDidUpdate(prevProps: ISessionProps) {
        if (this.props.errorStatus.type === "error" && prevProps.errorStatus.type !== "error") {
            this.isDialogOpen.value = true;
        }
    }

    render(): JSX.Element {
        const {
            canPerformAdminActions,
            cardSet,
            session,
            status,
            errorStatus,
            workItems,
            selectedWorkItem,
            leaveSession,
            activeUsers ,
            } = this.props;


        const onDismiss = () => {
            this.isDialogOpen.value = false;
            this.props.errorStatus.type = "";
        }

        if (errorStatus.type !== "error" && errorStatus.type !== "retry" && (status.loading || !session)) {
            return (
                <div className="absolute-fill flex-column flex-grow flex-center justify-center">
                    <Spinner size={SpinnerSize.large} />
                    <div>{status.message}</div>
                </div>
            );
        }
        if (errorStatus.type === "retry") {
            return (
                <div className="absolute-fill flex-column flex-grow flex-center justify-center">
                    <Spinner size={SpinnerSize.large} />
                    <div>{status.message}</div>
                    <div>{errorStatus.message}</div>
                </div>
            );
        }
        if (errorStatus.type === "error") {
            return (
                <div>
                    <Observer isDialogOpen={this.isDialogOpen}>
                        {(props: { isDialogOpen: boolean }) => {
                            return props.isDialogOpen ? (
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        background: 'white',
                                        border: '1px solid #ccc',
                                        padding: '20px',
                                        zIndex: 1000,
                                        minWidth: '300px'
                                    }}
                                >
                                    <h3>Error establishing a connection</h3>
                                    <div dangerouslySetInnerHTML={{ __html: errorStatus.message}}/>
                                    <button
                                        onClick={() => {
                                            this.props.history.push("/");
                                            window.location.reload();
                                        }}
                                        style={{ marginTop: '20px', background: '#0078d4', color: 'white', border: 'none', padding: '10px' }}
                                    >
                                        Back to home
                                    </button>
                                </div>
                            ) : null;
                        }}
                    </Observer>
                </div>
            );
        }

        const sessionModeCheck = (workitem: number, selectedWi: any) => {
            if ((session && session.mode === SessionMode.Online && canPerformAdminActions) || (session && session.mode === SessionMode.Offline)) {
                return selectedWi(workitem);
            } else {
                return null;
            }
        }



        return (
            <div className="absolute-fill">
                <div className="bolt-header-with-commandbar">
                    <div>
                        <h2>{session.name}</h2>
                    </div>

                    <div className="session--active-users flex-row flex-justify-end flex-center flex-self-stretch">
                        {activeUsers.map(u => (
                            <div key={u.tfId} title={u.name}>
                                <div>
                                    <VssPersona
                                        identityDetailsProvider={{
                                            getDisplayName: () => u.name,
                                            getIdentityImageUrl: () =>
                                                u.imageUrl
                                        }}
                                        size="small"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <HeaderCommandBar
                        items={
                            [
                                {
                                    id: "action-leave",
                                    important: true,
                                    text: "Leave session",
                                    iconProps: { iconName: "Home" },
                                    onActivate: () => {
                                        leaveSession();
                                    }
                                },
                                (!session.isLegacy && {
                                    id: "action-end",
                                    important: false,
                                    text: "End session",
                                    iconProps: { iconName: "Delete" },
                                    onActivate: () => {
                                        this.props.endSession();
                                    }
                                }) ||
                                    undefined
                            ].filter(x => !!x) as IHeaderCommandBarItem[]
                        }
                    />
                </div>

                <div className="page-content page-content-top flex-row session-content">
                    <div className="work-item-list v-scroll-auto flex-column custom-scrollbar flex-noshrink">

                 
                        {workItems.map(workItem => (
                            <WorkItemCard
                                key={workItem.id}
                                cardSet={cardSet}
                                selected={
                                    !!selectedWorkItem &&
                                    selectedWorkItem.id === workItem.id
                                }
                                workItem={workItem}
                                onClick={ ()=> sessionModeCheck(workItem.id, this.props.selectWorkItem)}
                            />
                    
                        ))}
                        </div>
                        {!!selectedWorkItem && <WorkItemView  users={activeUsers}/>}
                        {!selectedWorkItem && (
                        <div className="flex-grow flex-column flex-center justify-center">
                            <i>Select a work item on the left to get started</i>
                        </div>
                    )} 
                </div>
            
            </div>
        );
    }
}

export default connect(
    (state: IState) => {
        return {
            identity: state.init.currentIdentity,
            status: state.session.status,
            errorStatus: state.session.errorStatus,
            session: state.session.session,
            cardSet: state.session.cardSet,
            workItems: state.session.workItems,
            estimates: state.session.estimates,
            selectedWorkItem: state.session.selectedWorkItem,
            activeUsers: getActiveUsers(state),
            canPerformAdminActions: canPerformAdminActions(state)
        };
    },
    Actions
)(Session as any);
