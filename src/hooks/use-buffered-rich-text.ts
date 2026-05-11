import { useDocumentSession } from "./use-document-session";

interface UseBufferedRichTextProps {
  value?: string;
  onSave?: (content: string) => void | Promise<void>;
  onDiscard?: (content: string) => void | Promise<void>;
  onLocalChange?: (content: string) => void;
}

interface UseBufferedRichTextReturn {
  localContent: string;
  hasUnsavedChanges: boolean;
  handleLocalChange: (content: string) => void;
  handleSave: () => Promise<void>;
  handleDiscard: () => Promise<void>;
}

/**
 * Generic draft buffer for the rich text editor.
 *
 * Use this outside Sanity when the editor should keep local HTML changes until
 * the host application explicitly saves or discards them.
 */
export function useBufferedRichText({
  value,
  onSave,
  onDiscard,
  onLocalChange,
}: UseBufferedRichTextProps): UseBufferedRichTextReturn {
  const { localContent, hasUnsavedChanges, handleLocalChange, handleSave, handleDiscard } = useDocumentSession({
    value,
    onSave,
    onDiscard,
    onLocalChange,
  });

  return {
    localContent,
    hasUnsavedChanges,
    handleLocalChange,
    handleSave,
    handleDiscard,
  };
}
