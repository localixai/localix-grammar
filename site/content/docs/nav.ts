import type { DocsConfig } from '@/shared/config';

// The docs' table of contents. Every markdown file under content/docs is a page listed here, in
// a group, or is named under `unlisted` with why: a file in neither fails the build.
const docs: DocsConfig = {
  index: {
    title: 'Localix Grammar docs',
    description: 'How to install Localix Grammar, connect OpenRouter, check your writing, and what the extension does with your text.',
  },
  groups: [
    {
      title: 'Start',
      blurb: 'From the repository to a first check, and what happens during one.',
      pages: ['getting-started', 'how-it-works'],
    },
    {
      title: 'Use',
      blurb: 'Checking text in an editor, in the popup and on a selection, and the settings that shape it.',
      pages: ['checking', 'settings', 'editors'],
    },
    {
      title: 'Privacy',
      blurb: 'What leaves the browser, where it goes, and why the extension asks for each permission.',
      pages: ['privacy', 'permissions'],
    },
  ],
  unlisted: {},
};

export default docs;
