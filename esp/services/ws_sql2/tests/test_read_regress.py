import importlib.util
import os
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = os.path.join(os.path.dirname(__file__), "read-regress.py")
spec = importlib.util.spec_from_file_location("read_regress", SCRIPT)
read_regress = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = read_regress
spec.loader.exec_module(read_regress)


class ReadRegressTests(unittest.TestCase):
    def test_known_unsupported_layouts_do_not_create_report(self):
        names = ["regress::multi::dg_var", "regress::single::dg_var"]

        def metadata(_endpoint, name, _timeout):
            return f"Unsupported record layout for '{name}': runtime metadata is unavailable", None

        def query(_endpoint, sql, _timeout):
            name = next(name for name in names if name in sql)
            return f"Binder Error: Unsupported record layout for '{name}': runtime metadata is unavailable", None

        with tempfile.TemporaryDirectory() as directory:
            report = os.path.join(directory, "errors.json")
            with open(report, "w", encoding="utf-8") as output:
                output.write("stale")
            with (patch.object(read_regress, "list_logical_files", return_value=names),
                  patch.object(read_regress, "get_logical_file_meta", side_effect=metadata),
                  patch.object(read_regress, "execute_sql", side_effect=query),
                  patch.object(sys, "argv", ["read-regress.py", "--report", report])):
                self.assertEqual(0, read_regress.main())
            self.assertFalse(os.path.exists(report))

    def test_other_dg_var_errors_are_reported(self):
        name = "regress::multi::dg_var"
        layout_error = f"Unsupported record layout for '{name}': runtime metadata is unavailable"
        for meta_error, query_error in (
            ("Permission denied", "Permission denied"),
            (layout_error, "Permission denied"),
            ("Permission denied", layout_error),
        ):
            with self.subTest(meta_error=meta_error, query_error=query_error):
                with (patch.object(read_regress, "get_logical_file_meta", return_value=(meta_error, None)),
                      patch.object(read_regress, "execute_sql", return_value=(query_error, None))):
                    item = read_regress.run_file("", name, 30, 10)
                self.assertEqual("error", item["status"])

    def test_old_unsupported_layout_error_remains_expected(self):
        with (patch.object(read_regress, "get_logical_file_meta", return_value=(None, {"recordCount": None})),
              patch.object(read_regress, "execute_sql", return_value=(
                  "hpcc_scan offline overload received an invalid ECL record definition", None,
              ))):
            item = read_regress.run_file("", "regress::multi::dg_var", 30, 10)
        self.assertEqual("expected_error", item["status"])


if __name__ == "__main__":
    unittest.main()
