import type {
  ImdBlock,
  ImdInteractionResult,
  ImdPendingBlock,
} from "@interactive-markdown/core";
import type { ComponentType, ReactNode } from "react";

export type IncompleteMode = "hide" | "placeholder" | "progressive";

export type ImdAnswers = Record<string, { values: string[] }>;

export type InteractiveBlockType = "choice" | "input" | "switch" | "action";

export type InteractiveDisabled =
  | boolean
  | Partial<Record<InteractiveBlockType, boolean>>;

export type InteractiveHandlers = {
  disabled?: InteractiveDisabled;
  submitOnSelect?: boolean;
  onChoice?: (result: ImdInteractionResult) => void;
  onInput?: (result: ImdInteractionResult) => void;
  onSwitch?: (result: ImdInteractionResult) => void;
  onAction?: (result: ImdInteractionResult) => void;
};

export type BlockComponentProps<T extends ImdBlock = ImdBlock> = {
  block: T;
  disabled?: boolean;
  values?: string[];
  meta?: Record<string, unknown>;
  onSubmit: (values: string[]) => void;
  /** choice only: fire onSelect immediately in single mode (default true) */
  submitOnSelect?: boolean;
  /** True while rendering a streaming pending widget. */
  incomplete?: boolean;
};

export type ImdComponents = {
  Choice?: ComponentType<
    BlockComponentProps<Extract<ImdBlock, { type: "choice" }>>
  >;
  Input?: ComponentType<
    BlockComponentProps<Extract<ImdBlock, { type: "input" }>>
  >;
  Switch?: ComponentType<
    BlockComponentProps<Extract<ImdBlock, { type: "switch" }>>
  >;
  Action?: ComponentType<
    BlockComponentProps<Extract<ImdBlock, { type: "action" }>>
  >;
  Markdown?: ComponentType<{ children: string }>;
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
