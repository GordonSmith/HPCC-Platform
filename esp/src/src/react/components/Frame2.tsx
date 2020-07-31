import * as React from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import Drawer from "@material-ui/core/Drawer";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import { RouteParams } from "universal-router";
import { AutoSizer } from "react-virtualized";
import * as ESPRequest from "../../ESPRequest";
import { MainList } from "./NavigationMenu";
import { Body } from "./Body";
import { UtilityBar } from "./UtilityBar";
import { UserAccountContext } from "../hooks/userContext";

declare const dojoConfig;

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
    },
    toolbar: {
        paddingRight: 24, // keep right padding when drawer closed
    },
    toolbarIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 8px",
        ...theme.mixins.toolbar,
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginRight: 36,
    },
    menuButtonHidden: {
        display: "none",
    },
    title: {
        flexGrow: 1,
    },
    drawerPaper: {
        position: "relative",
        whiteSpace: "nowrap",
        width: drawerWidth,
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    drawerPaperClose: {
        overflowX: "hidden",
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up("sm")]: {
            width: theme.spacing(9),
        },
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        height: "100vh",
        overflow: "hidden",
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
    },
    fixedHeight: {
        height: 240,
    },
}));

interface Frame2 {
    widgetClassID: string,
    widgetParams?: RouteParams
}

export const Frame2: React.FunctionComponent<Frame2> = ({
    widgetClassID = "ActivityWidget",
    widgetParams
}) => {
    const classes = useStyles();
    const mainRef = React.useRef<HTMLDivElement>();

    const [open, setOpen] = React.useState(false);
    // const handleDrawerOpen = () => {
    //     setOpen(true);
    // };
    const handleDrawerClose = () => {
        setOpen(false);
    };

    const [userAccount, setUserAccount] = React.useState({});

    React.useEffect(() => {
        ESPRequest.send("ws_account", "MyAccount").then(function (user) {
            setUserAccount(user.MyAccountResponse);
            dojoConfig.username = user.MyAccountResponse.username;
        });
    }, []);

    return (
        <div className={classes.root}>
            <CssBaseline />
            <UserAccountContext.Provider value={{ userAccount, setUserAccount }}>
                <UtilityBar />
            </UserAccountContext.Provider>
            <Drawer
                variant="permanent"
                classes={{
                    paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
                }}
                open={open}
            >
                <div className={classes.toolbarIcon}>
                    <IconButton onClick={handleDrawerClose}>
                        <ChevronLeftIcon />
                    </IconButton>
                </div>
                <Divider />
                <MainList />
            </Drawer>
            <main className={classes.content}>
                <div ref={mainRef} className={classes.appBarSpacer} />
                <AutoSizer >
                    {({ height, width }) => {
                        const y = mainRef?.current?.clientHeight || 0;
                        return <div style={{ height: `${height - y}px`, width: `${width - 0}px`, overflow: "auto" }}>
                            <Body widgetClassID={widgetClassID} params={widgetParams} />
                        </div>;
                    }}
                </AutoSizer>
            </main>
        </div>
    );
};
