import type { ImdBlock, ImdDocument, ValidationIssue, ValidationResult } from "./types.js";

export function validate(document: ImdDocument): ValidationResult {
  const issues: ValidationIssue[] = [];
  document.blocks.forEach((block, index) => {
    issues.push(...validateBlock(block, index));
  });
  return { ok: issues.length === 0, issues };
}

function validateBlock(block: ImdBlock, index: number): ValidationIssue[] {
  const path = `blocks[${index}]`;
  switch (block.type) {
    case "markdown":
      return [];
    case "choice": {
      const issues: ValidationIssue[] = [];
      if (!block.id) issues.push({ path, message: "choice requires id" });
      if (block.mode !== "single" && block.mode !== "multiple") {
        issues.push({ path, message: "choice.mode must be single or multiple" });
      }
      if (!block.options.length) issues.push({ path, message: "choice requires options" });
      return issues;
    }
    case "input":
      return block.id ? [] : [{ path, message: "input requires id" }];
    case "switch": {
      const issues: ValidationIssue[] = [];
      if (!block.id) issues.push({ path, message: "switch requires id" });
      if (block.default !== undefined && block.default !== "on" && block.default !== "off") {
        issues.push({ path, message: 'switch.default must be "on" or "off"' });
      }
      return issues;
    }
    case "actions":
      return block.items.length
        ? []
        : [{ path, message: "actions requires at least one item" }];
  }
}
