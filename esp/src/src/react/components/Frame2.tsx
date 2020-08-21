import * as React from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import { MuiThemeProvider } from "@material-ui/core/styles";
import { theme } from "../theme";
import CircularProgress from "@material-ui/core/CircularProgress";
import Drawer from "@material-ui/core/Drawer";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { AutoSizer } from "react-virtualized";
import * as ESPRequest from "../../ESPRequest";
import { MainList } from "./NavigationMenu";
import { UtilityBar } from "./UtilityBar";
import { UserAccountContext } from "../hooks/userContext";
import { hashHistory } from "../util/history";
import { router } from "./routes";

declare const dojoConfig;

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex"
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar
    },
    toolbarIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 8px",
        ...theme.mixins.toolbar
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        })
    },
    appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
        })
    },
    menuButton: {
        marginRight: 36
    },
    menuButtonHidden: {
        display: "none"
    },
    title: {
        flexGrow: 1
    },
    drawerPaper: {
        position: "relative",
        whiteSpace: "nowrap",
        width: drawerWidth,
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
        })
    },
    drawerPaperClose: {
        overflowX: "hidden",
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up("sm")]: {
            width: theme.spacing(9)
        }
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        height: "100vh",
        overflow: "hidden"
    },
    center: {
        paddingTop: theme.spacing(4),
        position: "fixed",
        paddingBottom: theme.spacing(4),
        top: "50%",
        left: "50%"
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4)
    },
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden"
    }
}));

interface Frame2 {
}

export const Frame2: React.FunctionComponent<Frame2> = () => {
    const classes = useStyles();

    const mainRef = React.useRef<HTMLDivElement>();

    const [body, setBody] = React.useState(<h1>...loading...</h1>);
    const [open, setOpen] = React.useState(false);
    const [userAccount, setUserAccount] = React.useState({});
    const [loading, setLoading] = React.useState(true);

    const handleDrawerOpen = () => {
        setOpen(true);
    };
    const handleDrawerClose = () => {
        setOpen(false);
    };

    React.useEffect(() => {
        ESPRequest.send("ws_account", "MyAccount").then(function (user) {
            setUserAccount(user.MyAccountResponse);
            dojoConfig.username = user.MyAccountResponse.username;
            setLoading(false);
        });

        const unlisten = hashHistory.listen(async (location, action) => {
            document.title = `ECL Watch${location.pathname.split("/").join(" | ")}`;
            setBody(await router.resolve(location));
        });

        router.resolve(hashHistory.location).then(setBody);

        return () => unlisten();
    }, []);

    return (
        <MuiThemeProvider theme={theme}>
            {loading ? <div className={classes.center}>
                <CircularProgress color="primary" /></div> : (
                    <div className={classes.root}>
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
                            <div className={classes.toolbar}>
                                {open ?
                                    <IconButton onMouseDown={handleDrawerClose}><ChevronLeftIcon /></IconButton>
                                :
                                    <IconButton onMouseDown={handleDrawerOpen}><ChevronRightIcon /></IconButton>
                                }
                            </div>
                            <div className={classes.toolbarIcon}>
                                {open ?
                                    <IconButton onMouseDown={handleDrawerClose}><ChevronLeftIcon /></IconButton>
                                :
                                    <IconButton onMouseDown={handleDrawerOpen}><ChevronRightIcon /></IconButton>
                                }
                            </div>
                            <Divider />
                            <MainList />
                        </Drawer>
                        <main className={classes.content}>
                            <div ref={mainRef} className={classes.appBarSpacer} />
                                <AutoSizer >
                                    {({ height, width }) => {
                                        const y = mainRef?.current?.clientHeight || 0;
                                        return <div style={{ height: `${height - y}px`, width: `${width - 0}px`, overflowY: "auto", overflowX: "hidden" }}>
                                        {body}
                                    </div>;
                                    }}
                                </AutoSizer>
                        </main>
                    </div>
                )}
        </MuiThemeProvider>
    );
};
