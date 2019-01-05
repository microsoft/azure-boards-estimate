export interface IWorkItem {
    project: string;
    id: number;
    title: string;
    description: string;
    workItemType: string;

    icon?: string;
    color?: string;
}
