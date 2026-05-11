export interface EditorState {
  activeFormats: Set<string>;
  currentBlockTag: string;
  currentAlignment: string;
  currentFontSize: string;
  currentListType: string | null;
  hasLink: boolean;
  currentTextColor: string;
  currentBackgroundColor: string;
  selectedImage: HTMLImageElement | null;
  selectedTable: HTMLTableElement | null;
  selectedColumnLayout: HTMLElement | null;
}

export interface EditorCommand<TArgs = void> {
  id: string;
  execute(args: TArgs): void;
  isActive?(state: EditorState): boolean;
  isDisabled?(state: EditorState): boolean;
}
