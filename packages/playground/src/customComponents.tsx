import { useId, useState } from "react";
import {
  isFilled,
  type ImdBlock,
} from "@interactive-markdown/core";
import type { BlockComponentProps, ImdComponents } from "@interactive-markdown/react";

type ChoiceBlock = Extract<ImdBlock, { type: "choice" }>;
type InputBlock = Extract<ImdBlock, { type: "input" }>;
type SwitchBlock = Extract<ImdBlock, { type: "switch" }>;
type ActionsBlock = Extract<ImdBlock, { type: "actions" }>;

type Labels = Record<string, never>;

/** Demo: custom chrome; same label → control → hint order as defaults. */
export function createCustomComponents(_labels?: Labels): ImdComponents {
  function Choice({
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
      if (block.mode === "multiple") {
        onSubmit(next);
        return;
      }
      if (!submitOnSelect || !isFilled(block, next)) return;
      onSubmit(next);
    };

    return (
      <div className="imd-custom choice" data-imd="choice">
        {block.label ? <div className="imd-label">{block.label}</div> : null}
        <div className="imd-custom-title">
          {block.mode === "multiple" ? "Multi" : "Single"}
        </div>
        <div role={block.mode === "single" ? "radiogroup" : "group"}>
          {block.options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label key={opt.value} className="imd-option">
                <input
                  type={block.mode === "single" ? "radio" : "checkbox"}
                  name={block.mode === "single" ? groupName : undefined}
                  value={opt.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    if (block.mode === "single") update([opt.value]);
                    else {
                      update(
                        checked
                          ? selected.filter((v) => v !== opt.value)
                          : [...selected, opt.value],
                      );
                    }
                  }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
        {block.hint ? <p className="imd-hint below">{block.hint}</p> : null}
      </div>
    );
  }

  function Input({
    block,
    disabled,
    values: controlled,
    onSubmit,
    incomplete,
  }: BlockComponentProps<InputBlock>) {
    const id = useId();
    const [local, setLocal] = useState(
      controlled?.[0] ?? block.defaultValue ?? "",
    );
    const value = controlled?.[0] ?? local;

    return (
      <div className="imd-custom input" data-imd="input">
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
          onChange={(e) => {
            const next = e.target.value;
            if (controlled === undefined) setLocal(next);
            if (disabled || incomplete) return;
            if (!isFilled(block, [next])) return;
            onSubmit([next]);
          }}
        />
        {block.hint ? <p className="imd-hint below">{block.hint}</p> : null}
      </div>
    );
  }

  function Switch({
    block,
    disabled,
    values: controlled,
    onSubmit,
  }: BlockComponentProps<SwitchBlock>) {
    const id = useId();
    const initial = controlled?.[0] ?? block.default ?? "off";
    const [local, setLocal] = useState(initial);
    const value = controlled?.[0] ?? local;
    const on = value === "on";

    return (
      <div className="imd-custom switch" data-imd="switch">
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
              if (!block.required || isFilled(block, values)) onSubmit(values);
            }}
          />
        </div>
        {block.hint ? <p className="imd-hint below">{block.hint}</p> : null}
      </div>
    );
  }

  function Actions({
    block,
    disabled,
    onSubmit,
  }: BlockComponentProps<ActionsBlock>) {
    return (
      <div className="imd-custom actions" data-imd="actions">
        {block.label ? <div className="imd-label">{block.label}</div> : null}
        <div className="imd-custom-actions-row">
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
        {block.hint ? <p className="imd-hint below">{block.hint}</p> : null}
      </div>
    );
  }

  return { Choice, Input, Switch, Actions };
}
