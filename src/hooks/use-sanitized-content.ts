interface UseSanitizedContentResult {
  sanitizedContent: string;
  isLoading: boolean;
}

/**
 * Frontend renderer contract: HTML from this field has already been sanitized
 * before storage, so rendering can skip a second heavy sanitization pass.
 */
export function useSanitizedContent(content: string): UseSanitizedContentResult {
  return { sanitizedContent: content ?? "", isLoading: false };
}
