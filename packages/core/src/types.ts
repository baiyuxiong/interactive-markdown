export type ImdOption = { value: string; label: string };
export type ImdActionItem = { actionId: string; label: string };

export type ImdBlock =
  | { type: "markdown"; text: string }
  | {
      type: "choice";
      id: string;
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
