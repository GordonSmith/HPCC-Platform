import * as React from "react";
import Lock from "@material-ui/icons/LockOutlined";
import { WorkunitsService } from "@hpcc-js/comms";
import nlsHPCC from "../../nlsHPCC";
import { icons } from "../util/table";
import { AutoSizeTable } from "./AutoSizeTable";

const wuService = new WorkunitsService({ baseUrl: "" });

export interface WUQueryComponent {
}

export const WUQueryComponent: React.FunctionComponent<WUQueryComponent> = () => {

    return <AutoSizeTable
        title={nlsHPCC.Workunits}
        icons={icons}
        columns={[
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
        ].map(row => ({ ...row, cellStyle: { padding: "0.0em" } }))}
        data={query => {
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
            exportButton: true,
            selection: true,
            fixedColumns: {
                left: 2
            }
        }}
        actions={[
            {
                tooltip: nlsHPCC.Delete,
                icon: icons.Delete as any,
                onClick: (evt, data: any[]) => alert("You want to delete " + data.length + " rows")
            }
        ]}
    />;
};
