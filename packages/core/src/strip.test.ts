import { describe, expect, it } from "vitest";
import { stripIncomplete } from "./strip.js";

describe("stripIncomplete", () => {
  it("returns complete documents unchanged", () => {
    const source = [
      "Hello",
      "",
      ":::choice{id=login mode=single}",
      "- phone | Phone",
      ":::",
      "",
      "Done",
    ].join("\n");
    expect(stripIncomplete(source)).toBe(source);
  });

  it("strips an unclosed directive from the opening fence", () => {
    const source = [
      "Intro",
      "",
      ":::choice{id=login mode=single}",
      "- phone | Phone",
    ].join("\n");
    expect(stripIncomplete(source)).toBe("Intro\n\n");
  });

  it("keeps prior closed blocks when a later block is incomplete", () => {
    const source = [
      ":::input{id=name}",
      "default",
      ":::",
      "",
      ":::switch{id=notify}",
    ].join("\n");
    expect(stripIncomplete(source)).toBe(":::input{id=name}\ndefault\n:::\n\n");
  });

  it.each([":", "::", ":::"])(
    "strips trailing incomplete colon prefix %j",
    (prefix) => {
      expect(stripIncomplete(`Intro\n\n${prefix}`)).toBe("Intro\n\n");
    },
  );
});
