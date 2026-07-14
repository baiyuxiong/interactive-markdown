export type ImdOption = { value: string; label: string };
export type ImdActionItem = { actionId: string; label: string };

export type ImdBlock =
  | { type: "markdown"; text: string }
  | {
      type: "choice";
      id: string;
      label?: string;
      mode: "single" | "multiple";
      options: ImdOption[];
      required?: boolean;
      hint?: string;
    }
  | {
      type: "input";
      id: string;
      label?: string;
      placeholder?: string;
      required?: boolean;
      hint?: string;
      defaultValue?: string;
    }
  | {
      type: "switch";
      id: string;
      label?: string;
      default?: "on" | "off";
      required?: boolean;
      hint?: string;
    }
  | {
      type: "actions";
      items: ImdActionItem[];
      label?: string;
      hint?: string;
    };

export type ImdDocument = {
  source: string;
  blocks: ImdBlock[];
};

export type ImdInteractionKind = "choice" | "input" | "switch" | "action";

export type ImdInteractionResult = {
  kind: ImdInteractionKind;
  blockId: string;
  values: string[];
  block: ImdBlock;
  meta?: Record<string, unknown>;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

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
