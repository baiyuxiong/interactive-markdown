# Streaming Incomplete Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `parseSafe` plus React `incomplete` modes (`hide` | `placeholder` | `progressive`) so streaming UIs can keep showing progress instead of blanking unclosed `:::` blocks.

**Architecture:** Core gains `parseSafe` that returns closed `document` + optional `ImdPendingBlock`. Prefer refactoring `parse` to call `parseSafe` and fold pending back into a trailing markdown block (preserve today's `parse` semantics). React streaming path switches to `parseSafe` and branches on `incomplete` / `renderPending`.

**Tech Stack:** TypeScript, Vitest, Testing Library, React 18, existing `@interactive-markdown/core` / `react` / `playground` packages. Use `nvm use 22` then `npm` (see `AGENTS.md`).

**Spec:** `docs/superpowers/specs/2026-07-14-streaming-incomplete-modes-design.md` (also mirrored in `docs/spec.md` §4.1 / §6 / §7).

---

## File structure

| File | Responsibility |
|---|---|
| `packages/core/src/types.ts` | Add `ImdPendingBlock`, `ParseSafeResult` |
| `packages/core/src/parse.ts` | Implement `parseSafe`; make `parse` wrap it |
| `packages/core/src/parseSafe.test.ts` | TDD for `parseSafe` |
| `packages/core/src/index.ts` | Export new types + `parseSafe` |
| `packages/react/src/types.ts` | `IncompleteMode`, props, `incomplete` on `BlockComponentProps` |
| `packages/react/src/pending.tsx` | Default placeholder skeleton + progressive adapters |
| `packages/react/src/InteractiveMarkdown.tsx` | Streaming → `parseSafe` + mode branch |
| `packages/react/src/defaults.tsx` | Honor `incomplete` / `data-imd-pending` |
| `packages/react/src/InteractiveMarkdown.test.tsx` | Mode + no-handler tests |
| `packages/playground/src/App.tsx` + `demo.ts` + `styles.css` | Mode switcher UI |
| `README.md` | Document `incomplete` |
| `docs/spec.md` | Already updated; only tweak if implementation drifts |

---

### Task 1: Core types for pending

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add pending types**

Append to `packages/core/src/types.ts`:

```ts
export type ImdPendingBlock = {
  type: "choice" | "input" | "switch" | "actions";
  id?: string;
  mode?: "single" | "multiple";
  options?: ImdOption[];
  items?: ImdActionItem[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  default?: "on" | "off";
  defaultValue?: string;
  /** Text from the opening fence line through EOF. */
  raw: string;
};

export type ParseSafeResult = {
  document: ImdDocument;
  pending: ImdPendingBlock | null;
};
```

Update `packages/core/src/index.ts` type exports to include `ImdPendingBlock` and `ParseSafeResult`.

- [ ] **Step 2: Commit (skip if no git repo)**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): add ImdPendingBlock and ParseSafeResult types"
```

---

### Task 2: `parseSafe` (TDD) + refactor `parse`

**Files:**
- Create: `packages/core/src/parseSafe.test.ts`
- Modify: `packages/core/src/parse.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/parse.test.ts` (ensure existing cases still pass; add regression if needed)

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/parseSafe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parse, parseSafe } from "./parse.js";

describe("parseSafe", () => {
  it("returns pending=null for a complete document", () => {
    const source = [
      "Intro",
      "",
      ":::choice{id=login mode=single}",
      "- phone | Phone",
      ":::",
    ].join("\n");
    const result = parseSafe(source);
    expect(result.pending).toBeNull();
    expect(result.document).toEqual(parse(source));
  });

  it("extracts trailing unclosed choice with complete option rows only", () => {
    const source = [
      "Intro",
      "",
      ":::choice{id=login mode=single}",
      "- phone | Phone",
      "- oa",
    ].join("\n");
    const result = parseSafe(source);
    expect(result.document.blocks).toEqual([
      { type: "markdown", text: "Intro\n\n" },
    ]);
    expect(result.pending).toEqual({
      type: "choice",
      id: "login",
      mode: "single",
      options: [{ value: "phone", label: "Phone" }],
      raw: ":::choice{id=login mode=single}\n- phone | Phone\n- oa",
    });
  });

  it("keeps prior closed blocks when a later block is incomplete", () => {
    const source = [
      ":::input{id=name}",
      "default",
      ":::",
      "",
      ":::switch{id=notify label=Notify}",
    ].join("\n");
    const result = parseSafe(source);
    expect(result.document.blocks).toEqual([
      {
        type: "input",
        id: "name",
        defaultValue: "default",
      },
      { type: "markdown", text: "\n\n" },
    ]);
    expect(result.pending).toMatchObject({
      type: "switch",
      id: "notify",
      label: "Notify",
    });
  });

  it("returns pending=null for unknown directive names (content excluded from document)", () => {
    const source = "Hi\n\n:::foobar{id=x}\nbody";
    const result = parseSafe(source);
    expect(result.pending).toBeNull();
    expect(result.document.blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
    ]);
  });

  it("parse folds pending back to trailing markdown (legacy behavior)", () => {
    const source = "Hi\n\n:::choice{id=login mode=single}\n- phone | Phone";
    const doc = parse(source);
    expect(doc.blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
      {
        type: "markdown",
        text: ":::choice{id=login mode=single}\n- phone | Phone",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test -w @interactive-markdown/core -- parseSafe
```

Expected: FAIL (`parseSafe` not exported / not defined).

- [ ] **Step 3: Implement `parseSafe` and refactor `parse`**

In `packages/core/src/parse.ts`:

1. Export `parseSafe(source): ParseSafeResult`.
2. Scan lines like today's `parse`. When an open fence has **no** close fence:
   - Push markdown before the open.
   - Do **not** push the open tail as markdown into `document`.
   - If `open.name` is `choice|input|switch|actions`, build `ImdPendingBlock` via a new `toPending(name, attrText, bodyLines, raw)`.
   - Else `pending = null` (unknown name — content excluded, matching strip-like hide).
3. Open-line detection for starting a pending region: reuse `matchOpenFence`. If a line looks like an open start (`/^:::[a-zA-Z][\w-]*/`) but attrs brace is unclosed so `matchOpenFence` fails, still treat from that line as pending territory: set `pending=null` until the opening line fully matches (no UI for half fences), and exclude from document (same blank as hide for that span). Prefer sharing a helper with `strip.ts` open detection where practical.
4. `toPending` rules:
   - Parse attrs only when the opening line fully matched `matchOpenFence`.
   - `options` / `items`: reuse `parseOptions` / `parseActions` (already skip incomplete rows).
   - `id` / `mode` / etc.: same as `toBlock` but omit empty `id` (use `id?:` — only set when attr present).
   - `input` `defaultValue`: body trim if non-empty.
5. Refactor `parse`:

```ts
export function parse(source: string): ImdDocument {
  const { document, pending } = parseSafe(source);
  if (!pending) return document;
  return {
    source,
    blocks: [
      ...document.blocks,
      { type: "markdown", text: pending.raw },
    ],
  };
}
```

Ensure `document.source` is always the original `source` string (same as today).

6. Export `parseSafe` from `packages/core/src/index.ts`.

- [ ] **Step 4: Run all core tests — expect PASS**

```bash
npm test -w @interactive-markdown/core
npm run build -w @interactive-markdown/core
```

Expected: all green; `dist` updated.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parse.ts packages/core/src/parseSafe.test.ts packages/core/src/index.ts packages/core/src/parse.test.ts
git commit -m "feat(core): add parseSafe for streaming pending blocks"
```

---

### Task 3: React types + pending UI helpers

**Files:**
- Modify: `packages/react/src/types.ts`
- Create: `packages/react/src/pending.tsx`
- Modify: `packages/react/src/defaults.tsx`
- Modify: `packages/react/src/index.ts` (re-export `IncompleteMode` if public)

- [ ] **Step 1: Extend prop types**

In `packages/react/src/types.ts`:

```ts
import type {
  ImdBlock,
  ImdInteractionResult,
  ImdPendingBlock,
} from "@interactive-markdown/core";

export type IncompleteMode = "hide" | "placeholder" | "progressive";

export type BlockComponentProps<T extends ImdBlock = ImdBlock> = {
  block: T;
  disabled?: boolean;
  values?: string[];
  meta?: Record<string, unknown>;
  onSubmit: (values: string[]) => void;
  submitOnSelect?: boolean;
  /** True while rendering a streaming pending widget. */
  incomplete?: boolean;
};

export type InteractiveMarkdownProps = {
  source: string;
  streaming?: boolean;
  /** Streaming-only. Default "hide". */
  incomplete?: IncompleteMode;
  renderPending?: (pending: ImdPendingBlock) => ReactNode;
  answers?: ImdAnswers;
  interactive?: InteractiveHandlers;
  components?: ImdComponents;
  meta?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
};
```

Keep existing exports; import `ReactNode` from `react`.

- [ ] **Step 2: Add `pending.tsx`**

Create `packages/react/src/pending.tsx`:

```tsx
import type { ImdBlock, ImdPendingBlock } from "@interactive-markdown/core";
import type { ImdComponents } from "./types.js";

/** Map pending → a structurally valid ImdBlock for progressive rendering. */
export function pendingToBlock(pending: ImdPendingBlock): ImdBlock {
  switch (pending.type) {
    case "choice":
      return {
        type: "choice",
        id: pending.id ?? "",
        mode: pending.mode ?? "single",
        options: pending.options ?? [],
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
        ...(pending.default ? { default: pending.default } : {}),
        ...(pending.required ? { required: true } : {}),
        ...(pending.hint ? { hint: pending.hint } : {}),
      };
    case "actions":
      return {
        type: "actions",
        items: pending.items ?? [],
        ...(pending.hint ? { hint: pending.hint } : {}),
      };
  }
}

export function DefaultPendingPlaceholder({
  pending,
}: {
  pending: ImdPendingBlock;
}) {
  const bars =
    pending.type === "choice" || pending.type === "actions" ? 2 : 1;
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

/** Minimal CSS string optional — playground can style; defaults use class names only. */
export type PendingRenderArgs = {
  pending: ImdPendingBlock;
  components: ImdComponents;
  Choice: ImdComponents["Choice"];
  Input: ImdComponents["Input"];
  Switch: ImdComponents["Switch"];
  Actions: ImdComponents["Actions"];
};
```

Also export a `renderProgressivePending(args)` that picks the matching default/override component, passes `block=pendingToBlock(pending)`, `incomplete`, `disabled`, `onSubmit={() => {}}`.

- [ ] **Step 3: Mark default widgets when incomplete**

In each `Default*` root element in `packages/react/src/defaults.tsx`, accept `incomplete` and set:

```tsx
data-imd-pending={incomplete ? "" : undefined}
```

(or `data-imd-pending={incomplete || undefined}`). Do not change interaction logic beyond existing `disabled`.

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/types.ts packages/react/src/pending.tsx packages/react/src/defaults.tsx
git commit -m "feat(react): add incomplete types and pending UI helpers"
```

---

### Task 4: Wire `InteractiveMarkdown` streaming path

**Files:**
- Modify: `packages/react/src/InteractiveMarkdown.tsx`
- Modify: `packages/react/src/InteractiveMarkdown.test.tsx`

- [ ] **Step 1: Write failing React tests**

Append to `packages/react/src/InteractiveMarkdown.test.tsx`:

```tsx
  it("hide mode (default) still conceals incomplete trailing blocks", () => {
    const incomplete = sample + "\n\n:::choice{id=more mode=single}\n- a | A";
    render(<InteractiveMarkdown source={incomplete} streaming />);
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });

  it("progressive mode shows complete option rows from pending", () => {
    const incomplete = sample + "\n\n:::choice{id=more mode=single}\n- a | A\n- b";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  it("progressive pending ignores clicks", async () => {
    const user = userEvent.setup();
    const onChoice = vi.fn();
    const incomplete =
      ":::choice{id=more mode=single}\n- a | A";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="progressive"
        interactive={{ onChoice }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "A" }));
    expect(onChoice).not.toHaveBeenCalled();
  });

  it("placeholder mode renders pending skeleton, not option labels", () => {
    const incomplete =
      "Hello\n\n:::choice{id=more mode=single}\n- a | SecretLabel";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="placeholder"
      />,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByText("SecretLabel")).not.toBeInTheDocument();
    expect(document.querySelector("[data-imd-pending]")).toBeTruthy();
  });

  it("renderPending overrides default pending UI", () => {
    const incomplete = ":::choice{id=more mode=single}\n- a | A";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="progressive"
        renderPending={() => <div>CustomPending</div>}
      />,
    );
    expect(screen.getByText("CustomPending")).toBeInTheDocument();
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });
```

Keep the existing streaming test (or rewrite it to assert `incomplete` default hide).

- [ ] **Step 2: Run React tests — expect FAIL**

```bash
npm test -w @interactive-markdown/react -- InteractiveMarkdown
```

Expected: FAIL on new progressive/placeholder cases.

- [ ] **Step 3: Implement streaming branch**

Replace the top of `InteractiveMarkdown` body roughly with:

```tsx
export function InteractiveMarkdown({
  source,
  streaming = false,
  incomplete = "hide",
  renderPending,
  answers,
  interactive,
  components,
  meta,
  className,
}: InteractiveMarkdownProps) {
  const Choice = components?.Choice ?? DefaultChoice;
  const Input = components?.Input ?? DefaultInput;
  const Switch = components?.Switch ?? DefaultSwitch;
  const Actions = components?.Actions ?? DefaultActions;
  const Md = components?.Markdown ?? DefaultMarkdown;

  let blocks: ImdBlock[];
  let pending: ImdPendingBlock | null = null;

  if (streaming) {
    const safe = parseSafe(source);
    blocks = safe.document.blocks;
    pending = safe.pending;
  } else {
    blocks = parse(source).blocks;
  }

  const disabled = interactive?.disabled ?? false;
  // ... existing handle() ...

  const pendingNode = (() => {
    if (!streaming || !pending) return null;
    if (renderPending) return renderPending(pending);
    if (incomplete === "hide") return null;
    if (incomplete === "placeholder") {
      return <DefaultPendingPlaceholder pending={pending} />;
    }
    // progressive
    const block = pendingToBlock(pending);
    const common = {
      incomplete: true as const,
      disabled: true,
      meta,
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
    return <Actions key="pending-actions" block={block} {...common} />;
  })();

  return (
    <div className={className} data-imd-root="">
      {/* existing blocks.map — note: do not use stripIncomplete */}
      {pendingNode}
    </div>
  );
}
```

Import `parseSafe`, `ImdPendingBlock`, helpers from `./pending.js`. You may remove unused `stripIncomplete` import (keep exporting strip from core for non-React callers).

Closed-block rendering stays identical; still run `validate` on complete interactive blocks.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -w @interactive-markdown/react
npm run build -w @interactive-markdown/react
```

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/InteractiveMarkdown.tsx packages/react/src/InteractiveMarkdown.test.tsx packages/react/src/pending.tsx packages/react/src/types.ts packages/react/src/defaults.tsx packages/react/src/index.ts
git commit -m "feat(react): support hide/placeholder/progressive incomplete modes"
```

---

### Task 5: Playground mode switcher + README

**Files:**
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/demo.ts`
- Modify: `packages/playground/src/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Add i18n labels in `demo.ts`**

Under each locale UI object, add:

```ts
incomplete: "未闭合策略", // en: "Incomplete"
incompleteHide: "隐藏", // en: "Hide"
incompletePlaceholder: "占位", // en: "Placeholder"
incompleteProgressive: "渐进", // en: "Progressive"
```

- [ ] **Step 2: Wire selector in `App.tsx`**

```tsx
import type { IncompleteMode } from "@interactive-markdown/react";

const [incomplete, setIncomplete] = useState<IncompleteMode>("progressive");
```

Add a small segmented control near the streaming pill. Pass `incomplete={incomplete}` into `<InteractiveMarkdown />`.

- [ ] **Step 3: CSS for placeholder bars**

In `packages/playground/src/styles.css` (and optionally a tiny note that library class names are unstyled):

```css
.imd-pending-placeholder {
  display: grid;
  gap: 0.5rem;
  margin: 0.75rem 0;
  opacity: 0.7;
}
.imd-pending-bar {
  height: 0.75rem;
  border-radius: 4px;
  background: color-mix(in oklab, currentColor 12%, transparent);
}
.imd-pending-title {
  width: 40%;
}
[data-imd-pending] {
  opacity: 0.85;
}
```

- [ ] **Step 4: Update README Streaming section**

Replace the Streaming section with:

```md
#### Streaming

```tsx
<InteractiveMarkdown
  source={partialText}
  streaming
  incomplete="progressive" // "hide" | "placeholder" | "progressive"
/>
```

While `streaming` is true, trailing unclosed `:::` blocks are handled by `incomplete`:

| Value | Behavior |
|---|---|
| `hide` (default) | Do not render the pending block (legacy) |
| `placeholder` | Show a type skeleton |
| `progressive` | Grow the real widget as rows/attrs stabilize; not interactive until closed |

Optional `renderPending={(pending) => ...}` overrides the pending region.
```

- [ ] **Step 5: Manual verify playground**

```bash
npm run build -w @interactive-markdown/core
npm run build -w @interactive-markdown/react
# then start playground per package.json script, e.g.
npm run dev -w @interactive-markdown/playground
```

Expected: switching modes changes mid-stream behavior; progressive shows options appearing; hide blanks; placeholder shows bars.

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/App.tsx packages/playground/src/demo.ts packages/playground/src/styles.css README.md
git commit -m "docs(playground): demo incomplete streaming modes"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test + build**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm test
npm run build -w @interactive-markdown/core
npm run build -w @interactive-markdown/react
```

Expected: all workspaces green.

- [ ] **Step 2: Spec drift check**

Skim `docs/spec.md` §4.1 / §6 / §7 and the design doc. If any API name drifted during implementation, update those docs in the same commit.

- [ ] **Step 3: Mark design status Approved/Implemented**

In `docs/superpowers/specs/2026-07-14-streaming-incomplete-modes-design.md`, set `Status: Approved` (or `Implemented` after merge).

```bash
git add docs/superpowers/specs/2026-07-14-streaming-incomplete-modes-design.md docs/spec.md
git commit -m "docs: mark streaming incomplete modes design approved"
```

---

## Spec coverage self-check

| Spec item | Task |
|---|---|
| `parseSafe` + `ImdPendingBlock` | Task 1–2 |
| `stripIncomplete` unchanged | Task 2 (no edits to strip; existing tests) |
| `parse` folds pending → markdown | Task 2 |
| `incomplete` hide/placeholder/progressive | Task 3–4 |
| `renderPending` | Task 4 |
| Pending never interactive | Task 4 tests |
| `BlockComponentProps.incomplete` | Task 3–4 |
| Playground switcher | Task 5 |
| README | Task 5 |
| `docs/spec.md` already updated | Task 6 drift check |

## Notes for implementers

- Prefer **not** importing `stripIncomplete` in React after this change; `hide` = ignore `pending`.
- Custom `components` in progressive mode receive `incomplete` + `disabled`; placeholder uses library skeleton unless `renderPending` is set (custom components are **not** auto-wrapped for placeholder unless you later choose to — stick to design: skeleton by default).
- If the workspace has no git repository, skip commit steps and continue.
