import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView, NodeView } from "prosemirror-view";

export class ImageNodeView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private handle: HTMLElement;
  private frame: HTMLElement;
  private hint: HTMLElement;
  private sizeBadge: HTMLElement;
  private node: ProseMirrorNode;
  private resizing = false;
  private selected = false;
  private startX = 0;
  private startWidth = 0;

  constructor(
    node: ProseMirrorNode,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.node = node;

    const wrapper = document.createElement("span");
    wrapper.style.cssText =
      "display:inline-block;position:relative;max-width:100%;vertical-align:bottom;line-height:0;cursor:default;padding:8px 8px 16px 8px";

    const frame = document.createElement("span");
    frame.style.cssText =
      "position:absolute;inset:4px 4px 12px 4px;border:2px solid rgba(37,99,235,0);border-radius:10px;" +
      "pointer-events:none;transition:border-color 0.15s ease, box-shadow 0.15s ease";

    const img = document.createElement("img");
    img.style.cssText = "display:block;max-width:100%;height:auto;border-radius:6px";
    this.applyAttrs(img, node);

    const hint = document.createElement("span");
    hint.style.cssText =
      "position:absolute;left:10px;bottom:-2px;padding:3px 8px;border-radius:999px;font:600 11px/1.2 system-ui,sans-serif;" +
      "color:#1d4ed8;background:rgba(219,234,254,0.96);border:1px solid rgba(96,165,250,0.9);" +
      "box-shadow:0 4px 12px rgba(37,99,235,0.15);opacity:0;transform:translateY(4px);pointer-events:none;" +
      "transition:opacity 0.15s ease, transform 0.15s ease";
    hint.textContent = "Drag corner to resize";

    const sizeBadge = document.createElement("span");
    sizeBadge.style.cssText =
      "position:absolute;top:-2px;right:12px;padding:3px 8px;border-radius:999px;font:600 11px/1.2 system-ui,sans-serif;" +
      "color:#fff;background:rgba(30,64,175,0.92);box-shadow:0 6px 16px rgba(30,64,175,0.28);opacity:0;" +
      "transform:translateY(-4px);pointer-events:none;transition:opacity 0.15s ease, transform 0.15s ease";

    const handle = document.createElement("span");
    handle.style.cssText =
      "position:absolute;bottom:2px;right:2px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;" +
      "background:#2563eb;border:2px solid #fff;border-radius:999px;cursor:se-resize;opacity:0;" +
      "box-shadow:0 6px 18px rgba(37,99,235,0.3);transition:opacity 0.15s ease, transform 0.15s ease";
    handle.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
      '<path d="M1 9L9 1M4 9L9 4M7 9L9 7" stroke="white" stroke-width="1.4" stroke-linecap="round"/>' +
      "</svg>";

    wrapper.addEventListener("mouseenter", () => {
      this.setChromeVisibility(true);
    });
    wrapper.addEventListener("mouseleave", () => {
      if (!this.resizing && !this.selected) this.setChromeVisibility(false);
    });

    handle.addEventListener("mousedown", this.onHandleMouseDown);

    wrapper.appendChild(frame);
    wrapper.appendChild(img);
    wrapper.appendChild(hint);
    wrapper.appendChild(sizeBadge);
    wrapper.appendChild(handle);

    this.dom = wrapper;
    this.img = img;
    this.frame = frame;
    this.hint = hint;
    this.sizeBadge = sizeBadge;
    this.handle = handle;
    this.updateSizeBadge();
  }

  private applyAttrs(img: HTMLImageElement, node: ProseMirrorNode) {
    img.src = (node.attrs.src as string) ?? "";
    img.alt = (node.attrs.alt as string) ?? "";
    if (node.attrs.title) img.title = node.attrs.title as string;
    img.style.width = (node.attrs.width as string) ?? "";
    img.style.height = (node.attrs.height as string) ?? "";
  }

  private setChromeVisibility(visible: boolean) {
    this.frame.style.borderColor = visible ? "rgba(37,99,235,0.75)" : "rgba(37,99,235,0)";
    this.frame.style.boxShadow = visible ? "0 0 0 4px rgba(191,219,254,0.75)" : "none";
    this.handle.style.opacity = visible ? "1" : "0";
    this.handle.style.transform = visible ? "scale(1)" : "scale(0.92)";
    this.hint.style.opacity = visible ? "1" : "0";
    this.hint.style.transform = visible ? "translateY(0)" : "translateY(4px)";
  }

  private updateSizeBadge() {
    const width = Math.round(this.img.getBoundingClientRect().width || this.img.offsetWidth || 0);
    this.sizeBadge.textContent = width > 0 ? `${width}px wide` : "Resize image";
  }

  private onHandleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.resizing = true;
    this.startX = e.clientX;
    this.startWidth = this.img.offsetWidth || 300;
    this.updateSizeBadge();
    this.sizeBadge.style.opacity = "1";
    this.sizeBadge.style.transform = "translateY(0)";
    this.setChromeVisibility(true);

    const onMove = (e: MouseEvent) => {
      if (!this.resizing) return;
      const w = Math.max(50, this.startWidth + (e.clientX - this.startX));
      this.img.style.width = `${w}px`;
      this.img.style.height = "";
      this.updateSizeBadge();
    };

    const onUp = () => {
      if (!this.resizing) return;
      this.resizing = false;
      this.sizeBadge.style.opacity = "0";
      this.sizeBadge.style.transform = "translateY(-4px)";
      if (!this.selected) this.setChromeVisibility(false);
      const pos = this.getPos();
      if (pos !== undefined) {
        const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
          ...this.node.attrs,
          width: `${this.img.offsetWidth}px`,
          height: null,
        });
        this.view.dispatch(tr);
      }
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.applyAttrs(this.img, node);
    this.updateSizeBadge();
    return true;
  }

  selectNode() {
    this.selected = true;
    this.img.style.outline = "2px solid #2563eb";
    this.setChromeVisibility(true);
  }

  deselectNode() {
    this.selected = false;
    this.img.style.outline = "";
    if (!this.resizing) {
      this.setChromeVisibility(false);
      this.sizeBadge.style.opacity = "0";
      this.sizeBadge.style.transform = "translateY(-4px)";
    }
  }

  stopEvent(e: Event): boolean {
    return (this.handle as HTMLElement).contains(e.target as Node) || this.resizing;
  }

  destroy() {
    this.handle.removeEventListener("mousedown", this.onHandleMouseDown);
  }
}
