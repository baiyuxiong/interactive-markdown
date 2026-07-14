import type { ImdActionItem, ImdBlock, ImdDocument, ImdOption } from "./types.js";

type Attrs = Record<string, string | true>;

type RawDirective = {
  name: string;
  attrs: Attrs;
  body: string;
  raw: string;
};

export function parse(source: string): ImdDocument {
  const { lines, starts } = splitLines(source);
  const blocks: ImdBlock[] = [];
  let mdStart = 0;
  let i = 0;

  while (i < lines.length) {
    const open = matchOpenFence(lines[i] ?? "");
    if (!open) {
      i++;
      continue;
    }

    const openStart = starts[i] ?? 0;
    pushMarkdown(blocks, source, mdStart, openStart);

    let closeLine = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (isCloseFence(lines[j] ?? "")) {
        closeLine = j;
        break;
      }
    }

    if (closeLine < 0) {
      blocks.push({ type: "markdown", text: source.slice(openStart) });
      mdStart = source.length;
      break;
    }

    const directiveEnd = (starts[closeLine] ?? 0) + (lines[closeLine] ?? "").length;
    const raw = source.slice(openStart, directiveEnd);
    const bodyLines = lines.slice(i + 1, closeLine);
    const directive: RawDirective = {
      name: open.name,
      attrs: parseAttrs(open.attrText),
      body: bodyLines.join("\n"),
      raw,
    };
    const block = toBlock(directive);
    blocks.push(block ?? { type: "markdown", text: raw });

    mdStart = directiveEnd;
    i = closeLine + 1;
  }

  pushMarkdown(blocks, source, mdStart, source.length);
  return { source, blocks };
}

/** Char offset of the start of each line. */
function splitLines(source: string): { lines: string[]; starts: number[] } {
  const lines = source.split("\n");
  const starts: number[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    starts.push(offset);
    offset += (lines[i] ?? "").length;
    if (i < lines.length - 1) offset += 1;
  }
  return { lines, starts };
}

function pushMarkdown(
  blocks: ImdBlock[],
  source: string,
  start: number,
  end: number,
) {
  if (end > start) blocks.push({ type: "markdown", text: source.slice(start, end) });
}

function toBlock(d: RawDirective): ImdBlock | null {
  switch (d.name) {
    case "choice":
      return {
        type: "choice",
        id: str(d.attrs.id) ?? "",
        mode: str(d.attrs.mode) === "multiple" ? "multiple" : "single",
        options: parseOptions(d.body),
        ...boolHint(d.attrs),
      };
    case "input": {
      const defaultValue = d.body.trim();
      return {
        type: "input",
        id: str(d.attrs.id) ?? "",
        label: str(d.attrs.label),
        placeholder: str(d.attrs.placeholder),
        ...(defaultValue ? { defaultValue } : {}),
        ...boolHint(d.attrs),
      };
    }
    case "switch": {
      const def = str(d.attrs.default);
      return {
        type: "switch",
        id: str(d.attrs.id) ?? "",
        label: str(d.attrs.label),
        default: def === "on" ? "on" : def === "off" ? "off" : undefined,
        ...boolHint(d.attrs),
      };
    }
    case "actions":
      return {
        type: "actions",
        items: parseActions(d.body),
        hint: str(d.attrs.hint),
      };
    default:
      return null;
  }
}

function boolHint(attrs: Attrs): { required?: boolean; hint?: string } {
  const out: { required?: boolean; hint?: string } = {};
  if (attrs.required === true || str(attrs.required) === "true") out.required = true;
  const hint = str(attrs.hint);
  if (hint !== undefined) out.hint = hint;
  return out;
}

function parseOptions(body: string): ImdOption[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const m = /^-\s+(.+?)\s*\|\s*(.+)$/.exec(line);
      if (!m) return [];
      return [{ value: m[1]!.trim(), label: m[2]!.trim() }];
    });
}

function parseActions(body: string): ImdActionItem[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const m = /^-\s+(.+?)\s*\|\s*(.+)$/.exec(line);
      if (!m) return [];
      return [{ actionId: m[1]!.trim(), label: m[2]!.trim() }];
    });
}

function matchOpenFence(line: string): { name: string; attrText: string } | null {
  const m = /^:::([a-zA-Z][\w-]*)(?:\{([^}]*)\})?\s*$/.exec(line);
  if (!m) return null;
  return { name: m[1]!, attrText: m[2] ?? "" };
}

function isCloseFence(line: string): boolean {
  return /^:::\s*$/.test(line);
}

function parseAttrs(raw: string): Attrs {
  const attrs: Attrs = {};
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i]!)) i++;
    if (i >= raw.length) break;
    const keyStart = i;
    while (i < raw.length && /[\w-]/.test(raw[i]!)) i++;
    const key = raw.slice(keyStart, i);
    if (!key) {
      i++;
      continue;
    }
    if (raw[i] === "=") {
      i++;
      if (raw[i] === '"' || raw[i] === "'") {
        const q = raw[i]!;
        i++;
        const start = i;
        while (i < raw.length && raw[i] !== q) i++;
        attrs[key] = raw.slice(start, i);
        if (raw[i] === q) i++;
      } else {
        const start = i;
        while (i < raw.length && !/\s/.test(raw[i]!)) i++;
        attrs[key] = raw.slice(start, i);
      }
    } else {
      attrs[key] = true;
    }
  }
  return attrs;
}

function str(v: string | true | undefined): string | undefined {
  if (v === undefined || v === true) return undefined;
  return v;
}
