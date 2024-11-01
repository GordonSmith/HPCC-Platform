import * as Observable from "dojo/store/Observable";
import { WorkunitsService, FileSprayService, DFUService, WsWorkunits, FileSpray, WsDfu, Workunit, DFUWorkunit, LogicalFile, Query, IOptions } from "@hpcc-js/comms";
import { Memory } from "./store/Memory";
import nlsHPCC from "./nlsHPCC";

const Opts: IOptions = { baseUrl: "" };
const workunitsService = new WorkunitsService(Opts);
const filesprayService = new FileSprayService(Opts);
const dfuService = new DFUService(Opts);

export type searchAllResponse = undefined | "ecl" | "dfu" | "file" | "query";

interface SearchParams {
    searchECL: boolean;
    searchECLText: boolean;
    searchDFU: boolean;
    searchFile: boolean;
    searchQuery: boolean;
    text: string;
    searchType?: string;
}

interface Row {
    storeID: number;
    id: string;
    Type: string;
    Reason: string;
    Context: string;
    Summary: string;
    _type: string;
}

interface WuQueryRow extends Row {
    _wuid: string;
}

interface GetDFUWorkunitRow extends Row {
    _wuid: string;
}

interface DFUQueryRow extends Row {
    _nodeGroup: string;
    _name: string;
}

interface WUListQueriesRow extends Row {
    _querySetId: string;
    _id: string;
}

export class ESPSearch {

    protected _searchID = 0;
    protected id = 0;
    protected _rowID = 0;
    protected _searchText: string;

    store = new Observable(new Memory("storeID"));
    eclStore = new Observable(new Memory("Wuid"));
    dfuStore = new Observable(new Memory("ID"));
    fileStore = new Observable(new Memory("__hpcc_id"));
    queryStore = new Observable(new Memory("__hpcc_id"));

    constructor(private update: () => void) {
    }

    generateSearchParams(searchText: string): SearchParams {
        const searchParams: SearchParams = {
            searchECL: false,
            searchECLText: false,
            searchDFU: false,
            searchFile: false,
            searchQuery: false,
            text: searchText
        };

        if (searchText.indexOf("ecl:") === 0) {
            searchParams.searchECL = true;
            searchParams.searchECLText = true;
            searchParams.text = searchText.substring(4);
        } else if (searchText.indexOf("dfu:") === 0) {
            searchParams.searchDFU = true;
            searchParams.text = searchText.substring(4);
        } else if (searchText.indexOf("file:") === 0) {
            searchParams.searchFile = true;
            searchParams.text = searchText.substring(5);
        } else if (searchText.indexOf("query:") === 0) {
            searchParams.searchQuery = true;
            searchParams.text = searchText.substring(6);
        } else {
            searchParams.searchECL = true;
            searchParams.searchDFU = true;
            searchParams.searchFile = true;
            searchParams.searchQuery = true;
        }
        searchParams.text = searchParams.text.trim();

        return searchParams;
    }

    searchAll(searchText: string): Promise<Row[][]> {

        this.store.setData([]);
        this.eclStore.setData([]);
        this.dfuStore.setData([]);
        this.fileStore.setData([]);
        this.queryStore.setData([]);

        const searchArray: Array<Promise<Row[]>> = [];
        const searchParams = this.generateSearchParams(searchText);

        if (searchParams.searchECL) {
            searchArray.push(workunitsService.WUQuery({ Wuid: "*" + searchParams.text + "*" }).then(response => {
                const results = this.parseWuQueryResponse(nlsHPCC.WUID, response);
                this.loadWUQueryResponse(results);
                return results;
            }));
            searchArray.push(workunitsService.WUQuery({ Jobname: "*" + searchText + "*" }).then(response => {
                const results = this.parseWuQueryResponse(nlsHPCC.JobName, response);
                this.loadWUQueryResponse(results);
                return results;
            }));
            searchArray.push(workunitsService.WUQuery({ Owner: searchText }).then(response => {
                const results = this.parseWuQueryResponse(nlsHPCC.Owner, response);
                this.loadWUQueryResponse(results);
                return results;
            }));
        }
        if (searchParams.searchECLText) {
            searchArray.push(workunitsService.WUQuery({ ECL: searchParams.text }).then(response => {
                const results = this.parseWuQueryResponse(nlsHPCC.ECL, response);
                this.loadWUQueryResponse(results);
                return results;
            }));
        }
        if (searchParams.searchDFU) {
            searchArray.push(filesprayService.GetDFUWorkunits({ Wuid: "*" + searchText + "*" }).then(response => {
                const results = this.parseGetDFUWorkunitsResponse(nlsHPCC.ECL, response);
                this.loadGetDFUWorkunitsResponse(results);
                return results;
            }));
            searchArray.push(filesprayService.GetDFUWorkunits({ Jobname: "*" + searchText + "*" }).then(response => {
                const results = this.parseGetDFUWorkunitsResponse(nlsHPCC.JobName, response);
                this.loadGetDFUWorkunitsResponse(results);
                return results;
            }));
            searchArray.push(filesprayService.GetDFUWorkunits({ Owner: searchText }).then(response => {
                const results = this.parseGetDFUWorkunitsResponse(nlsHPCC.Owner, response);
                this.loadGetDFUWorkunitsResponse(results);
                return results;
            }));
        }
        if (searchParams.searchFile) {
            searchArray.push(dfuService.DFUQuery({ LogicalName: "*" + searchParams.text + "*" }).then(response => {
                const results = this.parseDFUQueryResponse(nlsHPCC.LogicalName, response);
                this.loadDFUQueryResponse(results);
                return results;
            }));
            searchArray.push(dfuService.DFUQuery({ Owner: searchParams.text }).then(response => {
                const results = this.parseDFUQueryResponse(nlsHPCC.Owner, response);
                this.loadDFUQueryResponse(results);
                return results;
            }));
        }
        if (searchParams.searchQuery) {
            searchArray.push(workunitsService.WUListQueries({ QueryID: "*" + searchParams.text + "*" }).then(response => {
                const results = this.parseWUListQueriesResponse(nlsHPCC.ID, response);
                this.loadWUListQueriesResponse(results);
                return results;
            }));
            searchArray.push(workunitsService.WUListQueries({ QueryName: "*" + searchParams.text + "*" }).then(response => {
                const results = this.parseWUListQueriesResponse(nlsHPCC.Name, response);
                this.loadWUListQueriesResponse(results);
                return results;
            }));
        }

        this.update();

        return Promise.all(searchArray);
    }

    parseWuQueryResponse(prefix: string, response: WsWorkunits.WUQueryResponse): WuQueryRow[] {
        return response?.Workunits?.ECLWorkunit.map(item => {
            let Context = "";
            switch (prefix) {
                case nlsHPCC.WUID:
                    Context = item.Wuid;
                    break;
                case nlsHPCC.JobName:
                    Context = item.Jobname;
                    break;
                case nlsHPCC.Owner:
                    Context = item.Owner;
                    break;
                case nlsHPCC.ECL:
                    Context = item.Query.Text;
                    break;
            }

            return {
                storeID: ++this._rowID,
                id: item.Wuid,
                Type: nlsHPCC.ECLWorkunit,
                Reason: prefix,
                Context,
                Summary: item.Wuid,
                _type: "Wuid",
                _wuid: item.Wuid,
                ...item
            } satisfies WuQueryRow;
        });
    }

    parseGetDFUWorkunitResponse(prefix: string, response: FileSpray.GetDFUWorkunitResponse): GetDFUWorkunitRow | undefined {
        const item = response?.result;
        return (item && item.State !== 999) ? {
            storeID: ++this._rowID,
            id: item.ID,
            Type: nlsHPCC.DFUWorkunit,
            Reason: prefix,
            Context: "",
            Summary: item.ID,
            _type: "DFUWuid",
            _wuid: item.ID,
            ...item
        } satisfies GetDFUWorkunitRow : undefined;
    }

    parseGetDFUWorkunitsResponse(prefix: string, response: FileSpray.GetDFUWorkunitsResponse): GetDFUWorkunitRow[] {
        return response?.results?.DFUWorkunit.map(item => {
            let Context = "";
            switch (prefix) {
                case nlsHPCC.WUID:
                    Context = item.ID;
                    break;
                case nlsHPCC.JobName:
                    Context = item.JobName;
                    break;
                case nlsHPCC.Owner:
                    Context = item.User;
                    break;
            }
            return {
                storeID: ++this._rowID,
                id: item.ID,
                Type: nlsHPCC.DFUWorkunit,
                Reason: prefix,
                Context,
                Summary: item.ID,
                _type: "DFUWuid",
                _wuid: item.ID,
                ...item
            } satisfies GetDFUWorkunitRow;
        });
    }

    parseDFUQueryResponse(prefix: string, response: WsDfu.DFUQueryResponse): DFUQueryRow[] {
        return response?.DFULogicalFiles?.DFULogicalFile.map(item => {
            let Context = "";
            switch (prefix) {
                case nlsHPCC.LogicalName:
                    Context = item.Name;
                    break;
                case nlsHPCC.Owner:
                    Context = item.Owner;
                    break;
            }
            if (item.isSuperfile) {
                return {
                    storeID: ++this._rowID,
                    id: item.Name,
                    Type: nlsHPCC.SuperFile,
                    Reason: prefix,
                    Context,
                    Summary: item.Name,
                    _type: "SuperFile",
                    _nodeGroup: item.NodeGroup,
                    _name: item.Name,
                    ...item
                } satisfies DFUQueryRow;
            }
            return {
                storeID: ++this._rowID,
                id: item.NodeGroup + "::" + item.Name,
                Type: nlsHPCC.LogicalFile,
                Reason: prefix,
                Context,
                Summary: item.Name + " (" + item.NodeGroup + ")",
                _type: "LogicalFile",
                _nodeGroup: item.NodeGroup,
                _name: item.Name,
                ...item
            } satisfies DFUQueryRow;
        });
    }

    parseWUListQueriesResponse(prefix: string, response: WsWorkunits.WUListQueriesResponse): WUListQueriesRow[] {
        return response?.QuerysetQueries?.QuerySetQuery.map(item => {
            let Context = "";
            switch (prefix) {
                case nlsHPCC.ID:
                    Context = item.Id;
                    break;
                case nlsHPCC.Name:
                    Context = item.Name;
                    break;
            }
            return {
                storeID: ++this._rowID,
                id: item.QuerySetId + "::" + item.Id,
                Type: nlsHPCC.Query,
                Reason: prefix,
                Context,
                Summary: item.Name + " (" + item.QuerySetId + " - " + item.Id + ")",
                _type: "Query",
                _querySetId: item.QuerySetId,
                _id: item.Id,
                ...item
            } satisfies WUListQueriesRow;
        });
    }

    loadWUQueryResponse(results) {
        if (results) {
            results.forEach((item, idx) => {
                this.store.put(item, { overwrite: true });
                this.eclStore.put(Workunit.attach(Opts, item._wuid, item), { overwrite: true });
            });
            return results.length;
        }
        return 0;
    }

    loadGetDFUWorkunitResponse(workunit) {
        if (workunit) {
            this.store.put(workunit, { overwrite: true });
            this.dfuStore.put(DFUWorkunit.attach(Opts, workunit._wuid, workunit), { overwrite: true });
            return 1;
        }
        return 0;
    }

    loadGetDFUWorkunitsResponse(results) {
        if (results) {
            results.forEach((item, idx) => {
                this.store.put(item, { overwrite: true });
                this.dfuStore.put(DFUWorkunit.attach(Opts, item._wuid, item), { overwrite: true });
            });
            return results.length;
        }
        return 0;
    }

    loadDFUQueryResponse(items) {
        if (items) {
            items.forEach((item, idx) => {
                this.store.put(item, { overwrite: true });
                // TODO:  Move `lf.update` call into the attach method, needs:  https://github.com/hpcc-systems/Visualization/issues/4277
                const lf = LogicalFile.attach(Opts, item._nodeGroup, item._name);
                lf.update(item);
                this.fileStore.put(lf, { overwrite: true });
            });
            return items.length;
        }
        return 0;
    }

    loadWUListQueriesResponse(items) {
        if (items) {
            items.forEach((item, idx) => {
                this.store.put(item, { overwrite: true });
                // TODO:  Move `query["set"]` call into the attach method, needs:  https://github.com/hpcc-systems/Visualization/issues/4277
                const query = Query.attach(Opts, item._querySetId, item._id);
                query["set"](item);
                this.queryStore.put(query, { overwrite: true });
            });
            return items.length;
        }
        return 0;
    }
}

export function searchAll(searchText: string,
    loadWUQueryResponse: (prefix: string, response: any) => void,
    loadGetDFUWorkunitResponse: (prefix: string, response: any) => void,
    loadGetDFUWorkunitsResponse: (prefix: string, response: any) => void,
    loadDFUQueryResponse: (prefix: string, response: any) => void,
    loadWUListQueriesResponse: (prefix: string, response: any) => void,
    start: (searchCount: number) => void,
    done: (success: boolean) => void,
): any {

    const generateSearchParams = (searchText: string): SearchParams => {
        const searchParams: SearchParams = {
            searchECL: false,
            searchECLText: false,
            searchDFU: false,
            searchFile: false,
            searchQuery: false,
            text: searchText,
            searchType: ""
        };

        if (searchText.indexOf("ECL:") === 0) {
            searchParams.searchType = "ecl";
            searchParams.searchECL = true;
            searchParams.searchECLText = true;
            searchParams.text = searchText.substring(4);
        } else if (searchText.indexOf("DFU:") === 0) {
            searchParams.searchType = "dfu";
            searchParams.searchDFU = true;
            searchParams.text = searchText.substring(4);
        } else if (searchText.indexOf("FILE:") === 0) {
            searchParams.searchType = "file";
            searchParams.searchFile = true;
            searchParams.text = searchText.substring(5);
        } else if (searchText.indexOf("QUERY:") === 0) {
            searchParams.searchType = "query";
            searchParams.searchQuery = true;
            searchParams.text = searchText.substring(6);
        } else {
            searchParams.searchECL = true;
            searchParams.searchDFU = true;
            searchParams.searchFile = true;
            searchParams.searchQuery = true;
        }
        searchParams.text = searchParams.text.trim();

        return searchParams;
    };

    const searchArray = [];
    const searchParams = generateSearchParams(searchText);

    if (searchParams.searchECL) {
        searchArray.push(workunitsService.WUQuery({ Wuid: "*" + searchParams.text + "*" }).then(response => {
            loadWUQueryResponse(nlsHPCC.WUID, response);
        }));
        searchArray.push(workunitsService.WUQuery({ Jobname: "*" + searchText + "*" }).then(response => {
            loadWUQueryResponse(nlsHPCC.JobName, response);
        }));
        searchArray.push(workunitsService.WUQuery({ Owner: searchText }).then(response => {
            loadWUQueryResponse(nlsHPCC.Owner, response);
        }));
    }
    if (searchParams.searchECLText) {
        searchArray.push(workunitsService.WUQuery({ ECL: searchParams.text }).then(response => {
            loadWUQueryResponse(nlsHPCC.ECL, response);
        }));
    }
    if (searchParams.searchDFU) {
        searchArray.push(filesprayService.GetDFUWorkunits({ Wuid: "*" + searchText + "*" }).then(response => {
            loadGetDFUWorkunitsResponse(nlsHPCC.ECL, response);
        }));
        searchArray.push(filesprayService.GetDFUWorkunits({ Jobname: "*" + searchText + "*" }).then(response => {
            loadGetDFUWorkunitsResponse(nlsHPCC.JobName, response);
        }));
        searchArray.push(filesprayService.GetDFUWorkunits({ Owner: searchText }).then(response => {
            loadGetDFUWorkunitsResponse(nlsHPCC.Owner, response);
        }));
    }
    if (searchParams.searchFile) {
        searchArray.push(dfuService.DFUQuery({ LogicalName: "*" + searchParams.text + "*" }).then(response => {
            loadDFUQueryResponse(nlsHPCC.LogicalName, response);
        }));
        searchArray.push(dfuService.DFUQuery({ Owner: searchParams.text }).then(response => {
            loadDFUQueryResponse(nlsHPCC.Owner, response);
        }));
    }
    if (searchParams.searchQuery) {
        searchArray.push(workunitsService.WUListQueries({ QueryID: "*" + searchParams.text + "*" }).then(response => {
            loadWUListQueriesResponse(nlsHPCC.ID, response);
        }));
        searchArray.push(workunitsService.WUListQueries({ QueryName: "*" + searchParams.text + "*" }).then(response => {
            loadWUListQueriesResponse(nlsHPCC.Name, response);
        }));
    }

    start(searchArray.length);
    Promise.all(searchArray).then(function (results) {
        done(true);
    }, function (error) {
        done(false);
    });

    return searchParams.searchType;
}