# Chrome Web Store listing draft

## Name

Localix Grammar

## Short description

Precise AI grammar, spelling, punctuation, and style checks inside supported web editors.

## Detailed description

Write with confidence without leaving the page.

Localix Grammar reviews text in supported website editors and returns focused grammar, spelling,
punctuation, and clarity suggestions. Preview the corrected text, accept or reject individual
Git-style changes, or decide on all changes at once.

### Built for real web editors

- Works with textareas, prose inputs, rich text, and frames
- Preserves links, emphasis, paragraphs, and surrounding formatting
- Rejects stale or model-invented corrections before changing the page
- Cancels obsolete checks while you continue typing

### Your model choice

Connect your own OpenRouter account with secure PKCE—or use an existing inference API key—and
choose a model from OpenRouter's live catalog. Copying a key is optional.

### Controls that stay out of the way

- Manual or check-while-typing modes
- Global and per-site switches
- Every change marked in the corrected text; apply all of it, or copy the text
- Searchable model picker
- Dark, light, and system themes
- Keyboard navigation and reduced-motion support

### Privacy-aware by design

Localix operates no grammar proxy or text database. The OpenRouter key is stored in trusted Chrome
extension storage and never sent to webpage scripts. Password, authentication-code, payment,
identity, and read-only fields are excluded.

Text selected for a grammar check is sent through OpenRouter to the model you choose. OpenRouter and
the selected provider's policies apply.

Before connection, the popup explains that active-editor text is sent for manual checks and, when
enabled, after a typing pause. Choosing **Continue with OpenRouter** or submitting an API key is the
affirmative action that follows this disclosure; no writing is submitted before a connection
exists.

Focusing an editor alone does not send text. Automatic checks require trusted user input, and
page-script-generated input or trigger clicks are ignored.

## Category

Productivity

## Language

English listing; the grammar engine detects multilingual writing and receives the editor's valid
language hint when available.

## Permission justifications

### storage

Required to save the selected model, theme, enable/automatic-check settings, disabled-site list,
and the OAuth-issued or manually supplied OpenRouter key. Credential access is restricted to
trusted extension contexts.

### identity

Required to complete OpenRouter's OAuth PKCE authorization through Chrome's managed web-auth flow.

### contextMenus

Required to add one item, **Correct selected text with Localix Grammar**, to the right-click menu.
The selected text is read only when the person chooses that item, and is checked like any other
text.

### Host access on all sites

The content script requires access for the extension's single purpose: show the Localix control in
supported web editors across HTTP(S) websites and frames. Chrome-internal and local file pages are
not matched. Text is read only from the active eligible editor when a manual or automatic check
runs. Sensitive and opt-out fields are excluded.

### openrouter.ai

Required for the extension service worker to authenticate with OpenRouter, load the model catalog,
and send user-requested grammar checks. Background network access is restricted to
`https://openrouter.ai/*`.

## Data disclosure notes

- Website content is processed for the grammar feature.
- Authentication information is stored locally for OpenRouter requests.
- No analytics, advertising, browsing-history collection, sale, or unrelated data use.
- No remotely hosted executable code.
- Link the listing to `PRIVACY_POLICY.md` published at a stable HTTPS URL.
- Confirm the Limited Use declaration and prominent pre-OAuth disclosure against the current
  Chrome Web Store dashboard form.

## Screenshots and captions

`npm run screenshots` captures these from the production build at 1280×800, with fixed model
responses, into `store-assets/screenshots/` and `store-assets/chrome-web-store-screenshots.zip`.

1. **Review writing in place** (`01-review-in-place.jpg`): tracked changes beside a web editor.
2. **Check any text** (`02-check-any-text.jpg`): the popup checking pasted text.
3. **Control where checks run** (`03-settings.jpg`): account, automatic checks, per-site pause.
4. **Choose your model** (`04-choose-your-model.jpg`): the searchable OpenRouter model list.
5. **Connect in one step** (`05-connect-openrouter.jpg`): OpenRouter sign-in or an API key.

The images contain no personal writing and no API key. Look at them before uploading.

## Support

- Homepage: `https://grammar.localix.ai`
- Source and issues: `https://github.com/localixai/localix-grammar`
- Privacy policy: `https://grammar.localix.ai/privacy` (the repository's `PRIVACY_POLICY.md`, published by the site)
