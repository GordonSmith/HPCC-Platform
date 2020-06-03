import * as React from "react";
import { makeStyles } from "@material-ui/core/styles"
import { DojoComponent } from "./DojoComponent";
import { MainList } from "./NavigationMenu";
import { UtilityBar } from "./UtilityBar";

declare const dojoConfig;

const useStyles = makeStyles(theme => ({
    container: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "70px;"
    },
    nav: {
        flexDirection: "column",
        order: 1,
        width: "240px",
        alignItems: "center",

    },
    contentWrapper: {
        flexDirection: "column",
        order: 2,
        marginLeft: "35px",
        width: "100%",
        alignItems: "center"
    },
    content: {
        height: "100vh"
    }
}));

export function Frame() {
    const classes = useStyles();
    const [mainWidget, setMainWidget] = React.useState("ActivityWidget");
    const selectedWidgetCallback = (widget) => {
        setMainWidget(widget)
    }

    return (
        <>
            <UtilityBar  />
            <div className={classes.container}>
                <div className={classes.nav}>
                    <MainList getWidgetName={selectedWidgetCallback}/>
                </div>
                <div className={classes.contentWrapper}>
                    <main className={classes.content}>
                        <DojoComponent widgetClassID={mainWidget} params={{}} />
                    </main>
                </div>
            </div>
        </>
    );
}
