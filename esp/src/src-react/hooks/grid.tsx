import * as React from "react";
import { DetailsList, DetailsListLayoutMode, Dropdown, IColumn, ICommandBarItemProps, IDetailsHeaderProps, IStackProps, mergeStyleSets, Selection, Stack, TooltipHost, TooltipOverflowMode } from "@fluentui/react";
import { useConst } from "@fluentui/react-hooks";
import { AlphaNumSortMemory, QueryRequest, QuerySortItem } from "src/Memory";
import * as ESPRequest from "src/ESPRequest";
import nlsHPCC from "src/nlsHPCC";
import { createCopyDownloadSelection } from "../components/Common";
import { DojoGrid } from "../components/DojoGrid";
import { useDeepCallback, useDeepEffect, useDeepMemo } from "./deepHooks";
import { Pagination } from "@fluentui/react-experiments/lib/Pagination";
import { useUserStore } from "./store";
import { useUserTheme } from "./theme";

interface DojoColumn {
    selectorType?: string;
    label?: string;
    field?: string;
    width?: number;
    headerIcon?: string;
    headerTooltip?: string;
    sortable?: boolean;
    disabled?: boolean | ((item: any) => boolean);
    hidden?: boolean;
    formatter?: (object, value, node, options) => any;
    renderCell?: (object, value, node, options) => any;
}

type DojoColumns = { [key: string]: DojoColumn };

interface useGridProps {
    store: any,
    query?: QueryRequest,
    sort?: QuerySortItem,
    columns: object,
    getSelected?: () => any[],
    filename: string
}

interface useGridResponse {
    Grid: React.FunctionComponent,
    selection: any[],
    refreshTable: (clearSelection?: boolean) => void,
    copyButtons: ICommandBarItemProps[]
}

export function useGrid({
    store,
    query,
    sort,
    columns,
    getSelected,
    filename
}: useGridProps): useGridResponse {

    const constStore = useConst(store);
    const constQuery = useConst({ ...query });
    const constSort = useConst({ ...sort });
    const constColumns = useConst({ ...columns });
    const constGetSelected = useConst(() => getSelected);
    const [grid, setGrid] = React.useState<any>(undefined);
    const [selection, setSelection] = React.useState([]);

    const Grid = React.useCallback(() => <DojoGrid
        store={constStore}
        query={constQuery}
        sort={constSort}
        columns={constColumns}
        getSelected={constGetSelected}

        setGrid={setGrid}
        setSelection={setSelection} />,
        [constColumns, constGetSelected, constQuery, constSort, constStore]);

    const refreshTable = useDeepCallback((clearSelection = false) => {
        grid?.set("query", { ...query });
        if (clearSelection) {
            grid?.clearSelection();
        }
    }, [grid], [query]);

    useDeepEffect(() => {
        refreshTable();
    }, [], [query]);

    const copyButtons = React.useMemo((): ICommandBarItemProps[] => [
        ...createCopyDownloadSelection(constColumns, selection, `${filename}.csv`)
    ], [constColumns, filename, selection]);

    return { Grid, selection, refreshTable, copyButtons };
}

function tooltipItemRenderer(item: any, index: number, column: IColumn) {
    const id = `${column.key}-${index}`;
    const value = item[column.fieldName || column.key];
    return <TooltipHost id={id} content={value} overflowMode={TooltipOverflowMode.Parent}>
        {column.data.formatter ?
            <span style={{ display: "flex" }}>{column.data.formatter(value, item)}</span> :
            <span aria-describedby={id}>{value}</span>
        }
    </TooltipHost>;
}

function columnsAdapter(columns: DojoColumns, sorted?: QuerySortItem): IColumn[] {
    const attr = sorted?.attribute;
    const desc = sorted?.descending;
    const retVal: IColumn[] = [];
    for (const key in columns) {
        const column = columns[key];
        if (column?.selectorType === undefined) {
            retVal.push({
                key,
                name: column.label ?? key,
                fieldName: column.field ?? key,
                minWidth: column.width,
                maxWidth: column.width,
                isResizable: true,
                isSorted: key == attr,
                isSortedDescending: key == attr && desc,
                iconName: column.headerIcon,
                isIconOnly: !!column.headerIcon,
                data: column,
                onRender: tooltipItemRenderer
            } as IColumn);
        }
    }
    return retVal;
}

interface useFluentStoreGridProps {
    store: any,
    query?: QueryRequest,
    sort?: QuerySortItem,
    start: number,
    count: number,
    columns: DojoColumns,
    filename: string
}

interface useFluentStoreGridResponse {
    Grid: React.FunctionComponent<{ height?: string }>,
    selection: any[],
    copyButtons: ICommandBarItemProps[],
    total: number,
    refreshTable: (clearSelection?: boolean) => void
}

function useFluentStoreGrid({
    store,
    query,
    sort,
    start,
    count,
    columns,
    filename
}: useFluentStoreGridProps): useFluentStoreGridResponse {

    const memoizedColumns = useDeepMemo(() => ({ ...columns }), [], [columns]);
    const [sorted, setSorted] = React.useState<QuerySortItem>(sort);
    const [selection, setSelection] = React.useState([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [total, setTotal] = React.useState<number>(0);

    const selectionHandler = useConst(new Selection({
        onSelectionChanged: () => {
            setSelection(selectionHandler.getSelection());
        }
    }));

    const refreshTable = React.useCallback((clearSelection = false) => {
        if (isNaN(start) || (isNaN(count) || count === 0)) return;
        if (clearSelection) {
            selectionHandler.setItems([], true);
        }
        const storeQuery = store.query(query ?? {}, { start, count, sort: sorted ? [sorted] : undefined });
        storeQuery.total.then(total => {
            setTotal(total);
        });
        storeQuery.then(items => {
            setItems(items);
        });
    }, [count, query, selectionHandler, sorted, start, store]);

    React.useEffect(() => {
        refreshTable();
    }, [refreshTable]);

    const fluentColumns: IColumn[] = React.useMemo(() => {
        return columnsAdapter(memoizedColumns, sorted);
    }, [memoizedColumns, sorted]);

    const onColumnClick = React.useCallback((event: React.MouseEvent<HTMLElement>, column: IColumn) => {
        if (memoizedColumns[column.key]?.sortable === false) return;

        let sorted = column.isSorted;
        let isSortedDescending: boolean = column.isSortedDescending;
        if (!sorted) {
            sorted = true;
            isSortedDescending = false;
        } else if (!isSortedDescending) {
            isSortedDescending = true;
        } else {
            sorted = false;
            isSortedDescending = false;
        }
        setSorted({
            attribute: sorted ? column.key : "",
            descending: sorted ? isSortedDescending : false
        });
    }, [memoizedColumns]);

    const renderDetailsHeader = React.useCallback((props: IDetailsHeaderProps, defaultRender?: any) => {
        return defaultRender({
            ...props,
            onRenderColumnHeaderTooltip: (tooltipHostProps) => {
                return <TooltipHost {...tooltipHostProps} content={tooltipHostProps?.column?.data?.headerTooltip ?? ""} />;
            },
            styles: { root: { paddingTop: 1 } }
        });
    }, []);

    const Grid = React.useCallback(({ height }) => <DetailsList
        compact={true}
        items={items}
        columns={fluentColumns}
        setKey="set"
        layoutMode={DetailsListLayoutMode.justified}
        selection={selectionHandler}
        selectionPreservedOnEmptyClick={true}
        onItemInvoked={this._onItemInvoked}
        onColumnHeaderClick={onColumnClick}
        onRenderDetailsHeader={renderDetailsHeader}
        styles={{ root: { height, minHeight: height, maxHeight: height } }}
    />, [fluentColumns, items, onColumnClick, renderDetailsHeader, selectionHandler]);

    const copyButtons = React.useMemo((): ICommandBarItemProps[] => [
        ...createCopyDownloadSelection(memoizedColumns, selection, `${filename}.csv`)
    ], [memoizedColumns, filename, selection]);

    return { Grid, selection, copyButtons, total, refreshTable };
}

interface useFluentGridProps {
    data: any[],
    primaryID: string,
    alphaNumColumns?: { [id: string]: boolean },
    sort?: QuerySortItem,
    columns: DojoColumns,
    filename: string
}

export function useFluentGrid({
    data,
    primaryID,
    alphaNumColumns,
    sort,
    columns,
    filename
}: useFluentGridProps): useFluentStoreGridResponse {

    const constStore = useConst(new AlphaNumSortMemory(primaryID, alphaNumColumns));
    const { Grid, selection, copyButtons, total, refreshTable } = useFluentStoreGrid({ store: constStore, columns, sort, filename, start: 0, count: data.length });

    React.useEffect(() => {
        constStore.setData(data);
        refreshTable();
    }, [constStore, data, refreshTable]);

    return { Grid, selection, copyButtons, total, refreshTable };
}

interface useFluentPagedGridProps {
    persistID: string,
    store: ESPRequest.Store,
    query?: QueryRequest,
    sort?: QuerySortItem,
    columns: DojoColumns,
    filename: string
}

interface useFluentPagedGridResponse {
    Grid: React.FunctionComponent<{ height?: string }>,
    GridPagination: React.FunctionComponent<Partial<IStackProps>>,
    selection: any[],
    refreshTable: (clearSelection?: boolean) => void,
    copyButtons: ICommandBarItemProps[]
}

export function useFluentPagedGrid({
    persistID,
    store,
    query,
    sort,
    columns,
    filename
}: useFluentPagedGridProps): useFluentPagedGridResponse {

    const [page, setPage] = React.useState(0);
    const [persistedPageSize, setPersistedPageSize] = useUserStore(`${persistID}_pageSize`, "25");
    const pageSize = React.useMemo(() => {
        const retVal = parseInt(persistedPageSize);
        if (isNaN(retVal)) {
            return 0;
        }
        return retVal;
    }, [persistedPageSize]);
    const { Grid, selection, copyButtons, total, refreshTable } = useFluentStoreGrid({ store, query, sort, start: page * pageSize, count: pageSize, columns, filename });
    const [theme] = useUserTheme();

    const paginationStyles = React.useMemo(() => mergeStyleSets({
        root: {
            padding: "10px 12px 10px 6px",
            display: "grid",
            gridTemplateColumns: "9fr 1fr",
            gridColumnGap: "10px"
        },
        pageControls: {
            ".ms-Pagination-container": {
                flexDirection: "row-reverse",
                justifyContent: "space-between"
            },
            ".ms-Pagination-container > :first-child": {
                display: "flex"
            },
            ".ms-Pagination-container .ms-Button-icon": {
                color: theme.palette.themePrimary
            },
            ".ms-Pagination-container .ms-Pagination-pageNumber": {
                color: theme.palette.neutralDark
            },
            ".ms-Pagination-container button:hover": {
                backgroundColor: theme.palette.neutralLighter
            },
            ".ms-Pagination-container .is-disabled .ms-Button-icon": {
                color: theme.palette.neutralQuaternary
            }
        },
        paginationLabel: {
            fontWeight: 600,
            marginLeft: "6px",
            color: theme.palette.neutralDark,
        }
    }), [theme]);

    const dropdownChange = React.useCallback((evt, option) => {
        const newPageSize = option.key as number;
        setPage(Math.floor((page * pageSize) / newPageSize));
        setPersistedPageSize(`${newPageSize}`);
    }, [page, pageSize, setPersistedPageSize]);

    const GridPagination = React.useCallback(() => {
        return <Stack horizontal className={paginationStyles.root}>
            <Stack.Item className={paginationStyles.pageControls}>
                <Pagination
                    selectedPageIndex={page} itemsPerPage={pageSize} totalItemCount={total}
                    pageCount={Math.ceil(total / pageSize)} format="buttons" onPageChange={index => setPage(Math.round(index))}
                    onRenderVisibleItemLabel={props => {
                        const start = props.selectedPageIndex === 0 ? 1 : (props.selectedPageIndex * props.itemsPerPage) + 1;
                        const end = (props.itemsPerPage * (props.selectedPageIndex + 1)) > props.totalItemCount ? props.totalItemCount : props.itemsPerPage * (props.selectedPageIndex + 1);
                        return <div className={paginationStyles.paginationLabel}>
                            {start} {props.strings.divider} {end} {nlsHPCC.Of.toLowerCase()} {props.totalItemCount} {nlsHPCC.Rows}
                        </div>;
                    }}
                />
            </Stack.Item>
            <Stack.Item align="center">
                <Dropdown id="pageSize" options={[
                    { key: 10, text: "10" },
                    { key: 25, text: "25" },
                    { key: 50, text: "50" },
                    { key: 100, text: "100" },
                    { key: 250, text: "250" },
                    { key: 500, text: "500" },
                    { key: 1000, text: "1000" }
                ]} selectedKey={pageSize} onChange={dropdownChange} />
            </Stack.Item>
        </Stack>;
    }, [dropdownChange, page, pageSize, paginationStyles, total]);

    return { Grid, GridPagination, selection, refreshTable, copyButtons };
}
