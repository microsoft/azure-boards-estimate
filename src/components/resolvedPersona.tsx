import { VssPersona } from "azure-devops-ui/VssPersona";
import * as React from "react";
import {
    getGraphAvatarDataUrl,
    resolveSizedImageUrl
} from "../services/avatars";

export interface IResolvedPersonaProps {
    displayName: string;
    imageUrl?: string;
    descriptor?: string;
    avatarHref?: string;
    size?: any;
}

export function ResolvedPersona(props: IResolvedPersonaProps): JSX.Element {
    const {
        displayName,
        imageUrl,
        descriptor,
        avatarHref,
        size = "small"
    } = props;
    const [graphAvatarDataUrl, setGraphAvatarDataUrl] = React.useState<
        string | undefined
    >(undefined);

    React.useEffect(() => {
        let disposed = false;

        getGraphAvatarDataUrl({
            descriptor,
            avatarHref,
            imageUrl
        }).then(result => {
            if (!disposed && result) {
                setGraphAvatarDataUrl(result);
            }
        });

        return () => {
            disposed = true;
        };
    }, [descriptor, avatarHref, imageUrl]);

    return (
        <VssPersona
            identityDetailsProvider={{
                getDisplayName: () => displayName,
                getIdentityImageUrl: (requestedSize: number) =>
                    graphAvatarDataUrl ||
                    resolveSizedImageUrl(imageUrl, requestedSize)
            }}
            showInitialsOnImageError={true}
            size={size}
        />
    );
}
