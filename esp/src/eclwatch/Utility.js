define([
    "dojo/_base/array",
    "dojox/html/entities"
], function (arrayUtil, entities) {

    function xmlEncode(str) {
        str = "" + str;
        return entities.encode(str);
    }

    function xmlEncode2(str) {
        str = "" + str;
        return str.replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/\n/g, '&#10;')
                  .replace(/\r/g, '&#13;')
        ;
    }

    function csvEncode(cell) {
        if (!isNaN(cell)) return cell;
        return '"' + String(cell).replace('"', '""') + '"';
    }

    function unitTest(size, unit) {
        var nsIndex = size.indexOf(unit);
        if (nsIndex !== -1) {
            return parseFloat(size.substr(0, nsIndex));
        }
        return -1;
    }

    function espSize2Bytes(size) {
        if (!size) {
            return 0;
        } else if (!isNaN(size)) {
            return parseFloat(size);
        }
        var retVal = unitTest(size, "Kb");
        if (retVal >= 0) {
            return retVal * 1024;
        }
        var retVal = unitTest(size, "Mb");
        if (retVal >= 0) {
            return retVal * Math.pow(1024, 2);
        }
        var retVal = unitTest(size, "Gb");
        if (retVal >= 0) {
            return retVal * Math.pow(1024, 3);
        }
        var retVal = unitTest(size, "Tb");
        if (retVal >= 0) {
            return retVal * Math.pow(1024, 4);
        }
        var retVal = unitTest(size, "Pb");
        if (retVal >= 0) {
            return retVal * Math.pow(1024, 5);
        }
        var retVal = unitTest(size, "Eb");
        if (retVal >= 0) {
            return retVal * Math.pow(1024, 6);
        }
        var retVal = unitTest(size, "Zb");
        if (retVal >= 0) {
            return retVal * Math.pow(1024, 7);
        }
        var retVal = unitTest(size, "b");
        if (retVal >= 0) {
            return retVal;
        }
        return 0;
    }

    function espSize2BytesTests() {
        var tests = [
            { str: "1", expected: 1 },
            { str: "1b", expected: 1 },
            { str: "1Kb", expected: 1 * 1024 },
            { str: "1Mb", expected: 1 * 1024 * 1024 },
            { str: "1Gb", expected: 1 * 1024 * 1024 * 1024 },
            { str: "1Tb", expected: 1 * 1024 * 1024 * 1024 * 1024 },
            { str: "1Pb", expected: 1 * 1024 * 1024 * 1024 * 1024 * 1024 },
            { str: "1Eb", expected: 1 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 },
            { str: "1Zb", expected: 1 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 }
        ];
        tests.forEach(function (test, idx) {
            if (espSize2Bytes(test.str) !== test.expected) {
                console.log("espSize2BytesTests failed with " + test.str + "(" +espSize2Bytes(test.str) + ") !== " + test.expected);
            }
        }, this);
    }

    function espSkew2Number(skew) {
        if (!skew) {
            return 0;
        }
        return parseFloat(skew);
    }

    function espSkew2NumberTests() {
        var tests = [
            { str: "", expected: 0 },
            { str: "1", expected: 1 },
            { str: "10%", expected: 10 },
            { str: "-10%", expected: -10 }
        ];
        tests.forEach(function (test, idx) {
            if (espSkew2Number(test.str) !== test.expected) {
                console.log("espSkew2NumberTests failed with " + test.str + "(" + espSkew2Number(test.str) + ") !== " + test.expected);
            }
        }, this);
    }

    function downloadToCSV (grid, rows, fileName) {
            var csvContent = "";
            var headers = grid.columns;
            var container = [];
            var headerNames = [];

            for (var key in headers) {
                if (headers[key].selectorType !== 'checkbox') {
                    if (!headers[key].label) {
                        var str = csvEncode(headers[key].field);
                        headerNames.push(str);
                    } else {
                        var str = csvEncode(headers[key].label);
                        headerNames.push(str);
                    }
                }
            }
            container.push(headerNames);

            arrayUtil.forEach(rows, function (cells, idx){
                container.push(cells);
            });

            arrayUtil.forEach(container, function (header, idx) {
                dataString = header.join(",");
                csvContent += dataString + "\n";
            });

            var download = function(content, fileName, mimeType) {
            var a = document.createElement('a');
            mimeType = mimeType || 'application/octet-stream';

            if (navigator.msSaveBlob) { // IE10
                return navigator.msSaveBlob(new Blob([content], { type: mimeType }), fileName);
            } else if ('download' in a) {
                a.href = 'data:' + mimeType + ',' + encodeURIComponent(content);
                a.setAttribute('download', fileName);
                document.body.appendChild(a);
                setTimeout(function() {
                  a.click();
                  document.body.removeChild(a);
                }, 66);
                return true;
              } else {
                var f = document.createElement('iframe');
                document.body.appendChild(f);
                f.src = 'data:' + mimeType + ',' + encodeURIComponent(content);

                setTimeout(function() {
                  document.body.removeChild(f);
                }, 333);
                return true;
              }
            }
            download(csvContent,  fileName, 'text/csv');
    }

    /* alphanum.js (C) Brian Huisman
     * Based on the Alphanum Algorithm by David Koelle
     * The Alphanum Algorithm is discussed at http://www.DaveKoelle.com
     *
     * Distributed under same license as original
     * 
     * This library is free software; you can redistribute it and/or
     * modify it under the terms of the GNU Lesser General Public
     * License as published by the Free Software Foundation; either
     * version 2.1 of the License, or any later version.
     * 
     * This library is distributed in the hope that it will be useful,
     * but WITHOUT ANY WARRANTY; without even the implied warranty of
     * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
     * Lesser General Public License for more details.
     * 
     * You should have received a copy of the GNU Lesser General Public
     * License along with this library; if not, write to the Free Software
     * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
     */

    /* ********************************************************************
     * Alphanum sort() function version - case sensitive
     *  - Slower, but easier to modify for arrays of objects which contain
     *    string properties
     *
     */
    function alphanum(a, b) {
        function chunkify(t) {
            var tz = [];
            var x = 0, y = -1, n = 0, i, j;

            while (i = (j = t.charAt(x++)).charCodeAt(0)) {
                var m = (i == 46 || (i >= 48 && i <= 57));
                if (m !== n) {
                    tz[++y] = "";
                    n = m;
                }
                tz[y] += j;
            }
            return tz;
        }

        var aa = chunkify(a);
        var bb = chunkify(b);

        for (x = 0; aa[x] && bb[x]; x++) {
            if (aa[x] !== bb[x]) {
                var c = Number(aa[x]), d = Number(bb[x]);
                if (c == aa[x] && d == bb[x]) {
                    return c - d;
                } else return (aa[x] > bb[x]) ? 1 : -1;
            }
        }
        return aa.length - bb.length;
    }


    /* ********************************************************************
     * Alphanum sort() function version - case insensitive
     *  - Slower, but easier to modify for arrays of objects which contain
     *    string properties
     *
     */
    function alphanumCase(a, b) {
        function chunkify(t) {
            var tz = [];
            var x = 0, y = -1, n = 0, i, j;

            while (i = (j = t.charAt(x++)).charCodeAt(0)) {
                var m = (i == 46 || (i >= 48 && i <= 57));
                if (m !== n) {
                    tz[++y] = "";
                    n = m;
                }
                tz[y] += j;
            }
            return tz;
        }

        var aa = chunkify(a.toLowerCase());
        var bb = chunkify(b.toLowerCase());

        for (x = 0; aa[x] && bb[x]; x++) {
            if (aa[x] !== bb[x]) {
                var c = Number(aa[x]), d = Number(bb[x]);
                if (c == aa[x] && d == bb[x]) {
                    return c - d;
                } else return (aa[x] > bb[x]) ? 1 : -1;
            }
        }
        return aa.length - bb.length;
    }

    function alphanumSort(arr, col, caseInsensitive, reverse) {
        if (arr && arr instanceof Array) {
            arr.sort(function (l, r) {
                if (caseInsensitive) {
                    return alphanumCase(r[col], l[col]) * (reverse ? -1 : 1);
                }
                return alphanum(l[col], r[col]) * (reverse ? -1 : 1);
            });
        }
    }

    return {
        espTime2Seconds: HPCCPlatformComms.espTime2Seconds,
        espSize2Bytes: espSize2Bytes,
        espSkew2Number: espSkew2Number,
        xmlEncode: xmlEncode,
        xmlEncode2: xmlEncode2,
        alphanumSort: alphanumSort,
        downloadToCSV: downloadToCSV
    }
});
