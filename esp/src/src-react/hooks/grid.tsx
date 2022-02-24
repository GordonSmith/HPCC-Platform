import * as React from "react";
import { DetailsList, DetailsListLayoutMode, Dropdown, IColumn, ICommandBarItemProps, IDetailsHeaderProps, Label, Selection, Stack, TooltipHost, TooltipOverflowMode } from "@fluentui/react";
import { useConst } from "@fluentui/react-hooks";
import { AlphaNumSortMemory } from "src/Memory";
import * as ESPRequest from "src/ESPRequest";
import nlsHPCC from "src/nlsHPCC";
import { createCopyDownloadSelection } from "../components/Common";
import { DojoGrid } from "../components/DojoGrid";
import { useDeepCallback, useDeepEffect } from "./deepHooks";
import { Pagination } from "@fluentui/react-experiments/lib/Pagination";

interface useGridProps {
    store: any,
    query?: object,
    sort?: object[],
    columns: object,
    getSelected?: () => any[],
    filename: string
}

export function useGrid({ store, query = {}, sort = [], columns, getSelected, filename }: useGridProps): [React.FunctionComponent, any[], (clearSelection?: boolean) => void, ICommandBarItemProps[]] {

    const constStore = useConst(store);
    const constQuery = useConst({ ...query });
    const constSort = useConst([...sort]);
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

    return [Grid, selection, refreshTable, copyButtons];
}

interface Sorted {
    column: string;
    descending: boolean;
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

function columnsAdapter(columns, sorted: Sorted): IColumn[] {
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
                isSorted: key == sorted.column,
                isSortedDescending: key == sorted.column && sorted.descending,
                iconName: column.headerIcon,
                isIconOnly: !!column.headerIcon,
                data: column,
                onRender: tooltipItemRenderer
            } as IColumn);
        }
    }
    return retVal;
}

export interface useFluentGridProps {
    data: any[],
    primaryID: string,
    alphaNumColumns?: { [id: string]: boolean },
    query?: object,
    sort?: object[],
    columns: object,
    getSelected?: () => any[],
    filename: string
}

export function useFluentGrid({
    data,
    primaryID,
    alphaNumColumns = {},
    query = {},
    sort = [],
    columns,
    getSelected,
    filename
}: useFluentGridProps): [React.FunctionComponent, any[], ICommandBarItemProps[]] {

    const constStore = useConst(new AlphaNumSortMemory(primaryID, alphaNumColumns));
    const constQuery = useConst({ ...query });
    const constColumns = useConst({ ...columns });
    const [sorted, setSorted] = React.useState<Sorted>({ column: "", descending: false });
    const [selection, setSelection] = React.useState([]);
    const [items, setItems] = React.useState<any[]>([]);

    const refreshTable = React.useCallback(() => {
        const sort = sorted.column ? [{ attribute: sorted.column, descending: sorted.descending }] : undefined;
        constStore.query(constQuery, { sort }).then(items => {
            setItems(items);
        });
    }, [constQuery, constStore, sorted.column, sorted.descending]);

    React.useEffect(() => {
        refreshTable();
    }, [refreshTable]);

    React.useEffect(() => {
        constStore.setData(data);
        refreshTable();
    }, [constStore, data, refreshTable]);

    const fluentColumns: IColumn[] = React.useMemo(() => {
        return columnsAdapter(constColumns, sorted);
    }, [constColumns, sorted]);

    const onColumnClick = React.useCallback((event: React.MouseEvent<HTMLElement>, column: IColumn) => {
        if (constColumns[column.key]?.sortable === false) return;

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
            column: sorted ? column.key : "",
            descending: sorted ? isSortedDescending : false
        });
    }, [constColumns]);

    React.useEffect(() => {
        const sort = sorted.column ? [{ attribute: sorted.column, descending: sorted.descending }] : undefined;
        constStore.query(constQuery, { sort }).then(items => {
            setItems(items);
        });
    }, [constQuery, constStore, sorted.column, sorted.descending]);

    const selectionHandler = useConst(new Selection({
        onSelectionChanged: () => {
            setSelection(selectionHandler.getSelection());
        }
    }));

    const renderDetailsHeader = React.useCallback((props: IDetailsHeaderProps, defaultRender?: any) => {
        return defaultRender({
            ...props,
            onRenderColumnHeaderTooltip: (tooltipHostProps) => {
                return <TooltipHost {...tooltipHostProps} content={tooltipHostProps?.column?.data?.headerTooltip ?? ""} />;
            },
            styles: { root: { paddingTop: 1 } }
        });
    }, []);

    const Grid = React.useCallback(() => <DetailsList
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
    />, [fluentColumns, items, onColumnClick, renderDetailsHeader, selectionHandler]);

    const copyButtons = React.useMemo((): ICommandBarItemProps[] => [
        ...createCopyDownloadSelection(constColumns, selection, `${filename}.csv`)
    ], [constColumns, filename, selection]);

    return [Grid, selection, copyButtons];
}

export interface useFluentPagedGridProps {
    store: ESPRequest.Store,
    alphaNumColumns?: { [id: string]: boolean },
    query?: object,
    sort?: object[],
    columns: object,
    getSelected?: () => any[],
    filename: string,
    width?: string;
    height?: string;
}

export function useFluentPagedGrid({
    store,
    alphaNumColumns = {},
    query = {},
    sort = [],
    columns,
    getSelected,
    filename,
    width,
    height
}: useFluentPagedGridProps): [(height: string) => JSX.Element, React.FunctionComponent, any[], (full?: boolean) => void, ICommandBarItemProps[]] {

    const constQuery = useConst({ ...query });
    const constColumns = useConst({ ...columns });
    const [sorted, setSorted] = React.useState<Sorted>({ column: "", descending: false });
    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(25);
    const [selection, setSelection] = React.useState([]);
    const [items, setItems] = React.useState<any[]>([]);
    const [total, setTotal] = React.useState<number>();

    const refreshTable = React.useCallback(() => {
        const sort = sorted.column ? [{ attribute: sorted.column, descending: sorted.descending }] : undefined;
        const storeQuery = store.query({ ...constQuery, [store.startProperty]: page * pageSize, [store.countProperty]: pageSize }, { sort });
        storeQuery.total.then(total => {
            setTotal(total);
        });
        storeQuery.then(items => {
            setItems(items);
        });
    }, [sorted.column, sorted.descending, store, constQuery, page, pageSize]);

    const fluentColumns: IColumn[] = React.useMemo(() => {
        return columnsAdapter(constColumns, sorted);
    }, [constColumns, sorted]);

    const onColumnClick = React.useCallback((event: React.MouseEvent<HTMLElement>, column: IColumn) => {
        if (constColumns[column.key]?.sortable === false) return;

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
            column: sorted ? column.key : "",
            descending: sorted ? isSortedDescending : false
        });
    }, [constColumns]);

    React.useEffect(() => {
        refreshTable();
    }, [refreshTable]);

    const selectionHandler = useConst(new Selection({
        onSelectionChanged: () => {
            setSelection(selectionHandler.getSelection());
        }
    }));

    const renderDetailsHeader = React.useCallback((props: IDetailsHeaderProps, defaultRender?: any) => {
        return defaultRender({
            ...props,
            onRenderColumnHeaderTooltip: (tooltipHostProps) => {
                return <TooltipHost {...tooltipHostProps} content={tooltipHostProps?.column?.data?.headerTooltip ?? ""} />;
            },
            styles: { root: { paddingTop: 1 } }
        });
    }, []);

    const Grid = React.useCallback((height: string) => <DetailsList
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
        styles={{ root: { width, height, maxHeight: height } }}
    />, [fluentColumns, items, onColumnClick, renderDetailsHeader, selectionHandler, width]);

    const dropdownChange = React.useCallback((evt, option) => {
        const newPageSize = option.key as number;
        setPage(Math.floor((page * pageSize) / newPageSize));
        setPageSize(newPageSize);
    }, [page, pageSize]);

    const GridPagination = React.useCallback(() => {
        return <Stack horizontal horizontalAlign="space-between">
            <Stack.Item>
            </Stack.Item>
            <Stack.Item>
                <Pagination selectedPageIndex={page} itemsPerPage={pageSize} totalItemCount={total} pageCount={Math.ceil(total / pageSize)} format="buttons" onPageChange={index => setPage(Math.round(index))} />
            </Stack.Item>
            <Stack.Item align="center">
                <Label htmlFor={"pageSize"}>{nlsHPCC.PageSize}</Label>
                <Dropdown id="pageSize" options={[
                    { key: 10, text: "10" },
                    { key: 25, text: "25" },
                    { key: 50, text: "50" },
                    { key: 100, text: "100" },
                    { key: 250, text: "250" },
                    { key: 500, text: "500" },
                    { key: 1000, text: "1000" }
                ]} defaultSelectedKey={pageSize} onChange={dropdownChange} />
            </Stack.Item>
        </Stack>;
    }, [dropdownChange, page, pageSize, total]);

    const copyButtons = React.useMemo((): ICommandBarItemProps[] => [
        ...createCopyDownloadSelection(constColumns, selection, `${filename}.csv`)
    ], [constColumns, filename, selection]);

    return [Grid, GridPagination, selection, refreshTable, copyButtons];
}
