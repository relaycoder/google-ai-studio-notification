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
    selector: "button > span[aria-label='stop']",
  },
];