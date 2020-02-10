import * as React from "react";
import { userKeyValStore } from "../KeyValStore";
//import { Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@material-ui/core";
// import { MuiThemeProvider } from "@material-ui/core/styles";
// import { theme } from './theme';

import "dojo/i18n";
// @ts-ignore
import * as nlsHPCC from "dojo/i18n!hpcc/nls/hpcc";

const ws_store = userKeyValStore();

interface RecentFilters {
    filter: object
}

export const RecentFilters: React.FunctionComponent<RecentFilters> = ({
    filter
}) => {
    React.useEffect(() => {
        ws_store.get("WUQueryUsersRecentFilter").then(function(data){
            if(data) {
                let response = JSON.parse(data)
                console.log(response)
            }
        });
    });

    return (
        // <MuiThemeProvider theme={theme}>
            
        // </MuiThemeProvider>
        <div>hello</div>
        )
};
