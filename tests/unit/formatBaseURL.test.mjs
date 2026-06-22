import { test } from "node:test";
import assert from "node:assert";

import { formatBaseURL } from "../../dist/utils/formatBaseURL.js";

test("appends /v1 when it is missing", () => {
  assert.strictEqual(formatBaseURL("https://host"), "https://host/v1");
});

test("leaves the URL unchanged when it already ends with /v1", () => {
  assert.strictEqual(formatBaseURL("https://host/v1"), "https://host/v1");
});
