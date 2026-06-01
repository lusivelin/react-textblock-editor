import { useCallback, useRef } from "react";
import { Code2 } from "lucide-react";
import type { EditorExtension, EditorOverlayProps } from "@lib/core/editor-extension";
import { ToolbarButton } from "@lib/components/prosemirror/toolbar";
import { SourceModeModal } from "@lib/components/prosemirror/source-mode-modal";
import { serializeDocToHtml, formatHtmlForDisplay } from "@lib/utils/html/prosemirror-to-html";
import { parseSourceHtmlToDoc } from "@lib/utils/html/html-to-prosemirror";

function HtmlSourceOverlay({ view, schema, isSourceMode, onToggleSourceMode }: EditorOverlayProps) {
  const capturedHtmlRef = useRef<string | null>(null);

  if (isSourceMode && capturedHtmlRef.current === null) {
    capturedHtmlRef.current = formatHtmlForDisplay(serializeDocToHtml(view.state.doc, schema));
  }
  if (!isSourceMode && capturedHtmlRef.current !== null) {
    capturedHtmlRef.current = null;
  }

  const handleConfirm = useCallback(
    (html: string) => {
      try {
        const newDoc = parseSourceHtmlToDoc(html, schema);
        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
        view.dispatch(tr);
      } catch {}
      onToggleSourceMode?.();
      view.focus();
    },
    [view, schema, onToggleSourceMode]
  );

  const handleCancel = useCallback(() => {
    onToggleSourceMode?.();
    view.focus();
  }, [onToggleSourceMode, view]);

  if (!isSourceMode || capturedHtmlRef.current === null) return null;

  return (
    <SourceModeModal
      initialHtml={capturedHtmlRef.current}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

export function createHtmlSourceExtension(): EditorExtension {
  return {
    id: "html-source",
    getToolbarItems: () => [
      {
        id: "html-source:toggle",
        group: "view",
        priority: 5,
        render: ({ isSourceMode, onToggleSourceMode }) => {
          if (!onToggleSourceMode) return null;
          return (
            <ToolbarButton
              title={isSourceMode ? "Exit HTML source" : "Edit HTML source"}
              active={isSourceMode}
              onMouseDown={(e) => {
                e.preventDefault();
                onToggleSourceMode();
              }}
            >
              <Code2 size={14} />
            </ToolbarButton>
          );
        },
      },
    ],
    getOverlays: () => [
      {
        id: "html-source:modal",
        render: (props) => <HtmlSourceOverlay {...props} />,
      },
    ],
  };
}
