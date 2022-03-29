import * as React from "react";
import { TextField } from "azure-devops-ui/TextField";
import { Button } from "azure-devops-ui/Button";
import "./customEstimate.scss"

export const CustomEstimate: React.FC<{
    commitEstimate: (value: string) => void;
}> = props => {
    const [value, setValue] = React.useState();

    return (
        <div className="flex-row">
            <TextField
                className={"estimate-input-field"}
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
                    props.commitEstimate(value);
                }}
            >  Save
            </Button>
        </div>
    );
};
