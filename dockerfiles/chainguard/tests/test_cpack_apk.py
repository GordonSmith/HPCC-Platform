#!/usr/bin/env python3
"""Exercise native APK CPack integration without building HPCC or using a container."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[3]


class CPackApkTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="hpcc apk test ")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.build = self.root / "build"
        self.tools = self.root / "tools"
        self.tools.mkdir()
        self.log = self.root / "melange.log"
        self.env = dict(os.environ, PATH=f"{self.tools}:{os.environ['PATH']}",
                        APK_TEST_LOG=str(self.log), HPCC_SYSROOT="")
        self.tool("syft", "import json\nprint(json.dumps({'spdxVersion': 'SPDX-2.3'}))\n")
        self.tool("melange", """
import json, os, pathlib, sys, tarfile
args = sys.argv[1:]
def value(flag):
    return args[args.index(flag) + 1]
with open(os.environ["APK_TEST_LOG"], "a") as log:
    log.write(json.dumps(args) + "\\n")
if os.environ.get("APK_TEST_FAIL"):
    sys.exit(7)
config = pathlib.Path(args[1]).read_text()
def field(key):
    return next(line.split(": ", 1)[1] for line in config.splitlines() if line.startswith("  " + key + ":"))
with tarfile.open(pathlib.Path(value("--source-dir")) / "stage-rootfs.tar") as stage:
    assert stage.extractfile("./opt/fixture/bin/payload").read() == b"fixture\\n"
    assert stage.extractfile("./etc/fixture.conf").read() == b"fixture\\n"
    assert stage.getmember("./opt/fixture/bin/payload").mode & 0o111
    assert stage.getmember("./opt/fixture/bin/alias").issym()
    assert len([name for name in stage.getnames() if name.startswith("./var/lib/db/sbom/")]) == 2
if not os.environ.get("APK_TEST_NO_OUTPUT"):
    output = pathlib.Path(value("--out-dir")) / value("--arch")
    output.mkdir(parents=True, exist_ok=True)
    name = field("name") + "-" + field("version") + "-r" + field("epoch") + ".apk"
    (output / name).write_text(config)
""")
        (self.root / "payload").write_text("fixture\n")
        (self.root / "CMakeLists.txt").write_text(f"""
cmake_minimum_required(VERSION 3.22.1)
project(apk-fixture NONE)
include("{SOURCE}/cmake_modules/apkPackaging.cmake")
set(CPACK_PACKAGE_NAME fixture)
set(CPACK_PACKAGE_VERSION 10.9.0)
set(CPACK_RPM_PACKAGE_VERSION 10.9.0)
set(CPACK_RPM_PACKAGE_RELEASE trunk0)
set(CPACK_PACKAGE_CONTACT "HPCC Test <test@example.invalid>")
set(CPACK_GENERATOR External)
set(CPACK_EXTERNAL_ENABLE_STAGING ON)
set(CPACK_MONOLITHIC_INSTALL TRUE)
set(CPACK_SET_DESTDIR ON)
set(CPACK_APK_BUILD_DIR "${{CMAKE_BINARY_DIR}}")
set(CPACK_APK_SOURCE_DIR "{SOURCE}")
set(CPACK_EXTERNAL_PACKAGE_SCRIPT "{SOURCE}/cmake_modules/package_apk.cmake")
install(PROGRAMS payload DESTINATION bin)
install(FILES payload DESTINATION /etc RENAME fixture.conf)
install(CODE "file(CREATE_LINK payload \\"\\$ENV{{DESTDIR}}${{CMAKE_INSTALL_PREFIX}}/bin/alias\\" SYMBOLIC)")
include(CPack)
""")
        self.run_command("cmake", "-S", str(self.root), "-B", str(self.build), "-G", "Ninja",
                         "-DCMAKE_INSTALL_PREFIX=/opt/fixture")
        (self.build / "vcpkg_packages").mkdir()

    def tool(self, name, body):
        path = self.tools / name
        path.write_text(f"#!{shutil.which('python3')}\n" + body)
        path.chmod(0o755)

    def run_command(self, *args, success=True, env=None):
        result = subprocess.run(args, env=env or self.env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout)
        return result.stdout

    def package(self, success=True):
        return self.run_command("cmake", "--build", str(self.build), "--target", "package", success=success)

    def add_host_platform(self):
        defaults = self.root / "defaults"
        defaults.mkdir()
        (defaults / "environment.conf").write_text(
            "[DEFAULT]\nuser=hpcc\ngroup=hpcc\nhome=/home\npath=/opt/HPCCSystems\n"
            "configs=/etc/HPCCSystems\nruntime=/var/lib/HPCCSystems\n"
            "pid=/var/run/HPCCSystems\nlock=/var/lock/HPCCSystems\nlog=/var/log/HPCCSystems\n"
            "sourcedir=/etc/HPCCSystems/source\nenvironment=environment.xml\n")
        (defaults / "environment.xml").write_text("<Environment/>\n")
        (defaults / "genenvrules.conf").write_text("# fixture\n")
        (self.root / "hpcc-init").write_text(
            "#!/bin/sh\n[ \"$1\" != start ] || touch /etc/hpcc-service-started\n")
        (self.root / "client-tool").write_text("#!/bin/sh\nprintf '%s\\n' 'fixture client tool 10.9.0'\n")
        with (self.root / "CMakeLists.txt").open("a") as cmake:
            cmake.write("""
install(PROGRAMS hpcc-init DESTINATION /opt/HPCCSystems/etc/init.d)
install(PROGRAMS hpcc-init DESTINATION /opt/HPCCSystems/etc/init.d RENAME dafilesrv)
install(FILES payload DESTINATION /opt/HPCCSystems/sbin)
install(PROGRAMS client-tool DESTINATION /opt/HPCCSystems/bin RENAME eclcc)
install(PROGRAMS client-tool DESTINATION /opt/HPCCSystems/bin RENAME ecl-bundle)
install(DIRECTORY defaults/ DESTINATION /opt/HPCCSystems/etc/HPCCSystems/rpmnew)
""")
        self.run_command("cmake", "-S", str(self.root), "-B", str(self.build))

    def test_package_and_install_are_separate(self):
        install_env = dict(self.env, DESTDIR=str(self.root / "install"))
        self.run_command("cmake", "--install", str(self.build), env=install_env)
        self.assertFalse(self.log.exists())
        self.package()
        self.assertEqual(len(self.log.read_text().splitlines()), 1)
        self.assertEqual(len(list(self.build.glob("fixture-10.9.0_alpha0-r0.*.apk"))), 1)
        sboms = list(self.build.glob("fixture-10.9.0_alpha0-r0.*.json"))
        self.assertEqual(len(sboms), 2)
        for sbom in sboms:
            json.loads(sbom.read_text())
        self.assertFalse(list(self.build.glob("*.tar.gz")))
        self.assertFalse(list(self.build.glob("*.deb")))
        self.assertFalse(list(self.build.glob("*.rpm")))
        staged = next((self.build / "_CPack_Packages").glob("*/External/*/opt/fixture/bin/payload"))
        self.assertEqual(staged.read_text(), "fixture\n")
        self.assertFalse((staged.parents[3] / "var/lib/db/sbom").exists())

    def test_failure_and_missing_output_do_not_reuse_previous_apk(self):
        self.package()
        self.env["APK_TEST_FAIL"] = "1"
        self.assertIn("APK packaging failed", self.package(success=False))
        del self.env["APK_TEST_FAIL"]
        self.env["APK_TEST_NO_OUTPUT"] = "1"
        self.assertIn("APK packaging failed", self.package(success=False))

    def test_current_cpack_metadata_signing_and_output_directory(self):
        key = self.root / "development key.rsa"
        key.write_text("test-only key")
        output = self.root / "custom output"
        self.run_command("cpack", "--config", str(self.build / "CPackConfig.cmake"),
                         "-B", str(output), "-D", "CPACK_PACKAGE_NAME=hpccsystems-plugin-fixture",
                         "-D", "CPACK_RPM_PACKAGE_RELEASE=rc2",
                         "-D", f"CPACK_APK_SIGNING_KEY={key}")
        self.assertEqual(len(list(output.glob("hpccsystems-plugin-fixture-10.9.0_rc2-r0.*.apk"))), 1)
        args = json.loads(self.log.read_text())
        self.assertEqual(args[args.index("--signing-key") + 1], str(key))

    def test_configured_provenance_directory(self):
        provenance = self.root / "shared dependencies" / "vcpkg_packages"
        provenance.parent.mkdir()
        (self.build / "vcpkg_packages").rename(provenance)
        self.run_command("cpack", "--config", str(self.build / "CPackConfig.cmake"),
                         "-B", str(self.root / "output"),
                         "-D", f"CPACK_APK_VCPKG_PACKAGES_DIR={provenance}")

    def test_distribution_detection(self):
        os_release = self.root / "os-release"
        script = self.root / "detect.cmake"
        script.write_text(f"""
include("{SOURCE}/cmake_modules/apkPackaging.cmake")
set(CMAKE_SYSTEM_NAME Linux)
hpcc_detect_apk_distribution(actual "{os_release}")
if(NOT actual STREQUAL expected)
    message(FATAL_ERROR "Unexpected distribution detection: ${{actual}}")
endif()
""")
        for distro, expected in (("chainguard", "TRUE"), ('"wolfi"', "TRUE"),
                                ("alpine", "FALSE"), ("ubuntu", "FALSE"),
                                ("notwolfi", "FALSE")):
            with self.subTest(distro=distro):
                os_release.write_text(f"ID={distro}\n")
                self.run_command("cmake", f"-Dexpected={expected}", "-P", str(script))
        os_release.write_text("ID=chainguard\n")
        self.run_command("cmake", "-DCMAKE_CROSSCOMPILING=TRUE", "-Dexpected=FALSE", "-P", str(script))
        os_release.unlink()
        self.run_command("cmake", "-Dexpected=FALSE", "-P", str(script))

    def test_invalid_release_and_sbom_failure(self):
        output = self.run_command("cpack", "--config", str(self.build / "CPackConfig.cmake"),
                                  "-D", "CPACK_RPM_PACKAGE_RELEASE=invalid", success=False)
        self.assertIn("Unsupported package release for APK versioning", output)
        self.tool("syft", "import sys\nsys.exit('fixture syft failure')\n")
        self.assertIn("fixture syft failure", self.package(success=False))

    def test_standalone_install_path_is_preserved(self):
        output = self.root / "standalone output"
        self.run_command("bash", str(SOURCE / "dockerfiles/chainguard/containers/package-install-tree.sh"),
                         "-b", str(self.build), "--hpcc-source-dir", str(SOURCE),
                         "-s", str(self.root / "standalone staging"), "-o", str(output), "-f", "apk")
        self.assertEqual(len(list(output.glob("fixture-10.9.0_alpha0-r0.*.apk"))), 1)

    def test_release_mapping_and_architecture_validation(self):
        for release, version in (("3", "10.9.0-r3"), ("closedown2", "10.9.0_beta2-r0"),
                                 ("trunk0Debug", "10.9.0_alpha0-r0")):
            with self.subTest(release=release):
                output = self.root / release
                self.run_command("cpack", "--config", str(self.build / "CPackConfig.cmake"),
                                 "-B", str(output), "-D", f"CPACK_RPM_PACKAGE_RELEASE={release}")
                self.assertEqual(len(list(output.glob(f"fixture-{version}.*.apk"))), 1)
        self.tool("uname", "print('unsupported-architecture')\n")
        self.assertIn("Unsupported architecture", self.package(success=False))

    def test_input_root_cannot_be_a_workspace(self):
        output = self.run_command(
            "bash", str(SOURCE / "dockerfiles/chainguard/containers/package-install-tree.sh"),
            "-b", str(self.build), "--stage-root", str(self.root), "-s", str(self.root),
            "--output-manifest", str(self.root / "outputs"), "--package-name", "fixture",
            "--package-version", "10.9.0", "--package-release", "1",
            "--package-contact", "Test", success=False)
        self.assertIn("Workspace must be outside the input root", output)
        self.assertEqual((self.root / "payload").read_text(), "fixture\n")

    def test_missing_syft_is_reported(self):
        (self.tools / "syft").unlink()
        for tool in ("dirname", "tar"):
            (self.tools / tool).symlink_to(shutil.which(tool))
        output = self.run_command(
            shutil.which("bash"), str(SOURCE / "dockerfiles/chainguard/containers/package-install-tree.sh"),
            "-b", str(self.build), "--hpcc-source-dir", str(SOURCE),
            env=dict(self.env, PATH=str(self.tools)), success=False)
        self.assertIn("syft is required", output)

    def test_setup_hooks_only_apply_to_host_platform(self):
        self.add_host_platform()
        self.package()
        package, = self.build.glob("fixture-*.apk")
        config = package.read_text()
        self.assertIn("post-install:", config)
        self.assertIn("post-upgrade:", config)
        self.assertIn("pre-deinstall:", config)
        self.assertIn("- procps", config)
        self.run_command("cmake", "-S", str(self.root), "-B", str(self.build), "-DCONTAINERIZED:BOOL=ON")
        self.package()
        container_package, = self.build.glob("fixture-*k8s.*.apk")
        self.assertNotIn("scriptlets:", container_package.read_text())

    @unittest.skipUnless(os.environ.get("HPCC_TEST_APK_INSTALL") == "1",
                         "Set HPCC_TEST_APK_INSTALL=1 for isolated installs using sudo, melange, syft, and apk")
    def test_real_platform_install_and_repeat_setup(self):
        self.add_host_platform()
        self.env = dict(os.environ, HPCC_SYSROOT="")
        self.package()
        package, = self.build.glob("fixture-*.apk")
        rootfs = self.root / "rootfs"
        rootfs.mkdir()
        self.addCleanup(subprocess.run, [
            "sudo", "-n", "chown", "-R", f"{os.getuid()}:{os.getgid()}", str(rootfs)], check=True)
        self.run_command("sudo", "-n", "apk", "--root", str(rootfs), "--initdb",
                         "--repositories-file", "/etc/apk/repositories", "--keys-dir", "/etc/apk/keys",
                         "--allow-untrusted", "add", str(package))
        account = self.run_command("sudo", "-n", "chroot", str(rootfs), "getent", "passwd", "hpcc")
        self.assertIn(":/home/hpcc:/bin/bash", account)
        self.assertNotEqual(account.split(":")[2], "0")
        for name in ("hpcc-init", "dafilesrv"):
            self.assertEqual(os.readlink(rootfs / f"etc/init.d/{name}"),
                             f"/opt/HPCCSystems/etc/init.d/{name}")
        for name in ("eclcc", "ecl-bundle"):
            self.assertEqual(os.readlink(rootfs / f"usr/bin/{name}"),
                             f"/opt/HPCCSystems/bin/{name}")
            output = self.run_command("sudo", "-n", "chroot", str(rootfs), "/bin/bash", "-c",
                                      f"PATH=/usr/bin:/bin {name} --version")
            self.assertIn("fixture client tool 10.9.0", output)
        config = rootfs / "etc/HPCCSystems/environment.conf"
        self.run_command("sudo", "-n", "chmod", "0666", str(config))
        contents = config.read_text() + "# administrator change\n"
        config.write_text(contents)
        setup = "/opt/HPCCSystems/sbin/hpcc-apk-setup"
        self.run_command("sudo", "-n", "chroot", str(rootfs), setup)
        self.assertEqual(config.read_text(), contents)
        self.assertEqual(account, self.run_command(
            "sudo", "-n", "chroot", str(rootfs), "getent", "passwd", "hpcc"))
        for directory in ("lib", "log", "run", "lock"):
            owner = self.run_command("sudo", "-n", "chroot", str(rootfs),
                                     "stat", "-c", "%u", f"/var/{directory}/HPCCSystems")
            self.assertEqual(owner.strip(), account.split(":")[2])
        self.assertFalse((rootfs / "etc/hpcc-service-started").exists())
        self.assertFalse((rootfs / "home/hpcc/.ssh/id_rsa").exists())
        packaged_config = self.root / "defaults/environment.conf"
        packaged_config.write_text(packaged_config.read_text() + "# new package default\n")
        self.package()
        reinstall = self.run_command("sudo", "-n", "apk", "--root", str(rootfs),
                                     "--repositories-file", "/etc/apk/repositories", "--keys-dir", "/etc/apk/keys",
                                     "--allow-untrusted", "add", "--upgrade", str(package))
        self.assertIn("# new package default",
                      (rootfs / "opt/HPCCSystems/etc/HPCCSystems/rpmnew/environment.conf").read_text(), reinstall)
        self.assertIn("HPCC runtime setup complete", reinstall)
        self.assertEqual(config.read_text(), contents)
        self.assertFalse((rootfs / "etc/hpcc-service-started").exists())
        self.run_command("sudo", "-n", "chroot", str(rootfs), "ln", "-sf", "/bin/true", "/usr/bin/ecl-bundle")
        conflict = self.run_command("sudo", "-n", "chroot", str(rootfs), setup, success=False)
        self.assertIn("Cannot install /usr/bin/ecl-bundle", conflict)
        self.assertEqual(os.readlink(rootfs / "usr/bin/ecl-bundle"), "/bin/true")
        self.run_command("sudo", "-n", "apk", "--root", str(rootfs), "del", "fixture")
        self.assertFalse((rootfs / "etc/init.d/hpcc-init").is_symlink())
        self.assertFalse((rootfs / "usr/bin/eclcc").is_symlink())
        self.assertEqual(os.readlink(rootfs / "usr/bin/ecl-bundle"), "/bin/true")
        self.assertEqual(config.read_text(), contents)
        self.assertTrue((rootfs / "var/lib/HPCCSystems").is_dir())

    @unittest.skipUnless(os.environ.get("HPCC_TEST_REAL_APK") == "1",
                         "Set HPCC_TEST_REAL_APK=1 to use real melange, syft, and apk")
    def test_real_apk_payload(self):
        self.env = dict(os.environ, HPCC_SYSROOT="")
        self.package()
        package, = self.build.glob("fixture-*.apk")
        self.run_command("apk", "verify", "--allow-untrusted", str(package))
        with tarfile.open(package, "r:gz") as archive:
            self.assertEqual(archive.extractfile("opt/fixture/bin/payload").read(), b"fixture\n")
            self.assertEqual(archive.extractfile("etc/fixture.conf").read(), b"fixture\n")
            self.assertEqual(archive.getmember("opt/fixture/bin/alias").linkname, "payload")
            self.assertTrue(archive.getmember("opt/fixture/bin/alias").issym())
            self.assertTrue(archive.getmember("opt/fixture/bin/payload").mode & 0o111)
            self.assertIn("pkgname = fixture", archive.extractfile(".PKGINFO").read().decode())
            for suffix in ("runtime", "runtime-vcpkg"):
                name = f"var/lib/db/sbom/fixture-10.9.0_alpha0-r0.{suffix}.spdx.json"
                json.load(archive.extractfile(name))


if __name__ == "__main__":
    unittest.main()
