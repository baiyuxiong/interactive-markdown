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

  it("emits onChoice for multiple as selection changes (no confirm button)", async () => {
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
    expect(
      screen.queryByRole("button", { name: "Confirm" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "A" }));
    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(onChoice.mock.calls[0]?.[0]).toMatchObject({
      kind: "choice",
      blockId: "features",
      values: ["a"],
    });
    await user.click(screen.getByRole("checkbox", { name: "B" }));
    expect(onChoice.mock.calls.at(-1)?.[0]).toMatchObject({
      values: ["a", "b"],
    });
  });

  it("allows clearing the last multiple selection even when required", async () => {
    const user = userEvent.setup();
    const onChoice = vi.fn();
    const multi = [
      ":::choice{id=features mode=multiple required}",
      "- a | A",
      "- b | B",
      ":::",
    ].join("\n");
    const { rerender } = render(
      <InteractiveMarkdown
        source={multi}
        answers={{ features: { values: ["a"] } }}
        interactive={{ onChoice }}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "A" }));
    expect(onChoice).toHaveBeenCalledTimes(1);
    expect(onChoice.mock.calls[0]?.[0]).toMatchObject({ values: [] });
    rerender(
      <InteractiveMarkdown
        source={multi}
        answers={{ features: { values: [] } }}
        interactive={{ onChoice }}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
  });

  it("emits onInput as the user types (no submit button)", async () => {
    const user = userEvent.setup();
    const onInput = vi.fn();
    const src = ":::input{id=name label=Name required}\n:::";
    render(<InteractiveMarkdown source={src} interactive={{ onInput }} />);
    expect(
      screen.queryByRole("button", { name: "Submit" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /Name/ }), "Acme");
    expect(onInput).toHaveBeenCalled();
    expect(onInput.mock.calls.at(-1)?.[0]).toMatchObject({
      kind: "input",
      blockId: "name",
      values: ["Acme"],
    });
  });

  it("does not emit onInput for empty required input", async () => {
    const user = userEvent.setup();
    const onInput = vi.fn();
    const src = ":::input{id=name label=Name required}\n:::";
    render(<InteractiveMarkdown source={src} interactive={{ onInput }} />);
    await user.type(screen.getByRole("textbox", { name: /Name/ }), " ");
    expect(onInput).not.toHaveBeenCalled();
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

  it("hide mode (default) still conceals incomplete trailing blocks", () => {
    const incomplete = sample + "\n\n:::choice{id=more mode=single}\n- a | A";
    render(<InteractiveMarkdown source={incomplete} streaming />);
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });

  it.each([":", "::", ":::"])(
    "does not flash incomplete fence prefix %j while streaming",
    (prefix) => {
      render(
        <InteractiveMarkdown source={`Hello\n\n${prefix}`} streaming />,
      );
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.queryByText(prefix)).not.toBeInTheDocument();
    },
  );

  it("does not flash empty progressive choice while open fence attrs are still typing", () => {
    const { rerender } = render(
      <InteractiveMarkdown
        source={"Hello\n\n:::choice"}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    rerender(
      <InteractiveMarkdown
        source={"Hello\n\n:::choice{id="}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    rerender(
      <InteractiveMarkdown
        source={"Hello\n\n:::choice{id=more}\n"}
        streaming
        incomplete="progressive"
      />,
    );
    // Open committed but no option rows yet — still no empty widget.
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    rerender(
      <InteractiveMarkdown
        source={"Hello\n\n:::choice{id=more}\n- a | A"}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("progressive mode shows complete option rows from pending", () => {
    const incomplete = sample + "\n\n:::choice{id=more mode=single}\n- a | A\n- b";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  it("progressive pending ignores clicks", async () => {
    const user = userEvent.setup();
    const onChoice = vi.fn();
    const incomplete =
      ":::choice{id=more mode=single}\n- a | A";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="progressive"
        interactive={{ onChoice }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "A" }));
    expect(onChoice).not.toHaveBeenCalled();
  });

  it("progressive input updates defaultValue as body streams", () => {
    const { rerender } = render(
      <InteractiveMarkdown
        source={":::input{id=name}\nHe"}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("He");
    rerender(
      <InteractiveMarkdown
        source={":::input{id=name}\nHello"}
        streaming
        incomplete="progressive"
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Hello");
  });

  it("placeholder mode renders pending skeleton, not option labels", () => {
    const incomplete =
      "Hello\n\n:::choice{id=more mode=single}\n- a | SecretLabel";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="placeholder"
      />,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByText("SecretLabel")).not.toBeInTheDocument();
    expect(document.querySelector("[data-imd-pending]")).toBeTruthy();
  });

  it("renderPending overrides default pending UI", () => {
    const incomplete = ":::choice{id=more mode=single}\n- a | A";
    render(
      <InteractiveMarkdown
        source={incomplete}
        streaming
        incomplete="progressive"
        renderPending={() => <div>CustomPending</div>}
      />,
    );
    expect(screen.getByText("CustomPending")).toBeInTheDocument();
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });

  it("default UI order is label, control, then hint", () => {
    const src = [
      ':::choice{id=c label="Pick one" mode=single hint="choice hint"}',
      "- a | A",
      ":::",
      "",
      ':::input{id=n label="Name" hint="input hint"}',
      ":::",
      "",
      ':::switch{id=s label="Notify" default=off hint="switch hint"}',
      ":::",
      "",
      ':::actions{label="Next steps" hint="actions hint"}',
      "- go | Go",
      ":::",
    ].join("\n");
    const { container } = render(<InteractiveMarkdown source={src} />);

    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    const assertOrder = (nodes: (Element | null)[]) => {
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i];
        const b = nodes[i + 1];
        expect(a && b).toBeTruthy();
        expect(a!.compareDocumentPosition(b!) & following).toBe(following);
      }
    };

    const choice = container.querySelector('[data-imd="choice"]')!;
    expect(choice.querySelector("legend")).toBeNull();
    expect(choice.querySelector(".imd-label")?.tagName).toBe("DIV");
    assertOrder([
      choice.querySelector(".imd-label"),
      choice.querySelector('[role="radiogroup"]'),
      choice.querySelector(".imd-hint"),
    ]);

    const input = container.querySelector('[data-imd="input"]')!;
    assertOrder([
      input.querySelector(".imd-label"),
      input.querySelector("input"),
      input.querySelector(".imd-hint"),
    ]);

    const sw = container.querySelector('[data-imd="switch"]')!;
    const row = sw.querySelector(".imd-switch-row");
    assertOrder([
      row?.querySelector(".imd-label") ?? null,
      row?.querySelector('[role="switch"]') ?? null,
    ]);
    assertOrder([row, sw.querySelector(".imd-hint")]);

    const actions = container.querySelector('[data-imd="actions"]')!;
    assertOrder([
      actions.querySelector(".imd-label"),
      actions.querySelector("button"),
      actions.querySelector(".imd-hint"),
    ]);
  });
});
