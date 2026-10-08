# Chainguard Builds

This directory builds HPCC Platform packages in Wolfi-based development images.
Each image uses an Ubuntu sysroot that defines its minimum glibc, libstdc++, and
Python versions. Binaries built in an image run on distributions at or above
that baseline.

The scripts run on Linux, macOS and Windows using Docker, Podman, Apple's `container`
CLI or WSL containers; see [Container Engines](#container-engines).

## Directory Layout

The host-side build and validation scripts live in `dockerfiles/chainguard`:

- `build.sh` supplies the opinionated HPCC configure, build, and packaging workflow.
- `cmake-chainguard.sh` runs CMake in a Chainguard container with unchanged CLI arguments.
- `create-build-image.sh` pulls or builds development images.
- `validate-runtime.sh` launches runtime-image validation.
- `container-engine.sh` abstracts container engines and host-OS operations.
- `toolchain-baselines.sh` maps glibc baselines to GCC and Ubuntu sysroot versions.

The [containers](containers/) subdirectory contains `Dockerfile.toolchain`,
`Dockerfile.packager`, and `Dockerfile.runtime`, plus the scripts that run inside
containers: `package-install-tree.sh`, `prepare-sysroot.sh`, and
`generate-vcpkg-sbom.py`. Development and packaging image builds use
that subdirectory as their build context. Runtime image builds use the repository
containing the generated APK as their context. LN CI retains LN as that context,
even though the runtime Dockerfile now lives in HPCC-Platform.

## TL;DR

From the HPCC-Platform repository root, target Ubuntu >= 21.10, Rocky >= 9 and
Wolfi without an LN checkout:

```bash
./dockerfiles/chainguard/build.sh --glibc 2.34 --gcc 11
```

### LN Builds

LN retains only `dockerfiles/chainguard/build.sh`, a thin wrapper. From the LN
root, with a sibling HPCC-Platform checkout containing this tooling:

```bash
./dockerfiles/chainguard/build.sh --glibc 2.34 --gcc 11
# Override the HPCC-Platform checkout:
./dockerfiles/chainguard/build.sh -s /path/to/HPCC-Platform --glibc 2.34 --gcc 11
```

The wrapper sets LN as `--source-root` and HPCC-Platform as
`--hpcc-source-dir`, then delegates to this directory's `build.sh`. The shared
implementation has no LN discovery or requirement. Generic callers may pass
these two source roots independently; packaging tools are always resolved
relative to this tooling directory, not the selected project.

Standalone builds read this HPCC-Platform checkout's `.env`. The LN wrapper
instead defaults `ENV_FILE` to LN's `.env`. Set `ENV_FILE` explicitly to override
either behavior. `-s` (or `HPCC_SOURCE_DIR` in the wrapper's environment) selects
the HPCC checkout before configuration is loaded; put this override on the
command line or in the calling environment, not in `.env`.

LN's platform workflow uses its `community_ref` checkout for the shared tools,
so that ref must contain `dockerfiles/chainguard`. The builder-image workflow
also accepts `community_ref` (default `master`); select a ref containing this
tooling before it is merged to the default branch.

## CMake Proxy

`cmake-chainguard.sh` accepts the same arguments as CMake, including configure,
`--build`, `--install`, `--preset`, `-P`, `-E`, and help/version commands. It
executes only the requested CMake command; it does not add configure flags,
build automatically, or create packages.

The workspace (the parent of this checkout unless `CHAINGUARD_WORKSPACE_ROOT`
is set) and the calling working directory
are mounted at their original absolute paths. Relative paths, absolute paths,
and paths recorded in CMake caches therefore remain valid across proxy calls.
Other host paths must be mounted explicitly with `CHAINGUARD_EXTRA_MOUNTS`.
Use separate build trees for host CMake and each container toolchain.

```bash
# From the HPCC-Platform repository root:
export CHAINGUARD_GLIBC=2.34 CHAINGUARD_GCC=11
./dockerfiles/chainguard/cmake-chainguard.sh -S . -B ../build/cmake-chainguard -G Ninja
./dockerfiles/chainguard/cmake-chainguard.sh --build ../build/cmake-chainguard --parallel
./dockerfiles/chainguard/cmake-chainguard.sh --version
```

Proxy settings are environment variables, so none can consume a CMake argument:

| Variable | Default | Purpose |
|---|---|---|
| `CHAINGUARD_GLIBC` | `2.43` | Builder glibc baseline. |
| `CHAINGUARD_GCC` | Baseline default | Builder GCC major version. |
| `CHAINGUARD_ARCH` | Host architecture | Same architecture aliases as `build.sh`. |
| `CHAINGUARD_IMAGE` | Formulated JFrog tag | Use an explicit builder image without ensuring it; cannot be combined with `CHAINGUARD_GLIBC` or `CHAINGUARD_GCC`. |
| `CHAINGUARD_NO_PULL` | `0` | Set to `1` to avoid pulling the selected builder. |
| `CHAINGUARD_EXTRA_MOUNTS` | None | Docker-style bind/volume mount specifications, one per line. |
| `CHAINGUARD_WORKSPACE_ROOT` | Parent of this checkout | Existing workspace directory mounted at its host path; build/output directories must be beneath it. The LN wrapper defaults this to LN's parent, even with an external `-s` checkout. |
| `CHAINGUARD_PACKAGING` | `0` | Set to `1` to layer packaging tools onto the builder and enable privileged execution for melange. Used by `build.sh`. |
| `CHAINGUARD_BUILD_DIR` | None | Optional workspace build directory for the single-build lock and platform-specific vcpkg scratch volumes. Used by `build.sh`; without it, proxy calls use uniquely named containers. |

For example, to make an external source tree available at the same path:

```bash
CHAINGUARD_EXTRA_MOUNTS="type=bind,source=/opt/my-project,target=/opt/my-project" \
  ./dockerfiles/chainguard/cmake-chainguard.sh -S /opt/my-project -B ../build/my-project
```

The proxy preserves the existing container-engine selection, compiler caches,
optional JFrog NuGet cache, and Ctrl-C cleanup. Image preparation and proxy
diagnostics go to stderr, leaving stdout for CMake output. CMake's exit status
is propagated to the caller.

The proxy deliberately leaves sysroot/triplet and other CMake configuration to
the caller. Use `build.sh` for the supported HPCC sysroot, Python,
vcpkg, and packaging defaults.

## Build Packages

`build.sh` configures and builds HPCC-Platform (or an explicitly selected
CMake project), stages the install tree, and
creates packages and SBOMs. Its default builder is glibc 2.43 with GCC 15 and
uses an HPCC JFrog-qualified tag. When only `--glibc` is specified, GCC defaults
to the version paired with that baseline in the supported-baselines table.
It delegates container execution to `cmake-chainguard.sh`, running its configure,
build, and package steps together in one container.

```bash
./dockerfiles/chainguard/build.sh
```

Before each default build, the helper calls `create-build-image.sh`. That
script pulls the published builder image so a local `latest` tag stays current.
If the pull fails, it reuses the local image or builds one when missing. Use
`--no-pull` to keep a locally built builder image, for example while testing
Dockerfile changes.

Select a baseline, compiler, architecture, and package formats:

```bash
./dockerfiles/chainguard/build.sh \
  --glibc 2.39 \
  --gcc 13 \
  --arch amd64 \
  -f all
```

By default, both source roots are this HPCC-Platform checkout. `-s` selects the
HPCC-Platform dependency/source root; `--source-root` selects a different CMake
project root. When omitted, the CMake root follows `-s`. Both roots must contain
`CMakeLists.txt`. When the default builder is missing, the image helper
authenticates to JFrog using the credentials described below.

### Options and Defaults

| Option | Default | Purpose |
|---|---|---|
| `-s`, `--hpcc-source-dir <source>` | This checkout | HPCC-Platform dependency/source directory. |
| `--source-root <source>` | HPCC-Platform source directory | CMake project root. The LN wrapper fixes this to LN. |
| `-g`, `--glibc <version>` | `2.43` | Builder glibc baseline. |
| `-c`, `--gcc <major>` | Baseline default | Builder GCC major version; GCC 15 for the default glibc 2.43 baseline. |
| `-a`, `--arch`, `--aarch <arch>` | Host architecture | `x64`/`amd64`/`x86_64` or `arm64`/`aarch64`. |
| `-i <image>` | Formulated JFrog tag | Use a pre-existing local or remote builder image without ensuring it. Cannot be combined with `--glibc` or `--gcc`. |
| `-b <directory>` | Derived from image | Build directory; must be inside the workspace. |
| `-o <directory>` | Build directory | Package and SBOM output directory; must be inside the workspace. |
| `-f <formats>` | `all` | Comma-separated `apk`, `deb`, and `rpm`, or `all`. |
| `-k <key>` | None | APK signing key. DEB and RPM output is not signed. |
| `--containerized` | Off | Configure with `CONTAINERIZED=ON`. |
| `--no-pull` | Off | Use the local builder image, or build one, instead of pulling the published image. |
| `-- <options>` | None | Additional CMake options. |

The formulated image is:

```text
useast.jfrog.lexisnexisrisk.com/hpccpl-docker-misc-local/chainguard/build-images/hpcc-chainguard-glibc<baseline>-gcc<major>-dev:latest-<arch>
```

To use a locally built image:

```bash
./dockerfiles/chainguard/build.sh \
  -i hpcc-chainguard-glibc2.39-gcc13-dev:latest-amd64 \
  -f all
```

By default, standalone builds go under the HPCC-Platform source checkout's
`build` directory, for example `build/chainguard-hpcc-glibc2.39-gcc13`.
Intermediate files go in its `staging`
subdirectory. Use a separate build directory for each image to prevent CMake
from reusing a cache from another baseline.

For glibc 2.39 and GCC 13, the default directories are:

- Bare-metal: `build/chainguard-hpcc-glibc2.39-gcc13`.
- With `--containerized`: `build/chainguard-hpcc-glibc2.39-gcc13-containerized`.

The LN wrapper preserves its existing `../build/chainguard-glibc2.39-gcc13`
prefix (and optional `-containerized` suffix). `CHAINGUARD_BUILD_PREFIX`
overrides the prefix for either entry point; keep it a single directory name.
`CHAINGUARD_BUILD_ROOT` overrides the parent build directory; the LN wrapper
sets it to the workspace's `build` directory to preserve existing LN paths.
An explicit `-b` takes precedence. Keep standalone and delegated build trees
separate so their CMake caches and staging directories cannot collide.

The image's `-dev` suffix is not included in the directory name.
An explicit `-b` directory is used unchanged; existing directories are not renamed.

Only one container may use a build directory at a time. A second build is
refused, and Ctrl-C stops the full containerized build.

### Build Modes

| | Bare-metal (default) | Containerized (`--containerized`) |
|---|---|---|
| CMake | `CONTAINERIZED=OFF` | `CONTAINERIZED=ON` |
| Deployment | Host or VM using HPCC init scripts | Kubernetes using HPCC Helm charts |
| Contents | Init scripts, systemd units, `/etc/HPCCSystems`, and components such as `eclserver` | Kubernetes helper scripts; no host init or configuration files |
| DEB/RPM scripts | `postinst`, `prerm`, and `postrm` | None |
| Build directory suffix | None | `-containerized` |
| Package label | `glibc<baseline>` | `glibc<baseline>_k8s` |
| Typical use | DEB/RPM host installation | APK for the Chainguard runtime image |

Keep the modes in separate build directories because they produce different
install trees. `build-docker-chainguard.yml` always uses the containerized mode,
and `containers/Dockerfile.runtime` installs its APK.

On Ubuntu 23.10 and later, melange needs unprivileged user namespaces to build
APKs. Enable them before an APK build:

```bash
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
```

The helper checks this setting before starting the full build.

## Supported Baselines

| Image | Sysroot | GCC | `GLIBC` / `GLIBCXX` | Python | Supported targets |
|---|---|---:|---|---:|---|
| `hpcc-chainguard-glibc2.34-gcc11-dev` | Ubuntu 21.10 | 11 | 2.34 / 3.4.29 | 3.9 | Ubuntu >= 21.10, Rocky >= 9, Wolfi |
| `hpcc-chainguard-glibc2.35-gcc11-dev` | Ubuntu 22.04 | 11 | 2.35 / 3.4.30 | 3.10 | Ubuntu >= 22.04, Wolfi |
| `hpcc-chainguard-glibc2.36-gcc11-dev` | Ubuntu 22.10 | 11 | 2.36 / 3.4.30 | 3.10 | Ubuntu >= 22.10, Wolfi |
| `hpcc-chainguard-glibc2.37-gcc11-dev` | Ubuntu 23.04 | 11 | 2.37 / 3.4.32 | 3.11 | Ubuntu >= 23.04, Wolfi |
| `hpcc-chainguard-glibc2.38-gcc13-dev` | Ubuntu 23.10 | 13 | 2.38 / 3.4.32 | 3.11 | Ubuntu >= 23.10, Wolfi |
| `hpcc-chainguard-glibc2.39-gcc13-dev` | Ubuntu 24.04 | 13 | 2.39 / 3.4.33 | 3.12 | Ubuntu >= 24.04, Rocky >= 10, Wolfi |
| `hpcc-chainguard-glibc2.40-gcc13-dev` | Ubuntu 24.10 | 13 | 2.40 / 3.4.33 | 3.12 | Ubuntu >= 24.10, Wolfi |
| `hpcc-chainguard-glibc2.41-gcc13-dev` | Ubuntu 25.04 | 13 | 2.41 / 3.4.34 | 3.13 | Ubuntu >= 25.04, Wolfi |
| `hpcc-chainguard-glibc2.42-gcc15-dev` | Ubuntu 25.10 | 15 | 2.42 / 3.4.34 | 3.13 | Ubuntu >= 25.10, Wolfi |
| `hpcc-chainguard-glibc2.43-gcc15-dev` | Ubuntu 26.04 | 15 | 2.43 / 3.4.35 | 3.14 | Ubuntu >= 26.04, Wolfi |
| `hpcc-chainguard-glibc2.44-gcc16-dev` | Ubuntu 26.10 | 16 | 2.44 / 3.4.36 | 3.14 | Ubuntu >= 26.10, Wolfi |

Ubuntu sysroots provide a consistent package layout. The GCC version paired
with each baseline is the newest one supported by that sysroot's libstdc++.
Rocky 8 is not supported by these images.

## Build a Development Image

From the HPCC-Platform repository root, ensure one image or every supported baseline is
available locally:

```bash
./dockerfiles/chainguard/create-build-image.sh --glibc 2.34
./dockerfiles/chainguard/create-build-image.sh --glibc 2.39 --gcc 13
./dockerfiles/chainguard/create-build-image.sh --glibc all
```

With a registry-qualified `--tag-prefix`, the helper first pulls the published
image. Otherwise, or when the pull fails, it reuses an existing image with the
expected tag. If that is missing, the helper builds and validates it. Remove the
local image and use `--no-pull` to force a rebuild.

The default image tag is:

```text
hpcc-chainguard-glibc<baseline>-gcc<major>-dev:latest-<arch>
```

Useful options:

| Option | Purpose |
|---|---|
| `--gcc 13,15` | Build each selected glibc baseline with each listed GCC major. A version newer than the baseline default may fail to link. |
| `--arch arm64` | Build for ARM64. The aliases `--aarch` and `aarch64` are accepted; the default is the host architecture. |
| `--tag-prefix <prefix>` | Replace the default `hpcc-chainguard` image prefix, including with a registry-qualified prefix. |
| `--base-image <image>` | Replace the default JFrog `gcc-glibc:latest-dev` base image. |
| `--no-pull` | Do not pull a registry-qualified image; reuse or build it locally. The publishing workflow uses this so it always builds a fresh image. |

Both `--glibc` and `--gcc` accept comma-separated lists. For example:

```bash
./dockerfiles/chainguard/create-build-image.sh \
  --glibc 2.39,2.43 \
  --gcc 13,15 \
  --arch arm64
```

To use the default JFrog base image, create `.env` in the HPCC-Platform repository root
(or LN's root when using its wrapper).
It is sourced by bash, so replace the placeholders and leave optional settings
commented out unless needed:

```bash
JFROG_USERNAME=your.name@example.com
JFROG_PASSWORD='your-password-or-PAT'
# JFROG_REGISTRY=useast.jfrog.lexisnexisrisk.com
# JFROG_NUGET_REPOSITORY=hpccpl-nuget-local
# NUGET_MODE=read  # read, write, readwrite, or off
```

The helper passes the password to the container backend's registry login through
stdin.

### vcpkg Binary Cache

Each image includes mono and `nuget.exe` (`/opt/nuget/nuget.exe`) so vcpkg can
share built ports through a JFrog NuGet feed. When `JFROG_USERNAME` and
`JFROG_PASSWORD` are set, `cmake-chainguard.sh` (also used by `build.sh`)
registers the feed as the
NuGet source `JFrog` and sets
`VCPKG_BINARY_SOURCES=clear;default,readwrite;nuget,JFrog,<NUGET_MODE>`, so the
local cache in `~/.cache/vcpkg/chainguard` is checked first.

| Variable | Default | Purpose |
|---|---|---|
| `JFROG_NUGET_REPOSITORY` | `hpccpl-nuget-local` | JFrog NuGet repository key; the feed is `https://<JFROG_REGISTRY>/artifactory/api/nuget/v3/<key>/index.json`. |
| `NUGET_MODE` | `read` | `read`, `write`, `readwrite`, or `off`. CI uses `readwrite` except on pull requests. |

Package IDs are `<port>_<triplet>`, for example
`zlib_x64-linux-dynamic-sysroot`. Versions end in the vcpkg ABI hash, which
includes the glibc baseline and compiler, so baselines never share binaries.
Credentials reach the container through a temporary mounted file, not the
command line. Feed errors only cost cache hits; vcpkg builds missing ports
locally.

Each image contains:

- `/opt/hpcc-sysroot`, also exported as `HPCC_SYSROOT`.
- `/opt/hpcc-sysroot/hpcc-baseline`, which records the `GLIBC`, `GLIBCXX`, and
  `PYTHON` limits.
- Image labels `org.hpccsystems.glibc-baseline`,
  `org.hpccsystems.gcc-major`, and `org.hpccsystems.sysroot-image`.

`containers/prepare-sysroot.sh` verifies the requested glibc baseline. It also removes
Wolfi glibc headers copied into GCC's `include-fixed` directory, where they
would take precedence over the older sysroot headers.

## Package Output

All formats use the same staged install tree and are written to the output
directory. Names include the glibc baseline, optional `_k8s` marker, and
architecture:

| Format | Tool | Example bare-metal name |
|---|---|---|
| APK | melange | `hpccsystems-platform-10.2.73_beta0-r0.glibc2.39.x86_64.apk` |
| DEB | nfpm | `hpccsystems-platform_10.2.73-closedown0_glibc2.39_amd64.deb` |
| RPM | nfpm | `hpccsystems-platform-10.2.73-closedown0.glibc2.39.x86_64.rpm` |

DEB and RPM releases use the CPack release from `version.cmake` as is. APK
releases must be numeric, so the APK version maps it to an equivalent that apk
orders the same way:

| CPack release | APK version |
|---|---|
| `1` (gold) | `10.2.73-r1` |
| `rc2` | `10.2.73_rc2-r0` |
| `closedown0` | `10.2.73_beta0-r0` |
| `trunk0` | `10.2.73_alpha0-r0` |

Containerized names insert `_k8s` after the baseline. melange's signed
repository and `APKINDEX` remain in `staging/apk-repo/<arch>`.

The packager:

- Generates runtime and vcpkg SPDX SBOMs.
- Rejects ELF objects that exceed the image's `GLIBC` or `GLIBCXX` limits.
- Derives DEB and RPM dependencies from ELF objects. RPM dependencies use
  exact `soname(VERSION)(64bit)` symbols; DEBs require the highest referenced
  glibc version and the builder's libstdc++ major.
- Maps `libcrypt.so.1` to `libcrypt1` on Debian-family systems and
  `libxcrypt-compat` on RHEL-family systems.
- Includes platform install scripts and creates library SONAME links for
  bare-metal DEB/RPM packages. APKs store the links in
  `opt/HPCCSystems/lib/soname-links.txt` for the runtime image to apply.

Java and Python plugin runtimes remain optional. The Python plugin loads only
where the baseline's `libpython<version>.so.1.0` is installed. This is the
default Python on Rocky 10 and Ubuntu 22.04, 24.04, and 26.04.
`containers/Dockerfile.runtime` installs the matching Wolfi
`python-<version>-base`; the workflow reads that version from `hpcc-baseline`.

## Sysroot Behavior

For sysroot-enabled images, the build helper:

- Uses the `x64-linux-dynamic-sysroot` or `arm64-linux-dynamic-sysroot` vcpkg
  triplet and `linux-sysroot-toolchain.cmake` from
  `HPCC-Platform/vcpkg_overlays`.
- Sets `HPCC_GLIBC_BASELINE`, preventing cached vcpkg binaries from being
  shared across baselines.
- Configures `CMAKE_SYSROOT` and linker search paths so the sysroot's startup
  files and libraries take precedence over Wolfi's, while vcpkg libraries take
  precedence over older copies in the sysroot.
- Builds `py3embed` with the sysroot's Python interpreter, headers, and
  `libpython`, using `/opt/hpcc-sysroot/hpcc-python.cmake`.

The build container puts `/usr/bin` and `/bin` first in `PATH`, bypassing
the base image's `/usr/local` OpenSSF compiler wrapper. GNU coreutils supplies `date`
with the nanosecond support required by vcpkg.

## Native DEB and RPM Builds

For distribution-native packages, configure the project on the target distribution so
CMake selects the correct metadata and install scripts. Then run:

```bash
# Debian or Ubuntu
cmake --build <build-dir> --parallel
cpack --config <build-dir>/CPackConfig.cmake -G DEB

# Red Hat, Rocky, Fedora, or SUSE
cmake --build <build-dir> --parallel
cpack --config <build-dir>/CPackConfig.cmake -G RPM
```

The package is written to `<build-dir>`. Do not run `cpack` in a build directory
configured inside the Wolfi builder: that configuration uses archive
generators. Use `-f deb,rpm` with `build.sh` instead.

## Container Engines

All container-engine operations go through `container-engine.sh`. Support for
another engine belongs in that file rather than in the build scripts.

| Engine | `CONTAINER_RUNTIME` | Host | Requirements |
|---|---|---|---|
| Docker | `docker` | Linux, macOS, Windows | Reachable daemon |
| Podman | `podman` | Linux, macOS, Windows | `podman info` succeeds; on Windows, a running Podman machine and Git Bash |
| Apple `container` CLI | `apple` | macOS | `jq` |
| WSL containers (`wslc.exe`) | `wslc` | Windows | WSL 2.9.3+, run from Git Bash |

Docker is used when its daemon is reachable, then Podman, Apple's CLI, or `wslc`.
Set `CONTAINER_RUNTIME` to choose explicitly. The settings below can also be
placed in the selected repository's `.env` file.

| Variable | Apple | `wslc` |
|---|---|---|
| `CONTAINER_CPUS` | Default: all host CPUs | Optional further limit |
| `CONTAINER_MEMORY` (e.g. `32G`) | Default: 75% of host memory | Optional further limit |
| `CONTAINER_DNS` (space-separated IPs) | Default: host's DNS servers | Default: follows Windows |

Podman notes:

- Rootless Podman runs builds with `--userns=keep-id` so build output stays
  owned by the host user.
- On Windows, translates bind-mount and build-context paths to Windows paths,
  runs as the Podman machine's user rather than the Git Bash UID, and keeps vcpkg
  build trees and packages in per-build volumes (`podman volume ls`).
- Resource limits come from the Podman machine (`podman machine set --cpus
  --memory`); `CONTAINER_CPUS`, `CONTAINER_MEMORY`, and `CONTAINER_DNS` are not
  applied.

`wslc` notes:

- Builds only for the host architecture.
- Translates bind-mount sources to Windows paths.
- Keeps vcpkg build trees and packages in per-build volumes (`wslc volume list`).
- All containers share one session VM sized by `session.cpuCount` and
  `session.memorySize` in `%LOCALAPPDATA%\wslc\settings.yaml` (defaults: all
  CPUs, half of memory; set `memorySize` to 75% of host memory to match Apple).
  Run `wslc system session terminate` after changing them.

## Runtime Image Notes

`validate-runtime.sh --image <runtime-image>` smoke-tests the final image as
its default non-root user before publication. It checks the runtime identity
and environment, required tools/libraries, C++ compile/link/run, HPCC CLI startup,
and SBOM JSON parsing. Checks fail fast inside the container.

`containers/Dockerfile.runtime` copies the Wolfi `git-lfs` and `kubectl-latest`
packages, their resolved root filesystem, and package SBOMs from the Chainguard
Go image into the distroless JDK/FIPS image. It excludes `apk` and its indexes.
GCC, headers, and development files remain because `eclcc` compiles generated
C++ at runtime.
