# Requirements Verification Questions

The supplied `plan.md` is detailed enough to establish the baseline design, but these answers are needed to finalize the AI-DLC workflow, stage boundaries, and acceptance criteria. Fill every `[Answer]:` tag.

## Question 1: Security Extensions
Should security extension rules be enforced for this project?

A) Yes - enforce all SECURITY rules as blocking constraints

B) No - skip SECURITY rules

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2: Property-Based Testing Extension
Should property-based testing rules be enforced for this project?

A) Yes - enforce PBT rules for all applicable mapping, filtering, serialization, and stateful logic

B) Partial - enforce PBT rules for pure functions and serialization round-trips only

C) No - skip PBT rules

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3: Resiliency Extensions
Should the resiliency baseline be applied to this project?

A) Yes - apply it as directional design-time guidance

B) No - skip the resiliency baseline

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4: User Stories
Should the workflow include a User Stories stage for the new ESP API and its operator/client personas?

A) Yes - define stories for SQL clients, ESP operators, security administrators, and maintainers

B) No - treat the supplied plan as the complete acceptance baseline and skip stories

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5: First Delivery Boundary
What should the first implementation unit prioritize if the complete plan is too large for one delivery increment?

A) Build/dependency wiring, ECM contract, query engine shell, and static extension registration

B) Metadata/type mapping plus FLAT/compressed/superfile scan path

C) KEY scan and pushdown semantics

D) End-to-end vertical slice with reduced file-type coverage

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 6: Deployment Readiness
What deployment scope should the workflow require before the first release candidate?

A) Build and focused tests only; packaging/configuration follows in a later increment

B) Linux primary triplet including service configuration and packaging

C) Linux, Windows, and macOS packaging as part of the first release candidate

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 7: Acceptance of Existing Plan Decisions
May the workflow treat the confirmed scope and decisions in `plan.md` as approved defaults unless an answer above explicitly changes them?

A) Yes - use plan.md decisions as the baseline

B) No - require explicit approval of each major design decision during Application Design

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8: RTO/RPO Goals and Disaster Recovery Strategy
What recovery target and disaster recovery strategy should apply to the ws_sql2 service?

A) RPO/RTO measured in hours - Backup and Restore

B) RPO/RTO measured in tens of minutes - Pilot Light

C) RPO/RTO measured in minutes - Warm Standby

D) Near-real-time RPO/RTO - Multi-site Active/Active

E) Single-region deployment is acceptable; no cross-region DR is required

X) Other (please describe after [Answer]: tag below)

[Answer]: E

## Question 9: Change Management Process
How should production changes for this workload be governed?

A) Use an existing organizational change-management process; provide its name or tool

B) No formal process exists; propose a lightweight change-management process

C) The workload is exempt from formal change management; provide the rationale

X) Other (please describe after [Answer]: tag below)

[Answer]: A Use existing GitHub change-management process

## Question 10: CI/CD and Deployment Tooling
What CI/CD tooling and deployment process should the workflow target?

A) Use the existing CI/CD pipeline; provide the tool or reference

B) No pipeline exists; propose a CI/CD pipeline definition

X) Other (please describe after [Answer]: tag below)

[Answer]: A Github Actions

## Question 11: Rollback Mechanism
How should a failed production deployment be rolled back?

A) Redeploy the previous version-pinned artifact or configuration

B) Blue/green swap back to the previous environment

C) Canary auto-rollback on health or metric regression

D) Database-aware rollback with migration reversal

E) Use the organization’s existing rollback procedure; provide the reference

X) Other (please describe after [Answer]: tag below)

[Answer]: E Rollback is handled by the end user

## Question 12: Deployment Style
What deployment strategy is acceptable for this workload?

A) Direct or in-place deployment

B) Rolling deployment

C) Blue/green deployment

D) Canary deployment

X) Other (please describe after [Answer]: tag below)

[Answer]: X deployment is handled by the end user

## Question 13: Regional Topology
Does this workload require multi-region deployment?

A) Single-region, multi-zone

B) Multi-region active-passive

C) Multi-region active-active

X) Other (please describe after [Answer]: tag below)

[Answer]: X Handled by the end user

## Question 14: Resiliency Testing Approach
How should resiliency mechanisms such as failover and recovery be validated?

A) Use an existing DR testing, game-day, or chaos-engineering practice; provide the reference

B) No practice exists; propose a DR testing schedule and chaos plan

C) Defer execution to the Operations phase while capturing scenarios now

X) Other (please describe after [Answer]: tag below)

[Answer]: X Handled by the end user

## Question 15: Incident Response Process
How are production incidents handled for this workload?

A) Use an existing incident-response process; provide the reference

B) No formal process exists; propose a lightweight incident-response and correction-of-errors process

X) Other (please describe after [Answer]: tag below)

[Answer]: X Handled by the end user
