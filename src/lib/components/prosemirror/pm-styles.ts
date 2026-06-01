interface ThemeEntry { el: HTMLStyleElement; count: number }
const registry = new Map<string, ThemeEntry>();

export function injectTheme(css: string): () => void {
  if (typeof document === "undefined") return () => {};
  const existing = registry.get(css);
  if (existing) {
    existing.count++;
    return () => {
      existing.count--;
      if (existing.count === 0) { existing.el.remove(); registry.delete(css); }
    };
  }
  const el = document.createElement("style");
  el.setAttribute("data-rtb-theme", "");
  el.textContent = css;
  document.head.appendChild(el);
  registry.set(css, { el, count: 1 });
  return () => {
    const entry = registry.get(css);
    if (!entry) return;
    entry.count--;
    if (entry.count === 0) { entry.el.remove(); registry.delete(css); }
  };
}

