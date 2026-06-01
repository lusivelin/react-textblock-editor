import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { validateHtml } from "@lib/utils/html/validate-html";

interface SourceModeModalProps {
  initialHtml: string;
  onConfirm: (html: string) => void;
  onCancel: () => void;
}

export function SourceModeModal({ initialHtml, onConfirm, onCancel }: SourceModeModalProps) {
  const [html, setHtml] = useState(initialHtml);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtml(val);
    setError(validateHtml(val));
  }, []);

  const handleConfirm = useCallback(() => {
    const err = validateHtml(html);
    if (err) { setError(err); return; }
    onConfirm(html);
  }, [html, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  }, [handleConfirm]);

  return createPortal(
    <div
      className="rtb-html-popup-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="rtb-html-popup rtb-html-popup--source" role="dialog" aria-modal="true" aria-label="HTML source editor">

        <div className="rtb-html-popup__header">
          <div className="rtb-html-popup__title-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            <span className="rtb-html-popup__title">HTML Source</span>
          </div>
          <button
            type="button"
            className="rtb-html-popup__close"
            title="Cancel (Esc)"
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="rtb-html-popup__panes">
          <div className="rtb-html-popup__pane">
            <textarea
              ref={textareaRef}
              className={`rtb-html-popup__textarea${error ? " rtb-html-popup__textarea--error" : ""}`}
              value={html}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              aria-label="Document HTML source"
              aria-invalid={error !== null}
              aria-describedby={error ? "rtb-src-error" : undefined}
            />
            {error ? (
              <div id="rtb-src-error" className="rtb-html-popup__error" role="alert">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            ) : (
              <div className="rtb-html-popup__hint">
                <kbd>⌘↵</kbd> to apply &nbsp;·&nbsp; <kbd>Esc</kbd> to cancel
              </div>
            )}
          </div>
        </div>

        <div className="rtb-html-popup__footer">
          <button
            type="button"
            className="rtb-html-popup__btn rtb-html-popup__btn--secondary"
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rtb-html-popup__btn rtb-html-popup__btn--primary"
            disabled={!!error}
            onMouseDown={(e) => { e.preventDefault(); handleConfirm(); }}
          >
            Apply <kbd>⌘↵</kbd>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
