import * as React from "react";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowMaximize20Regular, ArrowMinimize20Regular } from "@fluentui/react-icons";
import nlsHPCC from "src/nlsHPCC";
import { isFullscreen, updateFullscreen } from "../util/history";

const useFullscreenStyles = makeStyles({
    fullscreen: {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        background: tokens.colorNeutralBackground1,
    },
    normal: {
        height: "100%"
    }
});

export interface FullscreenProps {
    children?: React.ReactNode;
}

export const FullscreenFrame: React.FunctionComponent<FullscreenProps> = ({
    children
}) => {
    const fullscreen = isFullscreen();
    const layoutStyles = useFullscreenStyles();

    return <div className={fullscreen ? layoutStyles.fullscreen : layoutStyles.normal}>
        {children}
    </div>;
};

export const FullscreenStack: React.FunctionComponent<FullscreenProps> = ({
    children
}) => {
    const fullscreen = isFullscreen();

    return <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ flexGrow: 1 }}>
            {children}
        </div>
        <div style={{ alignSelf: "center" }}>
            <Button appearance="subtle" aria-label={nlsHPCC.MaximizeRestore} icon={fullscreen ? <ArrowMinimize20Regular /> : <ArrowMaximize20Regular />} onClick={() => updateFullscreen(!fullscreen)} />
        </div>
    </div>;
};
