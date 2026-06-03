import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ImagePlus, Link2 } from "lucide-react";
import type { NodeSpec, Schema } from "prosemirror-model";
import type { EditorExtension } from "@lib/core/editor-extension";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { ImageNodeView } from "@lib/components/prosemirror/image-view";
import { createImageId, createInsertImageCommand, runCommand, ToolbarButton, ToolbarSeparator } from "@lib/components/prosemirror/toolbar";
import { usePopover } from "@lib/hooks/use-popover";

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
      src: string; alt: string; title: string | null;
      width: string | null; height: string | null;
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

export interface ImageInsertOptions {
  alt?: string;
  title?: string;
}

export interface ImageInsertResult {
  imageId: string;
}

export interface ImageExtensionOptions {
  /** Called with the selected File; must resolve to a public URL. */
  onUpload?: (file: File) => Promise<string>;
  /** Maximum allowed file size in bytes. Defaults to 20 MB. */
  maxFileSizeBytes?: number;
  /**
   * Integrate an external media picker (Cloudinary, S3 browser, Uploadcare, etc.).
   * The extension calls this with an `insert` callback; your code opens the picker
   * and calls `insert(url, attrs?)` once the user selects an asset.
   *
   * @example
   * onExternalPicker: (insert) => {
   *   cloudinaryWidget.open();
   *   cloudinaryWidget.on("success", (r) =>
   *     insert(r.secure_url, { alt: r.original_filename })
   *   );
   * }
   */
  onExternalPicker?: (insert: (url: string, attrs?: ImageInsertOptions) => void) => void;
  /** Icon shown in the external picker toolbar button. Defaults to a link icon. */
  externalPickerIcon?: React.ReactNode;
  /** Tooltip for the external picker button. Defaults to "Open media picker". */
  externalPickerLabel?: string;
}

export interface ImageExtensionApi {
  /** Opens the native file browser to upload an image. */
  openPicker: () => void;
  insertImageFromUrl: (url: string, attrs?: ImageInsertOptions) => ImageInsertResult | null;
  insertImageFromFile: (file: File, attrs?: ImageInsertOptions) => Promise<ImageInsertResult | null>;
}

interface ImageRuntimeBridge {
  openPicker?: () => void;
  insertImageFromUrl?: (url: string, attrs?: ImageInsertOptions) => ImageInsertResult | null;
  insertImageFromFile?: (file: File, attrs?: ImageInsertOptions) => Promise<ImageInsertResult | null>;
}

const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024;

function isValidHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ImageToolbarButtons({
  onUpload,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
  onExternalPicker,
  externalPickerIcon,
  externalPickerLabel = "Open media picker",
  runtime,
  view,
  schema,
}: {
  onUpload?: (file: File) => Promise<string>;
  maxFileSizeBytes?: number;
  onExternalPicker?: ImageExtensionOptions["onExternalPicker"];
  externalPickerIcon?: React.ReactNode;
  externalPickerLabel?: string;
  runtime: ImageRuntimeBridge;
  view: EditorView;
  schema: Schema;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL popover state ──────────────────────────────────────────────────────
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const {
    isOpen: urlOpen, pos: urlPos,
    anchorRef: linkBtnRef, panelRef: linkPanelRef,
    close: closeUrl, toggle: toggleUrl,
  } = usePopover<HTMLButtonElement, HTMLDivElement>({
    panelWidth: 300,
    panelHeight: 250,
    onClose: () => setUrlError(null),
  });

  useEffect(() => {
    if (urlOpen) urlInputRef.current?.focus();
  }, [urlOpen]);

  // ── Shared insert helpers ──────────────────────────────────────────────────
  const insertImage = (src: string, attrs: ImageInsertOptions = {}): ImageInsertResult => {
    const imageId = createImageId();
    runCommand(view, createInsertImageCommand(schema, src, {
      alt: attrs.alt ?? "",
      title: attrs.title ?? undefined,
      imageId,
    }));
    return { imageId };
  };

  const insertImageFromUrl = (urlValue: string, attrs: ImageInsertOptions = {}) => {
    const trimmed = urlValue.trim();
    if (!trimmed || !isValidHttpImageUrl(trimmed)) return null;
    return insertImage(trimmed, attrs);
  };

  const insertImageFromFile = async (file: File, attrs: ImageInsertOptions = {}) => {
    if (file.size > maxFileSizeBytes) return null;
    const src = onUpload ? await onUpload(file) : URL.createObjectURL(file);
    return insertImage(src, attrs);
  };

  // ── Runtime bridge ─────────────────────────────────────────────────────────
  useEffect(() => {
    runtime.openPicker = () => fileInputRef.current?.click();
    runtime.insertImageFromUrl = insertImageFromUrl;
    runtime.insertImageFromFile = insertImageFromFile;
    return () => {
      runtime.openPicker = undefined;
      runtime.insertImageFromUrl = undefined;
      runtime.insertImageFromFile = undefined;
    };
  });

  // ── File input handler ─────────────────────────────────────────────────────
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || file.size > maxFileSizeBytes) return;
    try { await insertImageFromFile(file); } catch {}
  };

  // ── URL popover submit ─────────────────────────────────────────────────────
  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) { setUrlError("Enter an image URL."); return; }
    if (!isValidHttpImageUrl(trimmed)) { setUrlError("Use a valid http or https URL."); return; }
    insertImageFromUrl(trimmed, { alt: alt.trim() || undefined, title: title.trim() || undefined });
    setUrl(""); setAlt(""); setTitle("");
    closeUrl();
  };

  const onUrlKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") { event.preventDefault(); submitUrl(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Direct file upload — no dropdown */}
      <ToolbarButton
        title="Upload image"
        onMouseDown={(event) => { event.preventDefault(); fileInputRef.current?.click(); }}
      >
        <ImagePlus size={14} />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* URL insertion popover */}
      <ToolbarButton
        ref={linkBtnRef}
        title="Insert image from URL"
        onMouseDown={(event) => { event.preventDefault(); toggleUrl(); }}
      >
        <Link2 size={14} />
      </ToolbarButton>
      {urlOpen && urlPos && (
        <div
          ref={linkPanelRef}
          onKeyDown={onUrlKeyDown}
          className="rtb-image-url-popover"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: urlPos.top,
            left: urlPos.left,
            width: 300,
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.98)",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>Insert image from URL</div>

          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Image URL</span>
            <input
              ref={urlInputRef}
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
              placeholder="https://example.com/image.jpg"
              style={{ width: "100%", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Alt text</span>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image"
              style={{ width: "100%", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Title <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tooltip text"
              style={{ width: "100%", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }}
            />
          </label>

          {urlError && (
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: "7px 10px" }}>
              {urlError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); closeUrl(); }}
              style={{ border: "1px solid rgba(148,163,184,0.35)", background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); submitUrl(); }}
              style={{ border: 0, background: "#2563eb", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {/* External media picker (optional) */}
      {onExternalPicker && (
        <ToolbarButton
          title={externalPickerLabel}
          onMouseDown={(event) => {
            event.preventDefault();
            onExternalPicker((pickedUrl, attrs) => { insertImageFromUrl(pickedUrl, attrs); });
          }}
        >
          {externalPickerIcon ?? <span style={{ fontSize: 11, fontWeight: 700 }}>…</span>}
        </ToolbarButton>
      )}
    </>
  );
}

/**
 * Insert an image file directly into the view.
 *
 * Flow:
 * 1. Create a temporary object URL and insert the image immediately (instant feedback).
 * 2. If `onUpload` is provided, upload in the background and swap `src` when done.
 * 3. On upload failure, remove the placeholder node.
 * 4. Always revoke the object URL when finished.
 */
async function insertFileIntoView(
  file: File,
  view: EditorView,
  onUpload?: (file: File) => Promise<string>,
  attrs: ImageInsertOptions = {},
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE
): Promise<void> {
  const { schema } = view.state;
  if (!schema.nodes.image) return;
  if (file.size > maxFileSizeBytes) return;

  const tempSrc = URL.createObjectURL(file);
  const imageId = createImageId();

  runCommand(view, createInsertImageCommand(schema, tempSrc, {
    alt: attrs.alt ?? file.name.replace(/\.[^.]+$/, ""),
    title: attrs.title ?? undefined,
    imageId,
  }));

  if (!onUpload) return;

  try {
    const realSrc = await onUpload(file);
    view.state.doc.descendants((node, pos) => {
      if (node.type === schema.nodes.image && (node.attrs as Record<string, unknown>).imageId === imageId) {
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: realSrc }));
        return false;
      }
    });
  } catch {
    view.state.doc.descendants((node, pos) => {
      if (node.type === schema.nodes.image && (node.attrs as Record<string, unknown>).imageId === imageId) {
        view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize));
        return false;
      }
    });
  } finally {
    URL.revokeObjectURL(tempSrc);
  }
}

export function createImageExtension(options: ImageExtensionOptions = {}): EditorExtension {
  const runtime: ImageRuntimeBridge = {};
  const api: ImageExtensionApi = {
    openPicker: () => runtime.openPicker?.(),
    insertImageFromUrl: (url, attrs) => runtime.insertImageFromUrl?.(url, attrs) ?? null,
    insertImageFromFile: (file, attrs) => runtime.insertImageFromFile?.(file, attrs) ?? Promise.resolve(null),
  };

  return {
    id: "images",
    getApi: () => api,
    getSchema: () => ({ nodes: { image: imageNodeSpec } }),
    getNodeViews: () => ({
      image: (node, view, getPos) => new ImageNodeView(node, view, getPos as () => number | undefined),
    }),
    getEditorHandlers: () => ({
      handlePaste(view, event) {
        const items = event.clipboardData ? Array.from(event.clipboardData.items) : [];
        const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
        if (!imageItem) return false;
        const file = imageItem.getAsFile();
        if (!file) return false;
        event.preventDefault();
        void insertFileIntoView(file, view, options.onUpload, {}, options.maxFileSizeBytes);
        return true;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer
          ? Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
          : [];
        if (!files.length) return false;
        event.preventDefault();
        const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (dropPos) {
          const $pos = view.state.doc.resolve(dropPos.pos);
          view.dispatch(view.state.tr.setSelection(TextSelection.near($pos)));
        }
        for (const file of files) {
          void insertFileIntoView(file, view, options.onUpload, {}, options.maxFileSizeBytes);
        }
        return true;
      },
    }),
    getToolbarItems: () => [
      {
        id: "images:insert",
        group: "insert",
        priority: 10,
        render: ({ view, schema }) => (
          <>
            <ImageToolbarButtons
              onUpload={options.onUpload}
              maxFileSizeBytes={options.maxFileSizeBytes}
              onExternalPicker={options.onExternalPicker}
              externalPickerIcon={options.externalPickerIcon}
              externalPickerLabel={options.externalPickerLabel}
              runtime={runtime}
              view={view}
              schema={schema}
            />
            <ToolbarSeparator />
          </>
        ),
      },
    ],
  };
}
