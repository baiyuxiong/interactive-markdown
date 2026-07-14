import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";
import { serialize } from "./serialize.js";
import { validate } from "./validate.js";

const sample = [
  "你更倾向哪种登录方式？",
  "",
  ':::choice{id=login mode=single required hint="后续可在设置中更换"}',
  "- phone | 手机号登录",
  "- oauth | 第三方账号登录",
  ":::",
  "",
  "产品暂定叫什么名字？",
  "",
  ":::input{id=name label=产品名称 placeholder=例如：智能审批助手 required hint=\"可稍后修改\"}",
  ":::",
  "",
  "是否开启消息通知？",
  "",
  ":::switch{id=notify label=消息通知 default=off hint=\"可随时关闭\"}",
  ":::",
  "",
  ':::actions{hint="确认后将进入下一步"}',
  "- submit | 确认并继续",
  "- skip | 暂时跳过",
  ":::",
].join("\n");

describe("parse", () => {
  it("parses choice, input, switch, and actions blocks", () => {
    const doc = parse(sample);
    expect(doc.source).toBe(sample);
    expect(doc.blocks).toEqual([
      { type: "markdown", text: "你更倾向哪种登录方式？\n\n" },
      {
        type: "choice",
        id: "login",
        mode: "single",
        required: true,
        hint: "后续可在设置中更换",
        options: [
          { value: "phone", label: "手机号登录" },
          { value: "oauth", label: "第三方账号登录" },
        ],
      },
      { type: "markdown", text: "\n\n产品暂定叫什么名字？\n\n" },
      {
        type: "input",
        id: "name",
        label: "产品名称",
        placeholder: "例如：智能审批助手",
        required: true,
        hint: "可稍后修改",
      },
      { type: "markdown", text: "\n\n是否开启消息通知？\n\n" },
      {
        type: "switch",
        id: "notify",
        label: "消息通知",
        default: "off",
        hint: "可随时关闭",
      },
      { type: "markdown", text: "\n\n" },
      {
        type: "actions",
        hint: "确认后将进入下一步",
        items: [
          { actionId: "submit", label: "确认并继续" },
          { actionId: "skip", label: "暂时跳过" },
        ],
      },
    ]);
  });

  it("uses input body as defaultValue", () => {
    const doc = parse(":::input{id=name}\n智能审批助手\n:::");
    expect(doc.blocks).toEqual([
      {
        type: "input",
        id: "name",
        defaultValue: "智能审批助手",
      },
    ]);
  });

  it("falls back unknown closed directives to markdown", () => {
    const src = ":::foo{id=x}\nbar\n:::";
    const doc = parse(src);
    expect(doc.blocks).toEqual([{ type: "markdown", text: src }]);
  });
});

describe("validate", () => {
  it("accepts a valid document", () => {
    expect(validate(parse(sample)).ok).toBe(true);
  });

  it("rejects choice without id or options", () => {
    const doc = parse(":::choice{mode=single}\n:::");
    const result = validate(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("serialize", () => {
  it("round-trips a valid document", () => {
    const doc = parse(sample);
    const again = parse(serialize(doc));
    expect(again.blocks).toEqual(doc.blocks);
  });
});
