import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ChevronDown, ImagePlus, Link2, Upload } from "lucide-react";
import type { NodeSpec } from "prosemirror-model";
import type { EditorExtension } from "@lib/core/editor-extension";
import type { EditorView } from "prosemirror-view";
import type { Schema } from "prosemirror-model";
import { ImageNodeView } from "@lib/components/prosemirror/image-view";
import { createImageId, createInsertImageCommand, runCommand, ToolbarButton, ToolbarSeparator } from "@lib/components/prosemirror/toolbar";

type InsertMode = "upload" | "link";
const IMAGE_INSERT_MODE_STORAGE_KEY = "rave:image-insert-mode";

let memoryInsertMode: InsertMode = "upload";

const imageNodeSpec: NodeSpec = {
  inline: true,
  attrs: {
    src: {},
    alt: { default: "" },
    title: { default: null },
    imageId: { default: null },
    width: { default: null },
    height: { default: null },
  },
  group: "inline",
  draggable: true,
  parseDOM: [{
    tag: "img[src]",
    getAttrs(dom) {
      const element = dom as HTMLElement;
      return {
        src: element.getAttribute("src"),
        alt: element.getAttribute("alt") ?? "",
        title: element.getAttribute("title"),
        imageId: element.getAttribute("data-image-id"),
        width: element.style.width || element.getAttribute("width") || null,
        height: element.style.height || element.getAttribute("height") || null,
      };
    },
  }],
  toDOM(node) {
    const { src, alt, title, width, height } = node.attrs as {
      src: string;
      alt: string;
      title: string | null;
      width: string | null;
      height: string | null;
    };
    const attrs: Record<string, string> = { src };
    if (alt) attrs.alt = alt;
    if (title) attrs.title = title;
    if (node.attrs.imageId) attrs["data-image-id"] = node.attrs.imageId as string;
    const styles: string[] = [];
    if (width) styles.push(`width:${width}`);
    if (height) styles.push(`height:${height}`);
    if (styles.length > 0) attrs.style = styles.join(";");
    return ["img", attrs];
  },
};

export interface ImageExtensionOptions {
  onUpload?: (file: File) => Promise<string>;
}

export interface ImageInsertOptions {
  alt?: string;
  title?: string;
}

export interface ImageInsertResult {
  imageId: string;
}

export interface ImageExtensionApi {
  openPicker: () => void;
  insertImageFromUrl: (url: string, attrs?: ImageInsertOptions) => ImageInsertResult | null;
  insertImageFromFile: (file: File, attrs?: ImageInsertOptions) => Promise<ImageInsertResult | null>;
  getMode: () => InsertMode;
}

interface ImageRuntimeBridge {
  openPicker?: () => void;
  insertImageFromUrl?: (url: string, attrs?: ImageInsertOptions) => ImageInsertResult | null;
  insertImageFromFile?: (file: File, attrs?: ImageInsertOptions) => Promise<ImageInsertResult | null>;
  getMode?: () => InsertMode;
}

function isValidHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function readInsertMode(): InsertMode {
  if (typeof window === "undefined") return memoryInsertMode;
  try {
    const value = window.sessionStorage.getItem(IMAGE_INSERT_MODE_STORAGE_KEY);
    if (value === "link" || value === "upload") return value;
  } catch {
    // Ignore storage failures and fall back to the in-memory session value.
  }
  return memoryInsertMode;
}

function writeInsertMode(mode: InsertMode) {
  memoryInsertMode = mode;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(IMAGE_INSERT_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep the in-memory session value.
  }
}

function ImageInsertPopover({
  onUpload,
  runtime,
  view,
  schema,
}: {
  onUpload?: (file: File) => Promise<string>;
  runtime: ImageRuntimeBridge;
  view: EditorView;
  schema: Schema;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mode, setMode] = useState<InsertMode>(() => readInsertMode());
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    writeInsertMode(mode);
  }, [mode]);

  useEffect(() => {
    runtime.openPicker = openPopover;
    runtime.getMode = () => mode;
    runtime.insertImageFromUrl = insertImageFromUrl;
    runtime.insertImageFromFile = insertImageFromFile;
    return () => {
      runtime.openPicker = undefined;
      runtime.getMode = undefined;
      runtime.insertImageFromUrl = undefined;
      runtime.insertImageFromFile = undefined;
    };
  });

  useEffect(() => {
    if (!open) return;
    const target = mode === "link" ? urlInputRef.current : chooseButtonRef.current;
    target?.focus();
  }, [mode, open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
        setError(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setError(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const insertImage = (src: string, attrs: ImageInsertOptions = {}): ImageInsertResult => {
    const imageId = createImageId();
    runCommand(
      view,
      createInsertImageCommand(schema, src, {
        alt: attrs.alt ?? alt.trim(),
        title: attrs.title ?? (title.trim() || undefined),
        imageId,
      })
    );
    setUrl("");
    setAlt("");
    setTitle("");
    close();
    return { imageId };
  };

  const insertImageFromUrl = (urlValue: string, attrs: ImageInsertOptions = {}) => {
    const trimmed = urlValue.trim();
    if (!trimmed || !isValidHttpImageUrl(trimmed)) return null;
    return insertImage(trimmed, attrs);
  };

  const insertImageFromFile = async (file: File, attrs: ImageInsertOptions = {}) => {
    const src = onUpload ? await onUpload(file) : URL.createObjectURL(file);
    return insertImage(src, attrs);
  };

  const submitLink = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter an image URL.");
      return;
    }
    if (!isValidHttpImageUrl(trimmed)) {
      setError("Use a valid http or https URL.");
      return;
    }
    insertImageFromUrl(trimmed);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await insertImageFromFile(file);
    } catch {
      setError("Image upload failed.");
    }
  };

  const openPopover = () => {
    if (open) return;
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  };

  const togglePopover = () => {
    if (open) {
      close();
      return;
    }
    openPopover();
  };

  const onPopoverKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter" && mode === "link") {
      event.preventDefault();
      submitLink();
    }
  };

  return (
    <>
      <ToolbarButton
        ref={buttonRef}
        title="Insert image"
        onMouseDown={(event) => {
          event.preventDefault();
          togglePopover();
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ImagePlus size={14} />
          <ChevronDown size={10} />
        </span>
      </ToolbarButton>

      {open && (
        <div
          ref={panelRef}
          onKeyDown={onPopoverKeyDown}
          className="loom-image-popover"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            minWidth: 320,
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.98)",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Insert image</div>
            <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(241,245,249,0.95)" }}>
              {(["upload", "link"] as InsertMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setMode(item);
                    setError(null);
                  }}
                  data-active={mode === item || undefined}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "6px 10px",
                    cursor: "pointer",
                    background: mode === item ? "#fff" : "transparent",
                    boxShadow: mode === item ? "0 1px 3px rgba(15,23,42,0.12)" : "none",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {item === "upload" ? <Upload size={12} /> : <Link2 size={12} />}
                    {item === "upload" ? "Upload" : "Link"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Alt text</span>
            <input
              type="text"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Describe the image"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.4)",
                padding: "8px 10px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.4)",
                padding: "8px 10px",
              }}
            />
          </label>

          {mode === "upload" ? (
            <>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Pick a local file. The image is inserted immediately after upload completes.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  ref={chooseButtonRef}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }}
                  style={{
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "#fff",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Choose file
                </button>
                <span style={{ alignSelf: "center", fontSize: 12, color: "#64748b" }}>
                  {onUpload ? "Uploads to your endpoint" : "Uses a local object URL"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Image URL</span>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError(null);
                  }}
                  placeholder="https://example.com/image.jpg"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.4)",
                    padding: "8px 10px",
                  }}
                />
              </label>
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", borderRadius: 10, padding: "8px 10px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                close();
              }}
              style={{
                border: "1px solid rgba(148,163,184,0.35)",
                background: "#fff",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            {mode === "link" ? (
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  submitLink();
                }}
                style={{
                  border: 0,
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Insert
              </button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

export function createImageExtension(options: ImageExtensionOptions = {}): EditorExtension {
  const runtime: ImageRuntimeBridge = {};
  const api: ImageExtensionApi = {
    openPicker: () => runtime.openPicker?.(),
    insertImageFromUrl: (url, attrs) => runtime.insertImageFromUrl?.(url, attrs) ?? null,
    insertImageFromFile: (file, attrs) => runtime.insertImageFromFile?.(file, attrs) ?? Promise.resolve(null),
    getMode: () => runtime.getMode?.() ?? readInsertMode(),
  };

  return {
    id: "images",
    getApi: () => api,
    getSchema: () => ({
      nodes: {
        image: imageNodeSpec,
      },
    }),
    getNodeViews: () => ({
      image: (node, view, getPos) => new ImageNodeView(node, view, getPos as () => number | undefined),
    }),
    getToolbarItems: () => [
      {
        id: "images:insert",
        group: "insert",
        priority: 10,
        render: ({ view, schema }) => (
          <>
            <ImageInsertPopover onUpload={options.onUpload} runtime={runtime} view={view} schema={schema} />
            <ToolbarSeparator />
          </>
        ),
      },
    ],
  };
}
