import { describe, expect, it } from "vitest";
import { parse } from "./parse.js";
import { serialize } from "./serialize.js";
import { validate } from "./validate.js";

const sample = [
  "你好，我们先确认几个偏好。",
  "",
  ':::choice{id=login label="你更倾向哪种登录方式？" mode=single required hint="后续可在设置中更换"}',
  "- phone | 手机号登录",
  "- oauth | 第三方账号登录",
  ":::",
  "",
  ':::input{id=name label="产品暂定叫什么名字？" placeholder=例如：智能审批助手 required hint="可稍后修改"}',
  ":::",
  "",
  ':::switch{id=notify label="是否开启消息通知？" default=off hint="可随时关闭"}',
  ":::",
  "",
  ':::action{id=submit label="确认并继续" hint="确认后将进入下一步"}',
  '{"next":"review"}',
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
        hint: "确认后将进入下一步",
        data: { next: "review" },
      },
    ]);
  });

  it("parses escaped quotes inside attribute values", () => {
    const doc = parse(':::input{id=n label="说\\"你好\\""}\n:::');
    expect(doc.blocks).toEqual([
      { type: "input", id: "n", label: '说"你好"' },
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

  it("parses optional empty action body without data", () => {
    const doc = parse(':::action{id=skip label="暂时跳过"}\n:::');
    expect(doc.blocks).toEqual([
      { type: "action", id: "skip", label: "暂时跳过" },
    ]);
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

  it("sets dataError for invalid JSON but keeps action block", () => {
    const doc = parse(":::action{id=broken}\n{not json\n:::");
    const block = doc.blocks[0];
    expect(block).toMatchObject({ type: "action", id: "broken" });
    expect(block).toHaveProperty("dataError");
    expect(block && "data" in block && block.data).toBeUndefined();
    expect(validate(doc).ok).toBe(true);
  });

  it("treats closed :::actions as markdown (removed)", () => {
    const src = ":::actions\n- a | A\n:::";
    expect(parse(src).blocks).toEqual([{ type: "markdown", text: src }]);
  });

  it("round-trips action with data via serialize", () => {
    const src = [
      ':::action{id=create-sub-session label="创建子会话"}',
      '{"sessionName":"审批细节"}',
      ":::",
    ].join("\n");
    const doc = parse(src);
    const again = parse(serialize(doc));
    expect(again.blocks).toEqual(doc.blocks);
  });

  it("serialize drops dataError (empty body)", () => {
    const doc = parse(":::action{id=x}\n{bad\n:::");
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
    const doc = parse(":::action{label=Go}\n:::");
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
