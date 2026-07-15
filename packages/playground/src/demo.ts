export type Locale = "zh" | "en";

export const DEMO_SOURCE: Record<Locale, string> = {
  zh: `你好，我们先确认几个偏好。

:::choice{id=login mode=single required}
你更倾向哪种登录方式？

- phone | 手机号登录
- oauth | 第三方账号登录

后续可在设置中更换
:::

:::choice{id=features mode=multiple required}
需要哪些能力？（可多选）

- export | 导出报表
- notify | 消息通知
- audit | 操作审计

至少选一项
:::

:::input{id=name placeholder=例如：智能审批助手 required}
产品暂定叫什么名字？

可稍后修改
:::

:::switch{id=notify default=off}
是否开启消息通知？

可随时关闭
:::

:::action{id=create-sub-session}
创建子会话「审批细节」

\`\`\`json
{"sessionName":"审批细节","context":"澄清审批节点与角色","memberIds":["uuid-1","uuid-2"]}
\`\`\`

点击后业务可从 result.block.data 取上下文
:::

:::action{id=propose-session-conclusion}
确认并记录结论

\`\`\`json
{"proposedConclusion":"本期只做手机号登录，第三方登录以后再说。"}
\`\`\`
:::

:::action{id=skip}
暂时跳过
:::
`,
  en: `Hi — let's confirm a few preferences.

:::choice{id=login mode=single required}
Which login method do you prefer?

- phone | Phone login
- oauth | Third-party login

You can change this later in settings
:::

:::choice{id=features mode=multiple required}
Which capabilities do you need? (multi-select)

- export | Export reports
- notify | Notifications
- audit | Audit log

Pick at least one
:::

:::input{id=name placeholder=e.g. Approval Assistant required}
What's the working product name?

You can rename it later
:::

:::switch{id=notify default=off}
Enable notifications?

You can turn this off anytime
:::

:::action{id=create-sub-session}
Create sub-session “Approval details”

\`\`\`json
{"sessionName":"Approval details","context":"Clarify approval nodes and roles","memberIds":["uuid-1","uuid-2"]}
\`\`\`

After click, read context from result.block.data
:::

:::action{id=propose-session-conclusion}
Confirm & record conclusion

\`\`\`json
{"proposedConclusion":"Ship phone login only this round; third-party login later."}
\`\`\`
:::

:::action{id=skip}
Skip for now
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
      code: `:::choice{id=login mode=single required}
你更倾向哪种登录方式？

- phone | 手机号登录
- oauth | 第三方账号登录

说明
:::`,
    },
    {
      title: "choice（多选）",
      code: `:::choice{id=features mode=multiple required}
需要哪些能力？

- export | 导出报表
- notify | 消息通知
:::`,
    },
    {
      title: "input",
      code: `:::input{id=name placeholder=示例 required}
产品名称
:::`,
    },
    {
      title: "switch",
      code: `:::switch{id=notify default=off}
消息通知
:::`,
    },
    {
      title: "action（自定义 data）",
      code: `:::action{id=create-sub-session}
创建子会话「审批细节」

\`\`\`json
{"sessionName":"审批细节","context":"澄清审批节点与角色","memberIds":["uuid-1","uuid-2"]}
\`\`\`
:::

:::action{id=propose-session-conclusion}
确认并记录结论

\`\`\`json
{"proposedConclusion":"本期只做手机号登录，第三方登录以后再说。"}
\`\`\`
:::

:::action{id=skip}
暂时跳过
:::`,
    },
  ],
  en: [
    {
      title: "choice (single)",
      code: `:::choice{id=login mode=single required}
Which login method?

- phone | Phone login
- oauth | Third-party login

hint
:::`,
    },
    {
      title: "choice (multiple)",
      code: `:::choice{id=features mode=multiple required}
Which capabilities?

- export | Export reports
- notify | Notifications
:::`,
    },
    {
      title: "input",
      code: `:::input{id=name placeholder=Example required}
Product name
:::`,
    },
    {
      title: "switch",
      code: `:::switch{id=notify default=off}
Notifications
:::`,
    },
    {
      title: "action (custom data)",
      code: `:::action{id=create-sub-session}
Create sub-session

\`\`\`json
{"sessionName":"Approval details","memberIds":["uuid-1","uuid-2"]}
\`\`\`
:::

:::action{id=propose-session-conclusion}
Confirm & record conclusion

\`\`\`json
{"proposedConclusion":"Ship phone login only this round."}
\`\`\`
:::

:::action{id=skip}
Skip for now
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
    eventsEmpty: "与预览交互后，结果会出现在这里。点击 action 可查看 result.block.data。",
    eventsData: "block.data",
    eventsDataError: "block.dataError",
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
    eventsEmpty:
      "Interact with the preview — results show up here. Click an action to inspect result.block.data.",
    eventsData: "block.data",
    eventsDataError: "block.dataError",
    syntax: "Syntax",
  },
} as const;
