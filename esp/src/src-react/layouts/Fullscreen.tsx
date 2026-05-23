import * as React from "react";
import { mergeStyleSets } from "@fluentui/style-utilities";
import { Button } from "@fluentui/react-components";
import { ArrowMaximize20Regular, ArrowMinimize20Regular } from "@fluentui/react-icons";
import { useUserTheme } from "../hooks/theme";
import { updateFullscreen } from "../util/history";

export interface FullscreenProps {
    fullscreen: boolean;
    children?: React.ReactNode;
}

export const FullscreenFrame: React.FunctionComponent<FullscreenProps> = ({
    fullscreen,
    children
}) => {
    const { themeV9 } = useUserTheme();
    const layoutStyles = React.useMemo(() => mergeStyleSets({
        fullscreen: {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: themeV9.colorNeutralBackground1,
        },
        normal: {
            height: "100%"
        }
    }), [themeV9.colorNeutralBackground1]);

    return <div className={fullscreen ? layoutStyles.fullscreen : layoutStyles.normal}>
        {children}
    </div>;
};

export const FullscreenStack: React.FunctionComponent<FullscreenProps> = ({
    fullscreen,
    children
}) => {

    return <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ flexGrow: 1 }}>
            {children}
        </div>
        <div style={{ alignSelf: "center" }}>
            <Button appearance="subtle" icon={fullscreen ? <ArrowMinimize20Regular /> : <ArrowMaximize20Regular />} onClick={() => updateFullscreen(!fullscreen)} />
        </div>
    </div>;
};
