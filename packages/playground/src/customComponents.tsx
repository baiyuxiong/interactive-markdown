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

type Labels = { confirm: string; submit: string };

/** Demo: hint always rendered under the control (unlike default UI). */
export function createCustomComponents(labels: Labels): ImdComponents {
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
      if (block.mode === "single" && submitOnSelect && isFilled(block, next)) {
        onSubmit(next);
      }
    };

    return (
      <div className="imd-custom choice" data-imd="choice">
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
        {block.mode === "multiple" ? (
          <button
            type="button"
            disabled={disabled || !isFilled(block, selected)}
            onClick={() => onSubmit(selected)}
          >
            {labels.confirm}
          </button>
        ) : null}
        {block.hint ? <p className="imd-hint below">{block.hint}</p> : null}
      </div>
    );
  }

  function Input({
    block,
    disabled,
    values: controlled,
    onSubmit,
  }: BlockComponentProps<InputBlock>) {
    const id = useId();
    const [local, setLocal] = useState(
      controlled?.[0] ?? block.defaultValue ?? "",
    );
    const value = controlled?.[0] ?? local;

    return (
      <div className="imd-custom input" data-imd="input">
        {block.label ? (
          <label htmlFor={id}>
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
            if (controlled === undefined) setLocal(e.target.value);
          }}
        />
        <button
          type="button"
          disabled={disabled || !isFilled(block, [value])}
          onClick={() => onSubmit([value])}
        >
          {labels.submit}
        </button>
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
    const initial = controlled?.[0] ?? block.default ?? "off";
    const [local, setLocal] = useState(initial);
    const value = controlled?.[0] ?? local;
    const on = value === "on";

    return (
      <div className="imd-custom switch" data-imd="switch">
        <label className="imd-custom-switch-row">
          <span>{block.label ?? block.id}</span>
          <input
            type="checkbox"
            role="switch"
            checked={on}
            disabled={disabled}
            onChange={() => {
              const next = on ? "off" : "on";
              if (controlled === undefined) setLocal(next);
              const values = [next];
              if (!block.required || isFilled(block, values)) onSubmit(values);
            }}
          />
        </label>
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
