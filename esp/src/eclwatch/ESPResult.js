/*##############################################################################
#    HPCC SYSTEMS software Copyright (C) 2012 HPCC Systems®.
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.
############################################################################## */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/i18n",
    "dojo/i18n!./nls/hpcc",
    "dojo/_base/Deferred",
    "dojo/_base/lang",
    "dojo/dom-construct",

    "dojox/xml/parser",
    "dojox/html/entities",

    "hpcc/ESPBase",
    "hpcc/ESPRequest",
    "hpcc/WsWorkunits"
], function (declare, arrayUtil, i18n, nlsHPCC, Deferred, lang, domConstruct,
            parser, entities,
            ESPBase, ESPRequest, WsWorkunits) {

    var safeEncode = function (item) {
        var cellType = Object.prototype.toString.call(item);
        switch (cellType) {
            case "[object Boolean]":
            case "[object Number]":
                return item;
            case "[object String]":
                return entities.encode(item);
            case "[object Object]":
            case "[object Undefined]":
                return item;
            default:
                console.log("Unknown cell type:  " + cellType);
        }
        return item;
    }

    function RowFormatter(columns, row) {
        this._columns = [];
        this._columnIdx = {};
        this._formattedRow = {};
        this.flattenColumns(columns, row);

        this._grid = {};
        this.formatRow(columns, row);
    }

    RowFormatter.prototype.flattenColumns = function (columns) {
        var context = this;
        arrayUtil.forEach(columns, function (column) {
            context.flattenColumn(column);
        });
    };

    RowFormatter.prototype.flattenColumn = function (column) {
        if (column.children) {
            var context = this;
            arrayUtil.forEach(column.children, function (column) {
                context.flattenColumn(column);
            });
        } else {
            this._columnIdx[column.field] = this._columns.length;
            this._columns.push(column.field);
        }
    };

    var LINE_SPLITTER = "<br><hr style='border: 0px; border-bottom: 1px solid rgb(238, 221, 204);'>";
    var LINE_SPLITTER2 = "<br><hr style='visibility: hidden; border: 0px; border-bottom: 1px solid rgb(238, 221, 204);'>";
    RowFormatter.prototype.formatRow = function (columns, row, rowIdx) {
        rowIdx = rowIdx || 0;
        row = row || {};
        var context = this;
        var maxChildLen = 0;
        var colLenBefore = {};
        arrayUtil.forEach(columns, function (column) {
            if (!column.children && context._formattedRow[column.field] !== undefined) {
                colLenBefore[column.field] = ("" + context._formattedRow[column.field]).split(LINE_SPLITTER).length;
            }
            maxChildLen = Math.max(maxChildLen, context.formatCell(column, column.isRawHTML ? row[column.leafID] : safeEncode(row[column.leafID]), rowIdx));
        });
        arrayUtil.forEach(columns, function (column) {
            if (!column.children) {
                var cellLength = ("" + context._formattedRow[column.field]).split(LINE_SPLITTER).length - (colLenBefore[column.field] || 0);
                var delta = maxChildLen - cellLength;
                if (delta > 0) {
                    var paddingArr = [];
                    paddingArr.length = delta + 1;
                    var padding = paddingArr.join(LINE_SPLITTER2);
                    context._formattedRow[column.field] += padding;
                }
            }
        });
        return maxChildLen;
    };

    RowFormatter.prototype.formatCell = function (column, cell, rowIdx) {
        var internalRows = 0;
        if (column.children) {
            var children = cell && cell.Row ? cell.Row : [cell]
            if (children.length === 0) {
                children.push({});
            }
            var context = this;
            arrayUtil.forEach(children, function (row, idx) {
                internalRows += context.formatRow(column.children, row, rowIdx + idx) + 1;
            });
            return children.length;
        }
        if (this._formattedRow[column.field] === undefined) {
            this._formattedRow[column.field] = cell === undefined ? "" : cell;
            ++internalRows;
        } else {
            this._formattedRow[column.field] += LINE_SPLITTER + (cell === undefined ? "" : cell);
            ++internalRows
        }
        if (!this._grid[rowIdx]) {
            this._grid[rowIdx] = {}
        }
        this._grid[rowIdx][column.field] = cell;
        return internalRows;
    };

    RowFormatter.prototype.row = function (column) {
        var retVal = {};
        var context = this;
        arrayUtil.forEach(this._columns, function (column) {
            retVal[column] = context._formattedRow[column];
        });
        return retVal;
    };

    var Store = declare([ESPRequest.Store, ESPBase], {
        service: "WsWorkunits",
        action: "WUResult",
        responseQualifier: "WUResultResponse.Result",
        responseTotalQualifier: "WUResultResponse.Total",
        idProperty: "__hpcc_id",
        startProperty: "Start",
        countProperty: "Count",
        useSingletons: false,
        preRequest: function (request) {
            if (request.FilterBy) {
                ESPRequest.flattenMap(request, "FilterBy", "NamedValue", true, true);
            }
            if (this.name && this.cluster) {
                this.idPrefix = this.name + "_" + this.cluster;
                request['LogicalName'] = this.name;
                request['Cluster'] = this.cluster;
            } else if (this.name) {
                this.idPrefix = this.name;
                request['LogicalName'] = this.name;
            } else {
                this.idPrefix = this.wuid + "_" + this.sequence;
                request['Wuid'] = this.wuid;
                request['Sequence'] = this.sequence;
            }
            if (request.includeXmlSchema) {
                request['SuppressXmlSchema'] = false;
            } else {
                request['SuppressXmlSchema'] = true;
            }
        },
        preProcessResponse: function (response, request) {
            if (response.Total == -1 || response.Total === 9223372036854776000 || response.Total === Number.MAX_VALUE) {
                response.Total = response.Start + response.Count + 1000;
            }
            if (lang.exists("Result.Row", response)) {
                var context = this;
                var retVal = this.formatRows(context._structure, response.Result.Row);
                arrayUtil.forEach(retVal, function (item, index) {
                    item.__hpcc_rowNum = request.Start + index + 1;
                    item.__hpcc_id = context.idPrefix + "_" + item.__hpcc_rowNum;
                });
                response.Result = retVal;
            }
        },
        formatRows: function (columns, rows) {
            var context = this;
            return arrayUtil.map(rows, function (row) {
                var rowFormatter = new RowFormatter(columns, row);
                return rowFormatter.row();
            });
        }
    });

    var Result = declare([HPCCPlatformComms.Result], {
        i18n: nlsHPCC,
        store: null,
        Total: "-1",

        constructor: function (href, params) {
            if (lang.exists("Sequence", this)) {
                this.store = new Store({
                    wuid: this.Wuid,
                    sequence: this.Sequence,
                    isComplete: this.isComplete()
                });
            } else if (lang.exists("Name", this) && lang.exists("NodeGroup", this)) {
                this.store = new Store({
                    wuid: this.Wuid,
                    cluster: this.NodeGroup,
                    name: this.Name,
                    isComplete: true
                });
            } else {
                this.store = new Store({
                    wuid: this.Wuid,
                    cluster: this.Cluster,
                    name: this.Name,
                    isComplete: true
                });
            }
        },

        getName: function () {
            return this.Name;
        },

        getID: function () {
            if (this.Sequence != null) {
                return this.Sequence;
            }
            return this.Name;
        },

        canShowResults: function () {
            if (lang.exists("Sequence", this)) { //  Regular WU result
                return true;
            } else if (lang.exists("RecordCount", this) && this.RecordCount !== "") { //  DFU Sprayed CSV File will fail here
                return true;
            }
            return false;
        },

        isChildDataset: function (cell) {
            if (Object.prototype.toString.call(cell) !== "[object Object]") {
                return false;
            }
            var propCount = 0;
            var firstPropType = null;
            for (var key in cell) {
                if (!firstPropType) {
                    firstPropType = Object.prototype.toString.call(cell[key]);
                }
                propCount++;
            }
            return propCount === 1 && firstPropType === "[object Array]";
        },

        rowToTable: function (cell, __row, node) {
            if (this.isChildDataset(cell)) {  //  Don't display "Row" as a header  ---
                for (var key in cell) {
                    this.rowToTable(cell[key], __row, node);
                }
                return;
            }

            var table = domConstruct.create("table", { border: 1, cellspacing: 0, width: "100%" }, node);
            switch(Object.prototype.toString.call(cell)) {
                case "[object Object]":
                    var tr = domConstruct.create("tr", null, table);
                    for (var key in cell) {
                        domConstruct.create("th", { innerHTML: safeEncode(key) }, tr);
                    }
                    tr = domConstruct.create("tr", null, table);
                    for (var key in cell) {
                        switch (Object.prototype.toString.call(cell[key])) {
                            case "[object Object]":
                            case "[object Array]":
                                this.rowToTable(cell[key], __row, node);
                                break;
                            default:
                                domConstruct.create("td", { innerHTML: safeEncode(cell[key]) }, tr);
                                break;
                        }
                    }
                    break;
                case "[object Array]":
                    for (var i = 0; i < cell.length; ++i) {
                        switch (Object.prototype.toString.call(cell[i])) {
                            case "[object Boolean]":
                            case "[object Number]":
                            case "[object String]":
                                //  Item in Scalar  ---
                                var tr = domConstruct.create("tr", null, table);
                                domConstruct.create("td", { innerHTML: safeEncode(cell[i]) }, tr);
                                break;
                            default:
                                //  Child Dataset  ---
                                if (i === 0) {
                                    var tr = domConstruct.create("tr", null, table);
                                    for (var key in cell[i]) {
                                        var th = domConstruct.create("th", { innerHTML: safeEncode(key) }, tr);
                                    }
                                }
                                var tr = domConstruct.create("tr", null, table);
                                for (var key in cell[i]) {
                                    if (cell[i][key]) {
                                        if (Object.prototype.toString.call(cell[i][key]) === '[object Object]' || Object.prototype.toString.call(cell[i][key]) === '[object Array]') {
                                            var td = domConstruct.create("td", null, tr);
                                            this.rowToTable(cell[i][key], cell[i], td);
                                        } else if (key.indexOf("__html", key.length - "__html".length) !== -1) {
                                            var td = domConstruct.create("td", { innerHTML: cell[i][key] }, tr);
                                        } else if (key.indexOf("__javascript", key.length - "__javascript".length) !== -1) {
                                            var td = domConstruct.create("td", null, tr);
                                            this.injectJavascript(cell[i][key], cell[i], td);
                                        } else {
                                            var val = cell[i][key];
                                            var td = domConstruct.create("td", { innerHTML: safeEncode(val) }, tr);
                                        }
                                    } else {
                                        var td = domConstruct.create("td", { innerHTML: "" }, tr);
                                    }
                                }
                        }
                    }
                    break;
            }
        },
        injectJavascript : function(__cellContent, __row, __cell, __width) {
            //  Add paragraph so cells can valign  ---
            domConstruct.create("p", {
                style: {
                    height : "1px"
                },
                innerHTML: "&nbsp;"
            }, __cell);
            try {
                eval(__cellContent);
            } catch (e) {
                __cell.innerHTML = "<b>Error:</b>&nbsp;&nbsp;" + safeEncode(e.message) + "<br>" + safeEncode(__cellContent);
            }
        },
        parseName: function (nameObj) {
            nameObj.width = 500;
            var titleParts = nameObj.name.split("__");
            if (titleParts.length >= 3) {
                var specifiedWidth = parseInt(titleParts[titleParts.length - 2]);
                if (!isNaN(specifiedWidth)) {
                    nameObj.width = specifiedWidth;
                    titleParts = titleParts.slice(0, titleParts.length - 1);
                }
            }
            titleParts = titleParts.slice(0, titleParts.length - 1);
            nameObj.displayName = titleParts.join("__");
        },
        getRowStructureFromSchema: function (xsdSchema, parentNode, prefix) {
            var retVal = [];
            for (var i = 0; i < parentNode.children.length; ++i) {
                var node = parentNode.children[i];
                    var name = node.name;
                    var type = node.type;
                    var keyed = node.keyed;
                    var children = this.getRowStructureFromSchema(xsdSchema, node, prefix + name + "_");

                    var column = null;
                    var context = this;
                    if (name && name.indexOf("__hidden", name.length - "__hidden".length) !== -1) {
                    } else if (name && type) {
                        if (name.indexOf("__html", name.length - "__html".length) !== -1) {
                            var nameObj = {
                                name: name
                            };
                            this.parseName(nameObj);
                            column = {
                                isRawHTML: true,
                                label: nameObj.displayName,
                                leafID: name,
                                field: prefix + name,
                                width: nameObj.width,
                                formatter: function (cell, row) {
                                    return cell;
                                }
                            };
                        } else if (name.indexOf("__javascript", name.length - "__javascript".length) !== -1) {
                            var nameObj = {
                                name: name
                            };
                            this.parseName(nameObj);
                            column = {
                                isRawHTML:true,
                                label: nameObj.displayName,
                                leafID: name,
                                field: prefix + name,
                                width: nameObj.width,
                                renderCell: function (row, cell, node, options) {
                                    context.injectJavascript(cell, row, node, this.width)
                                }
                            };
                        } else {
                            column = {
                                label: name,
                                leafID: name,
                                field: prefix + name,
                                width: xsdSchema.calcWidth(type, name) * 9,
                                formatter: function (cell, row) {
                                    switch (typeof cell) {
                                        case "string":
                                            return cell.replace("\t", "&nbsp;&nbsp;&nbsp;&nbsp;");
                                    }
                                    return cell;
                                }
                            };
                        }
                    } else if (children) {
                        var childWidth = 10;  //  Allow for html table
                        arrayUtil.forEach(children, function (item, idx) {
                            childWidth += item.width;
                        });
                        column = {
                            label: name,
                            field: prefix + name,
                            leafID: name,
                            renderCell: function (row, cell, node, options) {
                                context.rowToTable(cell, row, node);
                            },
                            width: childWidth
                        };
                    }
                    if (column) {
                        column.__hpcc_keyed = keyed;
                        column.className = "resultGridCell";
                        column.sortable = false;
                        column.width += keyed ? 16 : 0;
                        column.renderHeaderCell = function (node) {
                            node.innerHTML = this.label + (this.__hpcc_keyed ? dojoConfig.getImageHTML("index.png", context.i18n.Index) : "");
                        };
                        if (children) {
                            column.children = children;
                        }
                        retVal.push(column);
                    }
            }
            return retVal.length ? retVal : null;
        },

        getStructure: function (xsdSchema) {
            var structure = [
                {
                    cells: [
                        [
                            {
                                label: "##", field: "__hpcc_rowNum", leafID: "__hpcc_rowNum", width: 54, className: "resultGridCell", sortable: false
                            }
                        ]
                    ]
                }
            ];

            var innerStruct = this.getRowStructureFromSchema(xsdSchema, xsdSchema.root, "");
            for (var i = 0; i < innerStruct.length; ++i) {
                structure[0].cells[structure[0].cells.length - 1].push(innerStruct[i]);
            }
            this.store._structure = structure[0].cells[0];
            return this.store._structure;
        },

        fetchStructure: function () {
            var context = this;
            return this.fetchXMLSchema().then(function (xsdSchema) {
                return context.getStructure(xsdSchema);
            });
        },

        getStore: function () {
            return this.store;
        },

        fetchNRows: function (start, count) {
            var deferred = new Deferred()
            this.store.query({
                Start: start,
                Count: count
            }).then(function (results) {
                deferred.resolve(results);
            });
            return deferred.promise;
        },

        fetchContent: function () {
            var deferred = new Deferred()
            var context = this;
            this.store.query({
                Start: 0,
                Count: 1
            }).total.then(function(total) {
                context.fetchNRows(0, total).then(function(results) {
                    deferred.resolve(results);
                });
            });
            return deferred.promise;
        },

        getLoadingMessage: function () {
            if (lang.exists("wu.state", this)) {
                return "<span class=\'dojoxGridWating\'>[" + this.wu.state + "]</span>";
            }
            return "<span class=\'dojoxGridWating\'>[unknown]</span>";
        },

        getECLRecord: function () {
            var retVal = "RECORD\n";
            for (var i = 0; i < this.ECLSchemas.ECLSchemaItem.length; ++i) {
                retVal += "\t" + this.ECLSchemas.ECLSchemaItem[i].ColumnType + "\t" + this.ECLSchemas.ECLSchemaItem[i].ColumnName + ";\n";
            }
            retVal += "END;\n";
            return retVal;
        }
    });

    return {
        Get: function (params) {
            return new Result("", params.Wuid, params);
        }
    }
});
