import { useEffect, useId, useState } from "react";
import {
  buildInteractionResult,
  isFilled,
  type ImdBlock,
} from "@interactive-markdown/core";
import type { BlockComponentProps } from "./types.js";

type ChoiceBlock = Extract<ImdBlock, { type: "choice" }>;
type InputBlock = Extract<ImdBlock, { type: "input" }>;
type SwitchBlock = Extract<ImdBlock, { type: "switch" }>;
type ActionBlock = Extract<ImdBlock, { type: "action" }>;

export function DefaultChoice({
  block,
  disabled,
  values: controlled,
  onSubmit,
  submitOnSelect = true,
  incomplete,
}: BlockComponentProps<ChoiceBlock>) {
  const [local, setLocal] = useState<string[]>(controlled ?? []);
  const selected = controlled ?? local;
  const groupName = useId();
  const labelId = useId();

  const update = (next: string[]) => {
    if (controlled === undefined) setLocal(next);
    if (block.mode === "multiple") {
      onSubmit(next);
      return;
    }
    if (!submitOnSelect || !isFilled(block, next)) return;
    onSubmit(next);
  };

  return (
    <fieldset
      className="imd-choice"
      disabled={disabled}
      data-imd="choice"
      data-imd-pending={incomplete ? "" : undefined}
    >
      {block.label ? (
        <div className="imd-label" id={labelId}>
          {block.label}
        </div>
      ) : null}
      <div
        role={block.mode === "single" ? "radiogroup" : "group"}
        aria-labelledby={block.label ? labelId : undefined}
      >
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
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
    </fieldset>
  );
}

export function DefaultInput({
  block,
  disabled,
  values: controlled,
  onSubmit,
  incomplete,
}: BlockComponentProps<InputBlock>) {
  const id = useId();
  const initial = controlled?.[0] ?? block.defaultValue ?? "";
  const [local, setLocal] = useState(initial);
  const value = controlled?.[0] ?? local;

  useEffect(() => {
    if (incomplete && controlled === undefined) {
      setLocal(block.defaultValue ?? "");
    }
  }, [incomplete, controlled, block.defaultValue]);

  return (
    <div
      className="imd-input"
      data-imd="input"
      data-imd-pending={incomplete ? "" : undefined}
    >
      {block.label ? (
        <label className="imd-label" htmlFor={id}>
          {block.label}
          {block.required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      <input
        id={id}
        type="text"
        value={value}
        placeholder={block.placeholder}
        disabled={disabled}
        aria-required={block.required || undefined}
        aria-label={block.label ? undefined : block.id}
        onChange={(e) => {
          const next = e.target.value;
          if (controlled === undefined) setLocal(next);
          if (disabled || incomplete) return;
          if (!isFilled(block, [next])) return;
          onSubmit([next]);
        }}
      />
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
    </div>
  );
}

export function DefaultSwitch({
  block,
  disabled,
  values: controlled,
  onSubmit,
  incomplete,
}: BlockComponentProps<SwitchBlock>) {
  const id = useId();
  const initial = controlled?.[0] ?? block.default ?? "off";
  const [local, setLocal] = useState(initial);
  const value = controlled?.[0] ?? local;
  const on = value === "on";

  return (
    <div
      className="imd-switch"
      data-imd="switch"
      data-imd-pending={incomplete ? "" : undefined}
    >
      <div className="imd-switch-row">
        {block.label ? (
          <label className="imd-label" htmlFor={id}>
            {block.label}
          </label>
        ) : null}
        <input
          id={id}
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
      </div>
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
    </div>
  );
}

export function DefaultAction({
  block,
  disabled,
  onSubmit,
  incomplete,
}: BlockComponentProps<ActionBlock>) {
  return (
    <div
      className="imd-action"
      data-imd="action"
      data-imd-pending={incomplete ? "" : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSubmit([block.id])}
      >
        {block.label ?? block.id}
      </button>
      {block.hint ? <p className="imd-hint">{block.hint}</p> : null}
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
    case "action":
      return buildInteractionResult("action", block, values, meta);
    default:
      return null;
  }
}
