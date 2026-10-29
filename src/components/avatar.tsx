import * as React from "react";
import { VssPersona } from "azure-devops-ui/VssPersona";
import { descriptorFromImageUrl, getAvatarDataUrl } from "../services/avatars";

export interface IAvatarProps {
    displayName: string;

    imageUrl?: string;

    descriptor?: string;

    size?: "small" | "medium" | "large";
}

export const Avatar: React.FC<IAvatarProps> = props => {
    const { displayName, imageUrl, descriptor, size } = props;
    const [dataUrl, setDataUrl] = React.useState<string | undefined>();

    React.useEffect(() => {
        let cancelled = false;
        setDataUrl(undefined);

        getAvatarDataUrl(descriptor || descriptorFromImageUrl(imageUrl)).then(
            url => {
                if (!cancelled) {
                    setDataUrl(url);
                }
            }
        );

        return () => {
            cancelled = true;
        };
    }, [descriptor, imageUrl]);

    return (
        <VssPersona
            imageUrl={dataUrl || imageUrl}
            displayName={displayName}
            size={size || "small"}
            showInitialsOnImageError={true}
        />
    );
};
