import test from "node:test";
import assert from "node:assert/strict";
import { pickPrimaryNavigationIssue } from "./navigation-read-shared";

test("prefers the variantless main issue over variant entries", () => {
  const variant = {
    id: 1,
    format: null,
    variant: "B",
  };
  const main = {
    id: 2,
    format: "Heft",
    variant: null,
  };

  const primary = pickPrimaryNavigationIssue([variant, main]);

  assert.equal(primary, main);
});

test("falls back to the existing variant ordering when no main issue exists", () => {
  const second = {
    id: 2,
    format: "Heft",
    variant: "B",
  };
  const first = {
    id: 1,
    format: "Heft",
    variant: "A",
  };

  const primary = pickPrimaryNavigationIssue([second, first]);

  assert.equal(primary, first);
});
