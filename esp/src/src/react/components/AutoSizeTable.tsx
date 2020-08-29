import * as React from "react";
import Refresh from "@material-ui/icons/Refresh";
import MaterialTable, { MaterialTableProps } from "material-table";
import { AutoSizer } from "react-virtualized";
import nlsHPCC from "../../nlsHPCC";
import { icons } from "../util/table";

interface MaterialTableExProps<RowData extends object> extends MaterialTableProps<RowData> {
}

const MaterialTableEx: React.FunctionComponent<MaterialTableExProps<object>> = (props) => {
    const tableRef = React.useRef(null);
    const isFirstRun = React.useRef(true);

    React.useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        tableRef.current.onQueryChange();
    }, [props.options.pageSize]);

    const newProps = {
        ...props,
        actions: [
            ...(props.actions || []),
            {
                icon: Refresh,
                tooltip: nlsHPCC.Refresh,
                isFreeAction: true,
                onClick: () => tableRef.current.onQueryChange()
            }
        ]
    };

    const data = Array.isArray(props.data) ? props.data : query => {
        query.pageSize = props.options.pageSize;
        return (props.data as any)(query);
    };

    return <MaterialTable
        tableRef={tableRef}
        icons={icons}
        {...newProps}
        data={data}
    />;
};

export const AutoSizeTable: React.FunctionComponent<MaterialTableExProps<object>> = (props) => {
    return <AutoSizer >
        {({ height, width }) => {
            const bodyHeight = height
                - 64    //  Title
                - 52    //  Footer
                - 2     //  Padding
                ;

            const pageSize = Math.max(Math.floor((bodyHeight) / 38.22) - 1, 0);
            if (pageSize === 0) {
                return <div>loading...</div>;
            }
            const newProps = {
                ...props,
                options: {
                    ...props.options,
                    pageSize: pageSize,
                    pageSizeOptions: [],
                    headerStyle: { padding: "0.0em" },
                    minBodyHeight: bodyHeight,
                    maxBodyHeight: bodyHeight
                }
            };

            return <div style={{ width: `${width}px` }}>
                <MaterialTableEx {...newProps} />
            </div>;
        }}
    </AutoSizer>;
}; 
