const VOID_ELEMENTS = new Set([
  "area","base","br","col","embed","hr","img","input",
  "link","meta","param","source","track","wbr",
]);

export function validateHtml(html: string): string | null {
  const trimmed = html.trim();
  if (!trimmed) return null;

  const stripped = trimmed
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^>]*)?(\/?)>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(stripped)) !== null) {
    const [full, rawName,, selfClose] = match;
    const name = rawName.toLowerCase();
    const isClosing = full.startsWith("</");
    const isSelfClose = selfClose === "/" || VOID_ELEMENTS.has(name);

    if (isClosing) {
      if (stack.length === 0) return `Unexpected closing tag </${name}>`;
      const top = stack[stack.length - 1];
      if (top !== name) return `Tag <${top}> was closed by </${name}>`;
      stack.pop();
    } else if (!isSelfClose) {
      stack.push(name);
    }
  }

  if (stack.length > 0) return `Unclosed tag: <${stack[stack.length - 1]}>`;
  return null;
}
