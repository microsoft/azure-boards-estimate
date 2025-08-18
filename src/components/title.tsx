import * as React from "react";
import "./title.scss";

export const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="font-size-xxl text-ellipsis">{children}</div>
);
