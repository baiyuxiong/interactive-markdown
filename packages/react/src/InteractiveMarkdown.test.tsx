import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InteractiveMarkdown } from "./InteractiveMarkdown.js";

const sample = [
  "Hello",
  "",
  ":::choice{id=login mode=single required}",
  "- phone | Phone",
  "- oauth | OAuth",
  ":::",
  "",
  ":::input{id=name label=Name required}",
  ":::",
  "",
  ":::switch{id=notify label=Notify default=off}",
  ":::",
  "",
  ":::actions",
  "- submit | Submit",
  "- skip | Skip",
  ":::",
].join("\n");

describe("InteractiveMarkdown", () => {
  it("renders markdown and does not show incomplete blocks while streaming", () => {
    const incomplete = sample + "\n\n:::choice{id=more mode=single}\n- a | A";
    render(<InteractiveMarkdown source={incomplete} streaming />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByText("Phone")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "A" })).not.toBeInTheDocument();
  });

  it("emits onChoice for single select", async () => {
    const user = userEvent.setup();
    const onChoice = vi.fn();
    render(
      <InteractiveMarkdown
        source={sample}
        interactive={{ onChoice }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Phone" }));
    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(onChoice.mock.calls[0]?.[0]).toMatchObject({
      kind: "choice",
      blockId: "login",
      values: ["phone"],
    });
  });

  it("requires confirm for multiple choice", async () => {
    const user = userEvent.setup();
    const onChoice = vi.fn();
    const multi = [
      ":::choice{id=features mode=multiple required}",
      "- a | A",
      "- b | B",
      ":::",
    ].join("\n");
    render(
      <InteractiveMarkdown source={multi} interactive={{ onChoice }} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "A" }));
    expect(onChoice).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onChoice.mock.calls[0]?.[0]).toMatchObject({
      values: ["a"],
    });
  });

  it("emits onInput when input is submitted", async () => {
    const user = userEvent.setup();
    const onInput = vi.fn();
    const src = ":::input{id=name label=Name required}\n:::";
    render(<InteractiveMarkdown source={src} interactive={{ onInput }} />);
    await user.type(screen.getByRole("textbox", { name: /Name/ }), "Acme");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onInput.mock.calls[0]?.[0]).toMatchObject({
      kind: "input",
      blockId: "name",
      values: ["Acme"],
    });
  });

  it("emits onSwitch and onAction", async () => {
    const user = userEvent.setup();
    const onSwitch = vi.fn();
    const onAction = vi.fn();
    const src = [
      ":::switch{id=notify label=Notify default=off}",
      ":::",
      "",
      ":::actions",
      "- skip | Skip",
      ":::",
    ].join("\n");
    render(
      <InteractiveMarkdown source={src} interactive={{ onSwitch, onAction }} />,
    );
    await user.click(screen.getByRole("switch", { name: "Notify" }));
    expect(onSwitch.mock.calls[0]?.[0]).toMatchObject({
      kind: "switch",
      values: ["on"],
    });
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({
      kind: "action",
      blockId: "skip",
      values: ["skip"],
    });
  });

  it("respects disabled and answers", () => {
    render(
      <InteractiveMarkdown
        source={":::choice{id=login mode=single}\n- phone | Phone\n:::"}
        answers={{ login: { values: ["phone"] } }}
        interactive={{ disabled: true }}
      />,
    );
    const radio = screen.getByRole("radio", { name: "Phone" });
    expect(radio).toBeDisabled();
    expect(radio).toBeChecked();
  });

  it("allows component overrides", () => {
    render(
      <InteractiveMarkdown
        source={":::choice{id=login mode=single}\n- phone | Phone\n:::"}
        components={{
          Choice: () => <div>CustomChoice</div>,
        }}
      />,
    );
    expect(screen.getByText("CustomChoice")).toBeInTheDocument();
  });
});
