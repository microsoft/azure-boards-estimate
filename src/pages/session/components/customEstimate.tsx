import * as React from "react";
import { TextField } from "azure-devops-ui/TextField";
import { Button } from "azure-devops-ui/Button";

export const CustomEstimate: React.FC<{
    commitEstimate: (value: string) => void;
}> = props => {
    const [value, setValue] = React.useState("");


    const returnInputvalue =()=>{
        if(value.includes(",")){
           return value.replace(/,/g, ".");
         }
         return value
     }
    

    return (
        <div className="flex-row">
            <TextField
                value={value}
                onChange={(
                    event: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                    >,
                    value: string
                ) => {
                    setValue(value);
                }}
            />
            <Button
                onClick={() => {
                    props.commitEstimate(returnInputvalue());
                }}
            >
                Save
            </Button>
        </div>
    );
};
