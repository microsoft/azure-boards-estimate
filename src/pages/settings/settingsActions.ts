import { actionCreatorFactory } from "typescript-fsa";
import { IWorkItemType, IField } from "../../model/workItemType";

const factory = actionCreatorFactory("settings");

export const init = factory<void>("init");
export const loaded = factory<{
    workItemTypes: IWorkItemType[];
    fields: IField[];
    classicLayout: boolean;
}>("loaded");
export const close = factory("close");

export const setField = factory<IWorkItemType>("setField");
export const setLayout = factory<{ classicLayout: boolean }>("setLayout");
