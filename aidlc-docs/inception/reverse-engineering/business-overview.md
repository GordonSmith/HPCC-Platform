# Business Overview

## Business Context
HPCC-Platform provides distributed data processing and access services over DFS logical files, ECL record layouts, Dali metadata, Thor/Roxie execution, and ESP APIs. The proposed ws_sql2 module adds bounded interactive SQL access inside ESP without replacing existing ws_sql, Thor, or Roxie workflows.

## Business Transactions
- Execute a bounded SQL query against explicitly named accessible DFS files.
- List DFS files accessible to the authenticated caller.
- Describe a DFS file and its mapped DuckDB schema.
- Explain projection and predicate pushdown without reading file data.
- Return stable schemas, JSON rows, limits, diagnostics, and structured failures.

## Business Dictionary
- **DFS logical file**: An HPCC logical name resolved through Dali.
- **hpcc_scan**: The DuckDB table function that binds an authorized DFS file.
- **Pushdown**: Applying projection or a semantically equivalent filter in the HPCC reader before DuckDB residual evaluation.
- **Residual filter**: A predicate left for DuckDB because HPCC cannot represent it safely.
- **ESP**: The service process hosting the request boundary and in-process DuckDB engine.
