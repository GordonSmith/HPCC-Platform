import * as React from "react";
//@ts-ignore
import { DuckDB } from "@hpcc-js/wasm/duckdb";
import type { AsyncDuckDB, Connection } from "@hpcc-js/wasm/dist/duckdb";

export function useDuckDB(): [AsyncDuckDB] {

    const [db, setDb] = React.useState<AsyncDuckDB>();

    React.useEffect(() => {
        DuckDB.load().then(duckdb => {
            setDb(duckdb.db);
        });
    }, []);

    return [db];
}

export function useDuckDBConnection<T>(scopes: T, name: string): [Connection] {

    const [db] = useDuckDB();
    const [connection, setConnection] = React.useState<Connection>();

    React.useEffect(() => {
        let c;
        if (db) {
            db.connect().then(async connection => {
                await db.registerFileText(`${name}.json`, JSON.stringify(scopes));
                await connection.insertJSONFromPath(`${name}.json`, { name });
                await connection.close();
                c = await db.connect();
                setConnection(c);
            });
        }
        return () => {
            try {
                c?.query(`DROP TABLE ${name}`).then(() => c?.close());
            } catch (e) {
                c?.close();
            }

        };
    }, [db, name, scopes]);

    return [connection];
}
