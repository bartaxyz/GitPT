import { test, expect } from "vitest";
import { formatBaseURL } from "../../src/utils/formatBaseURL.js";

test("appends /v1 when it is missing", () => {
  expect(formatBaseURL("https://host")).toBe("https://host/v1");
});

test("leaves the URL unchanged when it already ends with /v1", () => {
  expect(formatBaseURL("https://host/v1")).toBe("https://host/v1");
});

test("trims a trailing slash before appending /v1", () => {
  expect(formatBaseURL("https://host/")).toBe("https://host/v1");
});

test("trims a trailing slash when /v1 is already present", () => {
  expect(formatBaseURL("https://host/v1/")).toBe("https://host/v1");
});
