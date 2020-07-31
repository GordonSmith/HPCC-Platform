import * as React from "react";
import { makeStyles } from "@material-ui/core/styles"
import { MuiThemeProvider } from "@material-ui/core/styles";
import { theme } from '../theme';
import CircularProgress from '@material-ui/core/CircularProgress';
import { MainList } from "./NavigationMenu";
import { Body } from "./Body";
import { UtilityBar } from "./UtilityBar";
import { UserAccountContext } from "../hooks/userContext";
import * as ESPRequest from "../../ESPRequest";
import { RouteParams } from 'universal-router';
import { Box } from '@material-ui/core';

declare const dojoConfig;

const useStyles = makeStyles(theme => ({
    container: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "70px;"
    },
    center: {
        position: "fixed",
        top: "50%",
        left: "50%"
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

interface IFrame {
    widgetClassID: string,
    widgetParams?: RouteParams
}

export const Frame: React.FunctionComponent<IFrame> = ({
    widgetClassID = "ActivityWidget",
    widgetParams
}) => {
    const classes = useStyles();
    const [loading, setLoading] = React.useState(true);
    const [userAccount, setUserAccount] = React.useState({});

    React.useEffect(() => {
        ESPRequest.send("ws_account", "MyAccount").then(function (user) {
            setUserAccount(user.MyAccountResponse);
            dojoConfig.username = user.MyAccountResponse.username;
            setLoading(false);
        });
    }, []);

    return (
        <MuiThemeProvider theme={theme}>
            {loading ? <div className={classes.center}>
                <CircularProgress color="primary" /></div> : (
                    <UserAccountContext.Provider value={{ userAccount, setUserAccount }}>
                        <UtilityBar />
                        <div className={classes.container}>
                            <div className={classes.nav}>
                                <MainList />
                            </div>
                            <div className={classes.contentWrapper}>
                                <Box width="100%" height="100%">
                                    <Body widgetClassID={widgetClassID} params={widgetParams} />
                                </Box>
                            </div>
                        </div>
                    </UserAccountContext.Provider>
                )}
        </MuiThemeProvider>
    );
};
