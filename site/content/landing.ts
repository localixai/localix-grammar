import type { Block, Card, LandingContent, Media, Shot } from '@/shared/config';

// The landing's words. The design is the template's; this file is the site's. The pictures are
// the repository's own screenshots (public/shots links to docs/assets), captured from the
// production build by `npm run screenshots`. The page is dark whatever the reader's system says,
// so it always shows the extension's dark theme.
const DOCS = '/docs';
const GITHUB = 'https://github.com/localixai/localix-grammar';

const terminal = (blocks: Block[], label: string): Media => ({ kind: 'terminal', blocks, label });
const shot = (name: string, width: number, height: number, alt: string): Shot => ({
  src: `/shots/${name}-dark.png`,
  alt,
  width,
  height,
});
const image = (picture: Shot): Media => ({ kind: 'image', ...picture });

const OVERLAY = shot(
  'overlay',
  2560,
  1600,
  'A draft in a web editor with the Localix Grammar panel beside it: removed words struck through in red, corrected words in green, and one button to apply every change',
);

const CARDS: Card[] = [
  {
    tag: 'Anywhere you write',
    title: 'In the editor, in the popup, on a selection',
    text: 'Type in a text field or a rich-text editor and the check runs after a short pause, or press the button beside the field. Paste text copied from anywhere into the popup for the same review, with the corrected text ready to copy. Or select text, right-click, and choose “Correct selected text with Localix Grammar”.',
    links: [{ href: `${DOCS}/checking`, label: 'Checking your writing' }],
    media: image(shot('popup-check', 1116, 1400, 'The popup checking pasted text and showing its corrections as tracked changes')),
  },
  {
    tag: 'Your model',
    title: 'Any OpenRouter model, with its price',
    text: 'Sign in to OpenRouter with “Continue with OpenRouter”, or paste an API key. Pick any tool-capable model from the live catalog, searchable and priced per million tokens; a fresh install starts on the newest Claude Haiku.',
    links: [{ href: `${DOCS}/getting-started#connect-openrouter`, label: 'Connect and pick a model' }],
    media: image(shot('popup-models', 880, 1436, 'The searchable OpenRouter model list with prices')),
  },
  {
    tag: 'Control',
    title: 'It runs where and when you say',
    text: 'Check while typing, or only when you press the button. Pause it on one site or everywhere. It stays out of passwords, one-time codes, payment and identity fields, read-only controls and spreadsheet cells, and follows the system theme or stays light or dark.',
    links: [
      { href: `${DOCS}/settings`, label: 'Settings' },
      { href: `${DOCS}/editors`, label: 'Editors and fields' },
    ],
    media: image(shot('popup-settings', 1088, 1444, 'Settings: the connected account, automatic checks, per-site pause and theme')),
  },
  {
    tag: 'Precise',
    title: 'The model returns text; the extension finds the changes',
    text: 'One request per check. The model sends back the corrected text and nothing else, and the extension compares it with yours, word by word. A suggestion cannot point at the wrong place, and a reply that rewrites or answers your text is rejected.',
    links: [{ href: `${DOCS}/how-it-works`, label: 'How a check works' }],
    media: terminal(
      [
        {
          grid: [
            [['hi', '1  Sent as data'], ['dim', 'your text, inside tags, with a prompt to correct errors only']],
            [['hi', '2  Text back'], ['dim', 'the corrected text, as one tool call: no offsets, no labels']],
            [['hi', '3  Compared'], ['dim', 'each difference grown to whole words: teh → the']],
            [['hi', '4  Checked'], ['dim', 'a reply far shorter or longer than yours is rejected']],
            [['hi', '5  Applied'], ['dim', 'native input events and DOM ranges, never innerHTML']],
          ],
        },
      ],
      'How a check works, in five steps: the text is sent as data, the model returns the corrected text, the extension derives the changes, the answer is checked, and applying keeps the page intact',
    ),
  },
  {
    tag: 'Private',
    title: 'Your key stays in the extension',
    text: 'Text is sent only when a check runs, only to OpenRouter, and only to the model you selected. Localix runs no server between you and the model, and no analytics.',
    links: [
      { href: `${DOCS}/privacy`, label: 'Privacy policy' },
      { href: `${DOCS}/permissions`, label: 'Permissions' },
    ],
    media: terminal(
      [
        {
          grid: [
            [['hi', 'Text'], ['dim', 'sent when a check runs, to the model you chose']],
            [['hi', 'API key'], ['dim', 'in extension storage; pages never receive it']],
            [['hi', 'Network'], ['dim', 'https://openrouter.ai/* and nothing else']],
            [['hi', 'Tracking'], ['dim', 'no analytics, no advertising, no history']],
            [['hi', 'Code'], ['dim', 'all of it in the package, nothing loaded remotely']],
          ],
        },
      ],
      'What leaves the browser: text only when a check runs and only to the chosen model, the key kept in extension storage, network access limited to openrouter.ai, no analytics and no remote code',
    ),
  },
];

const landing: LandingContent = {
  hero: {
    title: { rest: 'A precise, privacy-aware proofreader for Chrome' },
    lede: 'It fixes spelling, grammar and punctuation in the editor you are already typing in, shows every change as a tracked edit, and applies them in one click. On any OpenRouter model, with your own key.',
    under: 'Build it, then load `dist/` unpacked in `chrome://extensions`. Needs Node.js 22.19 and Chrome 127 or later. [Install guide](/docs/getting-started)',
    shot: OVERLAY,
  },
  loop: {
    title: 'A proofreader, and nothing else',
    aside: 'Five things it does',
    cards: CARDS,
  },
  docs: { title: 'Documentation' },
  closing: {
    title: 'Install from source',
    aside: 'Free · MIT license',
    steps: [
      { title: 'Build it', text: 'With Node.js 22.19 or later: clone the repository, then `npm ci --ignore-scripts` and `npm run build`. The extension is in `dist/`.' },
      { title: 'Load it', text: 'Open `chrome://extensions`, turn on Developer mode, choose Load unpacked and select `dist/`.' },
      { title: 'Connect', text: 'Open the popup and choose “Continue with OpenRouter”, or paste an API key. Pick a model, and type in any editor.' },
    ],
    links: [
      { label: 'Install guide', href: `${DOCS}/getting-started` },
      { label: 'Source on GitHub', href: GITHUB },
    ],
  },
};

export default landing;
