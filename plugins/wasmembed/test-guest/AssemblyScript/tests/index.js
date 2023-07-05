import assert from "assert";
import { add } from "../build/debug.js";
assert.strictEqual(add(1, 2), 3);
assert.strictEqual(add(-1000, -2000), -3000);
console.log("ok");
