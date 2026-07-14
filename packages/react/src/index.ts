import {
  DefaultActions,
  DefaultChoice,
  DefaultInput,
  DefaultSwitch,
} from "./defaults.js";
import {
  InteractiveMarkdown,
} from "./InteractiveMarkdown.js";
import {
  DefaultPendingPlaceholder,
  pendingToBlock,
  renderProgressivePending,
} from "./pending.js";

export { InteractiveMarkdown };
export {
  DefaultActions,
  DefaultChoice,
  DefaultInput,
  DefaultSwitch,
  DefaultPendingPlaceholder,
  pendingToBlock,
  renderProgressivePending,
};
export type {
  BlockComponentProps,
  ImdAnswers,
  ImdComponents,
  IncompleteMode,
  InteractiveHandlers,
  InteractiveMarkdownProps,
} from "./types.js";

export type {
  ImdBlock,
  ImdDocument,
  ImdInteractionResult,
  ImdPendingBlock,
} from "@interactive-markdown/core";
