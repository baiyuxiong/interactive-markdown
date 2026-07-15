import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";
import { serialize } from "./serialize.js";
import { validate } from "./validate.js";

const sample = [
  "你好，我们先确认几个偏好。",
  "",
  ":::choice{id=login mode=single required}",
  "你更倾向哪种登录方式？",
  "",
  "- phone | 手机号登录",
  "- oauth | 第三方账号登录",
  "",
  "后续可在设置中更换",
  ":::",
  "",
  ':::input{id=name placeholder=例如：智能审批助手 default="智能审批助手" required}',
  "产品暂定叫什么名字？",
  "",
  "可稍后修改",
  ":::",
  "",
  ":::switch{id=notify default=off}",
  "是否开启消息通知？",
  "",
  "可随时关闭",
  ":::",
  "",
  ":::action{id=submit}",
  "确认并继续",
  "",
  "```json",
  '{"next":"review"}',
  "```",
  ":::",
].join("\n");

describe("parse", () => {
  it("parses choice, input, switch, and action blocks", () => {
    const doc = parse(sample);
    expect(doc.source).toBe(sample);
    expect(doc.blocks).toEqual([
      { type: "markdown", text: "你好，我们先确认几个偏好。\n\n" },
      {
        type: "choice",
        id: "login",
        label: "你更倾向哪种登录方式？",
        mode: "single",
        required: true,
        hint: "后续可在设置中更换",
        options: [
          { value: "phone", label: "手机号登录" },
          { value: "oauth", label: "第三方账号登录" },
        ],
      },
      { type: "markdown", text: "\n\n" },
      {
        type: "input",
        id: "name",
        label: "产品暂定叫什么名字？",
        placeholder: "例如：智能审批助手",
        defaultValue: "智能审批助手",
        required: true,
        hint: "可稍后修改",
      },
      { type: "markdown", text: "\n\n" },
      {
        type: "switch",
        id: "notify",
        label: "是否开启消息通知？",
        default: "off",
        hint: "可随时关闭",
      },
      { type: "markdown", text: "\n\n" },
      {
        type: "action",
        id: "submit",
        label: "确认并继续",
        data: { next: "review" },
      },
    ]);
  });

  it("parses escaped quotes inside attribute values", () => {
    const doc = parse(':::input{id=n placeholder="说\\"你好\\""}\n名字\n:::');
    expect(doc.blocks).toEqual([
      { type: "input", id: "n", placeholder: '说"你好"', label: "名字" },
    ]);
  });

  it("parses braces inside quoted attribute values", () => {
    const doc = parse(':::input{id=n placeholder="输入 {name} 后继续"}\n名字\n:::');
    expect(doc.blocks).toEqual([
      { type: "input", id: "n", placeholder: "输入 {name} 后继续", label: "名字" },
    ]);
  });

  it("uses input default attribute as defaultValue", () => {
    const doc = parse(":::input{id=name default=智能审批助手}\n产品名称\n:::");
    expect(doc.blocks).toEqual([
      {
        type: "input",
        id: "name",
        label: "产品名称",
        defaultValue: "智能审批助手",
      },
    ]);
  });

  it("falls back unknown closed directives to markdown", () => {
    const src = ":::foo{id=x}\nbar\n:::";
    const doc = parse(src);
    expect(doc.blocks).toEqual([{ type: "markdown", text: src }]);
  });

  it("ignores legacy label and hint attributes", () => {
    const doc = parse(
      ':::switch{id=notify label="legacy label" hint="legacy hint"}\n新的 label\n:::',
    );
    expect(doc.blocks).toEqual([
      { type: "switch", id: "notify", label: "新的 label" },
    ]);
  });

  it("parses choice label, options, and hint from body sections", () => {
    const doc = parse([
      ":::choice{id=features mode=multiple required}",
      "需要哪些能力？",
      "",
      "- export | 导出报表",
      "- notify | 消息通知",
      "",
      "至少选一项",
      ":::",
    ].join("\n"));
    expect(doc.blocks).toEqual([
      {
        type: "choice",
        id: "features",
        mode: "multiple",
        required: true,
        label: "需要哪些能力？",
        options: [
          { value: "export", label: "导出报表" },
          { value: "notify", label: "消息通知" },
        ],
        hint: "至少选一项",
      },
    ]);
  });

  it("rejects choice body text between option rows", () => {
    const src = [
      ":::choice{id=x}",
      "请选择",
      "- a | A",
      "中间说明",
      "- b | B",
      ":::",
    ].join("\n");
    expect(parse(src).blocks).toEqual([{ type: "markdown", text: src }]);
  });

  it("parses input and switch label and hint from body paragraphs", () => {
    expect(parse(":::input{id=name}\n产品名称\n\n可稍后修改\n:::").blocks[0]).toEqual({
      type: "input",
      id: "name",
      label: "产品名称",
      hint: "可稍后修改",
    });
    expect(parse(":::switch{id=notify default=off}\n消息通知\n\n可随时关闭\n:::").blocks[0]).toEqual({
      type: "switch",
      id: "notify",
      default: "off",
      label: "消息通知",
      hint: "可随时关闭",
    });
  });

  it("parses optional empty action body without data", () => {
    const doc = parse(":::action{id=skip}\n暂时跳过\n:::");
    expect(doc.blocks).toEqual([
      { type: "action", id: "skip", label: "暂时跳过" },
    ]);
  });

  it("keeps action labels that only look like unfenced JSON", () => {
    expect(parse(":::action{id=not-found}\n404 页面\n:::").blocks[0]).toEqual({
      type: "action",
      id: "not-found",
      label: "404 页面",
    });
    expect(parse(":::action{id=skip}\n- 跳过\n:::").blocks[0]).toEqual({
      type: "action",
      id: "skip",
      label: "- 跳过",
    });
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

  it("treats whitespace-only action body as empty", () => {
    const doc = parse(":::action{id=a}\n   \n:::");
    expect(doc.blocks).toEqual([{ type: "action", id: "a" }]);
  });

  it("trims action body before JSON.parse", () => {
    expect(parse(':::action{id=a}\n  {"k":1}  \n:::').blocks[0]).toMatchObject({
      type: "action",
      data: { k: 1 },
    });
  });

  it("parses number and boolean JSON into data", () => {
    expect(parse(":::action{id=a}\n42\n:::").blocks[0]).toMatchObject({
      data: 42,
    });
    expect(parse(":::action{id=a}\ntrue\n:::").blocks[0]).toMatchObject({
      data: true,
    });
  });

  it("sets dataError for invalid unfenced JSON-like action body", () => {
    const doc = parse(":::action{id=broken}\nBroken\n\n{not json\n:::");
    const block = doc.blocks[0];
    expect(block).toMatchObject({ type: "action", id: "broken", label: "Broken" });
    expect(block).toHaveProperty("dataError");
    expect(validate(doc).ok).toBe(true);
  });

  it("does not support action hint text after JSON", () => {
    const src = [
      ":::action{id=go}",
      "Go",
      "",
      "```json",
      '{"a":1}',
      "```",
      "",
      "This trailing text would be a hint.",
      ":::",
    ].join("\n");
    expect(parse(src).blocks).toEqual([{ type: "markdown", text: src }]);
  });

  it("sets dataError for invalid fenced JSON but keeps action block", () => {
    const doc = parse([
      ":::action{id=broken}",
      "Broken",
      "",
      "```json",
      "{not json",
      "```",
      ":::",
    ].join("\n"));
    const block = doc.blocks[0];
    expect(block).toMatchObject({ type: "action", id: "broken", label: "Broken" });
    expect(block).toHaveProperty("dataError");
    expect(typeof (block as { dataError?: string }).dataError).toBe("string");
    expect((block as { dataError?: string }).dataError!.length).toBeGreaterThan(0);
    expect(
      block && block.type === "action" ? block.data : undefined,
    ).toBeUndefined();
    expect(validate(doc).ok).toBe(true);
  });

  it("treats closed :::actions as markdown (removed)", () => {
    const src = ":::actions\n- a | A\n:::";
    expect(parse(src).blocks).toEqual([{ type: "markdown", text: src }]);
  });

  it("round-trips action with data via serialize", () => {
    const src = [
      ":::action{id=create-sub-session}",
      "创建子会话",
      "",
      "```json",
      '{"sessionName":"审批细节"}',
      "```",
      ":::",
    ].join("\n");
    const doc = parse(src);
    const again = parse(serialize(doc));
    expect(again.blocks).toEqual(doc.blocks);
  });

  it("serialize drops dataError (empty body)", () => {
    const doc = parse([
      ":::action{id=x}",
      "```json",
      "{bad",
      "```",
      ":::",
    ].join("\n"));
    const out = serialize(doc);
    expect(out).toBe(":::action{id=x}\n:::");
    expect(parse(out).blocks[0]).toEqual({ type: "action", id: "x" });
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

  it("requires action id", () => {
    const doc = parse(":::action\nGo\n:::");
    expect(validate(doc).ok).toBe(false);
  });
});

describe("serialize", () => {
  it("round-trips a valid document", () => {
    const doc = parse(sample);
    const again = parse(serialize(doc));
    expect(again.blocks).toEqual(doc.blocks);
  });
});
