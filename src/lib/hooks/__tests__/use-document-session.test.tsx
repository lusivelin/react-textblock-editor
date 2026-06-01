import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocumentSession } from "../use-document-session";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useDocumentSession — initial state", () => {
  it("returns value as localContent", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>hello</p>" })
    );
    expect(result.current.localContent).toBe("<p>hello</p>");
  });

  it("has no unsaved changes initially", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>hello</p>" })
    );
    expect(result.current.sessionState.hasUnsavedChanges).toBe(false);
  });

  it("saveStatus starts as idle", () => {
    const { result } = renderHook(() => useDocumentSession({}));
    expect(result.current.saveStatus).toBe("idle");
  });
});

describe("useDocumentSession — handleLocalChange", () => {
  it("updates localContent", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>initial</p>" })
    );
    act(() => { result.current.handleLocalChange("<p>updated</p>"); });
    expect(result.current.localContent).toBe("<p>updated</p>");
  });

  it("sets hasUnsavedChanges to true", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>initial</p>" })
    );
    act(() => { result.current.handleLocalChange("<p>changed</p>"); });
    expect(result.current.sessionState.hasUnsavedChanges).toBe(true);
  });

  it("calls onChange callback", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDocumentSession({ value: "", onChange })
    );
    act(() => { result.current.handleLocalChange("<p>new</p>"); });
    expect(onChange).toHaveBeenCalledWith("<p>new</p>");
  });
});

describe("useDocumentSession — handleSave", () => {
  it("calls onSave with current localContent", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>initial</p>", onSave })
    );
    act(() => { result.current.handleLocalChange("<p>edited</p>"); });
    await act(async () => { await result.current.handleSave(); });
    expect(onSave).toHaveBeenCalledWith("<p>edited</p>");
  });

  it("clears hasUnsavedChanges after save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>a</p>", onSave })
    );
    act(() => { result.current.handleLocalChange("<p>b</p>"); });
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.sessionState.hasUnsavedChanges).toBe(false);
  });

  it("sets saveStatus to saved after successful save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDocumentSession({ value: "", onSave })
    );
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.saveStatus).toBe("saved");
  });

  it("sets saveStatus to error when onSave throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() =>
      useDocumentSession({ value: "", onSave })
    );
    await act(async () => { await result.current.handleSave(); });
    expect(result.current.saveStatus).toBe("error");
  });
});

describe("useDocumentSession — handleDiscard", () => {
  it("resets localContent to the original value", async () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>original</p>" })
    );
    act(() => { result.current.handleLocalChange("<p>changed</p>"); });
    await act(async () => { await result.current.handleDiscard(); });
    expect(result.current.localContent).toBe("<p>original</p>");
  });

  it("clears hasUnsavedChanges", async () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>x</p>" })
    );
    act(() => { result.current.handleLocalChange("<p>y</p>"); });
    await act(async () => { await result.current.handleDiscard(); });
    expect(result.current.sessionState.hasUnsavedChanges).toBe(false);
  });
});

describe("useDocumentSession — sessionState", () => {
  it("exposes documentId", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ documentId: "article:1" })
    );
    expect(result.current.sessionState.documentId).toBe("article:1");
  });

  it("draftContent tracks localContent", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>v</p>" })
    );
    act(() => { result.current.handleLocalChange("<p>draft</p>"); });
    expect(result.current.sessionState.draftContent).toBe("<p>draft</p>");
  });
});

describe("useDocumentSession — localStorage persistence", () => {
  it("persists draft when persistence is enabled and changes exist", () => {
    const key = "draft:persist-test";
    const { result } = renderHook(() =>
      useDocumentSession({
        value: "<p>saved</p>",
        documentId: "persist-test",
        persistence: { enabled: true, storageKey: key },
      })
    );
    act(() => { result.current.handleLocalChange("<p>dirty</p>"); });
    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it("does not persist when persistence is disabled", () => {
    const { result } = renderHook(() =>
      useDocumentSession({ value: "<p>x</p>", documentId: "no-persist" })
    );
    act(() => { result.current.handleLocalChange("<p>changed</p>"); });
    expect(Object.keys(localStorage)).toHaveLength(0);
  });

  it("clears persisted draft after save", async () => {
    const key = "draft:clear-test";
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDocumentSession({
        value: "<p>v</p>",
        documentId: "clear-test",
        persistence: { enabled: true, storageKey: key },
        onSave,
      })
    );
    act(() => { result.current.handleLocalChange("<p>edit</p>"); });
    await act(async () => { await result.current.handleSave(); });
    expect(localStorage.getItem(key)).toBeNull();
  });
});
