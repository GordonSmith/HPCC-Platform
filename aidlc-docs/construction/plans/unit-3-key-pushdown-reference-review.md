# Unit 3 KEY and Pushdown Reference Review

## Status

Unit 3 now has working FLAT and KEY execution, physical FLAT reader projection pruning, integer and safe string comparison/range/IN filter translation, `IKeyTranslator` expected-to-actual filter translation, contiguous keyed-prefix versus post-filter classification, residual reporting, multi-part KEY merging, TLK exclusion, KEY blob resolution, and LIMIT/OFFSET plan pushdown. Additional filter types and broader mixed-layout fixtures remain incomplete.

## Reference Implementations Consulted

- Roxie `ccdactivity` and `ccdkey`: builds `RowFilter`/`IFieldFilter` objects, scores usable key prefixes, and checks rows after index lookup.
- Thor `thordiskread` and `thorread`: translates filters from expected to actual layouts, applies filters before row translation, and passes `FieldFilterArray` to `IDiskRowReader`.
- Thor `thindexread`: collects field filters, translates them with the keyed translator, and separates index lookup from post-read checks.
- `common/fileview2`: existing Dali/layout and KEY traversal patterns.
- dafilesrv paths: physical part/copy access and remote filtered-read boundaries.

## Findings Applied

- DuckDB table-function bind/init/execute callbacks are the extension boundary; bind owns schema/data, init owns per-scan state, and execution consumes that state.
- `pushdown_expression` and `pushdown_complex_filter` must only consume predicates that have been fully translated. Enabling filter pushdown before that contract is true can silently remove residual predicates.
- Client-local access context belongs in DuckDB `ClientContext::registered_state`, not service-wide extension state.
- Actual, expected, and projected record layouts must remain distinct.
- HPCC filters are created against the expected layout, then translated to the actual physical layout.
- Key eligibility depends on the actual key sort order and contiguous constrained prefix, not field ordinal comparison.
- `FieldFilterArray` is the reader boundary; `RowFilter` is an intermediate planning representation.
- Unsupported or partially translatable predicates remain DuckDB residual filters.
- Reader state must retain Dali file metadata, mapping, reader, stream, and request-scoped access context.
- Distributed KEY scans must exclude top-level key parts before creating a local manager or merger; TLK payload/blob identifiers are not data-row values.
- KEY blob fields are physical blob identifiers and must be resolved through `KLBlobProviderAdapter`/`IKeyManager::loadBlob`, then converted using the blob child type.
- Published KEY schemas may omit physical fields. Projection and filter indexes are mapped by field name to the actual key layout before materialization or monitor creation.
- Bind data owns a synthesized expected `RtlRecord` matching the published DuckDB columns; `IKeyTranslator(actual, expected)` translates typed filters into physical field indexes before classification.
- Only a contiguous constrained key prefix is attached to `IKeyManager`; non-leading and payload filters are evaluated as `RowFilter` post-filters after lookup.
- Contiguous keyed filters are sorted by actual field index before creating segment monitors. Same-field predicates are composed with HPCC `IValueSet::intersectSet`, IN values use `unionSet`, and one `IFieldFilter` is created per field. This matches ECL compiler/Thor/Roxie semantics and prevents duplicate JHTree monitors.
- VARSTRING, variable-size STRING, and fixed STRING constants matching the published byte width can be translated safely. Short fixed-string literals remain DuckDB residuals because HPCC padding semantics differ from DuckDB VARCHAR equality.
- Constant DuckDB LIMIT/OFFSET operators are consumed by an optimizer extension and reported in both text and JSON ExplainScan plans.

## Current Intentional Deviations

- FLAT projection pushdown constructs projected runtime metadata and passes it to `createRowReadFormatMapping`; KEY projection remains output materialization over the physical key buffer.
- Integer comparison, range, IN, and conjunction filters are translated; other types and unsupported composite expressions remain DuckDB residuals.
- `CWsSql2PushdownPlan` remains foundation-test scaffolding and is not the production KEY classification path.
- `mapEclRecordDefinition` is a limited text fallback used only when serialized `ECLbin` metadata is absent. It must be replaced with the repository HQL `parseQuery`/record-export path before claiming general nested/IFBLOCK ECL support.
- `DebugDev` manually assembles diagnostic JSON; it remains temporarily available for reader/layout diagnostics through Unit 5 and will be removed rather than promoted into a public serialization path.

## Next Implementation Sequence

1. Extend typed filter conversion to additional semantically compatible types while preserving unsupported expressions as residuals.
2. Validate pushed/non-pushed equivalence for each newly supported type and translated layout.
3. Add dedicated published fixtures for boolean, Unicode, and additional decimal filter semantics.
4. Evaluate a projected KEY row translator if avoiding unused payload materialization is worth the additional blob/layout complexity.
5. Add streaming result delivery through ESP so large query results do not require full in-memory JSON materialization.
6. Keep bind data, KEY options, and blob handling independent of Dali objects where practical, so Unit 6 can introduce the metadata-source seam and the `hpcc_scan(layout, parts, options)` overload without reworking Unit 3 code.

## Validation Evidence

- `regress::multi::dg_flat` official WUResult output was compared against ws_sql2.
- A reader/materialization mismatch was fixed by replacing positional callback materialization with direct `RtlRecord` field access.
- Current live FLAT and nested-child scans return correct values and row counts.
- `regress::single::searchindex` validates KEY schema-field remapping, integer materialization, predicates, and paged LIMIT/OFFSET execution.
- `regress::multi::dg_fetchindex1` validates multi-part merge, TLK exclusion, published field-attribute cleanup, and blob payload resolution.
- Native and expression-forced residual predicates produce identical rows for a leading keyed field (`kind`) and payload post-filter field (`dpos`).
- ExplainScan text and JSON distinguish `Keyed Filters`, `Post Filters`, and `Residual Filters`, and identify `Filter Layout Translation` when `IKeyTranslator` changes field indexes.
- `regress::single::searchindex` validates that an exact-width `word` filter is post-filtered without `kind`, becomes the second keyed constraint with `kind`, and remains equivalent to a DuckDB residual expression. A short `word='a'` literal remains residual.
- ExplainScan `Reader Projection` validates that a pushed FLAT filter-only field is omitted from projected rows while the selected field remains correct.
- `regress::single::dg_fetchtransindex` validates variable-size STRING post-filter pushdown and pushed-versus-residual equivalence for `tfn='Jane'`.
- `regress::single::searchindex` also validates non-leading `doc` post-filtering, a contiguous three-field `kind`/`word`/`doc` prefix, consecutive IN values collapsed to an HPCC range, and pushed-versus-CASE-residual equivalence.
- Repeated lower bounds validate type-aware strongest-bound intersection, and contradictory lower/upper bounds validate empty-set reduction.
- A catalog-wide `SELECT * ... LIMIT 3` sweep over 139 accessible `regress::*` files passes 93 and returns 46 controlled errors: 23 missing layouts, 8 nested/decimal gaps, 4 grouped files, 6 unsupported non-FLAT/variable formats, 3 KEY layout mismatches, and 2 decimal conversion defects. No transport failures, timeouts, or ESP crashes occurred.
- After adding bounded packed-decimal materialization and correcting fallback parsing to select the final top-level RECORD, the sweep passes 95 and returns 44 controlled errors: 23 missing layouts, 10 nested-layout gaps, 4 grouped files, 6 unsupported non-FLAT/conditional formats, and 1 nested KEY layout mismatch. The four scalar `book`/`person` decimal files pass, and no decimal conversion defects remain.
- ExplainScan text and JSON plans report actual LIMIT/OFFSET optimizer decisions without reading data.
- Foundation tests, targeted builds, Runtime installation, ESP restart, and `git diff --check` pass for the current slice.
