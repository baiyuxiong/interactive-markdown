# `:::action` JSON Payload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace multi-button `:::actions` with single-button `:::action{id,label}` plus optional JSON body on `block.data` / `block.dataError`.

**Architecture:** Core parses the directive body with `JSON.parse` (trim; empty → neither field; failure → `dataError`). React renders one `Action` button per block; click emits existing `ImdInteractionResult` with `block` carrying payload. Delete all `actions` / `ImdActionItem` code paths (greenfield, no alias).

**Tech Stack:** TypeScript, Vitest, Testing Library, React 18, `@interactive-markdown/core` / `react` / `playground`. Use `nvm use 22` then `npm` (see `AGENTS.md`).

**Spec:** `docs/superpowers/specs/2026-07-14-action-json-payload-design.md` — also update `docs/spec.md` / README / playground in the last task.

---

## File structure

| File | Responsibility |
|---|---|
| `packages/core/src/types.ts` | `action` block + pending; remove `ImdActionItem` / `actions` |
| `packages/core/src/parse.ts` | Parse `:::action` body → `data` / `dataError` |
| `packages/core/src/serialize.ts` | Serialize `:::action` (+ JSON body when `data` set) |
| `packages/core/src/validate.ts` | Require `id`; drop “items” rule |
| `packages/core/src/result.ts` | `isFilled` for `action`; keep `buildInteractionResult` |
| `packages/core/src/index.ts` | Drop `ImdActionItem` export |
| `packages/core/src/parse.test.ts` + new action-focused cases | TDD parse/serialize/validate |
| `packages/core/src/result.test.ts` | Update fixtures |
| `packages/react/src/types.ts` | `components.Action` |
| `packages/react/src/defaults.tsx` | `DefaultAction`; emit `action` |
| `packages/react/src/pending.tsx` | Pending → action block |
| `packages/react/src/InteractiveMarkdown.tsx` | Wire `Action`; progressive gate on `id` |
| `packages/react/src/index.ts` | Export `DefaultAction` |
| `packages/react/src/InteractiveMarkdown.test.tsx` | Click + UI + invalid JSON |
| `packages/playground/*` | Demo / custom components |
| `docs/spec.md`, `README.md`, package READMEs | Spec + docs sync |

---

### Task 1: Core types — `action` replaces `actions`

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Replace action-related types**

In `packages/core/src/types.ts`:

1. Delete `export type ImdActionItem = { actionId: string; label: string };`
2. Replace the `actions` variant of `ImdBlock` with:

```ts
  | {
      type: "action";
      id: string;
      label?: string;
      hint?: string;
      data?: unknown;
      dataError?: string;
    };
```

3. Update `ImdPendingBlock`:

```ts
export type ImdPendingBlock = {
  type: "choice" | "input" | "switch" | "action";
  id?: string;
  mode?: "single" | "multiple";
  options?: ImdOption[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  default?: "on" | "off";
  defaultValue?: string;
  /** Text from the opening fence line through EOF. */
  raw: string;
};
```

Remove `items?: ImdActionItem[]` from pending.

4. In `packages/core/src/index.ts`, remove `ImdActionItem` from the type export list.

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): replace actions block type with action + data

EOF
)"
```

---

### Task 2: Parse/serialize/validate — failing tests first

**Files:**
- Modify: `packages/core/src/parse.test.ts`
- Test: run via vitest in `packages/core`

- [ ] **Step 1: Rewrite sample + add action body cases in `parse.test.ts`**

Replace the sample’s actions section and expectations with action blocks. Replace the old actions expectation with two action blocks (or one in the sample — use one with JSON in the main sample):

```ts
const sample = [
  "你好，我们先确认几个偏好。",
  "",
  ':::choice{id=login label="你更倾向哪种登录方式？" mode=single required hint="后续可在设置中更换"}',
  "- phone | 手机号登录",
  "- oauth | 第三方账号登录",
  ":::",
  "",
  ':::input{id=name label="产品暂定叫什么名字？" placeholder=例如：智能审批助手 required hint="可稍后修改"}',
  ":::",
  "",
  ':::switch{id=notify label="是否开启消息通知？" default=off hint="可随时关闭"}',
  ":::",
  "",
  ':::action{id=submit label="确认并继续" hint="确认后将进入下一步"}',
  '{"next":"review"}',
  ":::",
].join("\n");
```

Update the test name to `"parses choice, input, switch, and action blocks"` and the last block expectation to:

```ts
      {
        type: "action",
        id: "submit",
        label: "确认并继续",
        hint: "确认后将进入下一步",
        data: { next: "review" },
      },
```

Append new tests in the same file:

```ts
  it("parses optional empty action body without data", () => {
    const doc = parse(':::action{id=skip label="暂时跳过"}\n:::');
    expect(doc.blocks).toEqual([
      { type: "action", id: "skip", label: "暂时跳过" },
    ]);
  });

  it("parses any JSON value into data", () => {
    expect(parse(':::action{id=a}\n[1,2]\n:::').blocks[0]).toMatchObject({
      type: "action",
      data: [1, 2],
    });
    expect(parse(':::action{id=a}\n"x"\n:::').blocks[0]).toMatchObject({
      data: "x",
    });
    expect(parse(":::action{id=a}\nnull\n:::").blocks[0]).toMatchObject({
      data: null,
    });
  });

  it("sets dataError for invalid JSON but keeps action block", () => {
    const doc = parse(":::action{id=broken}\n{not json\n:::");
    const block = doc.blocks[0];
    expect(block).toMatchObject({ type: "action", id: "broken" });
    expect(block).toHaveProperty("dataError");
    expect(block && "data" in block && block.data).toBeUndefined();
    expect(validate(doc).ok).toBe(true);
  });

  it("treats closed :::actions as markdown (removed)", () => {
    const src = ":::actions\n- a | A\n:::";
    expect(parse(src).blocks).toEqual([{ type: "markdown", text: src }]);
  });

  it("round-trips action with data via serialize", () => {
    const src = [
      ':::action{id=create-sub-session label="创建子会话"}',
      '{"sessionName":"审批细节"}',
      ":::",
    ].join("\n");
    const doc = parse(src);
    const again = parse(serialize(doc));
    expect(again.blocks).toEqual(doc.blocks);
  });

  it("serialize drops dataError (empty body)", () => {
    const doc = parse(":::action{id=x}\n{bad\n:::");
    const out = serialize(doc);
    expect(out).toBe(":::action{id=x}\n:::");
    expect(parse(out).blocks[0]).toEqual({ type: "action", id: "x" });
  });
```

Also update `validate` describe if it still assumes actions items — ensure “accepts a valid document” still passes with the new sample; add:

```ts
  it("requires action id", () => {
    const doc = parse(":::action{label=Go}\n:::");
    expect(validate(doc).ok).toBe(false);
  });
```

- [ ] **Step 2: Run tests — expect FAIL (types/parse still on `actions`)**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -w @interactive-markdown/core -- parse.test.ts
```

Expected: FAIL (compile or assertion errors around `actions` / missing `action`).

- [ ] **Step 3: Commit tests only (red)**

```bash
git add packages/core/src/parse.test.ts
git commit -m "$(cat <<'EOF'
test(core): specify :::action JSON body parsing

EOF
)"
```

---

### Task 3: Implement parse / serialize / validate / result

**Files:**
- Modify: `packages/core/src/parse.ts`
- Modify: `packages/core/src/serialize.ts`
- Modify: `packages/core/src/validate.ts`
- Modify: `packages/core/src/result.ts`
- Modify: `packages/core/src/result.test.ts`

- [ ] **Step 1: `parse.ts` — known name, `toBlock`, `toPending`, remove `parseActions`**

1. Drop `ImdActionItem` import.
2. Change `isKnownPendingName` / `toPending` name union: `"actions"` → `"action"`.
3. Add helper:

```ts
function parseActionBody(body: string): { data?: unknown; dataError?: string } {
  const trimmed = body.trim();
  if (!trimmed) return {};
  try {
    return { data: JSON.parse(trimmed) as unknown };
  } catch (err) {
    return {
      dataError: err instanceof Error ? err.message : String(err),
    };
  }
}
```

4. Replace `case "actions"` in `toBlock` with:

```ts
    case "action": {
      const parsed = parseActionBody(d.body);
      return {
        type: "action",
        id: str(d.attrs.id) ?? "",
        label: str(d.attrs.label),
        hint: str(d.attrs.hint),
        ...parsed,
      };
    }
```

5. Replace `case "actions"` in `toPending` with:

```ts
    case "action":
      return {
        type: "action",
        label: str(attrs.label),
        hint: str(attrs.hint),
        ...base,
      };
```

Do **not** parse JSON on pending (body applied only after close).

6. Delete `parseActions` entirely.

- [ ] **Step 2: `serialize.ts`**

Replace `case "actions"` with:

```ts
    case "action": {
      const attrs = attrsToString({
        id: block.id,
        label: block.label,
        hint: block.hint,
      });
      if (block.data !== undefined) {
        return `:::action${attrs}\n${JSON.stringify(block.data)}\n:::`;
      }
      return `:::action${attrs}\n:::`;
    }
```

(`dataError` → empty body; do not emit error text.)

- [ ] **Step 3: `validate.ts`**

Replace `case "actions"` with:

```ts
    case "action":
      return block.id ? [] : [{ path, message: "action requires id" }];
```

- [ ] **Step 4: `result.ts` + `result.test.ts`**

In `isFilled`, replace `case "actions"` with:

```ts
    case "action":
      return values.length === 1;
```

Update `result.test.ts` fixture:

```ts
const action: ImdBlock = {
  type: "action",
  id: "submit",
  label: "确认并继续",
  data: { next: "review" },
};
```

And expectation:

```ts
    expect(buildInteractionResult("action", action, ["submit"])).toEqual({
      kind: "action",
      blockId: "submit",
      values: ["submit"],
      block: action,
    });
```

Optional hardening in `buildInteractionResult` (keep values-based id for action kind — DefaultAction will pass `[block.id]`):

```ts
  const blockId =
    kind === "action"
      ? block.type === "action"
        ? block.id
        : (values[0] ?? "")
      : "id" in block
        ? block.id
        : "";
```

- [ ] **Step 5: Run core tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -w @interactive-markdown/core
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/parse.ts packages/core/src/serialize.ts packages/core/src/validate.ts packages/core/src/result.ts packages/core/src/result.test.ts
git commit -m "$(cat <<'EOF'
feat(core): parse :::action optional JSON body into data

EOF
)"
```

---

### Task 4: React — Action component + wiring (TDD)

**Files:**
- Modify: `packages/react/src/InteractiveMarkdown.test.tsx`
- Modify: `packages/react/src/types.ts`
- Modify: `packages/react/src/defaults.tsx`
- Modify: `packages/react/src/pending.tsx`
- Modify: `packages/react/src/InteractiveMarkdown.tsx`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1: Update react tests for `:::action`**

In `InteractiveMarkdown.test.tsx`:

1. Replace the top sample / any `:::actions` fixtures with `:::action`.
2. Update `"emits onSwitch and onAction"`:

```ts
    const src = [
      ":::switch{id=notify label=Notify default=off}",
      ":::",
      "",
      ':::action{id=skip label="Skip"}',
      '{"reason":"later"}',
      ":::",
    ].join("\n");
    // ...
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({
      kind: "action",
      blockId: "skip",
      values: ["skip"],
      block: {
        type: "action",
        id: "skip",
        label: "Skip",
        data: { reason: "later" },
      },
    });
```

3. Add:

```ts
  it("emits dataError on action click when JSON is invalid", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <InteractiveMarkdown
        source={":::action{id=broken label=Broken}\n{bad\n:::"}
        interactive={{ onAction }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Broken" }));
    const result = onAction.mock.calls[0]?.[0];
    expect(result.kind).toBe("action");
    expect(result.block.type).toBe("action");
    expect(result.block.dataError).toEqual(expect.any(String));
    expect(result.block.data).toBeUndefined();
  });
```

4. Update UI order test: use

```ts
      ':::action{id=go label="Go" hint="action hint"}',
      ":::",
```

Assert `[data-imd="action"]`: **button then hint** (no separate `.imd-label` — button text is the label).

5. Progressive: if any test used pending `actions` rows, change gate expectations to `action` + `id`. Add:

```ts
  it("progressive action shows once id is stable without waiting for JSON", () => {
    const { rerender } = render(
      <InteractiveMarkdown
        source={':::action{id=go label="Go"}\n'}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
    rerender(
      <InteractiveMarkdown
        source={':::action{id=go label="Go"}\n{"a":1}\n'}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
  });
```

- [ ] **Step 2: Run react tests — expect FAIL**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -w @interactive-markdown/react
```

Expected: FAIL (still `Actions` / `actions`).

- [ ] **Step 3: Implement React surface**

`types.ts` — replace `Actions` with:

```ts
  Action?: ComponentType<
    BlockComponentProps<Extract<ImdBlock, { type: "action" }>>
  >;
```

`defaults.tsx`:

- Rename type `ActionsBlock` → `ActionBlock = Extract<ImdBlock, { type: "action" }>`.
- Replace `DefaultActions` with:

```tsx
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
```

- In `emitForBlock`, `case "actions"` → `case "action"`.

`pending.tsx`:

- `case "actions"` → `case "action"` returning `{ type: "action", id: pending.id ?? "", ...label/hint }`.
- Placeholder bars: `pending.type === "choice" ? 2 : 1` (action is 1 bar).
- `renderProgressivePending` args: `Actions` → `Action`; render `<Action key="pending-action" ... />`.

`InteractiveMarkdown.tsx`:

- Import/export `DefaultAction` instead of `DefaultActions`.
- `const Action = components?.Action ?? DefaultAction`.
- Progressive gate:

```ts
      const canProgress =
        pending.type === "choice"
          ? (pending.options?.length ?? 0) > 0
          : pending.type === "action"
            ? Boolean(pending.id)
            : true;
      pendingNode = canProgress
        ? renderProgressivePending({
            pending,
            Choice,
            Input,
            Switch,
            Action,
            meta,
          })
        : null;
```

- Closed blocks: `answerKey` for action is `block.id` (same as other id blocks — remove the old `actions` special-case that skipped answers).
- Render:

```tsx
        if (block.type === "action") {
          return (
            <Action
              key={`action-${block.id}-${index}`}
              block={block}
              disabled={disabled}
              values={values}
              meta={meta}
              onSubmit={(v) => handle(block, v)}
            />
          );
        }
```

`index.ts`: export `DefaultAction` instead of `DefaultActions`.

- [ ] **Step 4: Run react + core tests**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -w @interactive-markdown/core
npm test -w @interactive-markdown/react
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src
git commit -m "$(cat <<'EOF'
feat(react): render :::action with block.data on click

EOF
)"
```

---

### Task 5: Playground + docs sync

**Files:**
- Modify: `packages/playground/src/demo.ts`
- Modify: `packages/playground/src/customComponents.tsx`
- Modify: `packages/playground/src/App.tsx` (only if it references actions list labels)
- Modify: `docs/spec.md`
- Modify: `README.md`
- Modify: `packages/core/README.md` (if present)
- Modify: `packages/react/README.md` (if present)
- Modify: `docs/superpowers/specs/2026-07-14-streaming-incomplete-modes-design.md` — only the pending `type` union / actions row mentions that would contradict (minimal surgical edits)

- [ ] **Step 1: Playground**

In `demo.ts`, replace every `:::actions` / `- id | label` action example with one or more:

```markdown
:::action{id=submit label="确认并继续" hint="确认后将进入下一步"}
{"step":"next"}
:::

:::action{id=skip label="暂时跳过"}
:::
```

Update EN/ZH titles from `"actions"` → `"action"` and lede copy.

In `customComponents.tsx`: rename `Actions` → `Action`, single button, `data-imd="action"`, `onSubmit([block.id])`, return `{ Choice, Input, Switch, Action }`.

- [ ] **Step 2: `docs/spec.md`**

Update §3 examples, §3.3 table (`action` row: attrs `id`, `label?`, `hint?`; content = optional JSON), bullet points about `actions` → `action` + `data`/`dataError`, §4 `ImdBlock`, §5 action result example (`block.type: "action"`, show `data`), §5.3 `labelsOf` for `action` (use `block.label`), §6.1 progressive note (action needs stable `id`, not option rows), §7 `components.Action`, §12 support table.

- [ ] **Step 3: Root + package READMEs**

Replace `:::actions` examples with `:::action` + JSON; document that click payload is `result.block.data`.

- [ ] **Step 4: Full verify**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test
npm run build
```

Expected: all PASS / build OK.

- [ ] **Step 5: Commit**

```bash
git add packages/playground docs/spec.md README.md packages/core/README.md packages/react/README.md docs/superpowers/specs/2026-07-14-streaming-incomplete-modes-design.md
git commit -m "$(cat <<'EOF'
docs: adopt :::action JSON payload in spec and demos

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Replace `:::actions` with `:::action{id,label}` | 1–3, 5 |
| Optional JSON body → `block.data` | 2–3 |
| Any JSON value | 2–3 |
| Invalid JSON → `dataError`, still clickable | 2–4 |
| No top-level result `data` field | 3–4 (unchanged result shape) |
| Serialize: `data` stringify; `dataError` → empty body | 2–3 |
| Progressive: show on stable `id`, no wait for JSON | 4 |
| React `components.Action`, class/data-imd rename | 4 |
| Docs / playground cleanup | 5 |
| Direct delete of `ImdActionItem` / list rows | 1, 3 |

## Self-review notes

- No TBD placeholders in steps.
- `buildInteractionResult` still uses `kind: "action"` (interaction kind unchanged); block type is `"action"`.
- Pending never sets `data`/`dataError` — only closed parse does.
- Old `:::actions` becomes unknown directive → markdown (Task 2 test).
