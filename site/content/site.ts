import type { SiteConfig } from '@/shared/config';

// What the site knows about itself: the product's name, where the site is published, the
// repository, how the extension is installed. There is no Chrome Web Store listing yet, so the
// way in is the repository's own: build it from source and load it unpacked.
const GITHUB = 'https://github.com/localixai/localix-grammar';
const DESCRIPTION =
  'Localix Grammar fixes spelling, grammar and punctuation in the editor you are already typing in, shows every change as a tracked edit, and applies them in one click. Your key stays in the extension; your text goes only to the OpenRouter model you chose.';

const site: SiteConfig = {
  name: 'Localix Grammar',
  title: 'Localix Grammar: a precise, privacy-aware proofreader for Chrome',
  description: DESCRIPTION,
  url: 'https://grammar.localix.ai',
  github: GITHUB,
  // The site is a folder of the product's repository, not a repository of its own.
  sourceDir: 'site',
  // One step a line, so every step shows; Copy takes all four, which a shell runs in turn,
  // stopping at the first that fails.
  install: [['From source', `git clone \\\n${GITHUB} &&\ncd localix-grammar &&\nnpm ci --ignore-scripts &&\nnpm run build`]],
  image: {
    path: '/og.png',
    width: 2400,
    height: 1260,
    alt: 'Localix Grammar, a precise, privacy-aware proofreader for Chrome: a draft in a web editor with the Localix Grammar panel beside it, its corrections as tracked changes',
  },
  bar: {
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Privacy', href: '/docs/privacy' },
      { label: 'GitHub', href: GITHUB },
    ],
    action: { label: 'Install', href: '/#start' },
  },
  footer: {
    note: 'Localix Grammar is MIT-licensed and open source, from Localix Lab.',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Privacy policy', href: '/docs/privacy' },
      { label: 'GitHub', href: GITHUB },
      { label: 'Changelog', href: `${GITHUB}/blob/main/CHANGELOG.md` },
      { label: 'localix.ai', href: 'https://localix.ai' },
    ],
  },
  jsonLd: {
    '@type': 'SoftwareApplication',
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome 127 or later',
    license: 'https://opensource.org/licenses/MIT',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  llms: '> Localix Grammar is an open source Chrome extension that proofreads text in web editors with a model the user picks on OpenRouter: it fixes spelling, grammar and punctuation, shows each change as a tracked edit, and applies them in one click.',
};

export default site;
