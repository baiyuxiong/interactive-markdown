import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  parse,
  parseSafe,
  serialize,
  validate,
  type ImdBlock,
} from "@interactive-markdown/core";
import {
  DefaultAction,
  DefaultChoice,
  DefaultInput,
  DefaultSwitch,
  emitForBlock,
} from "./defaults.js";
import {
  DefaultPendingPlaceholder,
  renderProgressivePending,
} from "./pending.js";
import type { ReactNode } from "react";
import type { InteractiveBlockType, InteractiveMarkdownProps } from "./types.js";

export type {
  ImdAnswers,
  ImdComponents,
  InteractiveHandlers,
  InteractiveMarkdownProps,
  BlockComponentProps,
} from "./types.js";

export {
  DefaultAction,
  DefaultChoice,
  DefaultInput,
  DefaultSwitch,
} from "./defaults.js";

function DefaultMarkdown({ children }: { children: string }) {
  if (!children) return null;
  return <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>;
}

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
  let blocks;
  let pending = null;
  if (streaming) {
    const safe = parseSafe(source);
    blocks = safe.document.blocks;
    pending = safe.pending;
  } else {
    blocks = parse(source).blocks;
  }
  const disabled = interactive?.disabled ?? false;
  const submitOnSelect = interactive?.submitOnSelect ?? true;
  const isBlockDisabled = (type: InteractiveBlockType) =>
    typeof disabled === "boolean" ? disabled : disabled[type] ?? false;

  const Choice = components?.Choice ?? DefaultChoice;
  const Input = components?.Input ?? DefaultInput;
  const Switch = components?.Switch ?? DefaultSwitch;
  const Action = components?.Action ?? DefaultAction;
  const Md = components?.Markdown ?? DefaultMarkdown;

  const handle = (block: ImdBlock, values: string[]) => {
    if (block.type !== "markdown" && isBlockDisabled(block.type)) return;
    const result = emitForBlock(block, values, meta);
    if (!result) return;
    switch (result.kind) {
      case "choice":
        interactive?.onChoice?.(result);
        break;
      case "input":
        interactive?.onInput?.(result);
        break;
      case "switch":
        interactive?.onSwitch?.(result);
        break;
      case "action":
        interactive?.onAction?.(result);
        break;
    }
  };

  let pendingNode = null;
  if (streaming && pending) {
    if (renderPending) {
      pendingNode = renderPending(pending);
    } else if (incomplete === "placeholder") {
      pendingNode = <DefaultPendingPlaceholder pending={pending} />;
    } else if (incomplete === "progressive") {
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
    }
    // hide → null
  }

  const renderAction = (
    block: Extract<ImdBlock, { type: "action" }>,
    index: number,
  ) => {
    const values = answers?.[block.id]?.values;
    return (
      <Action
        key={`action-${block.id}-${index}`}
        block={block}
        disabled={isBlockDisabled("action")}
        values={values}
        meta={meta}
        onSubmit={(v) => handle(block, v)}
      />
    );
  };

  const renderBlock = (block: ImdBlock, index: number): ReactNode => {
    if (block.type === "markdown") {
      return <Md key={`md-${index}`}>{block.text}</Md>;
    }

    const check = validate({ source, blocks: [block] });
    if (!check.ok) {
      return (
        <Md key={`bad-${index}`}>
          {serialize({ source, blocks: [block] })}
        </Md>
      );
    }

    const answerKey = "id" in block ? block.id : undefined;
    const values = answerKey ? answers?.[answerKey]?.values : undefined;

    if (block.type === "choice") {
      return (
        <Choice
          key={`choice-${block.id}-${index}`}
          block={block}
          disabled={isBlockDisabled("choice")}
          values={values}
          meta={meta}
          submitOnSelect={submitOnSelect}
          onSubmit={(v) => handle(block, v)}
        />
      );
    }
    if (block.type === "input") {
      return (
        <Input
          key={`input-${block.id}-${index}`}
          block={block}
          disabled={isBlockDisabled("input")}
          values={values}
          meta={meta}
          onSubmit={(v) => handle(block, v)}
        />
      );
    }
    if (block.type === "switch") {
      return (
        <Switch
          key={`switch-${block.id}-${index}`}
          block={block}
          disabled={isBlockDisabled("switch")}
          values={values}
          meta={meta}
          onSubmit={(v) => handle(block, v)}
        />
      );
    }
    if (block.type === "action") {
      return renderAction(block, index);
    }
    return null;
  };

  const isWhitespaceMarkdown = (block: ImdBlock) =>
    block.type === "markdown" && block.text.trim() === "";

  const isValidAction = (
    block: ImdBlock,
  ): block is Extract<ImdBlock, { type: "action" }> =>
    block.type === "action" && validate({ source, blocks: [block] }).ok;

  const renderBlocks = () => {
    const nodes: ReactNode[] = [];
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]!;
      if (!isValidAction(block)) {
        nodes.push(renderBlock(block, index));
        continue;
      }

      const actions: Array<{
        block: Extract<ImdBlock, { type: "action" }>;
        index: number;
      }> = [{ block, index }];
      let groupEnd = index;
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const next = blocks[cursor]!;
        if (isWhitespaceMarkdown(next)) {
          cursor++;
          continue;
        }
        if (!isValidAction(next)) break;
        actions.push({ block: next, index: cursor });
        groupEnd = cursor;
        cursor++;
      }

      if (actions.length === 1) {
        nodes.push(renderAction(block, index));
        continue;
      }

      nodes.push(
        <div
          key={`action-group-${index}-${groupEnd}`}
          className="imd-action-group"
          data-imd="action-group"
        >
          <div data-imd-action-group-items="">
            {actions.map((item) => renderAction(item.block, item.index))}
          </div>
        </div>,
      );
      index = groupEnd;
    }
    return nodes;
  };

  return (
    <div className={className} data-imd-root="">
      {renderBlocks()}
      {pendingNode}
    </div>
  );
}
