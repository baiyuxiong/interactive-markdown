import { useId, useState } from "react";
import {
  buildInteractionResult,
  isFilled,
  type ImdBlock,
} from "@interactive-markdown/core";
import type { BlockComponentProps } from "./types.js";

type ChoiceBlock = Extract<ImdBlock, { type: "choice" }>;
type InputBlock = Extract<ImdBlock, { type: "input" }>;
type SwitchBlock = Extract<ImdBlock, { type: "switch" }>;
type ActionsBlock = Extract<ImdBlock, { type: "actions" }>;

export function DefaultChoice({
  block,
  disabled,
  values: controlled,
  onSubmit,
  submitOnSelect = true,
}: BlockComponentProps<ChoiceBlock>) {
  const [local, setLocal] = useState<string[]>(controlled ?? []);
  const selected = controlled ?? local;
  const groupName = useId();

  const update = (next: string[]) => {
    if (controlled === undefined) setLocal(next);
    if (block.mode === "single" && submitOnSelect && isFilled(block, next)) {
      onSubmit(next);
    }
  };

  return (
    <fieldset className="imd-choice" disabled={disabled} data-imd="choice">
      {block.hint ? <legend className="imd-hint">{block.hint}</legend> : null}
      <div role={block.mode === "single" ? "radiogroup" : "group"}>
        {block.options.map((opt) => {
          const checked = selected.includes(opt.value);
          if (block.mode === "single") {
            return (
              <label key={opt.value} className="imd-option">
                <input
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => update([opt.value])}
                />
                {opt.label}
              </label>
            );
          }
          return (
            <label key={opt.value} className="imd-option">
              <input
                type="checkbox"
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const next = checked
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value];
                  update(next);
                }}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {block.mode === "multiple" ? (
        <button
          type="button"
          disabled={disabled || !isFilled(block, selected)}
          onClick={() => onSubmit(selected)}
        >
          Confirm
        </button>
      ) : null}
    </fieldset>
  );
}

export function DefaultInput({
  block,
  disabled,
  values: controlled,
  onSubmit,
}: BlockComponentProps<InputBlock>) {
  const id = useId();
  const initial = controlled?.[0] ?? block.defaultValue ?? "";
  const [local, setLocal] = useState(initial);
  const value = controlled?.[0] ?? local;

  return (
    <div className="imd-input" data-imd="input">
      {block.label ? (
        <label htmlFor={id}>
          {block.label}
          {block.required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
      <input
        id={id}
        type="text"
        value={value}
        placeholder={block.placeholder}
        disabled={disabled}
        aria-required={block.required || undefined}
        aria-label={block.label ? undefined : block.id}
        onChange={(e) => {
          if (controlled === undefined) setLocal(e.target.value);
        }}
      />
      <button
        type="button"
        disabled={disabled || !isFilled(block, [value])}
        onClick={() => onSubmit([value])}
      >
        Submit
      </button>
    </div>
  );
}

export function DefaultSwitch({
  block,
  disabled,
  values: controlled,
  onSubmit,
}: BlockComponentProps<SwitchBlock>) {
  const initial = controlled?.[0] ?? block.default ?? "off";
  const [local, setLocal] = useState(initial);
  const value = controlled?.[0] ?? local;
  const on = value === "on";

  return (
    <div className="imd-switch" data-imd="switch">
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
      <label>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={disabled}
          aria-label={block.label ? undefined : block.id}
          onChange={() => {
            const next = on ? "off" : "on";
            if (controlled === undefined) setLocal(next);
            const values = [next];
            if (!block.required || isFilled(block, values)) {
              onSubmit(values);
            }
          }}
        />
        {block.label ?? block.id}
      </label>
    </div>
  );
}

export function DefaultActions({
  block,
  disabled,
  onSubmit,
}: BlockComponentProps<ActionsBlock>) {
  return (
    <div className="imd-actions" data-imd="actions">
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
      {block.items.map((item) => (
        <button
          key={item.actionId}
          type="button"
          disabled={disabled}
          onClick={() => onSubmit([item.actionId])}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function emitForBlock(
  block: ImdBlock,
  values: string[],
  meta?: Record<string, unknown>,
) {
  switch (block.type) {
    case "choice":
      return buildInteractionResult("choice", block, values, meta);
    case "input":
      return buildInteractionResult("input", block, values, meta);
    case "switch":
      return buildInteractionResult("switch", block, values, meta);
    case "actions":
      return buildInteractionResult("action", block, values, meta);
    default:
      return null;
  }
}
