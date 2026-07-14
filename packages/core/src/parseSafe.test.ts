import { describe, expect, it } from "vitest";
import { parse, parseSafe } from "./parse.js";

describe("parseSafe", () => {
  it("returns pending=null for a complete document", () => {
    const source = [
      "Intro",
      "",
      ":::choice{id=login mode=single}",
      "- phone | Phone",
      ":::",
    ].join("\n");
    const result = parseSafe(source);
    expect(result.pending).toBeNull();
    expect(result.document).toEqual(parse(source));
  });

  it("extracts trailing unclosed choice with complete option rows only", () => {
    const source = [
      "Intro",
      "",
      ":::choice{id=login mode=single}",
      "- phone | Phone",
      "- oa",
    ].join("\n");
    const result = parseSafe(source);
    expect(result.document.blocks).toEqual([
      { type: "markdown", text: "Intro\n\n" },
    ]);
    expect(result.pending).toEqual({
      type: "choice",
      id: "login",
      mode: "single",
      options: [{ value: "phone", label: "Phone" }],
      raw: ":::choice{id=login mode=single}\n- phone | Phone\n- oa",
    });
  });

  it("keeps prior closed blocks when a later block is incomplete", () => {
    const source = [
      ":::input{id=name}",
      "default",
      ":::",
      "",
      ":::switch{id=notify label=Notify}",
      "",
    ].join("\n");
    const result = parseSafe(source);
    expect(result.document.blocks).toEqual([
      {
        type: "input",
        id: "name",
        defaultValue: "default",
      },
      { type: "markdown", text: "\n\n" },
    ]);
    expect(result.pending).toMatchObject({
      type: "switch",
      id: "notify",
      label: "Notify",
    });
  });

  it("unknown unclosed directive: pending=null and parse folds excludedRaw", () => {
    const source = "Hi\n\n:::foobar{id=x}\nbody";
    const result = parseSafe(source);
    expect(result.pending).toBeNull();
    expect(result.document.blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
    ]);
    // parse folds excludedRaw as a trailing markdown block (split from leading Hi\n\n)
    expect(parse(source).blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
      { type: "markdown", text: ":::foobar{id=x}\nbody" },
    ]);
  });

  it("half-open attrs fence: pending=null and parse folds incomplete open", () => {
    const source = "Hi\n\n:::choice{id=login";
    const result = parseSafe(source);
    expect(result.pending).toBeNull();
    expect(result.document.blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
    ]);
    // intentional split: leading markdown + trailing fold of incomplete open
    expect(parse(source).blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
      { type: "markdown", text: ":::choice{id=login" },
    ]);
  });

  it("parse folds pending back to trailing markdown (legacy behavior)", () => {
    const source = "Hi\n\n:::choice{id=login mode=single}\n- phone | Phone";
    const doc = parse(source);
    expect(doc.blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
      {
        type: "markdown",
        text: ":::choice{id=login mode=single}\n- phone | Phone",
      },
    ]);
  });

  it.each([":", "::", ":::"])(
    "excludes trailing incomplete colon prefix %j so streaming does not flash fence chars",
    (prefix) => {
      const source = `Hi\n\n${prefix}`;
      const result = parseSafe(source);
      expect(result.pending).toBeNull();
      expect(result.document.blocks).toEqual([
        { type: "markdown", text: "Hi\n\n" },
      ]);
      expect(parse(source).blocks).toEqual([
        { type: "markdown", text: "Hi\n\n" },
        { type: "markdown", text: prefix },
      ]);
    },
  );

  it("does not treat a normal line ending with colon as a fence prefix", () => {
    const source = "Hi\n\nNote:";
    const result = parseSafe(source);
    expect(result.pending).toBeNull();
    expect(result.document.blocks).toEqual([
      { type: "markdown", text: "Hi\n\nNote:" },
    ]);
  });

  it("defers pending until the opening fence line is committed (newline)", () => {
    // Same line still growing: name complete but attrs may arrive next — no pending yet.
    const growing = parseSafe("Hi\n\n:::choice");
    expect(growing.pending).toBeNull();
    expect(growing.document.blocks).toEqual([
      { type: "markdown", text: "Hi\n\n" },
    ]);

    // Mid-attrs still growing on the open line.
    const midAttrs = parseSafe("Hi\n\n:::choice{id=");
    expect(midAttrs.pending).toBeNull();

    // Open line committed by newline — pending appears.
    const committed = parseSafe("Hi\n\n:::choice\n");
    expect(committed.pending).toMatchObject({ type: "choice" });

    // Attrs complete on open line but no trailing newline yet — still deferred.
    const attrsNoNl = parseSafe("Hi\n\n:::choice{id=login}");
    expect(attrsNoNl.pending).toBeNull();

    // Body started (open line no longer last) — pending with options.
    const withBody = parseSafe(
      "Hi\n\n:::choice{id=login}\n- phone | Phone",
    );
    expect(withBody.pending).toMatchObject({
      type: "choice",
      id: "login",
      options: [{ value: "phone", label: "Phone" }],
    });
  });
});
