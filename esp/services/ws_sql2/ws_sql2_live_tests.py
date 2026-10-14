#!/usr/bin/env python3

import json
import os
import urllib.request
import xml.etree.ElementTree as ElementTree


ENDPOINT = os.environ.get("WS_SQL2_ENDPOINT", "http://127.0.0.1:8510/WsSQL2/")
TABLE = "hpcc_scan('regress::multi::dg_flat')"
SEARCH_INDEX = "hpcc_scan('regress::single::searchindex')"
MULTI_SEARCH_INDEX = "hpcc_scan('regress::multi::searchindex_default')"
FETCH_INDEX = "hpcc_scan('regress::multi::dg_fetchindex1')"
FETCH_TRANS_INDEX = "hpcc_scan('regress::single::dg_fetchtransindex')"
BOOK = "hpcc_scan('regress::single::book')"
PERSON = "hpcc_scan('regress::single::person')"
SINGLE_GROUPED = "hpcc_scan('regress::single::dg_grouped')"
MULTI_GROUPED = "hpcc_scan('regress::multi::dg_grouped')"


def xml_escape(value):
    return (value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&apos;"))


def local_name(tag):
    return tag.rsplit("}", 1)[-1]


def execute(sql, row_limit=0):
    row_limit_xml = f"<RowLimit>{row_limit}</RowLimit>" if row_limit else ""
    body = (
        '<?xml version="1.0"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
        '<soap:Body><ExecuteSQLRequest xmlns="urn:hpccsystems:ws:wssql2">'
        f"<SqlText>{xml_escape(sql)}</SqlText>"
        f"{row_limit_xml}"
        "</ExecuteSQLRequest></soap:Body></soap:Envelope>"
    )
    request = urllib.request.Request(
        ENDPOINT,
        data=body.encode(),
        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": '"ExecuteSQL"'},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ElementTree.fromstring(response.read())
    faults = [" ".join("".join(node.itertext()).split()) for node in root.iter()
              if local_name(node.tag) in ("Fault", "Exception")]
    if faults:
        raise AssertionError(f"{sql}: service fault: {'; '.join(faults)}")
    result = next((node for node in root.iter() if local_name(node.tag) == "Result"), None)
    if result is None:
        raise AssertionError(f"{sql}: missing Result")
    return json.loads("".join(result.itertext()).strip())


def explain(sql, include_fields=False):
    body = (
        '<?xml version="1.0"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
        '<soap:Body><ExplainScanRequest xmlns="urn:hpccsystems:ws:wssql2">'
        f"<SqlText>{xml_escape(sql)}</SqlText>"
        "</ExplainScanRequest></soap:Body></soap:Envelope>"
    )
    request = urllib.request.Request(
        ENDPOINT,
        data=body.encode(),
        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": '"wssql2/ExplainScan?ver_=1.00"'},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ElementTree.fromstring(response.read())
    plan = next((node for node in root.iter() if local_name(node.tag) == "OptimizedPlan"), None)
    plan_json = next((node for node in root.iter() if local_name(node.tag) == "OptimizedPlanJson"), None)
    if plan is None or plan_json is None:
        raise AssertionError(f"{sql}: missing optimized plan")
    result = ("".join(plan.itertext()), json.loads("".join(plan_json.itertext())))
    if not include_fields:
        return result
    projected = ["".join(node.itertext()) for node in root.iter() if local_name(node.tag) == "ProjectedColumn"]
    residual = ["".join(node.itertext()) for node in root.iter() if local_name(node.tag) == "ResidualFilter"]
    return result + (projected, residual)


def find_plan_node(value, name):
    if isinstance(value, dict):
        if value.get("name") == name:
            return value
        for child in value.values():
            match = find_plan_node(child, name)
            if match is not None:
                return match
    elif isinstance(value, list):
        for child in value:
            match = find_plan_node(child, name)
            if match is not None:
                return match
    return None


def plan_value_contains(value, expected):
    if isinstance(value, list):
        return any(expected in item for item in value)
    return expected in (value or "")


def assert_same(left, right, description):
    for key in ("columns", "rows", "rowCount", "returnedRowCount", "truncated"):
        if left.get(key) != right.get(key):
            raise AssertionError(f"{description}: {key} differs: {left.get(key)!r} != {right.get(key)!r}")


def main():
    pushed = execute(f"SELECT * FROM {TABLE} WHERE dg_parentid < 3")
    residual = execute(f"SELECT * FROM {TABLE} WHERE dg_parentid + 0 < 3")
    mixed = execute(f"SELECT * FROM {TABLE} WHERE dg_parentid < 3 AND dg_parentid + 0 < 3")
    assert_same(pushed, residual, "pushed and residual predicates")
    assert_same(pushed, mixed, "pushed and mixed predicates")
    search_index = execute(f"SELECT * FROM {SEARCH_INDEX} LIMIT 3")
    if search_index["columns"][-1] != "dpos" or not all(isinstance(row[-1], int) for row in search_index["rows"]):
        raise AssertionError("searchindex dpos column was not materialized as an integer")
    fetch_index = execute(f"SELECT * FROM {FETCH_INDEX} LIMIT 3")
    fetch_columns = {name: index for index, name in enumerate(fetch_index["columns"])}
    for row in fetch_index["rows"]:
        expected_blob = row[fetch_columns["fname"]] + row[fetch_columns["lname"]].rstrip()
        if row[fetch_columns["blobfield"]].rstrip() != expected_blob:
            raise AssertionError("multi-part KEY blobfield did not match fname + lname")
    prior_page = execute(f"SELECT dpos FROM {SEARCH_INDEX} OFFSET 9 ROWS FETCH NEXT 4 ROWS ONLY")
    next_page = execute(f"SELECT dpos FROM {SEARCH_INDEX} OFFSET 10 ROWS FETCH NEXT 3 ROWS ONLY")
    if prior_page["rows"][1:] != next_page["rows"]:
        raise AssertionError("searchindex OFFSET returned the wrong row window")
    limited = execute(f"SELECT * FROM {SEARCH_INDEX}", row_limit=1)
    if limited["returnedRowCount"] != 1 or limited["rowCount"] != 2 or not limited["truncated"]:
        raise AssertionError("request RowLimit did not stop with one lookahead row")
    limit_plan, limit_plan_json = explain(f"SELECT * FROM {SEARCH_INDEX} LIMIT 20")
    offset_plan, offset_plan_json = explain(f"SELECT * FROM {SEARCH_INDEX} OFFSET 500000 ROWS FETCH NEXT 20 ROWS ONLY")
    unbounded_plan, unbounded_plan_json = explain(f"SELECT * FROM {SEARCH_INDEX}")
    if "Pushed Limit: 20" not in limit_plan or "Pushed Offset" in limit_plan:
        raise AssertionError("ExplainScan did not report LIMIT pushdown accurately")
    if "Pushed Limit: 20" not in offset_plan or "Pushed Offset: 500000" not in offset_plan:
        raise AssertionError("ExplainScan did not report OFFSET pushdown accurately")
    if "Pushed Limit" in unbounded_plan or "Pushed Offset" in unbounded_plan:
        raise AssertionError("ExplainScan reported pushdown for an unbounded scan")
    limit_scan = find_plan_node(limit_plan_json, "HPCC_SCAN")
    offset_scan = find_plan_node(offset_plan_json, "HPCC_SCAN")
    unbounded_scan = find_plan_node(unbounded_plan_json, "HPCC_SCAN")
    if limit_scan is None or limit_scan.get("extra_info", {}).get("Pushed Limit") != "20":
        raise AssertionError("JSON plan did not expose LIMIT pushdown")
    offset_info = offset_scan.get("extra_info", {}) if offset_scan else {}
    if offset_info.get("Pushed Limit") != "20" or offset_info.get("Pushed Offset") != "500000":
        raise AssertionError("JSON plan did not expose OFFSET pushdown")
    unbounded_info = unbounded_scan.get("extra_info", {}) if unbounded_scan else {}
    if "Pushed Limit" in unbounded_info or "Pushed Offset" in unbounded_info:
        raise AssertionError("JSON plan reported pushdown for an unbounded scan")
    _, reader_projection_plan, projected_fields, residual_fields = explain(
        f"SELECT dg_parentid FROM {TABLE} WHERE dg_prange > 0 LIMIT 20", include_fields=True)
    reader_projection_info = find_plan_node(reader_projection_plan, "HPCC_SCAN").get("extra_info", {})
    reader_projection = reader_projection_info.get("Reader Projection", [])
    if isinstance(reader_projection, str):
        reader_projection = [reader_projection]
    if reader_projection != ["dg_parentid"]:
        raise AssertionError(f"physical reader projection was not pruned: {reader_projection!r}")
    if projected_fields != ["dg_parentid"] or residual_fields:
        raise AssertionError("ExplainScan legacy fields did not match structured plan metadata")
    keyed = execute(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE kind = 1 LIMIT 50")
    keyed_residual = execute(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE kind IS NOT DISTINCT FROM 1 LIMIT 50")
    payload = execute(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE dpos = 70013 LIMIT 50")
    payload_residual = execute(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE dpos IS NOT DISTINCT FROM 70013 LIMIT 50")
    assert_same(keyed, keyed_residual, "KEY leading-field pushed and residual predicates")
    assert_same(payload, payload_residual, "KEY payload post-filter and residual predicates")
    keyed_plan, keyed_plan_json = explain(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE kind = 1 LIMIT 20")
    post_plan, post_plan_json = explain(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE dpos > 70000 LIMIT 20")
    residual_plan, residual_plan_json = explain(
        f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE kind IS NOT DISTINCT FROM 1 LIMIT 20")
    keyed_info = find_plan_node(keyed_plan_json, "HPCC_SCAN").get("extra_info", {})
    post_info = find_plan_node(post_plan_json, "HPCC_SCAN").get("extra_info", {})
    residual_info = find_plan_node(residual_plan_json, "HPCC_SCAN").get("extra_info", {})
    if not plan_value_contains(keyed_info.get("Keyed Filters"), "kind="):
        raise AssertionError("ExplainScan did not report a contiguous keyed filter")
    if not plan_value_contains(post_info.get("Post Filters"), "dpos"):
        raise AssertionError("ExplainScan did not report a KEY payload post-filter")
    if "kind IS NOT DISTINCT FROM 1" not in residual_info.get("Residual Filters", ""):
        raise AssertionError("ExplainScan did not report a DuckDB residual filter")
    _, _, residual_projected_fields, residual_fields = explain(
        f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE kind IS NOT DISTINCT FROM 1 LIMIT 20",
        include_fields=True)
    if residual_projected_fields != ["kind", "word", "dpos"] \
        or not any("kind IS NOT DISTINCT FROM 1" in item for item in residual_fields):
        raise AssertionError("ExplainScan legacy residual fields did not match structured plan metadata")
    if post_info.get("Filter Layout Translation") != "expected-to-actual":
        raise AssertionError("ExplainScan did not report expected-to-actual KEY filter translation")
    exact_word = "a" + " " * 19
    short_word = execute(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE word = 'a' LIMIT 20")
    exact_word_post = execute(
        f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE word = '{exact_word}' LIMIT 20")
    exact_word_residual = execute(
        f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE word IS NOT DISTINCT FROM '{exact_word}' LIMIT 20")
    if short_word["returnedRowCount"] != 0:
        raise AssertionError("short fixed-string literal did not retain DuckDB padding semantics")
    assert_same(exact_word_post, exact_word_residual, "exact-width string post-filter and residual predicates")
    _, short_word_plan = explain(f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE word = 'a' LIMIT 20")
    _, exact_word_plan = explain(
        f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE word = '{exact_word}' LIMIT 20")
    _, prefix_plan = explain(
        f"SELECT kind, word, dpos FROM {SEARCH_INDEX} WHERE kind = 1 AND word = '{exact_word}' LIMIT 20")
    short_info = find_plan_node(short_word_plan, "HPCC_SCAN").get("extra_info", {})
    exact_info = find_plan_node(exact_word_plan, "HPCC_SCAN").get("extra_info", {})
    prefix_info = find_plan_node(prefix_plan, "HPCC_SCAN").get("extra_info", {})
    if "Keyed Filters" in short_info or "Post Filters" in short_info:
        raise AssertionError("ExplainScan claimed unsafe short fixed-string pushdown")
    if not plan_value_contains(exact_info.get("Post Filters"), "word="):
        raise AssertionError("ExplainScan did not report a non-leading exact-width string post-filter")
    if not plan_value_contains(prefix_info.get("Keyed Filters"), "kind=") \
        or not plan_value_contains(prefix_info.get("Keyed Filters"), "word="):
        raise AssertionError("ExplainScan did not report a contiguous two-field keyed prefix")
    doc_value = 281474976710657
    nonleading_doc = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} WHERE doc = {doc_value} LIMIT 50")
    nonleading_doc_residual = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE doc IS NOT DISTINCT FROM {doc_value} LIMIT 50")
    assert_same(nonleading_doc, nonleading_doc_residual, "non-leading KEY post-filter and residual predicates")
    prefix_in = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE kind = 1 AND word = '{exact_word}' AND doc IN ({doc_value}, {doc_value + 1}) LIMIT 50")
    prefix_in_residual = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE kind IS NOT DISTINCT FROM 1 AND word IS NOT DISTINCT FROM '{exact_word}' "
        f"AND CASE WHEN doc IN ({doc_value}, {doc_value + 1}) THEN true ELSE false END LIMIT 50")
    assert_same(prefix_in, prefix_in_residual, "three-field KEY IN and residual predicates")
    _, nonleading_doc_plan = explain(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} WHERE doc = {doc_value} LIMIT 20")
    _, prefix_in_plan = explain(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE kind = 1 AND word = '{exact_word}' AND doc IN ({doc_value}, {doc_value + 1}) LIMIT 20")
    nonleading_doc_info = find_plan_node(nonleading_doc_plan, "HPCC_SCAN").get("extra_info", {})
    prefix_in_info = find_plan_node(prefix_in_plan, "HPCC_SCAN").get("extra_info", {})
    if not plan_value_contains(nonleading_doc_info.get("Post Filters"), "doc="):
        raise AssertionError("ExplainScan did not report a non-leading KEY post-filter")
    if not plan_value_contains(prefix_in_info.get("Keyed Filters"), "doc"):
        raise AssertionError("ExplainScan did not report the third keyed IN/range constraint")
    strongest_range = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE kind = 1 AND word = '{exact_word}' "
        f"AND doc > {doc_value} AND doc > {doc_value + 10} AND doc < {doc_value + 100} LIMIT 100")
    strongest_range_residual = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE kind IS NOT DISTINCT FROM 1 AND word IS NOT DISTINCT FROM '{exact_word}' "
        f"AND CASE WHEN doc > {doc_value} AND doc > {doc_value + 10} AND doc < {doc_value + 100} "
        "THEN true ELSE false END LIMIT 100")
    assert_same(strongest_range, strongest_range_residual, "intersected strongest bounds and residual predicates")
    contradictory_range = execute(
        f"SELECT kind, word, doc, dpos FROM {SEARCH_INDEX} "
        f"WHERE kind = 1 AND word = '{exact_word}' "
        f"AND doc > {doc_value + 100} AND doc < {doc_value} LIMIT 100")
    if contradictory_range["returnedRowCount"] != 0:
        raise AssertionError("contradictory pushed bounds did not produce an empty value set")
    variable_string = execute(
        f"SELECT lname, fname, tfn, __filepos FROM {FETCH_TRANS_INDEX} WHERE tfn = 'Jane' LIMIT 20")
    variable_string_residual = execute(
        f"SELECT lname, fname, tfn, __filepos FROM {FETCH_TRANS_INDEX} "
        "WHERE tfn IS NOT DISTINCT FROM 'Jane' LIMIT 20")
    assert_same(variable_string, variable_string_residual, "variable STRING pushed and residual predicates")
    _, variable_string_plan = explain(
        f"SELECT lname, fname, tfn, __filepos FROM {FETCH_TRANS_INDEX} WHERE tfn = 'Jane' LIMIT 20")
    variable_string_info = find_plan_node(variable_string_plan, "HPCC_SCAN").get("extra_info", {})
    if not plan_value_contains(variable_string_info.get("Post Filters"), "tfn="):
        raise AssertionError("ExplainScan did not report variable STRING pushdown")
    books = execute(f"SELECT id, price FROM {BOOK} LIMIT 3")
    if books["rows"] != [[1, 0.0], [2, 3.99], [3, 0.0]]:
        raise AssertionError(f"packed DECIMAL scale conversion failed: {books['rows']!r}")
    people = execute(f"SELECT id, dob, booklimit FROM {PERSON} LIMIT 3")
    if people["rows"] != [[1, 19700101, 1000], [2, 20000101, 40], [3, 19700909, 0]]:
        raise AssertionError(f"scale-zero DECIMAL conversion failed: {people['rows']!r}")
    flat_count = execute(f"SELECT COUNT(*) FROM {TABLE}")["rows"]
    for grouped in (SINGLE_GROUPED, MULTI_GROUPED):
        if execute(f"SELECT COUNT(*) FROM {grouped}")["rows"] != flat_count:
            raise AssertionError(f"{grouped} row count differs from the ungrouped source")
    grouped_prefix = execute(f"SELECT dg_parentid FROM {SINGLE_GROUPED} LIMIT 8")["rows"]
    grouped_page = execute(f"SELECT dg_parentid FROM {SINGLE_GROUPED} OFFSET 5 ROWS FETCH NEXT 3 ROWS ONLY")["rows"]
    if grouped_prefix[5:] != grouped_page:
        raise AssertionError("grouped OFFSET did not skip group boundaries")
    _, grouped_plan = explain(f"SELECT * FROM {MULTI_GROUPED} LIMIT 100")
    grouped_info = find_plan_node(grouped_plan, "HPCC_SCAN").get("extra_info", {})
    if not grouped_info.get("Grouped", "").startswith("true") or "Pushed Limit" in grouped_info:
        raise AssertionError("ExplainScan did not report multi-part grouped scan accurately")
    for predicate in ("", " WHERE kind = 1", " WHERE dpos > 70000"):
        single_key = execute(f"SELECT COUNT(*), SUM(dpos) FROM {SEARCH_INDEX}{predicate}")["rows"]
        multi_key = execute(f"SELECT COUNT(*), SUM(dpos) FROM {MULTI_SEARCH_INDEX}{predicate}")["rows"]
        if single_key != multi_key:
            raise AssertionError(f"parallel multi-part KEY aggregate differs{predicate}: {multi_key!r} != {single_key!r}")
    key_window = execute(f"SELECT dpos FROM {MULTI_SEARCH_INDEX} OFFSET 1000 ROWS FETCH NEXT 25 ROWS ONLY")
    if key_window["returnedRowCount"] != 25:
        raise AssertionError("parallel multi-part KEY OFFSET/LIMIT returned the wrong row count")
    _, multi_key_plan = explain(f"SELECT * FROM {MULTI_SEARCH_INDEX} LIMIT 20")
    multi_key_info = find_plan_node(multi_key_plan, "HPCC_SCAN").get("extra_info", {})
    if int(multi_key_info.get("Max Threads", "1")) <= 1 or multi_key_info.get("Partitioned Scan") != "true" \
        or "Pushed Limit" in multi_key_info:
        raise AssertionError(f"ExplainScan did not report a parallel multi-part KEY scan: {multi_key_info!r}")
    if find_plan_node(limit_plan_json, "HPCC_SCAN").get("extra_info", {}).get("Max Threads") != "1":
        raise AssertionError("single-part KEY scan did not remain single-threaded")
    print(json.dumps({"rows": pushed["rows"], "rowCount": pushed["rowCount"], "truncated": pushed["truncated"]}))


if __name__ == "__main__":
    main()