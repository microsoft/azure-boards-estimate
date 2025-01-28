export interface IWorkItem {
    project: string;
    id: number;
    title: string;
    description: string;
    workItemType: string;
    estimate?: string | number;

    estimationFieldRefName?: string;

    icon?: string;
    color?: string;
    AcceptanceCriteria?: any;
    AreaPath?: any;
    Tags?: any;
    AssignedTo?: any;
}
