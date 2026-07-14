export type Locale = "zh" | "en";

export const DEMO_SOURCE: Record<Locale, string> = {
  zh: `你好，我们先确认几个偏好。

:::choice{id=login label="你更倾向哪种登录方式？" mode=single required hint="后续可在设置中更换"}
- phone | 手机号登录
- oauth | 第三方账号登录
:::

:::choice{id=features label="需要哪些能力？（可多选）" mode=multiple required hint="至少选一项"}
- export | 导出报表
- notify | 消息通知
- audit | 操作审计
:::

:::input{id=name label="产品暂定叫什么名字？" placeholder=例如：智能审批助手 required hint="可稍后修改"}
:::

:::switch{id=notify label="是否开启消息通知？" default=off hint="可随时关闭"}
:::

:::action{id=submit label="确认并继续" hint="确认后将进入下一步"}
{"step":"next"}
:::

:::action{id=skip label="暂时跳过"}
:::
`,
  en: `Hi — let's confirm a few preferences.

:::choice{id=login label="Which login method do you prefer?" mode=single required hint="You can change this later in settings"}
- phone | Phone login
- oauth | Third-party login
:::

:::choice{id=features label="Which capabilities do you need? (multi-select)" mode=multiple required hint="Pick at least one"}
- export | Export reports
- notify | Notifications
- audit | Audit log
:::

:::input{id=name label="What's the working product name?" placeholder=e.g. Approval Assistant required hint="You can rename it later"}
:::

:::switch{id=notify label="Enable notifications?" default=off hint="You can turn this off anytime"}
:::

:::action{id=submit label="Confirm & continue" hint="Confirm to continue"}
{"step":"next"}
:::

:::action{id=skip label="Skip for now"}
:::
`,
};

export const SYNTAX_SNIPPETS: Record<
  Locale,
  { title: string; code: string }[]
> = {
  zh: [
    {
      title: "choice（单选）",
      code: `:::choice{id=login label="你更倾向哪种登录方式？" mode=single required hint="说明"}
- phone | 手机号登录
- oauth | 第三方账号登录
:::`,
    },
    {
      title: "choice（多选）",
      code: `:::choice{id=features label="需要哪些能力？" mode=multiple required}
- export | 导出报表
- notify | 消息通知
:::`,
    },
    {
      title: "input",
      code: `:::input{id=name label="产品名称" placeholder=示例 required}
:::`,
    },
    {
      title: "switch",
      code: `:::switch{id=notify label="消息通知" default=off}
:::`,
    },
    {
      title: "action",
      code: `:::action{id=submit label="确认并继续" hint="确认后将进入下一步"}
{"step":"next"}
:::

:::action{id=skip label="暂时跳过"}
:::`,
    },
  ],
  en: [
    {
      title: "choice (single)",
      code: `:::choice{id=login label="Which login method?" mode=single required hint="hint"}
- phone | Phone login
- oauth | Third-party login
:::`,
    },
    {
      title: "choice (multiple)",
      code: `:::choice{id=features label="Which capabilities?" mode=multiple required}
- export | Export reports
- notify | Notifications
:::`,
    },
    {
      title: "input",
      code: `:::input{id=name label="Product name" placeholder=Example required}
:::`,
    },
    {
      title: "switch",
      code: `:::switch{id=notify label="Notifications" default=off}
:::`,
    },
    {
      title: "action",
      code: `:::action{id=submit label="Confirm & continue" hint="Confirm to continue"}
{"step":"next"}
:::

:::action{id=skip label="Skip for now"}
:::`,
    },
  ],
};
export const UI = {
  zh: {
    headline: "流式友好的可交互 Markdown",
    lede: "在正文中嵌入单选、多选、填写、开关与操作按钮；流式时可选择隐藏、占位或渐进展示未闭合块。",
    replay: "重新流式播放",
    jump: "直接显示完整内容",
    jumpDone: "已是完整内容",
    jumpHint: "跳过动画，立即显示全文",
    preview: "预览",
    source: "原文",
    custom: "自定义",
    customNote: "下方示例用 components 覆盖默认 UI（仍遵循 label → 控件 → hint）",
    streaming: "流式中",
    complete: "已完成",
    incomplete: "未闭合策略",
    incompleteHide: "隐藏",
    incompletePlaceholder: "占位",
    incompleteProgressive: "渐进",
    events: "事件",
    eventsEmpty: "与预览交互后，结果会出现在这里。",
    syntax: "语法",
  },
  en: {
    headline: "Stream-friendly interactive Markdown",
    lede: "Embed single/multi choice, inputs, switches, and action buttons in Markdown. While streaming, choose hide, placeholder, or progressive for incomplete blocks.",
    replay: "Replay stream",
    jump: "Show full content",
    jumpDone: "Already complete",
    jumpHint: "Skip the animation and show everything now",
    preview: "Preview",
    source: "Source",
    custom: "Custom",
    customNote: "This tab overrides UI via components (still label → control → hint).",
    streaming: "streaming",
    complete: "complete",
    incomplete: "Incomplete",
    incompleteHide: "Hide",
    incompletePlaceholder: "Placeholder",
    incompleteProgressive: "Progressive",
    events: "Events",
    eventsEmpty: "Interact with the preview — results show up here.",
    syntax: "Syntax",
  },
} as const;
