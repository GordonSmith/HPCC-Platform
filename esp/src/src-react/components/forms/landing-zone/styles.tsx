import { tokens } from "@fluentui/react-components";
import { mergeStyleSets } from "@fluentui/style-utilities";

export const cancelIcon = { iconName: "Cancel" };
export const iconButtonStyles = {
    root: {
        marginLeft: "auto",
        marginTop: "4px",
        marginRight: "2px",
    }
};
export const buttonStackStyles = {
    root: {
        height: "56px",
        justifyContent: "flex-end"
    },
};
export const componentStyles = mergeStyleSets({
    container: {
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "stretch",
    },
    header: [
        {
            flex: "1 1 auto",
            borderTop: `4px solid ${tokens.colorBrandBackground}`,
            display: "flex",
            alignItems: "center",
            fontWeight: tokens.fontWeightSemibold,
            padding: "12px 12px 14px 24px",
        },
    ],
    body: {
        flex: "4 4 auto",
        padding: "0 24px 24px 24px",
        overflowY: "hidden",
        selectors: {
            p: { margin: "14px 0" },
            "p:first-child": { marginTop: 0 },
            "p:last-child": { marginBottom: 0 },
        },
    },
    selectionTable: {
        padding: "4px",
        border: `1px solid ${tokens.colorBrandBackground2}`
    },
    twoColumnTable: {
        marginTop: "14px",
        "selectors": {
            "tr": { marginTop: "10px" }
        }
    }
});