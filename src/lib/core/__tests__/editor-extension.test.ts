import { describe, it, expect } from "vitest";
import {
  resolveExtensionDependencies,
  resolveExtensionFeatureFlags,
  resolveExtensionSessionPersistence,
} from "../editor-extension";
import type { EditorExtension, EditorExtensionContext } from "../editor-extension";

const ctx: EditorExtensionContext = {
  documentId: "doc:1",
  featureFlags: { offline: false, comments: false, trackedChanges: false, collaboration: false, ai: false },
};

function ext(id: string, overrides: Partial<EditorExtension> = {}): EditorExtension {
  return { id, ...overrides };
}

describe("resolveExtensionDependencies", () => {
  it("passes when all dependencies are present", () => {
    const exts = [ext("a"), ext("b", { dependsOn: ["a"] })];
    expect(() => resolveExtensionDependencies(exts)).not.toThrow();
  });

  it("throws when a required dependency is missing", () => {
    const exts = [ext("b", { dependsOn: ["a"] })];
    expect(() => resolveExtensionDependencies(exts)).toThrow(/"b".*"a"/);
  });

  it("passes when dependsOn is empty", () => {
    expect(() => resolveExtensionDependencies([ext("solo", { dependsOn: [] })])).not.toThrow();
  });

  it("passes with no extensions", () => {
    expect(() => resolveExtensionDependencies([])).not.toThrow();
  });
});

describe("resolveExtensionFeatureFlags", () => {
  it("merges flags from multiple extensions", () => {
    const exts = [
      ext("local-first", { getFeatureFlags: () => ({ offline: true }) }),
      ext("ai", { getFeatureFlags: () => ({ ai: true }) }),
    ];
    const flags = resolveExtensionFeatureFlags(exts, ctx);
    expect(flags).toEqual({ offline: true, ai: true });
  });

  it("later extension flags win on conflict", () => {
    const exts = [
      ext("a", { getFeatureFlags: () => ({ offline: false }) }),
      ext("b", { getFeatureFlags: () => ({ offline: true }) }),
    ];
    expect(resolveExtensionFeatureFlags(exts, ctx).offline).toBe(true);
  });

  it("returns empty object when no extensions define flags", () => {
    expect(resolveExtensionFeatureFlags([ext("plain")], ctx)).toEqual({});
  });
});

describe("resolveExtensionSessionPersistence", () => {
  it("returns the last persistence config", () => {
    const exts = [
      ext("a", { getSessionPersistence: () => ({ enabled: true, storageKey: "a" }) }),
      ext("b", { getSessionPersistence: () => ({ enabled: false, storageKey: "b" }) }),
    ];
    const result = resolveExtensionSessionPersistence(exts, ctx);
    expect(result?.storageKey).toBe("b");
  });

  it("returns undefined when no extensions configure persistence", () => {
    expect(resolveExtensionSessionPersistence([ext("plain")], ctx)).toBeUndefined();
  });

  it("skips extensions with no getSessionPersistence", () => {
    const exts = [
      ext("no-persist"),
      ext("persist", { getSessionPersistence: () => ({ enabled: true, storageKey: "key" }) }),
    ];
    expect(resolveExtensionSessionPersistence(exts, ctx)?.storageKey).toBe("key");
  });
});
