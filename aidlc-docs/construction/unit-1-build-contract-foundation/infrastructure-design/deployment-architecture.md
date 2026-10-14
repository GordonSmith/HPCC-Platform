# Unit 1 Deployment Architecture

## Architecture Summary
Unit 1 adds an independently buildable ws_sql2 ESP service to the existing HPCC deployment model. The service is packaged for the Linux primary triplet and remains separately enableable from legacy ws_sql.

## Build and Release Flow
1. GitHub Actions configures the repository with ws_sql2 enabled or disabled.
2. The enabled path resolves DuckDB through existing vcpkg/CMake policy and generates ECM types.
3. ESP service/plugin targets compile and link with the statically registered extension boundary.
4. Linux packaging produces the ws_sql2 service/configuration artifacts and required DuckDB runtime packaging.
5. Foundation smoke tests execute in the later validation environment selected by the deployment owner.

## Runtime Placement
- ws_sql2 runs inside each existing ESP instance where the service is enabled.
- DuckDB is in-process and request-scoped; no separate database service is introduced.
- HPCC metadata/readers remain accessed through existing platform components and later units.
- `ws_sql` remains an independent service path.

## Configuration Modes
- **Disabled**: no ws_sql2 build/runtime targets in the selected profile; legacy services remain unchanged.
- **Enabled**: DuckDB dependency, ECM contract, plugin, service, configuration, and package entries are present.
- **Misconfigured dependency**: configuration fails clearly rather than producing a partial service.

## End-User-Owned Concerns
The consuming deployment owner selects and operates deployment topology, rollback mechanism, regional placement, resiliency testing, incident response, and monitoring backends. Unit 1 supplies build/package contracts and preserves the handoff boundary; it does not claim those operational guarantees.

## Verification Handoff
- GitHub Actions: build/configuration validation.
- Later validation environment: foundation smoke tests and runtime registration/lifecycle checks.
- Unit 5: monitoring, full integration, performance/regression, and release validation.
