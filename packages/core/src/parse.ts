import type {
  ImdBlock,
  ImdDocument,
  ImdOption,
  ImdPendingBlock,
  ParseSafeResult,
} from "./types.js";

type Attrs = Record<string, string | true>;

type RawDirective = {
  name: string;
  attrs: Attrs;
  body: string;
  raw: string;
};

type ScanResult = {
  blocks: ImdBlock[];
  pending: ImdPendingBlock | null;
  /** Excluded raw when pending is null (unknown name or incomplete open line). */
  excludedRaw: string | null;
};

function isKnownPendingName(
  name: string,
): name is "choice" | "input" | "switch" | "action" {
  return (
    name === "choice" ||
    name === "input" ||
    name === "switch" ||
    name === "action"
  );
}

export function parseSafe(source: string): ParseSafeResult {
  const { blocks, pending } = scan(source);
  return { document: { source, blocks }, pending };
}

export function parse(source: string): ImdDocument {
  const { blocks, pending, excludedRaw } = scan(source);
  const fold = pending?.raw ?? excludedRaw;
  if (!fold) return { source, blocks };
  return {
    source,
    blocks: [...blocks, { type: "markdown", text: fold }],
  };
}

function scan(source: string): ScanResult {
  const { lines, starts } = splitLines(source);
  const blocks: ImdBlock[] = [];
  let mdStart = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const open = matchOpenFence(line);

    if (!open) {
      if (looksLikeOpenStart(line)) {
        const openStart = starts[i] ?? 0;
        pushMarkdown(blocks, source, mdStart, openStart);
        return {
          blocks,
          pending: null,
          excludedRaw: source.slice(openStart),
        };
      }
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
      const raw = source.slice(openStart);
      // While the opening fence is still the last line and has no trailing
      // newline, more chars (e.g. `{attrs}`) may still arrive — defer pending
      // so UIs don't flash empty widgets that then vanish.
      const openLineCommitted =
        i < lines.length - 1 || source.endsWith("\n");
      if (!openLineCommitted) {
        return {
          blocks,
          pending: null,
          excludedRaw: raw,
        };
      }
      const bodyLines = lines.slice(i + 1);
      const pending = isKnownPendingName(open.name)
        ? toPending(open.name, open.attrText, bodyLines, raw)
        : null;
      return {
        blocks,
        pending,
        excludedRaw: pending ? null : raw,
      };
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
  return { blocks, pending: null, excludedRaw: null };
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
    case "choice": {
      const parsed = parseChoiceBody(d.body, { pending: false });
      if (parsed.invalid) return null;
      return {
        type: "choice",
        id: str(d.attrs.id) ?? "",
        mode: str(d.attrs.mode) === "multiple" ? "multiple" : "single",
        options: parsed.options,
        ...textFields(parsed),
        ...boolRequired(d.attrs),
      };
    }
    case "input": {
      const sections = parseTextSections(d.body);
      const defaultValue = str(d.attrs.default);
      return {
        type: "input",
        id: str(d.attrs.id) ?? "",
        placeholder: str(d.attrs.placeholder),
        ...textFields(sections),
        ...(defaultValue ? { defaultValue } : {}),
        ...boolRequired(d.attrs),
      };
    }
    case "switch": {
      const def = str(d.attrs.default);
      const sections = parseTextSections(d.body);
      return {
        type: "switch",
        id: str(d.attrs.id) ?? "",
        default: def === "on" ? "on" : def === "off" ? "off" : undefined,
        ...textFields(sections),
        ...boolRequired(d.attrs),
      };
    }
    case "action": {
      const parsed = parseActionBody(d.body);
      if (parsed.invalid) return null;
      return {
        type: "action",
        id: str(d.attrs.id) ?? "",
        ...actionFields(parsed),
      };
    }
    default:
      return null;
  }
}

function toPending(
  name: "choice" | "input" | "switch" | "action",
  attrText: string,
  bodyLines: string[],
  raw: string,
): ImdPendingBlock {
  const attrs = parseAttrs(attrText);
  const body = bodyLines.join("\n");
  const id = str(attrs.id);
  const base = {
    ...(id !== undefined ? { id } : {}),
    ...boolRequired(attrs),
    raw,
  };

  switch (name) {
    case "choice":
      const choice = parseChoiceBody(body, { pending: true });
      return {
        type: "choice",
        mode: str(attrs.mode) === "multiple" ? "multiple" : "single",
        options: choice.options,
        ...textFields(choice),
        ...base,
      };
    case "input": {
      const sections = parseTextSections(body);
      const defaultValue = str(attrs.default);
      return {
        type: "input",
        placeholder: str(attrs.placeholder),
        ...textFields(sections),
        ...(defaultValue ? { defaultValue } : {}),
        ...base,
      };
    }
    case "switch": {
      const def = str(attrs.default);
      const sections = parseTextSections(body);
      return {
        type: "switch",
        default: def === "on" ? "on" : def === "off" ? "off" : undefined,
        ...textFields(sections),
        ...base,
      };
    }
    case "action":
      const action = parseActionBody(body, { parseData: false });
      return {
        type: "action",
        ...textFields(action),
        ...base,
      };
  }
}

function boolRequired(attrs: Attrs): { required?: boolean } {
  const out: { required?: boolean } = {};
  if (attrs.required === true || str(attrs.required) === "true") out.required = true;
  return out;
}

function parseChoiceBody(
  body: string,
  opts: { pending: boolean },
): { label?: string; hint?: string; options: ImdOption[]; invalid?: boolean } {
  const labelLines: string[] = [];
  const hintLines: string[] = [];
  const options: ImdOption[] = [];
  let phase: "label" | "options" | "hint" = "label";
  let invalid = false;

  for (const line of body.split("\n")) {
    const option = parseOptionLine(line);
    if (option) {
      if (phase === "hint") invalid = true;
      phase = "options";
      options.push(option);
      continue;
    }

    if (opts.pending && phase === "options" && /^\s*-/.test(line)) {
      continue;
    }

    if (phase === "label") {
      labelLines.push(line);
    } else {
      phase = "hint";
      hintLines.push(line);
    }
  }

  return {
    options,
    ...parseTextSectionsFromLines(labelLines, hintLines),
    ...(invalid ? { invalid: true } : {}),
  };
}

function parseOptionLine(line: string): ImdOption | null {
  const m = /^-\s+(.+?)\s*\|\s*(.+)$/.exec(line.trim());
  if (!m) return null;
  return { value: m[1]!.trim(), label: m[2]!.trim() };
}

function parseActionBody(
  body: string,
  opts: { parseData?: boolean } = { parseData: true },
): { label?: string; data?: unknown; dataError?: string; invalid?: boolean } {
  const trimmed = body.trim();
  if (!trimmed) return {};

  const fenced = /```json\s*\n([\s\S]*?)\n```/i.exec(body);
  if (!opts.parseData) return parsePendingActionText(body, fenced);

  if (fenced?.index !== undefined) {
    const before = body.slice(0, fenced.index);
    const after = body.slice(fenced.index + fenced[0].length);
    if (after.trim()) return { invalid: true };
    return {
      ...parseActionLabel(before),
      ...parseJsonData(fenced[1] ?? ""),
    };
  }

  const paragraphs = splitParagraphs(body);
  const jsonIndex = paragraphs.findIndex((p) => looksLikeJson(p));
  if (jsonIndex < 0) return parseActionLabel(body);

  if (paragraphs.slice(jsonIndex + 1).some((part) => part.trim())) {
    return { invalid: true };
  }

  const data = parseJsonData(paragraphs[jsonIndex] ?? "");
  if ("dataError" in data && jsonIndex === 0) return parseActionLabel(body);

  return {
    ...parseActionLabel(paragraphs.slice(0, jsonIndex).join("\n\n")),
    ...data,
  };
}

function parsePendingActionText(
  body: string,
  fenced: RegExpExecArray | null,
): { label?: string } {
  const pendingFenceStart = findPendingJsonFenceStart(body);
  if (pendingFenceStart >= 0) {
    return parseActionLabel(body.slice(0, pendingFenceStart));
  }

  if (fenced?.index !== undefined) {
    const before = body.slice(0, fenced.index);
    return parseActionLabel(before);
  }

  const fenceStart = /```json\b/i.exec(body);
  if (fenceStart?.index !== undefined) {
    return parseActionLabel(body.slice(0, fenceStart.index));
  }

  const paragraphs = splitParagraphs(body);
  const jsonIndex = paragraphs.findIndex((p) => looksLikeJson(p));
  if (jsonIndex < 0) return parseActionLabel(body);

  return parseActionLabel(paragraphs.slice(0, jsonIndex).join("\n\n"));
}

function findPendingJsonFenceStart(body: string): number {
  let offset = 0;
  for (const line of body.split("\n")) {
    if (/^\s*`{1,3}(?:j(?:s(?:o(?:n)?)?)?)?\s*$/i.test(line)) {
      return offset;
    }
    offset += line.length + 1;
  }
  return -1;
}

function parseJsonData(source: string): { data?: unknown; dataError?: string } {
  const trimmed = source.trim();
  if (!trimmed) return {};
  try {
    return { data: JSON.parse(trimmed) as unknown };
  } catch (err) {
    return { dataError: err instanceof Error ? err.message : String(err) };
  }
}

function parseActionLabel(body: string): { label?: string } {
  const label = body.trim();
  return label ? { label } : {};
}

function actionFields(fields: {
  label?: string;
  data?: unknown;
  dataError?: string;
}): { label?: string; data?: unknown; dataError?: string } {
  return {
    ...(fields.label !== undefined ? { label: fields.label } : {}),
    ...(fields.data !== undefined ? { data: fields.data } : {}),
    ...(fields.dataError !== undefined ? { dataError: fields.dataError } : {}),
  };
}

function looksLikeJson(text: string): boolean {
  return /^(?:[\[{"-]|\d|true\b|false\b|null\b)/.test(text.trim());
}

function parseTextSections(body: string): { label?: string; hint?: string } {
  const [label, ...hintParts] = splitParagraphs(body);
  return parseTextSectionsFromText(label ?? "", hintParts.join("\n\n"));
}

function parseTextSectionsFromLines(
  labelLines: string[],
  hintLines: string[],
): { label?: string; hint?: string } {
  return parseTextSectionsFromText(labelLines.join("\n"), hintLines.join("\n"));
}

function parseTextSectionsFromText(
  label: string,
  hint: string,
): { label?: string; hint?: string } {
  return {
    ...(label.trim() ? { label: label.trim() } : {}),
    ...(hint.trim() ? { hint: hint.trim() } : {}),
  };
}

function splitParagraphs(body: string): string[] {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function textFields(fields: { label?: string; hint?: string }): {
  label?: string;
  hint?: string;
} {
  return {
    ...(fields.label !== undefined ? { label: fields.label } : {}),
    ...(fields.hint !== undefined ? { hint: fields.hint } : {}),
  };
}

function matchOpenFence(line: string): { name: string; attrText: string } | null {
  if (!line.startsWith(":::")) return null;

  let i = 3;
  const nameStart = i;
  if (!/[a-zA-Z]/.test(line[i] ?? "")) return null;
  i++;
  while (i < line.length && /[\w-]/.test(line[i]!)) i++;
  const name = line.slice(nameStart, i);

  if (/^\s*$/.test(line.slice(i))) return { name, attrText: "" };
  if (line[i] !== "{") return null;

  i++;
  const attrStart = i;
  let quote: string | null = null;
  let escaped = false;
  while (i < line.length) {
    const ch = line[i]!;
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "}") break;
    i++;
  }

  if (line[i] !== "}" || quote) return null;
  const attrText = line.slice(attrStart, i);
  i++;
  if (!/^\s*$/.test(line.slice(i))) return null;
  return { name, attrText };
}

/** Streaming fence hint: bare :/::/::: or :::name… before the open is complete. */
function looksLikeOpenStart(line: string): boolean {
  const t = line.trimEnd();
  if (t === ":" || t === "::" || t === ":::") return true;
  return /^:::[a-zA-Z][\w-]*/.test(t);
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
        let value = "";
        while (i < raw.length) {
          if (raw[i] === "\\" && i + 1 < raw.length) {
            value += raw[i + 1]!;
            i += 2;
            continue;
          }
          if (raw[i] === q) break;
          value += raw[i]!;
          i++;
        }
        attrs[key] = value;
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
