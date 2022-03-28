import * as React from "react";
import { TextField } from "azure-devops-ui/TextField";
import { Button } from "azure-devops-ui/Button";
import "./customEstimate.scss"

export const CustomEstimate: React.FC<{
    commitEstimate: (value: number | null ) => void;
}> = props => {
    const [value, setValue] = React.useState<number | null>(null);

    return (
        <div className="flex-row">
          <input
             className="custom-values-input"
             onChange={(e) => setValue(Number(e.target.value))}
               type="number"
             
            />
            <Button
                className="custom-values-input"
                onClick={() => {
                    props.commitEstimate(value);
                }}
            >
                Save
            </Button>
        </div>
    );
};
