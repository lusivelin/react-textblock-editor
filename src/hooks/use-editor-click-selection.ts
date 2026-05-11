import { useCallback } from "react";

interface UseEditorClickSelectionProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  selectedImage: HTMLImageElement | null;
  selectedTable: HTMLTableElement | null;
  selectedColumnLayout: HTMLElement | null;
  setSelectedImage: (img: HTMLImageElement | null) => void;
  setSelectedTable: (t: HTMLTableElement | null) => void;
  setSelectedColumnLayout: (l: HTMLElement | null) => void;
}

export function useEditorClickSelection({
  editorRef,
  selectedImage,
  selectedTable,
  selectedColumnLayout,
  setSelectedImage,
  setSelectedTable,
  setSelectedColumnLayout,
}: UseEditorClickSelectionProps) {
  const clearAllSelections = useCallback(() => {
    editorRef.current?.querySelectorAll("img, table, .column-layout").forEach((el) => {
      el.classList.remove("selected");
    });
    setSelectedImage(null);
    setSelectedTable(null);
    setSelectedColumnLayout(null);
  }, [editorRef, setSelectedImage, setSelectedTable, setSelectedColumnLayout]);

  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      const clearAllClasses = () => {
        editorRef.current?.querySelectorAll("img, table, .column-layout").forEach((el) => {
          el.classList.remove("selected");
        });
      };

      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        clearAllClasses();
        setSelectedTable(null);
        setSelectedColumnLayout(null);
        if (selectedImage === img) {
          setSelectedImage(null);
        } else {
          img.classList.add("selected");
          setSelectedImage(img);
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNode(img);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } else if (target.tagName === "TABLE" || target.closest("table")) {
        const table = (target.tagName === "TABLE" ? target : target.closest("table")) as HTMLTableElement;
        clearAllClasses();
        setSelectedImage(null);
        setSelectedColumnLayout(null);
        if (selectedTable === table) {
          setSelectedTable(null);
        } else {
          table.classList.add("selected");
          setSelectedTable(table);
        }
      } else if (target.closest(".column-layout")) {
        const layout = target.closest(".column-layout") as HTMLElement;
        clearAllClasses();
        setSelectedImage(null);
        setSelectedTable(null);
        if (selectedColumnLayout === layout) {
          setSelectedColumnLayout(null);
        } else {
          layout.classList.add("selected");
          setSelectedColumnLayout(layout);
        }
      } else {
        clearAllSelections();
      }
    },
    [
      editorRef,
      selectedImage,
      selectedTable,
      selectedColumnLayout,
      setSelectedImage,
      setSelectedTable,
      setSelectedColumnLayout,
      clearAllSelections,
    ]
  );

  return { handleEditorClick, clearAllSelections };
}
