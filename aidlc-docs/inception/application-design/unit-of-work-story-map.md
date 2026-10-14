# ws_sql2 Unit and Story Map

## Story Allocation Rule
Cross-cutting stories are centered in Unit 5, while Units 1 through 4 provide the runtime implementation inputs and focused evidence required by Unit 5.

## Mapping
| Story | Primary Unit | Supporting Units | Notes |
|---|---|---|---|
| US-01 Execute authorized SELECT | Unit 4 | Units 1, 2, 5 | Unit 4 owns orchestration; Unit 2 supplies metadata/auth; Unit 5 validates end to end |
| US-02 Bind typed named parameters | Unit 4 | Units 1, 2, 5 | Query binding and type validation consume shared mapping |
| US-03 Discover accessible metadata | Unit 2 | Units 1, 5 | Metadata methods and authorization bind are Unit 2 responsibilities |
| US-04 Inspect pushdown/residual filters | Unit 3 | Units 2, 4, 5 | KEY/pushdown planning is primary; ExplainScan consumes shared metadata |
| US-05 Receive nested and bounded results | Unit 4 | Units 2, 5 | Mapping, serialization, limits, and truncation are validated together |
| US-06 Build/package independently | Unit 1 | Unit 5 | Unit 1 provides targets; Unit 5 validates Linux packaging |
| US-07 Enforce authorization/isolation | Unit 5 | Units 1, 2, 3, 4 | Cross-cutting story centered in final validation with runtime evidence |
| US-08 Observe and cancel requests | Unit 5 | Units 1, 3, 4 | Cross-cutting limits/cancellation/metrics require all runtime units |
| US-09 Return explicit failures | Unit 5 | Units 1, 2, 3, 4 | Error categories and regression tests are centralized in final validation |
| US-10 Extend readers safely | Unit 3 | Units 2, 4, 5 | Reader seam reuse and PBT/regression evidence span runtime units |

## Requirement Coverage
- FR-01 and FR-10: Units 1 and 5.
- FR-02, FR-08, and FR-09: Units 4 and 5, with Unit 1 query-engine foundation.
- FR-03, FR-04, and FR-05: Unit 2, consumed by Units 3 and 4.
- FR-06: Unit 3 for KEY/pushdown and Unit 4 for FLAT execution.
- FR-07: Unit 2 for metadata authorization and Unit 5 for cross-cutting validation.
- FR-11: Unit 5 with focused evidence from every runtime unit.

## Explicitly Not a Separate Story
End-user-owned deployment style, rollback, regional topology, resiliency testing, and incident response remain NFR/infrastructure responsibilities per approved requirements and are not assigned as separate user stories.
