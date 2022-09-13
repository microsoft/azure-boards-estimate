import * as React from "react";
import { Button } from "azure-devops-ui/Button";
import "./customEstimate.scss"
import { ICard } from "../../../model/cards";
import { Action } from "redux";




interface CustomEstimateProps {
    checkIfIsEqual: () => any;
    commitEstimate: (value: string | null) => void;
    disabled: boolean
}

export const CustomEstimate: React.FC<CustomEstimateProps> = props => {
    const [value, setValue] = React.useState<string | null>(null);


    const replaceChar = () => {
        if (value && value.includes(".")) {
            let currentVal = value
            return currentVal.replace(".", ",")
        }
        return value
    }


return (
    <div className="custom-estimate-wrapper">
        <div className="flex-row">
            <input
                disabled={!props.disabled}
                className="custom-values-input"
                onChange={(e) => setValue(e.target.value)}
                type="text" />
            <Button
                 disabled={!props.disabled}
                className="custom-values-input"
                onClick={() => {
                    props.commitEstimate(replaceChar() || props.checkIfIsEqual());
                }}
            >  Save
            </Button> 
       
        </div>
        {!props.disabled ? <div className="warning"> Only session owner can save estimate </div> : null}
        </div>
    );
};





