import OrderedMap from "orderedmap";
import { Bold, Code, Italic, Maximize2, Minimize2, Quote, Redo, Strikethrough, Underline, Undo } from "lucide-react";
import { baseKeymap, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { addListNodes, liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";
import { nodes as basicNodes } from "prosemirror-schema-basic";
import type { MarkSpec, NodeSpec } from "prosemirror-model";
import type { EditorExtension, EditorToolbarItemProps } from "@lib/core/editor-extension";
import {
  ColorDropdown,
  isBlockActive,
  isMarkActive,
  ListStyleDropdown,
  runCommand,
  ToolbarButton,
  ToolbarSeparator,
} from "@lib/components/prosemirror/toolbar";

const listNodes = addListNodes(OrderedMap.from(basicNodes), "block+", "block");

const bulletListSpec: NodeSpec = {
  ...listNodes.get("bullet_list"),
  attrs: { listStyleType: { default: "disc" } },
  parseDOM: [{
    tag: "ul",
    getAttrs(dom: Node | string) {
      return { listStyleType: (dom as HTMLElement).getAttribute("data-list-style") ?? "disc" };
    },
  }],
  toDOM(node: { attrs: { listStyleType?: string } }) {
    const listStyleType = node.attrs.listStyleType ?? "disc";
    return listStyleType !== "disc" ? ["ul", { "data-list-style": listStyleType }, 0] : ["ul", 0];
  },
};

const orderedListSpec: NodeSpec = {
  ...listNodes.get("ordered_list"),
  attrs: { order: { default: 1 }, listStyleType: { default: "decimal" } },
  parseDOM: [{
    tag: "ol",
    getAttrs(dom: Node | string) {
      const element = dom as HTMLElement;
      return {
        order: element.hasAttribute("start") ? +(element.getAttribute("start") ?? 1) : 1,
        listStyleType: element.getAttribute("data-list-style") ?? "decimal",
      };
    },
  }],
  toDOM(node: { attrs: { order?: number; listStyleType?: string } }) {
    const attrs: Record<string, string> = {};
    if ((node.attrs.order ?? 1) !== 1) attrs.start = String(node.attrs.order);
    if ((node.attrs.listStyleType ?? "decimal") !== "decimal") attrs["data-list-style"] = node.attrs.listStyleType!;
    return ["ol", attrs, 0];
  },
};

function renderHeadingButtons({ view, state, schema }: EditorToolbarItemProps) {
  const heading = schema.nodes.heading;
  const paragraph = schema.nodes.paragraph;
  if (!heading || !paragraph) return null;

  const renderHeadingButton = (level: number) => (
    <ToolbarButton
      key={`heading-${level}`}
      title={`Heading ${level}`}
      active={isBlockActive(state, heading, { level })}
      onMouseDown={(event) => {
        event.preventDefault();
        runCommand(view, setBlockType(heading, { level }));
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700 }}>{`H${level}`}</span>
    </ToolbarButton>
  );

  return (
    <>
      {renderHeadingButton(1)}
      {renderHeadingButton(2)}
      {renderHeadingButton(3)}
      <ToolbarButton
        title="Paragraph"
        active={isBlockActive(state, paragraph)}
        onMouseDown={(event) => {
          event.preventDefault();
          runCommand(view, setBlockType(paragraph));
        }}
      >
        <span style={{ fontSize: 11 }}>¶</span>
      </ToolbarButton>
    </>
  );
}

export function createDefaultFormattingExtension(): EditorExtension {
  return {
    id: "default-formatting",
    getSchema: () => ({
      nodes: {
        bullet_list: bulletListSpec,
        ordered_list: orderedListSpec,
        list_item: listNodes.get("list_item") as NodeSpec,
      },
      marks: {
        underline: {
          parseDOM: [{ tag: "u" }],
          toDOM: () => ["u", 0],
        } satisfies MarkSpec,
        strike: {
          parseDOM: [{ tag: "s" }, { tag: "del" }],
          toDOM: () => ["s", 0],
        } satisfies MarkSpec,
        textColor: {
          attrs: { color: {} },
          parseDOM: [{ tag: "span[data-text-color]", getAttrs: (dom) => ({ color: (dom as HTMLElement).getAttribute("data-text-color") }) }],
          toDOM: (mark) => ["span", { "data-text-color": mark.attrs.color as string, style: `color:${mark.attrs.color as string}` }, 0],
        } satisfies MarkSpec,
        backgroundColor: {
          attrs: { color: {} },
          parseDOM: [{ tag: "span[data-bg-color]", getAttrs: (dom) => ({ color: (dom as HTMLElement).getAttribute("data-bg-color") }) }],
          toDOM: (mark) => ["span", { "data-bg-color": mark.attrs.color as string, style: `background-color:${mark.attrs.color as string}` }, 0],
        } satisfies MarkSpec,
      },
    }),
    getPlugins: () => [history()],
    getKeymap: ({ schema }) => {
      const listItem = schema.nodes.list_item;
      return {
        "Mod-z": undo,
        "Mod-Shift-z": redo,
        "Mod-y": redo,
        ...(listItem ? {
          Enter: splitListItem(listItem),
          Tab: sinkListItem(listItem),
          "Shift-Tab": liftListItem(listItem),
        } : {}),
        ...baseKeymap,
      };
    },
    getToolbarItems: ({ schema }) => [
      {
        id: "default-formatting:history",
        group: "history",
        priority: 10,
        render: ({ view }) => (
          <>
            <ToolbarButton title="Undo (Ctrl+Z)" onMouseDown={(event) => { event.preventDefault(); runCommand(view, undo); }}>
              <Undo size={14} />
            </ToolbarButton>
            <ToolbarButton title="Redo (Ctrl+Shift+Z)" onMouseDown={(event) => { event.preventDefault(); runCommand(view, redo); }}>
              <Redo size={14} />
            </ToolbarButton>
            <ToolbarSeparator />
          </>
        ),
      },
      {
        id: "default-formatting:inline",
        group: "inline",
        priority: 10,
        render: ({ view, state }) => (
          <>
            <ToolbarButton
              title="Bold (Ctrl+B)"
              active={isMarkActive(state, schema.marks.strong)}
              onMouseDown={(event) => { event.preventDefault(); runCommand(view, toggleMark(schema.marks.strong)); }}
            >
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Italic (Ctrl+I)"
              active={isMarkActive(state, schema.marks.em)}
              onMouseDown={(event) => { event.preventDefault(); runCommand(view, toggleMark(schema.marks.em)); }}
            >
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Underline"
              active={isMarkActive(state, schema.marks.underline)}
              onMouseDown={(event) => { event.preventDefault(); runCommand(view, toggleMark(schema.marks.underline)); }}
            >
              <Underline size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Strikethrough"
              active={isMarkActive(state, schema.marks.strike)}
              onMouseDown={(event) => { event.preventDefault(); runCommand(view, toggleMark(schema.marks.strike)); }}
            >
              <Strikethrough size={14} />
            </ToolbarButton>
            <ToolbarButton
              title="Inline Code"
              active={isMarkActive(state, schema.marks.code)}
              onMouseDown={(event) => { event.preventDefault(); runCommand(view, toggleMark(schema.marks.code)); }}
            >
              <Code size={14} />
            </ToolbarButton>
            <ColorDropdown type="text" view={view} state={state} markType={schema.marks.textColor} />
            <ColorDropdown type="highlight" view={view} state={state} markType={schema.marks.backgroundColor} />
            <ToolbarSeparator />
          </>
        ),
      },
      {
        id: "default-formatting:block",
        group: "block",
        priority: 10,
        render: (props) => (
          <>
            {renderHeadingButtons(props)}
            <ToolbarSeparator />
            <ListStyleDropdown type="bullet" view={props.view} state={props.state} schema={props.schema} />
            <ListStyleDropdown type="ordered" view={props.view} state={props.state} schema={props.schema} />
            <ToolbarButton
              title="Blockquote"
              active={Boolean(props.schema.nodes.blockquote) && isBlockActive(props.state, props.schema.nodes.blockquote)}
              onMouseDown={(event) => {
                event.preventDefault();
                if (props.schema.nodes.blockquote) {
                  runCommand(props.view, wrapIn(props.schema.nodes.blockquote));
                }
              }}
            >
              <Quote size={14} />
            </ToolbarButton>
            <ToolbarSeparator />
          </>
        ),
      },
      {
        id: "default-formatting:view",
        group: "view",
        priority: 10,
        render: ({ isFullscreen, onToggleFullscreen }) => (
          onToggleFullscreen ? (
            <ToolbarButton
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              onMouseDown={(event) => {
                event.preventDefault();
                onToggleFullscreen();
              }}
              className="loom-fullscreen-btn"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </ToolbarButton>
          ) : null
        ),
      },
    ],
  };
}

export function createDefaultEditorExtensions(): EditorExtension[] {
  return [createDefaultFormattingExtension()];
}
