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
  DefaultActions,
  DefaultChoice,
  DefaultInput,
  DefaultSwitch,
  emitForBlock,
} from "./defaults.js";
import {
  DefaultPendingPlaceholder,
  renderProgressivePending,
} from "./pending.js";
import type { InteractiveMarkdownProps } from "./types.js";

export type {
  ImdAnswers,
  ImdComponents,
  InteractiveHandlers,
  InteractiveMarkdownProps,
  BlockComponentProps,
} from "./types.js";

export {
  DefaultActions,
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

  const Choice = components?.Choice ?? DefaultChoice;
  const Input = components?.Input ?? DefaultInput;
  const Switch = components?.Switch ?? DefaultSwitch;
  const Actions = components?.Actions ?? DefaultActions;
  const Md = components?.Markdown ?? DefaultMarkdown;

  const handle = (block: ImdBlock, values: string[]) => {
    if (disabled) return;
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
      pendingNode = renderProgressivePending({
        pending,
        Choice,
        Input,
        Switch,
        Actions,
        meta,
      });
    }
    // hide → null
  }

  return (
    <div className={className} data-imd-root="">
      {blocks.map((block, index) => {
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

        const answerKey =
          block.type === "actions" ? undefined : "id" in block ? block.id : undefined;
        const values = answerKey ? answers?.[answerKey]?.values : undefined;

        if (block.type === "choice") {
          return (
            <Choice
              key={`choice-${block.id}-${index}`}
              block={block}
              disabled={disabled}
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
              disabled={disabled}
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
              disabled={disabled}
              values={values}
              meta={meta}
              onSubmit={(v) => handle(block, v)}
            />
          );
        }
        return (
          <Actions
            key={`actions-${index}`}
            block={block}
            disabled={disabled}
            meta={meta}
            onSubmit={(v) => handle(block, v)}
          />
        );
      })}
      {pendingNode}
    </div>
  );
}
