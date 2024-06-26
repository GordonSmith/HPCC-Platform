import * as React from "react";
import { CommandBar, ContextualMenuItemType, ICommandBarItemProps, SelectionMode } from "@fluentui/react";
import { IScope } from "@hpcc-js/comms";
import { ICompletion } from "@hpcc-js/codemirror";
import { SizeMe } from "react-sizeme";
import nlsHPCC from "src/nlsHPCC";
import { useDuckDBConnection } from "../hooks/duckdb";
import { pivotItemStyle } from "../layouts/pivot";
import { FluentGrid, useCopyButtons, useFluentStoreState, FluentColumns } from "./controls/Grid";
import { ShortVerticalDivider } from "./Common";
import { SourceEditor } from "./SourceEditor";

const defaultUIState = {
    hasSelection: false
};

interface MetricsDataProps {
    scopes: IScope[];
}

export const MetricsData: React.FunctionComponent<MetricsDataProps> = ({
    scopes
}) => {

    const cleanScopes = React.useMemo(() => {
        return scopes.map(scope => {
            const retVal = { ...scope };
            delete retVal.__children;
            return retVal;
        });
    }, [scopes]);

    const connection = useDuckDBConnection(cleanScopes, "metrics");
    const [schema, setSchema] = React.useState<any[]>([]);
    const [_schemaError, setSchemaError] = React.useState<Error>();
    const [sql, setSql] = React.useState<string>("SELECT type, name, TimeElapsed FROM metrics WHERE TimeElapsed IS NOT NULL");
    const [_sqlError, setSqlError] = React.useState<Error>();
    const [dirtySql, setDirtySql] = React.useState<string>(sql);
    const [data, setData] = React.useState<any[]>([]);
    const [_uiState, setUIState] = React.useState({ ...defaultUIState });
    const {
        selection, setSelection,
        setTotal,
        refreshTable } = useFluentStoreState({});

    React.useEffect(() => {
        if (cleanScopes.length === 0) {
            setSchema([]);
            setData([]);
        } else if (connection) {
            try {
                connection.query(`DESCRIBE ${sql}`).then(result => {
                    setSchemaError(undefined);
                    if (connection) {
                        setSchema(result.toArray().map((row) => row.toJSON()));
                    }
                }).catch(e => {
                    setSchemaError(e);
                    setSchema([]);
                });
                connection.query(sql).then(result => {
                    setSqlError(undefined);
                    if (connection) {
                        setData(result.toArray().map((row) => row.toJSON()));
                    }
                }).catch(e => {
                    setSqlError(e);
                    setData([]);
                });
            } catch (e) {
                console.log(e.message);
                setSchema([]);
                setData([]);
            }
        }
    }, [cleanScopes.length, connection, sql]);

    //  Grid ---
    const columns = React.useMemo((): FluentColumns => {
        const retVal: FluentColumns = {};
        schema.forEach(col => {
            /*
            {
                column_name: "CostCompile",
                column_type: "DOUBLE",
                null: "YES",
                key: null,
                default: null,
                extra: null,
            }
            */
            retVal[col.column_name] = {
                label: col.column_name,
                sortable: true
            };
        });
        return retVal;
    }, [schema]);

    //  Command Bar  ---
    const buttons = React.useMemo((): ICommandBarItemProps[] => [
        {
            key: "reset", text: nlsHPCC.Reset, iconProps: { iconName: "Refresh" },
            onClick: () => { }
        },
        {
            key: "submit", text: nlsHPCC.Submit, iconProps: { iconName: "Play" },
            onClick: () => setSql(dirtySql)
        },
        { key: "divider_1", itemType: ContextualMenuItemType.Divider, onRender: () => <ShortVerticalDivider /> },
    ], [dirtySql]);

    const copyButtons = useCopyButtons(columns, selection, "metrics");

    //  Selection  ---
    React.useEffect(() => {
        const state = { ...defaultUIState };

        for (let i = 0; i < selection.length; ++i) {
            state.hasSelection = true;
            break;
        }
        setUIState(state);
    }, [selection]);

    const onChange = React.useCallback((newSql: string) => {
        setDirtySql(newSql);
    }, []);

    const onFetchHints = React.useCallback((cm, option): Promise<ICompletion | null> => {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        let start = cursor.ch;
        let end = cursor.ch;
        while (start && /\w/.test(line.charAt(start - 1))) --start;
        while (end < line.length && /\w/.test(line.charAt(end))) ++end;
        if (connection) {
            return connection.query(`SELECT * FROM sql_auto_complete("${dirtySql.substring(0, end)}")`).then(result => {
                if (connection) {
                    const hints = result.toArray().map((row) => row.toJSON());
                    const suggestion_start = hints.length ? hints[0].suggestion_start : end;
                    return {
                        list: hints.map(row => row.suggestion),
                        from: cm.posFromIndex(suggestion_start),
                        to: cm.posFromIndex(end),
                        // from: suggestion_start,
                        // to: suggestion_start + 1
                        // from: suggestion_start,
                        // to: end
                    };
                }
            }).catch(e => {
                console.log(e.message);
                return Promise.resolve(null);
            });
        }
        return Promise.resolve(null);
    }, [connection, dirtySql]);

    const onSubmit = React.useCallback(() => {
        setSql(dirtySql);
    }, [dirtySql]);

    return <div style={{ height: "100%", overflowY: "hidden" }}>
        <CommandBar items={buttons} farItems={copyButtons} />
        <div style={{ width: "100%", height: "80px" }}>
            <SourceEditor text={sql} mode="sql" toolbar={false} onChange={onChange} onFetchHints={onFetchHints} onSubmit={onSubmit}></SourceEditor>
        </div>
        <SizeMe monitorHeight >{({ size }) =>
            <div style={{ height: "100%", overflowY: "hidden" }}>
                <div style={{ ...pivotItemStyle(size), overflowY: "hidden" }}>
                    <FluentGrid
                        data={data}
                        primaryID={"__hpcc_id"}
                        alphaNumColumns={{ Name: true, Value: true }}
                        columns={columns}
                        setSelection={setSelection}
                        setTotal={setTotal}
                        refresh={refreshTable}
                        height={`${size.height - (80 + 8 + 45 + 12)}px`}
                        selectionMode={SelectionMode.none}
                    ></FluentGrid>
                </div>
            </div>
        }</SizeMe>
    </div>;
};
