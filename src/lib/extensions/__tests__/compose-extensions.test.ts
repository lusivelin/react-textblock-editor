import { describe, it, expect } from "vitest";
import { composeExtensions } from "../shared/compose-extensions";
import type { EditorExtension } from "@lib/core/editor-extension";

function ext(id: string): EditorExtension {
  return { id };
}

describe("composeExtensions", () => {
  it("returns plain extensions as-is", () => {
    const a = ext("a");
    const b = ext("b");
    expect(composeExtensions(a, b)).toEqual([a, b]);
  });

  it("filters out falsy values", () => {
    const a = ext("a");
    const result = composeExtensions(a, false, null, undefined);
    expect(result).toEqual([a]);
  });

  it("returns empty array when all values are falsy", () => {
    expect(composeExtensions(false, null, undefined)).toEqual([]);
  });

  it("returns empty array when called with no arguments", () => {
    expect(composeExtensions()).toEqual([]);
  });

  it("preserves order", () => {
    const a = ext("a");
    const b = ext("b");
    const c = ext("c");
    expect(composeExtensions(a, false, b, null, c).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});
