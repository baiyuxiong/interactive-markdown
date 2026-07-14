# Streaming Incomplete Modes Design

Date: 2026-07-14  
Status: Implemented

## Problem

When `streaming=true`, `stripIncomplete` drops everything from an unclosed `:::` fence to EOF. Widget bodies (options, default values, etc.) stay invisible until the closing fence arrives, so the UI appears to pause mid-stream.

## Goal

Let callers choose how incomplete trailing directives behave during streaming, without changing IMD grammar or interaction result types.

## Public API

### React

```ts
type IncompleteMode = "hide" | "placeholder" | "progressive";

type InteractiveMarkdownProps = {
  // ...existing
  streaming?: boolean;
  /** Only applies when streaming=true. Default: "hide" (current behavior). */
  incomplete?: IncompleteMode;
  /** Optional override for the pending region. */
  renderPending?: (pending: ImdPendingBlock) => ReactNode;
};
```

### Core

```ts
parseSafe(source: string): {
  document: ImdDocument; // closed blocks only (+ leading markdown)
  pending: ImdPendingBlock | null;
};

type ImdPendingBlock = {
  type: "choice" | "input" | "switch" | "actions";
  id?: string;
  mode?: "single" | "multiple";
  options?: ImdOption[];       // fully parsed option rows only
  items?: ImdActionItem[];     // fully parsed action rows only
  label?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  default?: "on" | "off";
  defaultValue?: string;
  raw: string;                 // text from opening fence to EOF
};
```

`stripIncomplete` remains exported for non-React callers and as the `hide` primitive.

`IncompleteMode` lives on the React package props; pending types live in core.

## Mode semantics

Shared rules:

1. Modes only apply when `streaming === true`. When streaming ends, render via full `parse` as today.
2. Pending / incomplete widgets are never interactive (`disabled` forced; handlers ignored).
3. Already-closed blocks behave exactly as today.
4. Unknown / unparseable opening type: do not invent a widget; at most a minimal caret/empty pending (implementation may omit UI until type is known).

| Mode | Pending UI | Interactive when |
|---|---|---|
| `hide` (default) | Not rendered | After close |
| `placeholder` | Type-based skeleton only; no half-parsed real labels/options | After close |
| `progressive` | Real partial widget from stably parsed fields; complete option/action rows appear as they land | After close |

### Progressive parsing details

- Append a `choice` / `actions` row only when the full `- value | label` line is parseable; hide partial lines.
- Fill attributes only after the opening fence line is fully available and attrs are stably parsed.
- Default components receive `incomplete: true` and a `data-imd-pending` (or equivalent) marker for styling.

### Placeholder details

- Skeleton keyed by `pending.type` (title bar, option bars, button outline).
- Custom `components.*` may still be used with `incomplete: true`; library default skeleton applies when not overridden.
- Prefer not flashing changing real text in this mode (avoids mid-stream jumps).

### `renderPending`

If provided, it replaces the default pending UI for all three modes (caller can still branch on mode if desired by closing over props). First ship should include the prop.

## Data flow

```text
source
  │
  ├─ streaming=false → parse(source) → closed blocks only
  │
  └─ streaming=true → parseSafe(source)
        ├─ document.blocks
        └─ pending?
              hide         → drop
              placeholder  → skeleton / components(incomplete)
              progressive  → partial block → components(incomplete)
              renderPending?(pending) overrides default pending UI
```

## Implementation notes

### Core

- Prefer implementing `parse` on top of `parseSafe` (pending folded back to markdown for today’s `parse` semantics) to avoid lexer drift.
- Today `parse` treats an unclosed fence as a trailing markdown block; that public behavior stays for `parse`.
- `parseSafe` must extract `pending` instead of dumping the open fence into markdown for streaming consumers.
- Keep `stripIncomplete` tests and behavior unchanged.

### React

- Switch the streaming path from `stripIncomplete` → `parse` to `parseSafe`.
- Extend `BlockComponentProps` with `incomplete?: boolean`.
- Force `disabled` when rendering pending.
- Playground: add a control to switch among `hide` / `placeholder` / `progressive`.

### Out of scope

- Grammar changes
- Changes to `ImdInteractionResult`
- Firing interaction handlers while pending
- Breaking changes to `parse` / `serialize` / `validate` for complete documents

## Docs / packaging

- Update `docs/spec.md` §4.1, §6, §7 to document `parseSafe` and `incomplete`.
- Update README streaming section briefly.
- Spec documents remain the source of truth for shipped behavior (`AGENTS.md`).

## Testing checklist

- Closed document: `parse` / `parseSafe.pending === null` identical to today.
- Unclosed `choice` with 0 / 1 / N complete option rows + one partial row.
- Prior closed block + trailing pending.
- Opening fence without known type / without attrs.
- React: `incomplete="hide"` matches current snapshot behavior.
- React: placeholder and progressive render pending; clicks do not fire handlers.
- After streaming ends (`streaming=false`), full interactivity resumes.
```
