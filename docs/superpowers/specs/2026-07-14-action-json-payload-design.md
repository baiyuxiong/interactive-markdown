# Design: `:::action` with JSON payload

## Goal

Replace multi-button `:::actions` with a single-button `:::action` block whose optional body is JSON context. On click, the business reads context from `result.block.data` (and parse errors from `result.block.dataError`).

This is a breaking change. Old `:::actions` syntax and APIs are removed (greenfield; no compatibility alias).

## Decisions (locked)

| Topic | Decision |
|---|---|
| Relation to `:::actions` | **Replace** — remove entirely |
| Where context lives | **Only** `block.data` / `block.dataError` — no top-level field on `ImdInteractionResult` |
| Body required? | **Optional** — empty / whitespace-only → neither `data` nor `dataError` |
| JSON value type | **Any** JSON (`object` / `array` / primitive / `null`) |
| Invalid JSON | Still an `action` block; no `data`; set `dataError`; button remains clickable |
| Streaming incomplete | Same as other blocks; `progressive` may show the button once the open fence (with stable `id`) is committed; pending is `disabled`; body parsed only after close |
| Serialize + `dataError` | Emit empty body; do **not** write `dataError` back into MD. Full replay uses `document.source` |

## Syntax

```markdown
:::action{id=create-sub-session label="创建子会话「审批细节」"}
{"sessionName":"审批细节","context":"澄清审批节点与角色","memberIds":["uuid-1","uuid-2"]}
:::

:::action{id=propose-session-conclusion label="确认并记录结论"}
{"proposedConclusion":"本期只做手机号登录，第三方登录以后再说。"}
:::

:::action{id=skip label="暂时跳过"}
:::
```

| Item | Rule |
|---|---|
| Directive name | `action` |
| Attributes | `id` **required**; `label?`; `hint?` (same quoting rules as other blocks) |
| Body | Optional. Trim, then if non-empty `JSON.parse` |
| Unknown `:::actions` | Not recognized as an interactive block (plain Markdown / source text) |

## Data model

```ts
type ImdBlock =
  | { type: "markdown"; text: string }
  | { /* choice — unchanged */ }
  | { /* input — unchanged */ }
  | { /* switch — unchanged */ }
  | {
      type: "action";
      id: string;
      label?: string;
      hint?: string;
      /** Present when body parsed as JSON successfully. */
      data?: unknown;
      /** Present when body was non-empty but JSON.parse failed. */
      dataError?: string;
    };
```

Removed:

- `ImdActionItem`
- `type: "actions"` and `items: ImdActionItem[]`
- List-row grammar `- actionId | label` for actions

`ImdPendingBlock.type` includes `"action"` instead of `"actions"`. Pending does not carry `data` / `dataError` (body applied only after the fence closes).

## Interaction result

`ImdInteractionResult` shape unchanged:

```ts
{
  kind: "action",
  blockId: string,          // = block.id
  values: string[],         // [block.id]
  block: Extract<ImdBlock, { type: "action" }>,
  meta?: Record<string, unknown>,
}
```

Business usage:

- Context: `result.block.data`
- Parse error: `result.block.dataError`

`toReplyPayload` remains `{ messageId?, blockId, kind, values }` — does **not** include `data`. Callers that need context take it from `block` themselves.

`buildInteractionResult("action", block, [block.id], meta)` — same as today’s id-in-values convention.

## React

| Before | After |
|---|---|
| `components.Actions` | `components.Action` |
| One block → N buttons | One block → **one** button (`label ?? id`) |
| `data-imd="actions"` / `.imd-actions` | `data-imd="action"` / `.imd-action` |

- Click always fires `onAction` when not disabled, including when `dataError` is set.
- Library does not surface `dataError` in default UI (no toast); business decides.
- `answers` keyed by `action.id` when marking historically clicked actions.

## Streaming / `incomplete`

| Mode | Behavior for pending `action` |
|---|---|
| `hide` | Do not render |
| `placeholder` | Single-button skeleton |
| `progressive` | After open fence line is committed and `id` is stable, render real button (optional `label`); **do not wait for JSON**; always `disabled` while pending |
| After close | Parse body → `data` or `dataError` |

Remove the old rule that `progressive` for actions required at least one complete option/action row.

## Validate

- Missing `id`: align with `choice` (invalid / degrade per existing attribute rules).
- Invalid JSON: **not** a `validate` failure — expressed via `dataError`; block remains valid.
- No “at least one item” rule.

## Serialize

- With `data`: body is `JSON.stringify(data)` (compact is fine).
- Empty / whitespace-only source body: empty body.
- `dataError` only: serialize as empty-bodied `:::action{...}` (error is not part of authoring source). Round-trip of broken JSON requires keeping `document.source`.

## Cleanup scope

Direct deletion (no deprecation path):

- core: `actions` parse/serialize/validate/pending branches, list-row action parsing, `ImdActionItem`, tests/fixtures
- react: `Actions` default + component slot, class names, tests
- docs / README / playground: all examples use `:::action`

## Out of scope

- Business action registries
- Putting `data` into `toReplyPayload`
- Default UI for displaying `dataError`
- Other new control types

## Test plan (acceptance)

1. Empty body / object / array / primitive / `null` → correct `data`
2. Invalid JSON → `type: "action"`, `dataError` set, clickable, `onAction` includes `block.dataError`
3. `blockId` and `values[0]` equal `id`
4. serialize ↔ parse round-trip for successful `data`
5. React: `components.Action`, new `data-imd` / class names
6. `parseSafe` + `progressive`: pending after stable open fence; `data` only after close
7. No remaining `:::actions` in docs/playground
