import { describe, expect, it } from "vitest";
import {
  buildInteractionResult,
  isFilled,
  toReplyPayload,
} from "./result.js";
import type { ImdBlock } from "./types.js";

const choice: ImdBlock = {
  type: "choice",
  id: "login",
  mode: "single",
  required: true,
  options: [
    { value: "phone", label: "手机号登录" },
    { value: "oauth", label: "第三方账号登录" },
  ],
};

const input: ImdBlock = {
  type: "input",
  id: "name",
  required: true,
  label: "产品名称",
};

const sw: ImdBlock = {
  type: "switch",
  id: "notify",
  required: true,
  label: "通知",
};

const actions: ImdBlock = {
  type: "actions",
  items: [
    { actionId: "submit", label: "确认并继续" },
    { actionId: "skip", label: "暂时跳过" },
  ],
};

describe("isFilled", () => {
  it("checks choice / input / switch required rules", () => {
    expect(isFilled(choice, [])).toBe(false);
    expect(isFilled(choice, ["phone"])).toBe(true);
    expect(isFilled(input, ["  "])).toBe(false);
    expect(isFilled(input, ["x"])).toBe(true);
    expect(isFilled(sw, ["off"])).toBe(false);
    expect(isFilled(sw, ["on"])).toBe(true);
  });

  it("treats non-required switch off as filled", () => {
    expect(isFilled({ ...sw, required: false }, ["off"])).toBe(true);
  });

  it("treats empty multiple as unfilled only when required", () => {
    const optional: ImdBlock = {
      type: "choice",
      id: "features",
      mode: "multiple",
      options: [{ value: "a", label: "A" }],
    };
    const requiredMulti: ImdBlock = { ...optional, required: true };
    expect(isFilled(optional, [])).toBe(true);
    expect(isFilled(requiredMulti, [])).toBe(false);
    expect(isFilled(requiredMulti, ["a"])).toBe(true);
  });
});

describe("buildInteractionResult", () => {
  it("builds choice / input / switch / action results", () => {
    expect(buildInteractionResult("choice", choice, ["phone"])).toEqual({
      kind: "choice",
      blockId: "login",
      values: ["phone"],
      block: choice,
    });
    expect(buildInteractionResult("action", actions, ["submit"])).toEqual({
      kind: "action",
      blockId: "submit",
      values: ["submit"],
      block: actions,
    });
  });
});

describe("toReplyPayload", () => {
  it("returns structured reply fields without content", () => {
    const result = buildInteractionResult("choice", choice, ["phone"]);
    expect(toReplyPayload(result, { messageId: "msg-1" })).toEqual({
      messageId: "msg-1",
      blockId: "login",
      kind: "choice",
      values: ["phone"],
    });
  });
});
