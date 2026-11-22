# Getting started

Install Localix Grammar from the [Chrome Web Store](https://chromewebstore.google.com/detail/localix-grammar/jjknmlcmaipahifkabacpoppicimkfcj), then connect an
OpenRouter account. To run your own build instead, build it from the repository and load it
unpacked.

## What you need

- Chrome or Chromium 127 or later.
- An OpenRouter account. Each check is a request to the model you pick, at its OpenRouter price.
- Node.js 22.19 or later, only to build it from source.

## From the Chrome Web Store

Open the [Localix Grammar page](https://chromewebstore.google.com/detail/localix-grammar/jjknmlcmaipahifkabacpoppicimkfcj), choose **Add to Chrome**, and pin it from the
puzzle-piece menu if you want its button in the toolbar. Chrome updates it on its own.

## From source

```bash
git clone https://github.com/localixai/localix-grammar && cd localix-grammar
npm ci --ignore-scripts
npm run build
```

The unpacked extension is now in `dist/`.

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `dist/` folder.

Reload any page that was already open, so the extension can reach its editors. To update later,
pull the repository, run `npm run build` again, and press the reload button on the extension's card
in `chrome://extensions`.

## Connect OpenRouter

Select the Localix Grammar icon in Chrome's toolbar. The popup says what will be sent before you
connect: the text of the editor you are checking, when you ask for a check and, while **Check while
typing** is on, after a pause in your typing. Nothing is sent before you connect.

- **Continue with OpenRouter** signs in through OAuth (with PKCE) in a Chrome window.
- **Use API key** takes an existing OpenRouter inference key. It is verified with OpenRouter before
  it is stored; management keys are rejected.

Either way the key is stored in extension storage that only the extension's service worker reads,
and the popup never shows it again. **Disconnect** in Settings removes it.

## Pick a model

A fresh install uses `~anthropic/claude-haiku-latest`, an OpenRouter alias that follows the newest
Claude Haiku. To change it, open **Settings** in the popup and choose the model under **Model**:
the list is OpenRouter's live catalog of tool-capable models, with a search field, three ways to
sort, and each model's input and output price per million tokens.

Models differ in how well they proofread. If one returns errors or misses mistakes, try another on
the same text.

## Your first check

Click into a text field or a rich-text editor on any page and type a few words with a mistake.
After a short pause the Localix button at the lower-right corner of the field shows how many
changes it suggests; select it to see them. [Checking your writing](checking.md) covers the rest.
