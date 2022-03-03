import * as React from "react";

export interface HolyGrailStyle {
    root?: React.CSSProperties;
    header?: React.CSSProperties;
    left?: React.CSSProperties;
    content?: React.CSSProperties;
    right?: React.CSSProperties;
    footer?: React.CSSProperties;
}

export interface HolyGrailProps {
    header?: any;
    left?: any;
    main?: any;
    right?: any;
    footer?: any;
    style?: HolyGrailStyle;
}

export const HolyGrail: React.FunctionComponent<HolyGrailProps> = ({
    header,
    left,
    main,
    right,
    footer,
    style
}) => {

    return <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100%", overflow: "hidden", ...style?.root }}>
        <header style={{ flex: "0 0", minWidth: 0, ...style?.header }}>{header}</header>
        <div style={{ flex: "1 1", display: "flex", minWidth: 0 }} >
            <div style={{ flex: "0 2", ...style?.left }}>{left}</div>
            <div style={{ flex: "1 1 auto", minWidth: 1, minHeight: 1, ...style?.content }}>{main}</div>
            <div style={{ flex: "0 2", ...style?.right }}>{right}</div>
        </div>
        <footer style={{ flex: "0 0", minWidth: 0, ...style?.footer }}>{footer}</footer>
    </div>;
};
