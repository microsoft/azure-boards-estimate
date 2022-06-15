import * as React from "react";
import { Button } from "azure-devops-ui/Button";
import "./customEstimate.scss"

interface CustomEstimateProps  {
    commitEstimate: (value: number | null ) => void;
    checkIfIsEqual: any
}

export const CustomEstimate: React.FC<CustomEstimateProps > = props => {
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
                    props.commitEstimate( value || props.checkIfIsEqual());
                }}
            >  Save
            </Button>
        </div>
    );
};

  


