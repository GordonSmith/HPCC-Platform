#!/usr/bin/env python3

import argparse
import collections
import html
import json
import time
import urllib.request
import xml.etree.ElementTree as ElementTree


def local_name(tag):
    return tag.rsplit("}", 1)[-1]


def post(endpoint, action, request_name, content, timeout):
    body = (
        '<?xml version="1.0"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
        f'<soap:Body><{request_name} xmlns="urn:hpccsystems:ws:wssql2">'
        f"{content}</{request_name}></soap:Body></soap:Envelope>"
    )
    request = urllib.request.Request(
        endpoint,
        data=body.encode(),
        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": f'"{action}"'},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return ElementTree.fromstring(response.read())


def classify(error):
    categories = (
        ("missing_layout", "could not determine a record layout"),
        ("nested_or_decimal", "does not support nested or decimal"),
        ("grouped", "group info. differs"),
        ("unsupported_format", "could not initialize the published record layout"),
        ("key_layout", "could not map KEY field"),
        ("decimal_conversion", "to DECIMAL"),
    )
    for category, marker in categories:
        if marker in error:
            return category
    return "other"


def main():
    parser = argparse.ArgumentParser(description="Run bounded hpcc_scan queries across a logical-file scope")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8510/WsSQL2/")
    parser.add_argument("--scope", default="regress::*")
    parser.add_argument("--limit", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=10)
    parser.add_argument("--report", default="ws_sql2_catalog_report.json")
    args = parser.parse_args()

    root = post(
        args.endpoint,
        "ListFiles",
        "ListFilesRequest",
        f"<Scope>{html.escape(args.scope)}</Scope>",
        args.timeout,
    )
    files = ["".join(node.itertext()).strip() for node in root.iter() if local_name(node.tag) == "File"]
    results = []
    started = time.monotonic()
    for logical_name in files:
        sql_name = logical_name.replace("'", "''")
        sql = f"SELECT * FROM hpcc_scan('{sql_name}') LIMIT {args.limit}"
        item = {"file": logical_name}
        query_started = time.monotonic()
        try:
            root = post(
                args.endpoint,
                "ExecuteSQL",
                "ExecuteSQLRequest",
                f"<SqlText>{html.escape(sql, quote=False)}</SqlText><ByteLimit>1048576</ByteLimit>",
                args.timeout,
            )
            item["seconds"] = round(time.monotonic() - query_started, 4)
            error = next(
                (" ".join("".join(node.itertext()).split()) for node in root.iter()
                 if local_name(node.tag) == "Exception"),
                None,
            )
            result = next(
                ("".join(node.itertext()).strip() for node in root.iter() if local_name(node.tag) == "Result"),
                None,
            )
            if error:
                item.update(status="error", category=classify(error), error=error)
            elif result:
                parsed = json.loads(result)
                item.update(
                    status="ok",
                    rows=parsed.get("returnedRowCount"),
                    columns=len(parsed.get("columns", [])),
                    truncated=parsed.get("truncated"),
                )
            else:
                item.update(status="invalid_response", category="invalid_response")
        except Exception as exception:
            item["seconds"] = round(time.monotonic() - query_started, 4)
            item.update(status="transport_error", category="transport_error", error=repr(exception))
        results.append(item)

    report = {
        "scope": args.scope,
        "limit": args.limit,
        "elapsed": round(time.monotonic() - started, 3),
        "statusCounts": dict(collections.Counter(item["status"] for item in results)),
        "categoryCounts": dict(collections.Counter(
            item.get("category", "ok") for item in results)),
        "results": results,
    }
    with open(args.report, "w", encoding="utf-8") as output:
        json.dump(report, output, indent=2)
    print(json.dumps({key: report[key] for key in ("scope", "limit", "elapsed", "statusCounts", "categoryCounts")}))
    return 1 if any(item["status"] != "ok" for item in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())