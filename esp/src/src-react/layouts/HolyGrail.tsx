import * as React from "react";
import { makeStyles } from "@fluentui/react-components";
import { useMounted } from "../hooks/mounted";

const useStyles = makeStyles({
    normal: {
        display: "flex",
        flexDirection: "column",
        minWidth: "0",
        minHeight: "100%",
        overflow: "hidden",
    },
    header: {
        flex: "0 0",
        minWidth: "0",
    },
    content: {
        flex: "1 1",
        display: "flex",
        minWidth: "0",
    },
    left: {
        flex: "0 2",
    },
    main: {
        flex: "1 1 auto",
        minWidth: "1px",
        minHeight: "1px",
    },
    right: {
        flex: "0 2",
    },
    footer: {
        flex: "0 0",
        minWidth: "0",
    },
});

export interface HolyGrailProps {
    header?: any;
    left?: any;
    main?: any;
    right?: any;
    footer?: any;
}

export const HolyGrail: React.FunctionComponent<HolyGrailProps> = ({
    header,
    left,
    main,
    right,
    footer
}) => {
    const styles = useStyles();
    const mounted = useMounted();

    return <div className={styles.normal}>
        <header className={styles.header}>{mounted && header}</header>
        <div className={styles.content}>
            <div className={styles.left}>{mounted && left}</div>
            <div className={styles.main}>{mounted && main}</div>
            <div className={styles.right}>{mounted && right}</div>
        </div>
        <footer className={styles.footer}>{mounted && footer}</footer>
    </div>;
};
