import { NavigateFunction, Params } from "react-router-dom";

export interface IPageProps<TParams extends { [K in keyof TParams]?: string | undefined } = {}> {
    navigate?: NavigateFunction;
    params?: Readonly<Params<string>>;
    // Legacy support - to be removed later
    history?: any;
    match?: any;
}
