export interface Site {
  name: string;
  matches: string[];
  selector: string;
}

export const sites: Site[] = [
  {
    name: 'Google AI Studio',
    matches: ['https://aistudio.google.com/*'],
    selector: "rect[class*='stoppable-stop']",
  },
  {
    name: 'Kimi Chat',
    matches: [
      'https://www.kimi.com/chat/*',
      'https://kimi.com/chat/*',
      'https://kimi.moonshot.cn/chat/*',
    ],
    selector: "svg[name='stop']",
  },
  {
    name: 'Qwen Chat',
    matches: ['https://chat.qwen.ai/c/*'],
    selector: 'button i.icon-StopIcon',
  },
  {
    name: 'OpenRouter',
    matches: ['https://openrouter.ai/chat*'],
    selector:
      'path[d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"]',
  },
  {
    name: 'ChatGPT',
    matches: ['https://chatgpt.com/*'],
    selector: 'button[data-testid="stop-button"]',
  },
  {
    name: 'Gemini',
    matches: ['https://gemini.google.com/app/*'],
    selector: 'button.stop[aria-label="Stop response"]',
  },
  {
    name: 'Grok',
    matches: ['https://grok.com/chat/*'],
    selector: 'button[aria-label="Stop generating"]',
  },
];