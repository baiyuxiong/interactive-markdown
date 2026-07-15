import type { ImdBlock, ImdDocument } from "./types.js";

export function serialize(document: ImdDocument): string {
  return document.blocks.map(serializeBlock).join("");
}

function serializeBlock(block: ImdBlock): string {
  switch (block.type) {
    case "markdown":
      return block.text;
    case "choice": {
      const attrs = attrsToString({
        id: block.id,
        mode: block.mode,
        required: block.required,
      });
      const options = block.options.map((o) => `- ${o.value} | ${o.label}`).join("\n");
      const body = joinBodySections(block.label, options, block.hint);
      return `:::choice${attrs}\n${body}\n:::`;
    }
    case "input": {
      const attrs = attrsToString({
        id: block.id,
        placeholder: block.placeholder,
        default: block.defaultValue,
        required: block.required,
      });
      const body = joinBodySections(block.label, block.hint);
      return body ? `:::input${attrs}\n${body}\n:::` : `:::input${attrs}\n:::`;
    }
    case "switch": {
      const attrs = attrsToString({
        id: block.id,
        default: block.default,
        required: block.required,
      });
      const body = joinBodySections(block.label, block.hint);
      return body ? `:::switch${attrs}\n${body}\n:::` : `:::switch${attrs}\n:::`;
    }
    case "action": {
      const attrs = attrsToString({
        id: block.id,
      });
      const data =
        block.data !== undefined
          ? ["```json", JSON.stringify(block.data), "```"].join("\n")
          : undefined;
      const body = joinBodySections(block.label, data);
      if (body) return `:::action${attrs}\n${body}\n:::`;
      return `:::action${attrs}\n:::`;
    }
  }
}

function joinBodySections(
  ...sections: Array<string | undefined>
): string {
  return sections
    .map((section) => section?.trim())
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
}

function attrsToString(
  attrs: Record<string, string | boolean | undefined>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (value === true) {
      parts.push(key);
      continue;
    }
    if (/[\s"{}]/.test(value)) {
      parts.push(`${key}="${value.replace(/"/g, '\\"')}"`);
    } else {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length ? `{${parts.join(" ")}}` : "";
}
