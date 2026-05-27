import * as React from "react";
import { DockPanel, DockPanelItem } from "../layouts/DockPanel";
import { FluentGrid, useFluentStoreState, FluentColumns, SelectionMode } from "./controls/Grid";

const sampleData1 = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    status: i % 3 === 0 ? "Error" : i % 3 === 1 ? "Warning" : "OK",
    value: Math.round(Math.random() * 1000)
}));

const sampleData2 = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    file: `/path/to/file_${i}.ecl`,
    size: Math.round(Math.random() * 10000),
    modified: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString().slice(0, 10)
}));

const sampleData3 = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    cluster: `cluster_${i % 5}`,
    job: `job_${i}`,
    duration: Math.round(Math.random() * 600),
    state: i % 4 === 0 ? "Running" : i % 4 === 1 ? "Completed" : i % 4 === 2 ? "Failed" : "Queued"
}));

const columns1: FluentColumns = {
    name: { label: "Name", width: 150, sortable: true },
    status: { label: "Status", width: 80, sortable: true },
    value: { label: "Value", width: 80, sortable: true }
};

const columns2: FluentColumns = {
    file: { label: "File", sortable: true, fluentColumn: { flexGrow: 1, minWidth: 200, isResizable: true } },
    size: { label: "Size", width: 80, sortable: true },
    modified: { label: "Modified", width: 100, sortable: true }
};

const columns3: FluentColumns = {
    cluster: { label: "Cluster", width: 100, sortable: true },
    job: { label: "Job", width: 120, sortable: true },
    duration: { label: "Duration (s)", width: 100, sortable: true },
    state: { label: "State", width: 80, sortable: true }
};

const GridPanel: React.FunctionComponent<{ data: any[], columns: FluentColumns }> = ({ data, columns }) => {
    const { setSelection, setTotal, refreshTable } = useFluentStoreState({});

    return <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <FluentGrid
            data={data}
            primaryID="id"
            columns={columns}
            setSelection={setSelection}
            setTotal={setTotal}
            refresh={refreshTable}
            height="100%"
            selectionMode={SelectionMode.multiple}
        />
    </div>;
};

export const DockPanelTest: React.FunctionComponent = () => {
    return <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <DockPanel hideSingleTabs={false}>
            <DockPanelItem key="grid1" title="Items">
                <GridPanel data={sampleData1} columns={columns1} />
            </DockPanelItem>
            <DockPanelItem key="grid2" title="Files" location="split-right" relativeTo="grid1">
                <GridPanel data={sampleData2} columns={columns2} />
            </DockPanelItem>
            <DockPanelItem key="grid3" title="Jobs" location="split-bottom" relativeTo="grid1">
                <GridPanel data={sampleData3} columns={columns3} />
            </DockPanelItem>
        </DockPanel>
    </div>;
};
