import { RouteComponentProps } from "react-router";

export interface IPageProps<TParams extends { [K in keyof TParams]?: string | undefined } = {}> extends RouteComponentProps<TParams> {}
