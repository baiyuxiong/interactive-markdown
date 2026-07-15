import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InteractiveMarkdown,
  type ImdAnswers,
  type ImdInteractionResult,
  type IncompleteMode,
} from "@interactive-markdown/react";
import { createCustomComponents } from "./customComponents.js";
import { DEMO_SOURCE, SYNTAX_SNIPPETS, UI, type Locale } from "./demo.js";

function useStream(full: string, cps = 60) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(true);
  const timer = useRef<number | null>(null);
  const gen = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const startStream = useCallback(() => {
    clearTimer();
    const id = ++gen.current;
    setText("");
    setStreaming(true);
    let i = 0;
    timer.current = window.setInterval(() => {
      if (id !== gen.current) return;
      i += 1;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clearTimer();
        setStreaming(false);
      }
    }, Math.max(8, Math.floor(1000 / cps)));
  }, [full, cps]);

  const showComplete = useCallback(() => {
    clearTimer();
    const id = ++gen.current;
    // Brief empty frame so the reset is perceptible, then paint full content.
    setText("");
    setStreaming(false);
    window.setTimeout(() => {
      if (id !== gen.current) return;
      setText(full);
    }, 360);
  }, [full]);

  useEffect(() => {
    startStream();
    return clearTimer;
  }, [startStream]);

  return {
    text,
    streaming,
    done: !streaming && text.length === full.length,
    startStream,
    showComplete,
  };
}

export function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem("imd-playground-locale");
    return saved === "en" || saved === "zh" ? saved : "zh";
  });
  const t = UI[locale];
  const source = DEMO_SOURCE[locale];

  const [runId, setRunId] = useState(0);
  const [view, setView] = useState<"preview" | "source" | "custom">("preview");
  const [incomplete, setIncomplete] = useState<IncompleteMode>("progressive");
  const { text, streaming, done, startStream, showComplete } = useStream(
    source,
    60,
  );
  const [log, setLog] = useState<ImdInteractionResult[]>([]);
  const [answers, setAnswers] = useState<ImdAnswers>({});
  const customComponents = useMemo(() => createCustomComponents(), []);

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    localStorage.setItem("imd-playground-locale", next);
    setLocale(next);
    setLog([]);
    setAnswers({});
    setRunId((n) => n + 1);
  };

  const onResult = (result: ImdInteractionResult) => {
    setLog((prev) => [result, ...prev].slice(0, 8));
    if (result.kind !== "action") {
      setAnswers((prev) => ({
        ...prev,
        [result.blockId]: { values: result.values },
      }));
    }
  };

  const replay = () => {
    setLog([]);
    setAnswers({});
    setRunId((n) => n + 1);
    startStream();
  };

  const jumpComplete = () => {
    setLog([]);
    setAnswers({});
    setRunId((n) => n + 1);
    showComplete();
  };

  return (
    <div className="page">
      <div className="topbar">
        <div className="lang" role="group" aria-label="Language">
          <button
            type="button"
            className={locale === "zh" ? "lang-btn active" : "lang-btn"}
            onClick={() => switchLocale("zh")}
          >
            中文
          </button>
          <button
            type="button"
            className={locale === "en" ? "lang-btn active" : "lang-btn"}
            onClick={() => switchLocale("en")}
          >
            EN
          </button>
        </div>
      </div>

      <header className="hero">
        <p className="brand">interactive-markdown</p>
        <h1>{t.headline}</h1>
        <p className="lede">{t.lede}</p>
        <div className="cta">
          <button type="button" className="primary" onClick={replay}>
            {t.replay}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={jumpComplete}
            title={t.jumpHint}
          >
            {t.jump}
          </button>
        </div>
      </header>

      <main className="stage">
        <section className="panel preview" aria-label="Live demo">
          <div className="panel-head">
            <div className="tabs" role="tablist" aria-label="Demo view">
              <button
                type="button"
                role="tab"
                aria-selected={view === "preview"}
                className={view === "preview" ? "tab active" : "tab"}
                onClick={() => setView("preview")}
              >
                {t.preview}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "source"}
                className={view === "source" ? "tab active" : "tab"}
                onClick={() => setView("source")}
              >
                {t.source}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "custom"}
                className={view === "custom" ? "tab active" : "tab"}
                onClick={() => setView("custom")}
              >
                {t.custom}
              </button>
            </div>
            <div className="panel-head-meta">
              <div
                className="incomplete-mode"
                role="group"
                aria-label={t.incomplete}
              >
                {(
                  [
                    ["hide", t.incompleteHide],
                    ["placeholder", t.incompletePlaceholder],
                    ["progressive", t.incompleteProgressive],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={
                      incomplete === mode
                        ? "incomplete-btn active"
                        : "incomplete-btn"
                    }
                    onClick={() => setIncomplete(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className={`pill ${streaming ? "busy" : "idle"}`}>
                {streaming ? t.streaming : done ? t.complete : "idle"}
              </span>
            </div>
          </div>
          {view === "source" ? (
            <pre className="source-body" aria-label="Markdown source">
              <code>{text || " "}</code>
              {streaming ? <span className="caret" aria-hidden="true" /> : null}
            </pre>
          ) : (
            <div
              className={
                view === "custom" ? "preview-body custom-body" : "preview-body"
              }
              key={`${runId}-${locale}-${view}`}
            >
              {view === "custom" ? (
                <p className="custom-note">{t.customNote}</p>
              ) : null}
              <InteractiveMarkdown
                source={text}
                streaming={streaming}
                incomplete={incomplete}
                answers={answers}
                components={view === "custom" ? customComponents : undefined}
                interactive={{
                  onChoice: onResult,
                  onInput: onResult,
                  onSwitch: onResult,
                  onAction: onResult,
                }}
              />
            </div>
          )}
        </section>

        <aside className="side">
          <section className="panel" aria-label="Interaction log">
            <div className="panel-head">
              <span>{t.events}</span>
            </div>
            {log.length === 0 ? (
              <p className="empty">{t.eventsEmpty}</p>
            ) : (
              <ul className="log">
                {log.map((item, i) => {
                  const actionBlock =
                    item.kind === "action" && item.block.type === "action"
                      ? item.block
                      : null;
                  return (
                    <li key={`${item.blockId}-${i}`}>
                      <code>{item.kind}</code>
                      <span>{item.blockId}</span>
                      <pre>{JSON.stringify(item.values)}</pre>
                      {actionBlock?.dataError ? (
                        <>
                          <span className="log-label error">
                            {t.eventsDataError}
                          </span>
                          <pre className="log-payload error">
                            {actionBlock.dataError}
                          </pre>
                        </>
                      ) : null}
                      {actionBlock && actionBlock.data !== undefined ? (
                        <>
                          <span className="log-label">{t.eventsData}</span>
                          <pre className="log-payload">
                            {JSON.stringify(actionBlock.data, null, 2)}
                          </pre>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel" aria-label="Syntax">
            <div className="panel-head">
              <span>{t.syntax}</span>
            </div>
            <div className="syntax-list">
              {SYNTAX_SNIPPETS[locale].map((s) => (
                <article key={s.title}>
                  <h2>{s.title}</h2>
                  <pre>
                    <code>{s.code}</code>
                  </pre>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <footer className="foot">
        <span>@interactive-markdown/core · @interactive-markdown/react</span>
        <span>MIT</span>
      </footer>
    </div>
  );
}
