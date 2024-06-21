import * as React from "react";
//@ts-ignore
import { DuckDB } from "@hpcc-js/wasm/duckdb";

export function useDuckDB(): [any] {

    const [db, setDb] = React.useState();

    React.useEffect(() => {
        DuckDB.load().then(duckdb => {
            setDb(duckdb.db);
        });
    }, []);

    return [db];
}

export function useDuckDBConnection<T>(scopes: T, name: string): [any] {

    const [db] = useDuckDB();
    const [connection, setConnection] = React.useState();

    React.useEffect(() => {
        let c;
        if (db) {
            db.connect().then(async connection => {
                await db.registerFileText(`${name}.json`, JSON.stringify(scopes));
                await connection.insertJSONFromPath(`${name}.json`, { name });
                await connection.close();
                c = await db.connect();
                // await connection.query(`CREATE TABLE ${name} AS SELECT * FROM read_json_auto('${name}.json')`);
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
