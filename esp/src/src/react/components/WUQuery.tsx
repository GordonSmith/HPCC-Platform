import * as React from "react";
import Abort from "@material-ui/icons/Cancel";
import Search from "@material-ui/icons/Search";
import Lock from "@material-ui/icons/Lock";
import Unlock from "@material-ui/icons/LockOutlined";
import Failed from "@material-ui/icons/Warning";
import { WorkunitsService } from "@hpcc-js/comms";
import { Column } from "material-table";
import nlsHPCC from "../../nlsHPCC";
import {  pushParam, pushParams, parseSearch } from "../util/history";
import { icons } from "../util/table";
import { WUAction } from "../../WsWorkunits";
import { AutoSizeTable } from "./AutoSizeTable";
import { Fields, Filter, Values } from "./Form";

const wuService = new WorkunitsService({ baseUrl: "" });

const FilterFields: Fields = {
    "Type": { type: "checkbox", label: nlsHPCC.ArchivedOnly },
    "Wuid": { type: "string", label: nlsHPCC.WUID, placeholder: "W20200824-060035" },
    "Owner": { type: "string", label: nlsHPCC.Owner, placeholder: nlsHPCC.jsmi },
    "JobName": { type: "string", label: nlsHPCC.JobName, placeholder: nlsHPCC.log_analysis_1 },
    "Cluster": { type: "string", label: nlsHPCC.Cluster, placeholder: nlsHPCC.Owner },
    "State": { type: "string", label: nlsHPCC.State, placeholder: nlsHPCC.Created },
    "ECL": { type: "string", label: nlsHPCC.ECL, placeholder: nlsHPCC.dataset },
    "LogicalFile": { type: "string", label: nlsHPCC.LogicalFile, placeholder: nlsHPCC.somefile },
    "LogicalFileSearchType": { type: "string", label: nlsHPCC.LogicalFileType, placeholder: "" },
    "StartDate": { type: "datetime", label: nlsHPCC.FromDate, placeholder: "" },
    "EndDate": { type: "datetime", label: nlsHPCC.ToDate, placeholder: "" },
    "LastNDays": { type: "string", label: nlsHPCC.LastNDays, placeholder: "2" }
};

export interface WUQueryProps {
    search?: string;
    // Type?: boolean;
    // Wuid?: string;
    // Owner?: string;
    // JobName?: string;
    // Cluster?: string;
    // State?: string;
    // ECL?: string;
    // LogicalFile?: string;
    // LogicalFileSearchType?: string;
    // StartDate?: string;
    // EndDate?: string;
    // LastNDays?: string;

    // orderBy?: string;
    // descending?: boolean;
}

export const WUQueryComponent: React.FunctionComponent<WUQueryProps> = ({
    search
}) => {
    const searchParams = parseSearch(search);

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
        { title: nlsHPCC.TotalClusterTime, field: "TotalClusterTime", width: 117 }
    ].map((row: Column<object>) => {
        if (row.field === searchParams?.orderBy) {
            row.defaultSort = searchParams?.descending === true ? "desc" : "asc";
        }
        return row;
    });

    const [refreshID, setRefreshID] = React.useState(0);
    const refresh = () => setRefreshID(refreshID + 1);

    const [showFilter, setShowFilter] = React.useState(false);

    // React.useEffect(() => {
    //     refresh();
    // }, [props.Type, props.Wuid, props.Owner, props.JobName, props.Cluster, props.State, props.ECL, props.LogicalFile, props.LogicalFileSearchType, props.StartDate, props.EndDate, props.LastNDays, props.orderBy, props.descending]);

    React.useEffect(() => {
        refresh();
    }, [search]);

    const filterFields: Fields = {};
    const filterValues: Values = {};
    for (const field in FilterFields) {
        filterFields[field] = { ...FilterFields[field]/*, value: props[field]*/ };
        // filterValues[field] = props[field];
    }

    console.log("search:  " + search);

    return <>
        <AutoSizeTable
            title={nlsHPCC.Workunits}
            icons={icons}
            columns={columns}
            refreshID={refreshID}
            data={query => {
                console.log("query.search:  ", query);
                pushParam("orderBy", query.orderBy?.field);
                pushParam("descending", query.orderDirection === "desc" ? true : undefined);
                return wuService.WUQuery({
                    ...filterValues,
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
        <Filter showFilter={showFilter} setShowFilter={setShowFilter} filterFields={filterFields} onApply={pushParams} />
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
