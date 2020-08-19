import * as React from "react";
import { FormControl, InputLabel, Input, FormHelperText, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@material-ui/core";
import Abort from "@material-ui/icons/Cancel";
import Search from "@material-ui/icons/Search";
import Lock from "@material-ui/icons/Lock";
import Unlock from "@material-ui/icons/LockOutlined";
import Failed from "@material-ui/icons/Warning";
import { WorkunitsService } from "@hpcc-js/comms";
import { Column } from "material-table";
import nlsHPCC from "../../nlsHPCC";
import { pushParam } from "../util/history";
import { icons } from "../util/table";
import { WUAction } from "../../WsWorkunits";
import { AutoSizeTable } from "./AutoSizeTable";

const wuService = new WorkunitsService({ baseUrl: "" });

export interface WUQueryProps {
    orderBy?: string;
    descending?: boolean;
}

const WUQueryFilter: React.FunctionComponent<WUQueryProps> = ({
    orderBy,
    descending
}) => {
    return <FormControl >
        <InputLabel htmlFor="my-input">Email address</InputLabel>
        <Input id="my-input" aria-describedby="my-helper-text" />
        <FormHelperText id="my-helper-text">We'll never share your email.</FormHelperText>
    </FormControl>;
};

export const WUQueryComponent: React.FunctionComponent<WUQueryProps> = ({
    orderBy,
    descending
}) => {

    const columns: Column<object>[] = [
        {
            title: <Lock />, field: "Protected", width: 32,
            render: row => row.Protected ? <Lock /> : undefined
        },
        {
            title: nlsHPCC.WUID, field: "Wuid", width: 180,
            render: rowData => <a href={`#/workunits/${rowData.Wuid}`}>{rowData.Wuid}</a>
        },
        { title: nlsHPCC.Owner, field: "Owner", width: 90 },
        { title: nlsHPCC.JobName, field: "Jobname", width: 500 },
        { title: nlsHPCC.Cluster, field: "Cluster", width: 90 },
        { title: nlsHPCC.RoxieCluster, field: "RoxieCluster", width: 99 },
        { title: nlsHPCC.State, field: "State", width: 90 },
        { title: nlsHPCC.TotalClusterTime, field: "TotalClusterTime", width: 117 },
    ].map((row: Column<object>) => {
        if (row.field === orderBy) {
            row.defaultSort = descending === true ? "desc" : "asc";
        }
        return row;
    });

    const [showFilter, setShowFilter] = React.useState(false);
    const closeFilter = () => setShowFilter(false);
    const [refreshID, setRefreshID] = React.useState(0);
    const refresh = () => setRefreshID(refreshID + 1);

    return <>
        <AutoSizeTable
            title={nlsHPCC.Workunits}
            icons={icons}
            columns={columns}
            refreshID={refreshID}
            data={query => {
                pushParam("orderBy", query.orderBy?.field);
                pushParam("descending", query.orderDirection === "desc" ? true : undefined);
                return wuService.WUQuery({
                    Sortby: query.orderBy?.field === "TotalClusterTime" ? "ClusterTime" : query.orderBy?.field as string | undefined,
                    Descending: query.orderDirection === "desc",
                    PageStartFrom: query.page * query.pageSize, PageSize: query.pageSize
                }).then(response => {
                    return {
                        data: response.Workunits.ECLWorkunit,
                        page: query.page,
                        totalCount: response.NumWUs
                    };
                });
            }}
            options={{
                search: false,
                exportButton: true,
                selection: true,
                fixedColumns: {
                    left: 2
                }
            }}
            actions={
                [
                    {
                        icon: Search,
                        tooltip: nlsHPCC.Filter,
                        isFreeAction: true,
                        onClick: () => setShowFilter(true)
                    },
                    {
                        tooltip: nlsHPCC.Delete,
                        icon: icons.Delete as any,
                        onClick: (evt, selection: any[]) => {
                            const list = arrayToList(selection, "Wuid");
                            if (confirm(nlsHPCC.DeleteSelectedWorkunits + "\n" + list)) {
                                WUAction(selection, "Delete").then(refresh);
                            }
                        }
                    }, {
                        tooltip: nlsHPCC.SetToFailed,
                        icon: Failed,
                        onClick: (evt, selection: any[]) => {
                            WUAction(selection, "SetToFailed").then(refresh);
                        }
                    }, {
                        tooltip: nlsHPCC.Abort,
                        icon: Abort,
                        onClick: (evt, selection: any[]) => {
                            WUAction(selection, "Abort").then(refresh);
                        }
                    }, {
                        tooltip: nlsHPCC.Protect,
                        icon: Lock,
                        onClick: (evt, selection: any[]) => {
                            WUAction(selection, "Protect").then(refresh);
                        }
                    }, {
                        tooltip: nlsHPCC.Unprotect,
                        icon: Unlock,
                        onClick: (evt, selection: any[]) => {
                            WUAction(selection, "Unprotect").then(refresh);
                        }
                    }
                ]}
        />
        <Dialog onClose={closeFilter} aria-labelledby="simple-dialog-title" open={showFilter}>
            <DialogTitle id="form-dialog-title">Subscribe</DialogTitle>
            <DialogContent>
                <WUQueryFilter />
            </DialogContent>
            <DialogActions>
                <Button onClick={closeFilter} color="primary">
                    Cancel
                </Button>
                <Button onClick={closeFilter} color="primary">
                    Subscribe
                 </Button>
            </DialogActions>
        </Dialog>
    </>;
};

function arrayToList(arr, field): string {
    let retVal = "";
    arr.some((item, idx) => {
        if (retVal.length) {
            retVal += "\n";
        }
        if (idx >= 10) {
            retVal += "\n..." + (arr.length - 10) + " " + this.i18n.More + "...";
            return true;
        }
        const lineStr = field ? item[field] : item;
        if (lineStr.length > 50) {
            retVal += "..." + item[field].slice(25, item[field].length);
        }
        else {
            retVal += lineStr;
        }
    }, this);
    return retVal;
}
