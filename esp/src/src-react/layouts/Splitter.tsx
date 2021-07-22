import * as React from "react";
import { IStackItemStyles, IStackStyles, IStackTokens, Stack } from "@fluentui/react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import { SizeMe } from "react-sizeme";

interface PaneProps {
    padding?: number;
    children?: React.ReactNode
}

export const Pane2: React.FunctionComponent<PaneProps> = ({
    padding = 4,
    children
}) => {

    const relDiv = React.useMemo<React.CSSProperties>(() => {
        return { width: "100%", height: "100%", position: "relative" };
    }, []);

    const absDiv = React.useMemo<React.CSSProperties>(() => {
        return { position: "absolute", padding: `${padding}px`, background: "pink" };
    }, [padding]);

    return <SizeMe monitorHeight>{({ size }) =>
        <div style={relDiv}>
            <div style={absDiv}>
                <div style={{ width: size.width - padding * 2, height: size.height - padding * 2, background: "skyblue", display: "inline-block" }} >
                    {children}
                </div>
            </div>
        </div>
    }
    </SizeMe>;
};

export const Pane: React.FunctionComponent<PaneProps> = ({
    padding = 4,
    children
}) => {

    return <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100%", overflow: "hidden", background: "pink" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, margin: padding, background: "skyblue" }}>
            {children}
        </div>
    </div>;
};

import { DefaultPalette } from "@fluentui/react/lib/Styling";
import { classNames, styles } from "./react-reflex";

// Styles definition
const stackStyles: IStackStyles = {
    root: {
        background: DefaultPalette.themeTertiary,
    },
};
const stackItemStyles: IStackItemStyles = {
    root: {
        alignItems: "center",
        background: DefaultPalette.themePrimary,
        color: DefaultPalette.white,
        display: "flex",
        justifyContent: "center",
    },
};

// Tokens definition
const outerStackTokens: IStackTokens = { childrenGap: 5 };
const innerStackTokens: IStackTokens = {
    childrenGap: 5,
    padding: 10,
};

export const Pane3: React.FunctionComponent<PaneProps> = ({
    padding = 4,
    children
}) => {

    return <Stack verticalFill tokens={outerStackTokens}>
        <Stack styles={stackStyles} tokens={innerStackTokens}>
            <Stack.Item grow styles={stackItemStyles}>
                {children}
            </Stack.Item>
        </Stack>
    </Stack>;
};

interface SplitterProps {
    children?: React.ReactNode
}

export const Splitter: React.FunctionComponent<SplitterProps> = ({
    children
}) => {

    return <ReflexContainer orientation="horizontal">
        <ReflexElement className="left-pane">
            {children[0]}
        </ReflexElement>
        <ReflexSplitter style={styles.reflexSplitter}>
            <div className={classNames.reflexSplitterDiv}></div>
        </ReflexSplitter>
        <ReflexElement className="right-pane">
            {children[1]}
        </ReflexElement>
    </ReflexContainer>;
};

