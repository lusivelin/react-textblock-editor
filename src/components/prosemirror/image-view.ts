import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView, NodeView } from "prosemirror-view";

export class ImageNodeView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private handle: HTMLElement;
  private node: ProseMirrorNode;
  private resizing = false;
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
      "display:inline-block;position:relative;max-width:100%;vertical-align:bottom;line-height:0;cursor:default";

    const img = document.createElement("img");
    img.style.cssText = "display:block;max-width:100%;height:auto";
    this.applyAttrs(img, node);

    const handle = document.createElement("span");
    handle.style.cssText =
      "position:absolute;bottom:3px;right:3px;width:10px;height:10px;" +
      "background:#2563eb;border-radius:2px;cursor:se-resize;opacity:0;transition:opacity 0.15s";

    wrapper.addEventListener("mouseenter", () => {
      handle.style.opacity = "0.85";
    });
    wrapper.addEventListener("mouseleave", () => {
      if (!this.resizing) handle.style.opacity = "0";
    });

    handle.addEventListener("mousedown", this.onHandleMouseDown);

    wrapper.appendChild(img);
    wrapper.appendChild(handle);

    this.dom = wrapper;
    this.img = img;
    this.handle = handle;
  }

  private applyAttrs(img: HTMLImageElement, node: ProseMirrorNode) {
    img.src = (node.attrs.src as string) ?? "";
    img.alt = (node.attrs.alt as string) ?? "";
    if (node.attrs.title) img.title = node.attrs.title as string;
    img.style.width = (node.attrs.width as string) ?? "";
    img.style.height = (node.attrs.height as string) ?? "";
  }

  private onHandleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.resizing = true;
    this.startX = e.clientX;
    this.startWidth = this.img.offsetWidth || 300;

    const onMove = (e: MouseEvent) => {
      if (!this.resizing) return;
      const w = Math.max(50, this.startWidth + (e.clientX - this.startX));
      this.img.style.width = `${w}px`;
      this.img.style.height = "";
    };

    const onUp = () => {
      if (!this.resizing) return;
      this.resizing = false;
      this.handle.style.opacity = "0";
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
    return true;
  }

  selectNode() {
    this.img.style.outline = "2px solid #2563eb";
    this.handle.style.opacity = "0.85";
  }

  deselectNode() {
    this.img.style.outline = "";
    this.handle.style.opacity = "0";
  }

  stopEvent(e: Event): boolean {
    return (this.handle as HTMLElement).contains(e.target as Node) || this.resizing;
  }

  destroy() {
    this.handle.removeEventListener("mousedown", this.onHandleMouseDown);
  }
}
