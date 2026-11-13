#!/bin/bash
set -euo pipefail
trap 'echo "HPCC APK setup failed at line ${LINENO}" >&2' ERR

INSTALL_DIR=/opt/HPCCSystems
CONFIG_DIR=/etc/HPCCSystems
DEFAULTS="${INSTALL_DIR}${CONFIG_DIR}/rpmnew"
CLIENT_TOOLS=(dfuplus ecl esp-api eclcc eclplus wuget ecl-bundle ecl-packagemap
    ecl-queries ecl-roxie esdl esdl-xml soapplus tankfile testsocket)

install_link() {
    local source="$1" destination="$2"
    if [[ -L "${destination}" && "$(readlink "${destination}")" == "${source}" ]]; then
        return
    fi
    if [[ -e "${destination}" || -L "${destination}" ]]; then
        echo "Cannot install ${destination}: an existing file or different symlink must be resolved first" >&2
        exit 1
    fi
    ln -s "${source}" "${destination}"
}

remove_link() {
    local source="$1" destination="$2"
    if [[ -L "${destination}" && "$(readlink "${destination}")" == "${source}" ]]; then
        rm -- "${destination}"
    fi
}

case "${1:-install}" in
    remove)
        for name in hpcc-init dafilesrv; do
            remove_link "${INSTALL_DIR}/etc/init.d/${name}" "/etc/init.d/${name}"
        done
        for name in "${CLIENT_TOOLS[@]}"; do
            remove_link "${INSTALL_DIR}/bin/${name}" "/usr/bin/${name}"
        done
        exit 0
        ;;
    install) ;;
    *) echo "Usage: $0 [install|remove]" >&2; exit 1 ;;
esac

for tool in awk getent groupadd useradd usermod install; do
    command -v "${tool}" >/dev/null || { echo "HPCC APK setup requires ${tool}" >&2; exit 1; }
done

read_default() {
    local value
    value="$(awk -F= -v key="$1" '
        /^\[/ { section = ($0 == "[DEFAULT]"); next }
        section {
            name = $1
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
            if (name == key) {
                sub(/^[^=]*=/, "")
                sub(/[[:space:]]*[#;].*$/, "")
                gsub(/^[[:space:]]+|[[:space:]]+$/, "")
                print
                exit
            }
        }
    ' "${DEFAULTS}/environment.conf")"
    [[ -n "${value}" ]] || { echo "Missing HPCC default setting: $1" >&2; exit 1; }
    printf '%s\n' "${value}"
}

# Read the package's root-owned defaults, not user-editable runtime configuration.
user="$(read_default user)"
group="$(read_default group)"
home="$(read_default home)"
runtime="$(read_default runtime)"
pid="$(read_default pid)"
lock="$(read_default lock)"
log="$(read_default log)"
sourcedir="$(read_default sourcedir)"
environment="$(read_default environment)"
[[ "$(read_default path)" == "${INSTALL_DIR}" && "$(read_default configs)" == "${CONFIG_DIR}" ]] || {
    echo "Native APK setup requires /opt/HPCCSystems and /etc/HPCCSystems" >&2
    exit 1
}
for name in "${user}" "${group}"; do
    [[ "${name}" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*\$?$ ]] || { echo "Invalid HPCC account name: ${name}" >&2; exit 1; }
done
for directory in "${home}" "${runtime}" "${pid}" "${lock}" "${log}" "${sourcedir}"; do
    [[ "${directory}" == /* && "${directory}" != / && "/${directory}/" != *"/../"* ]] || {
        echo "Invalid HPCC directory: ${directory}" >&2
        exit 1
    }
done
[[ "${environment}" != */* ]] || { echo "Invalid HPCC environment filename" >&2; exit 1; }

if ! getent group "${group}" >/dev/null; then
    groupadd --system "${group}"
fi
if ! getent passwd "${user}" >/dev/null; then
    useradd --system --create-home --home-dir "${home}/${user}" --gid "${group}" \
        --shell /bin/bash --comment "HPCC runtime user" "${user}"
elif ! id -nG "${user}" | tr ' ' '\n' | grep -Fxq "${group}"; then
    usermod --append --groups "${group}" "${user}"
fi

install -d -m 0755 /etc/init.d
if [[ ! -d "${CONFIG_DIR}" ]]; then
    install -d -m 0775 -o root -g "${group}" "${CONFIG_DIR}"
fi

copy_default() {
    local source="$1" destination="$2"
    if [[ ! -e "${destination}" && ! -L "${destination}" ]]; then
        install -m 0664 -o "${user}" -g "${group}" "${source}" "${destination}"
    fi
}

for name in environment.conf environment.xml genenvrules.conf; do
    copy_default "${DEFAULTS}/${name}" "${CONFIG_DIR}/${name}"
done
for name in configmgr config2mgr; do
    if [[ -d "${INSTALL_DIR}${CONFIG_DIR}/${name}" ]]; then
        if [[ ! -d "${CONFIG_DIR}/${name}" ]]; then
            install -d -m 0775 -o "${user}" -g "${group}" "${CONFIG_DIR}/${name}"
        fi
        for source in "${INSTALL_DIR}${CONFIG_DIR}/${name}/"*; do
            [[ ! -f "${source}" ]] || copy_default "${source}" "${CONFIG_DIR}/${name}/${source##*/}"
        done
    fi
done
for directory in "${runtime}" "${pid}" "${lock}" "${log}"; do
    install -d -m 0755 -o "${user}" -g "${group}" "${directory}"
done
if [[ ! -d "${sourcedir}" ]]; then
    install -d -m 0775 -o "${user}" -g "${group}" "${sourcedir}"
fi
copy_default "${CONFIG_DIR}/${environment}" "${sourcedir}/${environment}"
for name in hpcc-init dafilesrv; do
    install_link "${INSTALL_DIR}/etc/init.d/${name}" "/etc/init.d/${name}"
done
for name in "${CLIENT_TOOLS[@]}"; do
    if [[ -x "${INSTALL_DIR}/bin/${name}" ]]; then
        install_link "${INSTALL_DIR}/bin/${name}" "/usr/bin/${name}"
    fi
done
echo "HPCC runtime setup complete. Services have not been started."
