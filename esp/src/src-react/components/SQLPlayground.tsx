import * as React from "react";
import { createPortal } from "react-dom";
import { Button, Dropdown, Field, Label, makeStyles, mergeClasses, Option, Spinner, Text } from "@fluentui/react-components";
import { useConst, useOnEvent } from "@fluentui/react-hooks";
import { TableRegular, WarningRegular } from "@fluentui/react-icons";
import { SQLEditor, IPosition } from "@hpcc-js/codemirror";
import { isExceptions, SQL2Service, type WsSQL2 } from "@hpcc-js/comms";
import { Table } from "@hpcc-js/dgrid";
import { graphvizDot, Graphviz as GraphvizViz } from "@hpcc-js/graph";
import { scopedLogger } from "@hpcc-js/util";
import nlsHPCC from "src/nlsHPCC";
import { useUserTheme } from "../hooks/theme";
import { DockPanel, DockPanelItem, ResetableDockPanel } from "../layouts/DockPanel";
import { HolyGrail } from "../layouts/HolyGrail";
import { AutosizeComponent, AutosizeHpccJSComponent } from "../layouts/HpccJSAdapter";
import { InfoGrid } from "./InfoGrid";
import { OverflowTabList, type TabInfo } from "./controls/TabbedPanes/index";

import "hpcc/css/cmDarcula.css";
import "src-react-css/components/DojoGrid.css";

const logger = scopedLogger("src-react/components/SQLPlayground.tsx");

const FETCH_SIZE = 1000;
const RESULT_PAGE_SIZE = 50;

interface ExecutionGraphResponse {
    ExecutionGraph?: string;
    ExecutionGraphJson?: string;
}

type SQLTimings = Pick<WsSQL2.ExecuteQueryResponse, "InitMs" | "PrepareMs"> & Pick<WsSQL2.FetchResultSetResponse, "ExecuteMs">;

interface SQLResult {
    columns: string[];
    rows: unknown[][];
}

interface SQLStatementOutput {
    result: SQLResult;
    explain?: ExecutionGraphResponse;
    timings?: SQLTimings;
    elapsed: string;
}

interface ECLSampleManifest {
    items: {
        filename: string;
        name: string;
        selected?: boolean;
    }[];
}

interface SQLSampleManifest {
    items: {
        filename: string;
        sql: string;
    }[];
}

type SQLPlaygroundSample = ECLSampleManifest["items"][number] & { sql: string };

interface PlanNode {
    name: string;
    rows?: number;
    time?: number;
    children?: PlanNode[];
    extra_info?: { [key: string]: string | string[] };
}

interface SQLError {
    Severity: string;
    Code?: number | string;
    Message: string;
    LineNo?: number;
    Column?: number;
}

function toSQLErrors(e: unknown): SQLError[] {
    const exceptions = isExceptions(e) ? e.Exception : [{ Message: (e as Error)?.message ?? String(e) }];
    return exceptions.map(ex => {
        const lineMatch = /LINE (\d+):/.exec(ex.Message ?? "");
        return {
            Severity: "Error",
            Code: ex.Code,
            Message: ex.Message ?? "",
            LineNo: lineMatch ? parseInt(lineMatch[1], 10) : undefined
        };
    });
}

//  Plan -> DOT  ---
function dotEscape(str: string): string {
    return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, "\\n");
}

//  ExecutionGraphJson is either a static plan (array of {name, children, extra_info})
//  or, when analyzed, a DuckDB profile (root object with latency + children of {operator_name, operator_cardinality, operator_timing, ...})
interface ProfileNode {
    name?: string;
    operator_name?: string;
    operator_cardinality?: number;
    operator_timing?: number;
    latency?: number;
    children?: ProfileNode[];
    extra_info?: { [key: string]: string | string[] };
}

interface ParsedPlan {
    nodes: PlanNode[];
    totalTime?: number;
}

function formatSeconds(seconds: number): string {
    return `${seconds.toFixed(4)}s`;
}

function formatMilliseconds(milliseconds: number): string {
    return `${milliseconds.toFixed(2)} ms`;
}

function compactExecutionGraph(graph?: string): string {
    return (graph ?? "")
        .replace(/(?:\r?\n)[ \t]*(?:\r?\n)+/g, "\n")
        .replace(/^[ \t]*\u2502\s*\u2502[ \t]*(?:\r?\n)?/gm, "");
}

function clientElapsed(start: number): string {
    return `${((performance.now() - start) / 1000).toFixed(2)}s`;
}

function parseRows(rows?: string): unknown[][] {
    return rows ? JSON.parse(rows) : [];
}

function parseResult(metadata: WsSQL2.ResultSetMetadata | undefined, rows: unknown[][]): SQLResult {
    return {
        columns: (metadata?.Column ?? []).map(column => column.ColumnLabel ?? ""),
        rows
    };
}

function toExecutionGraph(response: Partial<WsSQL2.ExplainQueryResponse & WsSQL2.FetchResultSetResponse>): ExecutionGraphResponse {
    return {
        ExecutionGraph: response.RuntimeGraph ?? response.Plan,
        ExecutionGraphJson: response.RuntimeGraphJson ?? response.PlanJson
    };
}

function toPlanNode(node: ProfileNode): PlanNode {
    return {
        name: node.operator_name ?? node.name ?? "",
        rows: node.operator_cardinality,
        time: node.operator_timing,
        extra_info: node.extra_info,
        children: (node.children ?? []).map(toPlanNode)
    };
}

function parsePlan(planJson: string): ParsedPlan {
    const parsed: ProfileNode | ProfileNode[] = JSON.parse(planJson);
    if (Array.isArray(parsed)) {
        return { nodes: parsed.map(toPlanNode) };
    }
    if (parsed.operator_name === undefined && parsed.name === undefined) {
        return { nodes: (parsed.children ?? []).map(toPlanNode), totalTime: parsed.latency };
    }
    return { nodes: [toPlanNode(parsed)] };
}

function planToDot(plan: PlanNode[]): string {
    const lines: string[] = [];
    let nextID = 0;
    const visit = (node: PlanNode): string => {
        const id = `n${nextID++}`;
        const labelLines = [node.name];
        if (node.rows !== undefined) labelLines.push(`${nlsHPCC.Rows}: ${node.rows.toLocaleString()}`);
        if (node.time !== undefined) labelLines.push(`${nlsHPCC.Time}: ${formatSeconds(node.time)}`);
        for (const [key, value] of Object.entries(node.extra_info ?? {})) {
            const valueStr = Array.isArray(value) ? value.join(", ") : String(value);
            labelLines.push(`${key}: ${valueStr}`);
        }
        const shape = node.name.endsWith("_SCAN") ? "cylinder" : "box";
        lines.push(`    ${id} [label="${labelLines.map(dotEscape).join("\\n")}" shape="${shape}"];`);
        for (const child of node.children ?? []) {
            const childID = visit(child);
            lines.push(`    ${childID} -> ${id};`);
        }
        return id;
    };
    plan.forEach(visit);
    return `digraph G {\n    graph [fontname="arial" fontsize=11];\n    node [fontname="arial" fontsize=11 style="rounded"];\n${lines.join("\n")}\n}`;
}

const DEFAULT_SQL = "SELECT *\nFROM hpcc_scan('regress::multi::dg_flat')\nLIMIT 100";

const enum OutputMode {
    ERRORS = "errors",
    RESULTS = "results"
}

const borderStyle = "1px solid darkgrey";

const useStyles = makeStyles({
    root: {
        height: "100%",
        border: borderStyle,
        "& .fui-Button": {
            height: "min-content"
        },
        "& .fui-Label": {
            lineHeight: "32px",
            margin: "0 10px",
            padding: "0"
        }
    },
    titleBar: {
        padding: "4px 8px",
        height: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: borderStyle
    },
    title: {
        fontSize: "24px",
        lineHeight: "24px",
        fontWeight: "bold",
        display: "inline-block",
        margin: "0",
    },
    headerControls: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    samplesWrapper: {
        display: "flex"
    },
    inlineDropdown: {
        display: "flex",
        maxHeight: "32px",
        minWidth: "320px",
    },
    samplesDropdown: {
        minWidth: "220px",
        width: "220px"
    },
    resultsContainer: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0
    },
    resultTabContent: {
        flexGrow: 1,
        minHeight: 0
    },
    toolBar: {
        display: "flex",
        flexDirection: "row",
        padding: "6px 0 0 0"
    },
    controlsWrapper: {
        display: "flex",
        flexGrow: 1
    },
    outputButtons: {
        display: "flex",
        marginLeft: "18px"
    },
    statusMessage: {
        alignSelf: "center",
        minWidth: "100px",
        paddingRight: "8px"
    },
    planInfo: {
        display: "flex",
        flexDirection: "column",
        padding: "4px 8px",
        borderBottom: borderStyle
    },
    centered: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%"
    },
    outputResults: {
        display: "flex",
        flexDirection: "column",
        height: "100%"
    },
    outputResult: {
        position: "relative",
        flexGrow: 1,
        minHeight: 0
    }
});

//  Explain Graph  ---
interface ExplainGraphProps {
    explain?: ExecutionGraphResponse;
    timings?: SQLTimings;
}

const ExplainGraph: React.FunctionComponent<ExplainGraphProps> = ({
    explain,
    timings
}) => {
    const styles = useStyles();
    const { isDark } = useUserTheme();
    const [svg, setSvg] = React.useState("");
    const [layoutError, setLayoutError] = React.useState("");

    const widget = useConst(() => new GraphvizViz.SVGWidget());

    const [totalTime, setTotalTime] = React.useState<number>();

    React.useEffect(() => {
        setSvg("");
        setLayoutError("");
        setTotalTime(undefined);
        if (!explain?.ExecutionGraphJson) return;
        let plan: ParsedPlan;
        try {
            plan = parsePlan(explain.ExecutionGraphJson);
        } catch (e) {
            setLayoutError((e as Error).message);
            return;
        }
        setTotalTime(plan.totalTime);
        const worker = graphvizDot(planToDot(plan.nodes), "dot", "svg");
        let cancelled = false;
        worker.response.then(response => {
            if (!cancelled) setSvg(response);
        }).catch(e => {
            if (!cancelled) setLayoutError(String(e?.message ?? e));
        });
        return () => {
            cancelled = true;
            worker.terminate();
        };
    }, [explain]);

    React.useEffect(() => {
        widget.svg(svg).lazyRender();
    }, [svg, widget]);

    return <HolyGrail
        header={(explain || timings) && <div className={styles.planInfo}>
            {timings?.InitMs !== undefined && <Text size={200}><b>{nlsHPCC.SQLInitializationTime}:</b> {formatMilliseconds(timings.InitMs)}</Text>}
            {timings?.PrepareMs !== undefined && <Text size={200}><b>{nlsHPCC.SQLPreparationTime}:</b> {formatMilliseconds(timings.PrepareMs)}</Text>}
            {timings?.ExecuteMs !== undefined && <Text size={200}><b>{nlsHPCC.SQLExecutionTime}:</b> {formatMilliseconds(timings.ExecuteMs)}</Text>}
            {totalTime !== undefined && <Text size={200}><b>{nlsHPCC.Time}:</b> {formatSeconds(totalTime)}</Text>}
        </div>}
        main={layoutError ?
            <pre style={{ margin: 8, overflow: "auto" }}>{explain?.ExecutionGraph || layoutError}</pre> :
            <AutosizeHpccJSComponent widget={widget} hidden={!svg} style={{ colorScheme: isDark ? "dark" : "light", "--lightningcss-light": isDark ? " " : "initial", "--lightningcss-dark": isDark ? "initial" : " " } as React.CSSProperties} />
        }
    />;
};

//  Results Grid  ---
interface SQLResultGridProps {
    result?: SQLResult;
}

const SQLResultGrid: React.FunctionComponent<SQLResultGridProps> = ({
    result
}) => {
    const table = useConst(() => new Table()
        .pagination(true)
        .pageSize(RESULT_PAGE_SIZE)
        .sortable(true)
    );

    React.useEffect(() => {
        const data = (result?.rows ?? []).map(row => row.map(value => value !== null && typeof value === "object" ? JSON.stringify(value) : value));
        table
            .columns([])
            .columns(result?.columns ?? [])
            .data(data)
            .lazyRender()
            ;
    }, [result, table]);

    return <AutosizeHpccJSComponent widget={table} />;
};

//  Playground  ---
interface SQLPlaygroundProps {
    sql?: string;
}

export const SQLPlayground: React.FunctionComponent<SQLPlaygroundProps> = ({
    sql
}) => {
    const styles = useStyles();
    const { isDark } = useUserTheme();
    const sql2Service = React.useMemo(() => new SQL2Service({ baseUrl: "" }), []);

    const [dockpanel, setDockpanel] = React.useState<ResetableDockPanel>();
    const [toolbarContainer, setToolbarContainer] = React.useState<HTMLElement | null>(null);
    const [outputMode, setOutputMode] = React.useState<OutputMode>(OutputMode.ERRORS);
    const [samples, setSamples] = React.useState<SQLPlaygroundSample[]>([]);
    const [selectedSample, setSelectedSample] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [errors, setErrors] = React.useState<SQLError[]>([]);
    const [explain, setExplain] = React.useState<ExecutionGraphResponse>();
    const [timings, setTimings] = React.useState<SQLTimings>();
    const [outputs, setOutputs] = React.useState<SQLStatementOutput[]>([]);
    const [selectedOutputIndex, setSelectedOutputIndex] = React.useState(0);
    const [status, setStatus] = React.useState("");
    const abortController = React.useRef<AbortController | null>(null);
    const cursorIDs = React.useRef<string[]>([]);

    const result = outputs[selectedOutputIndex]?.result;

    const outputTabs = React.useMemo((): TabInfo[] => outputs.map((_, index) => ({
        id: String(index),
        label: `${nlsHPCC.Result} ${index + 1}`
    })), [outputs]);

    const editor = useConst(() => new SQLEditor());

    React.useEffect(() => {
        editor.option("theme", isDark ? "darcula" : "default");
    }, [editor, isDark]);

    React.useEffect(() => {
        editor.sql(sql ?? DEFAULT_SQL);
    }, [editor, sql]);

    React.useEffect(() => {
        let cancelled = false;
        const loadSamples = async () => {
            const [eclResponse, sqlResponse] = await Promise.all([
                fetch("/esp/files/eclwatch/ecl/ECLPlaygroundSamples.json"),
                fetch("/esp/files/eclwatch/ecl/SQLPlaygroundSamples.json")
            ]);
            if (!eclResponse.ok || !sqlResponse.ok) {
                throw new Error("Unable to load SQL Playground samples");
            }
            const [eclManifest, sqlManifest] = await Promise.all([
                eclResponse.json() as Promise<ECLSampleManifest>,
                sqlResponse.json() as Promise<SQLSampleManifest>
            ]);
            const sqlByFilename = new Map(sqlManifest.items.map(sample => [sample.filename, sample.sql]));
            const missingSamples = eclManifest.items.filter(sample => !sqlByFilename.has(sample.filename));
            if (missingSamples.length || sqlByFilename.size !== eclManifest.items.length) {
                throw new Error(`SQL sample catalog does not match ECL samples: ${missingSamples.map(sample => sample.filename).join(", ")}`);
            }
            const nextSamples = eclManifest.items.map(sample => ({
                ...sample,
                sql: sqlByFilename.get(sample.filename)!
            }));
            if (cancelled) return;
            setSamples(nextSamples);
            if (sql === undefined) {
                const selected = nextSamples.find(sample => sample.selected);
                if (selected) {
                    setSelectedSample(selected.filename);
                    editor.sql(selected.sql);
                }
            }
        };
        loadSamples().catch(error => logger.error(error));
        return () => {
            cancelled = true;
        };
    }, [editor, sql]);

    React.useEffect(() => {
        if (dockpanel) {
            //  Should only happen once on startup  ---
            const layout: any = dockpanel.layout();
            if (Array.isArray(layout?.main?.sizes) && layout.main.sizes.length === 2) {
                layout.main.sizes = [0.6, 0.4];
                dockpanel.layout(layout).lazyRender();
            }
        }
    }, [dockpanel]);

    const highlightErrors = React.useCallback((errs: SQLError[]) => {
        editor.removeAllHighlight();
        errs.filter(err => err.LineNo > 0).forEach(err => {
            const line = err.LineNo - 1;
            const startPos: IPosition = { ch: 0, line };
            const endPos: IPosition = { ch: editor.getLineLength(line), line };
            editor.highlightError(startPos, endPos);
        });
    }, [editor]);

    const showErrors = React.useCallback((errs: SQLError[]) => {
        setErrors(errs);
        highlightErrors(errs);
        if (errs.length) {
            setOutputMode(OutputMode.ERRORS);
        }
    }, [highlightErrors]);

    const startRequest = React.useCallback(() => {
        abortController.current?.abort();
        abortController.current = new AbortController();
        return abortController.current.signal;
    }, []);

    const showResult = React.useCallback((parsed: SQLResult, elapsed: string) => {
        setOutputMode(OutputMode.RESULTS);
        setStatus(`${parsed.rows.length} ${nlsHPCC.Rows} - ${elapsed}`);
    }, []);

    const closeCursor = React.useCallback((cursorId?: string) => {
        if (cursorId) {
            cursorIDs.current = cursorIDs.current.filter(id => id !== cursorId);
            sql2Service.CloseResultSet({ CursorId: cursorId }).catch(err => logger.error(err));
        }
    }, [sql2Service]);

    const closeCursors = React.useCallback(() => {
        const cursorIds = cursorIDs.current;
        cursorIDs.current = [];
        cursorIds.forEach(cursorId => {
            sql2Service.CloseResultSet({ CursorId: cursorId }).catch(err => logger.error(err));
        });
    }, [sql2Service]);

    const runSQL = React.useCallback(async (analyze: boolean, sqlText = editor.sql()) => {
        const signal = startRequest();
        closeCursors();
        setOutputs([]);
        setSelectedOutputIndex(0);
        setBusy(true);
        setStatus("");
        setExplain(undefined);
        setTimings(undefined);
        showErrors([]);
        const start = performance.now();
        try {
            const splitResponse = await sql2Service.SplitQuery({ SqlText: sqlText }, signal);
            if (signal.aborted) return;
            const statements = (splitResponse.Statements?.Statement ?? []).filter(statement => statement.trim());
            const nextOutputs: SQLStatementOutput[] = [];
            const explainErrors: SQLError[] = [];
            for (const statement of statements) {
                if (signal.aborted) return;
                const [executeOutcome, explainOutcome] = await Promise.allSettled([
                    sql2Service.ExecuteQuery({
                        SqlText: statement,
                        IncludeRuntimeGraph: analyze,
                        IncludeResultSetMetadata: true
                    }, signal),
                    sql2Service.ExplainQuery({ SqlText: statement }, signal)
                ]);
                if (signal.aborted) return;
                if (executeOutcome.status === "rejected") throw executeOutcome.reason;
                const response = executeOutcome.value;
                const hasOutput = !!response.CursorId || !!response.ResultSetMetadata?.Column?.length;
                const rows: unknown[][] = [];
                let executeMs: number | undefined;
                let runtimeGraph: WsSQL2.FetchResultSetResponse | undefined;
                if (response.CursorId) {
                    cursorIDs.current.push(response.CursorId);
                    let complete = false;
                    while (!complete) {
                        const fetched = await sql2Service.FetchResultSet({
                            CursorId: response.CursorId,
                            FetchSize: FETCH_SIZE
                        }, signal);
                        if (signal.aborted) return;
                        const fetchedRows = parseRows(fetched.Rows);
                        rows.push(...fetchedRows);
                        if (fetched.ExecuteMs !== undefined) executeMs = (executeMs ?? 0) + fetched.ExecuteMs;
                        if (fetched.RuntimeGraph || fetched.RuntimeGraphJson) runtimeGraph = fetched;
                        complete = fetched.Complete ?? fetchedRows.length < FETCH_SIZE;
                    }
                    closeCursor(response.CursorId);
                }
                if (!hasOutput) continue;

                let outputExplain: ExecutionGraphResponse | undefined;
                let totalTime: number | undefined;
                if (explainOutcome.status === "fulfilled") {
                    outputExplain = toExecutionGraph(explainOutcome.value);
                } else {
                    explainErrors.push(...toSQLErrors(explainOutcome.reason));
                }
                const graphJson = runtimeGraph?.RuntimeGraphJson ?? (explainOutcome.status === "fulfilled" ? explainOutcome.value.PlanJson : undefined);
                if (runtimeGraph) {
                    outputExplain = toExecutionGraph(runtimeGraph);
                }
                try {
                    totalTime = graphJson ? parsePlan(graphJson).totalTime : undefined;
                } catch {
                    totalTime = undefined;
                }
                nextOutputs.push({
                    result: parseResult(response.ResultSetMetadata, rows),
                    explain: outputExplain,
                    timings: { InitMs: response.InitMs, PrepareMs: response.PrepareMs, ExecuteMs: executeMs },
                    elapsed: totalTime !== undefined ? formatSeconds(totalTime) : clientElapsed(start)
                });
            }

            setOutputs(nextOutputs);
            if (nextOutputs.length) {
                setSelectedOutputIndex(0);
                setExplain(nextOutputs[0].explain);
                setTimings(nextOutputs[0].timings);
                showResult(nextOutputs[0].result, nextOutputs[0].elapsed);
            } else {
                setOutputMode(OutputMode.RESULTS);
                setStatus(nlsHPCC.noDataMessage);
            }
            if (explainErrors.length) {
                showErrors(explainErrors);
            }
        } catch (e) {
            if ((e as Error)?.name === "AbortError") return;
            closeCursors();
            setOutputs([]);
            showErrors(toSQLErrors(e));
        } finally {
            if (!signal.aborted) setBusy(false);
        }
    }, [closeCursor, closeCursors, editor, showErrors, showResult, sql2Service, startRequest]);

    const onOutputTabSelect = React.useCallback((tab: TabInfo) => {
        const index = Number(tab.id);
        const output = outputs[index];
        if (!output) return;
        setSelectedOutputIndex(index);
        setExplain(output.explain);
        setTimings(output.timings);
        showResult(output.result, output.elapsed);
    }, [outputs, showResult]);

    const submitSQL = React.useCallback(() => runSQL(false), [runSQL]);
    const analyzeSQL = React.useCallback(() => runSQL(true), [runSQL]);

    React.useEffect(() => {
        return () => {
            abortController.current?.abort();
            closeCursors();
        };
    }, [closeCursors]);

    const handleKeyUp = React.useCallback((evt: KeyboardEvent) => {
        if (evt.key === "Enter" && evt.ctrlKey) {
            submitSQL();
        }
    }, [submitSQL]);
    useOnEvent(window, "keyup", handleKeyUp);

    const busySpinner = <div className={styles.centered}><Spinner size="large" /></div>;

    return <div className={styles.root}>
        <HolyGrail
            header={
                <div className={styles.titleBar}>
                    <h1 className={styles.title}>{nlsHPCC.title_SQLPlayground}</h1>
                    <div className={styles.headerControls}>
                        <Field className={styles.samplesWrapper} label={nlsHPCC.Sample}>
                            <Dropdown
                                className={mergeClasses(styles.inlineDropdown, styles.samplesDropdown)}
                                selectedOptions={selectedSample ? [selectedSample] : []}
                                value={samples.find(sample => sample.filename === selectedSample)?.name ?? ""}
                                placeholder={nlsHPCC.Sample}
                                onOptionSelect={(_, data) => {
                                    const sample = samples.find(item => item.filename === data.optionValue);
                                    if (sample) {
                                        setSelectedSample(sample.filename);
                                        editor.sql(sample.sql);
                                    }
                                }}
                            >
                                {samples.map(sample => <Option key={sample.filename} value={sample.filename}>{sample.name}</Option>)}
                            </Dropdown>
                        </Field>
                    </div>
                </div>
            }
            main={
                <DockPanel hideSingleTabs onCreate={setDockpanel}>
                    <DockPanelItem key="sqlEditor" title={nlsHPCC.SQL}>
                        <HolyGrail
                            main={<AutosizeHpccJSComponent widget={editor} padding={4} />}
                            footer={<div ref={setToolbarContainer} />}
                        />
                    </DockPanelItem>
                    <DockPanelItem key="graph" title={nlsHPCC.Graphs} location="split-right" relativeTo="sqlEditor">
                        {busy ? busySpinner : <ExplainGraph explain={explain} timings={timings} />}
                    </DockPanelItem>
                    <DockPanelItem key="metrics" title={nlsHPCC.Plan} location="tab-after" relativeTo="graph">
                        {busy ? busySpinner : <pre style={{ margin: 8, height: "calc(100% - 16px)", overflow: "auto", lineHeight: 1.1 }}>{compactExecutionGraph(explain?.ExecutionGraph)}</pre>}
                    </DockPanelItem>
                    <DockPanelItem key="output" title={nlsHPCC.Outputs} location="split-bottom" relativeTo="sqlEditor">
                        {busy ? busySpinner :
                            outputMode === OutputMode.RESULTS ?
                                (result ?
                                    <div className={styles.outputResults}>
                                        <OverflowTabList tabs={outputTabs} selected={String(selectedOutputIndex)} onTabSelect={onOutputTabSelect} size="medium" />
                                        <div className={styles.outputResult}>
                                            <SQLResultGrid result={result} />
                                        </div>
                                    </div> :
                                    <AutosizeComponent><Label>{nlsHPCC.noDataMessage}</Label></AutosizeComponent>) :
                                <InfoGrid syntaxErrors={errors} sqlPlayground />
                        }
                    </DockPanelItem>
                </DockPanel>
            }
        />
        {toolbarContainer && createPortal(
            <div className={styles.toolBar}>
                <div className={styles.controlsWrapper}>
                    <Button appearance="primary" onClick={submitSQL} disabled={busy}>{nlsHPCC.Submit}</Button>
                    <Button onClick={analyzeSQL} disabled={busy}>{nlsHPCC.Analyze}</Button>
                    <div className={styles.outputButtons}>
                        <Button
                            icon={<WarningRegular />}
                            aria-label={nlsHPCC.ErrorWarnings}
                            onClick={() => setOutputMode(OutputMode.ERRORS)}
                            appearance={outputMode === OutputMode.ERRORS ? undefined : "subtle"}
                        />
                        <Button
                            icon={<TableRegular />}
                            aria-label={nlsHPCC.Results}
                            onClick={() => setOutputMode(OutputMode.RESULTS)}
                            appearance={outputMode === OutputMode.RESULTS ? undefined : "subtle"}
                            disabled={!result}
                        />
                    </div>
                </div>
                <div className={styles.statusMessage}>{status}</div>
            </div>,
            toolbarContainer
        )}
    </div>;
};
