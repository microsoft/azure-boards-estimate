import * as React from "react";
import "./subtitle.scss";

export const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="font-size-xl text-ellipsis">{children}</div>
);
