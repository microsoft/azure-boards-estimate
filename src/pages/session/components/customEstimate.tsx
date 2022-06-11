import * as React from "react";
import { Button } from "azure-devops-ui/Button";
import "./customEstimate.scss"

export const CustomEstimate: React.FC<{
    commitEstimate: (value: string |null ) => void;
}> = props => {
    const [value, setValue] = React.useState<string | null>(null);


 
  
    const replaceChar = ()=>{
       if(value &&  value.includes(".")){
    let currentVal = value   
     return  currentVal.replace(".", ",")
       }
       return value 
    }
  
  

    return (
        <div className="flex-row">
          <input
             className="custom-values-input"
   
             onChange={(e) => setValue(e.target.value)}
             type="text"

               
             
            />
            <Button
                className="custom-values-input"
                onClick={() => {
                    props.commitEstimate(replaceChar());
                }}
            >  Save
            </Button>
        </div>
    );
};

  


