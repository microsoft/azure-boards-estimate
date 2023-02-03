import * as React from "react";
import { Button } from "azure-devops-ui/Button";
import "./customEstimate.scss"
import { ICard } from "../../../model/cards";
import { Action } from "redux";




interface CustomEstimateProps {
    checkIfIsEqual: () => any;
    commitEstimate: (value: string | null) => void;
}

export const CustomEstimate: React.FC<CustomEstimateProps> = props => {
    const [value, setValue] = React.useState<string | null>(null);


const containsNumber = ()=> {
    if(/\d/.test(props.checkIfIsEqual()) ){
        return "number"
        }
        return "text"
    }
     
return (
        <div className="flex-row">
            <input
                className="custom-values-input"
                onChange={(e) => setValue(e.target.value)}
                type={containsNumber()}
              />
            <Button
                className="custom-values-input"
                onClick={() => {
                    props.commitEstimate(value || props.checkIfIsEqual());
                }}
            >  Save
            </Button>
        </div>
    );
};





