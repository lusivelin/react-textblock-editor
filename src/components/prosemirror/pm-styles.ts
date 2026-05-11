const STYLE_ID = "rave-pm-styles";
const STYLES = `
.rave-pm .ProseMirror { outline: none; padding: 1rem; min-height: inherit; font-size: 0.9375rem; line-height: 1.6; word-break: break-word; }
.rave-pm .ProseMirror > * + * { margin-top: 0.5em; }
.rave-pm .ProseMirror p { margin: 0; }
.rave-pm .ProseMirror h1 { font-size: 1.75em; font-weight: 700; margin: 0; }
.rave-pm .ProseMirror h2 { font-size: 1.375em; font-weight: 700; margin: 0; }
.rave-pm .ProseMirror h3 { font-size: 1.125em; font-weight: 600; margin: 0; }
.rave-pm .ProseMirror h4, .rave-pm .ProseMirror h5, .rave-pm .ProseMirror h6 { font-weight: 600; margin: 0; }
.rave-pm .ProseMirror ul, .rave-pm .ProseMirror ol { padding-left: 1.5em; margin: 0; }
.rave-pm .ProseMirror blockquote { border-left: 3px solid #e2e8f0; padding-left: 1em; color: #64748b; margin: 0; }
.rave-pm .ProseMirror pre { background: #f1f5f9; border-radius: 0.375rem; padding: 0.75rem; overflow-x: auto; margin: 0; }
.rave-pm .ProseMirror code { background: #f1f5f9; border-radius: 0.25rem; padding: 0.125em 0.25em; font-size: 0.875em; font-family: monospace; }
.rave-pm .ProseMirror pre code { background: none; padding: 0; }
.rave-pm .ProseMirror a { color: #3b82f6; text-decoration: underline; }
.rave-pm .ProseMirror img { max-width: 100%; height: auto; }
.rave-pm .ProseMirror table { border-collapse: collapse; width: 100%; }
.rave-pm .ProseMirror th, .rave-pm .ProseMirror td { border: 1px solid #e2e8f0; padding: 0.4em 0.6em; vertical-align: top; }
.rave-pm .ProseMirror th { background: #f8fafc; font-weight: 600; }
.rave-pm .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background-color: #adf; pointer-events: none; }
.rave-pm .ProseMirror.resize-cursor { cursor: col-resize; }
.rave-pm .ProseMirror-selectednode { outline: 2px solid #8cf; }
.rave-pm-dark .ProseMirror { color: #e2e8f0; }
.rave-pm-dark .ProseMirror blockquote { border-color: #334155; color: #94a3b8; }
.rave-pm-dark .ProseMirror pre, .rave-pm-dark .ProseMirror code { background: #1e293b; color: #e2e8f0; }
.rave-pm-dark .ProseMirror a { color: #60a5fa; }
.rave-pm-dark .ProseMirror th, .rave-pm-dark .ProseMirror td { border-color: #334155; }
.rave-pm-dark .ProseMirror th { background: #1e293b; }
`;

export function injectPmStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}
