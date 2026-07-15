import type { ImdBlock, ImdPendingBlock } from "@interactive-markdown/core";
import type { ReactNode } from "react";
import type { ImdComponents } from "./types.js";

export function pendingToBlock(pending: ImdPendingBlock): ImdBlock {
  switch (pending.type) {
    case "choice":
      return {
        type: "choice",
        id: pending.id ?? "",
        mode: pending.mode ?? "single",
        options: pending.options ?? [],
        ...(pending.label ? { label: pending.label } : {}),
        ...(pending.required ? { required: true } : {}),
        ...(pending.hint ? { hint: pending.hint } : {}),
      };
    case "input":
      return {
        type: "input",
        id: pending.id ?? "",
        ...(pending.label ? { label: pending.label } : {}),
        ...(pending.placeholder ? { placeholder: pending.placeholder } : {}),
        ...(pending.required ? { required: true } : {}),
        ...(pending.hint ? { hint: pending.hint } : {}),
        ...(pending.defaultValue ? { defaultValue: pending.defaultValue } : {}),
      };
    case "switch":
      return {
        type: "switch",
        id: pending.id ?? "",
        ...(pending.label ? { label: pending.label } : {}),
        ...(pending.required ? { required: true } : {}),
        ...(pending.hint ? { hint: pending.hint } : {}),
        ...(pending.default ? { default: pending.default } : {}),
      };
    case "action":
      return {
        type: "action",
        id: pending.id ?? "",
        ...(pending.label ? { label: pending.label } : {}),
      };
  }
}

export function DefaultPendingPlaceholder({
  pending,
}: {
  pending: ImdPendingBlock;
}) {
  const bars = pending.type === "choice" ? 2 : 1;
  return (
    <div
      className="imd-pending imd-pending-placeholder"
      data-imd-pending={pending.type}
      aria-busy="true"
    >
      <div className="imd-pending-bar imd-pending-title" />
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className="imd-pending-bar" />
      ))}
    </div>
  );
}

export function renderProgressivePending(args: {
  pending: ImdPendingBlock;
  Choice: NonNullable<ImdComponents["Choice"]>;
  Input: NonNullable<ImdComponents["Input"]>;
  Switch: NonNullable<ImdComponents["Switch"]>;
  Action: NonNullable<ImdComponents["Action"]>;
  meta?: Record<string, unknown>;
}): ReactNode {
  const block = pendingToBlock(args.pending);
  const { Choice, Input, Switch, Action } = args;
  const common = {
    incomplete: true as const,
    disabled: true,
    meta: args.meta,
    onSubmit: () => {},
  };
  if (block.type === "choice") {
    return (
      <Choice
        key="pending-choice"
        block={block}
        submitOnSelect={false}
        {...common}
      />
    );
  }
  if (block.type === "input") {
    return <Input key="pending-input" block={block} {...common} />;
  }
  if (block.type === "switch") {
    return <Switch key="pending-switch" block={block} {...common} />;
  }
  if (block.type === "action") {
    return <Action key="pending-action" block={block} {...common} />;
  }
  return null;
}
