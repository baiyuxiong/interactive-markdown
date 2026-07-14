import type {
  ImdBlock,
  ImdInteractionKind,
  ImdInteractionResult,
} from "./types.js";

export function isFilled(block: ImdBlock, values: string[]): boolean {
  switch (block.type) {
    case "choice": {
      if (block.mode === "single") return values.length === 1;
      if (block.required) return values.length >= 1;
      return true;
    }
    case "input": {
      const filled = Boolean(values[0]?.trim());
      if (block.required) return filled;
      return true;
    }
    case "switch": {
      const v = values[0];
      if (v !== "on" && v !== "off") return false;
      if (block.required) return v === "on";
      return true;
    }
    case "action":
      return values.length === 1;
    case "markdown":
      return true;
  }
}

export function buildInteractionResult(
  kind: ImdInteractionKind,
  block: ImdBlock,
  values: string[],
  meta?: Record<string, unknown>,
): ImdInteractionResult {
  const blockId =
    kind === "action"
      ? block.type === "action"
        ? block.id
        : (values[0] ?? "")
      : "id" in block
        ? block.id
        : "";

  return {
    kind,
    blockId,
    values,
    block,
    ...(meta ? { meta } : {}),
  };
}

export function toReplyPayload(
  result: ImdInteractionResult,
  opts: { messageId: string },
): {
  messageId: string;
  blockId: string;
  kind: ImdInteractionKind;
  values: string[];
} {
  return {
    messageId: opts.messageId,
    blockId: result.blockId,
    kind: result.kind,
    values: result.values,
  };
}
