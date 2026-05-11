/**
 * useLinkDialog Hook
 *
 * Manages link dialog state and operations
 */

import { useCallback, useState } from "react";

export interface UseLinkDialogReturn {
  isLinkDialogOpen: boolean;
  linkUrl: string;
  linkText: string;
  selectedTextForLink: string;
  setIsLinkDialogOpen: (open: boolean) => void;
  setLinkUrl: (url: string) => void;
  setLinkText: (text: string) => void;
  setSelectedTextForLink: (text: string) => void;
  openLinkDialog: (selectedText?: string) => void;
  closeLinkDialog: () => void;
  resetLinkDialog: () => void;
}

/**
 * Hook to manage link dialog state
 */
export function useLinkDialog(): UseLinkDialogReturn {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [selectedTextForLink, setSelectedTextForLink] = useState("");

  const openLinkDialog = useCallback((selectedText?: string) => {
    if (selectedText) {
      setSelectedTextForLink(selectedText);
      setLinkText(selectedText);
    }
    setIsLinkDialogOpen(true);
  }, []);

  const closeLinkDialog = useCallback(() => {
    setIsLinkDialogOpen(false);
  }, []);

  const resetLinkDialog = useCallback(() => {
    setLinkUrl("");
    setLinkText("");
    setSelectedTextForLink("");
    setIsLinkDialogOpen(false);
  }, []);

  return {
    isLinkDialogOpen,
    linkUrl,
    linkText,
    selectedTextForLink,
    setIsLinkDialogOpen,
    setLinkUrl,
    setLinkText,
    setSelectedTextForLink,
    openLinkDialog,
    closeLinkDialog,
    resetLinkDialog,
  };
}
