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
        hint: block.hint,
      });
      const body = block.options.map((o) => `- ${o.value} | ${o.label}`).join("\n");
      return `:::choice${attrs}\n${body}\n:::`;
    }
    case "input": {
      const attrs = attrsToString({
        id: block.id,
        label: block.label,
        placeholder: block.placeholder,
        required: block.required,
        hint: block.hint,
      });
      const body = block.defaultValue ?? "";
      return body ? `:::input${attrs}\n${body}\n:::` : `:::input${attrs}\n:::`;
    }
    case "switch": {
      const attrs = attrsToString({
        id: block.id,
        label: block.label,
        default: block.default,
        required: block.required,
        hint: block.hint,
      });
      return `:::switch${attrs}\n:::`;
    }
    case "actions": {
      const attrs = attrsToString({ hint: block.hint });
      const body = block.items.map((i) => `- ${i.actionId} | ${i.label}`).join("\n");
      return `:::actions${attrs}\n${body}\n:::`;
    }
  }
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
