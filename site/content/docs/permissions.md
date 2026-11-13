# Permissions

Localix Grammar has one purpose: to review and correct writing in web editors with a model you
select through your OpenRouter account. This page lists each permission it asks Chrome for, why, and
what it lets the extension see.

## What it asks for

| Permission                    | Why                                                                  | What it exposes                                         |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `storage`                     | Keeps your preferences and the OpenRouter key                        | The extension's own settings and key                    |
| `identity`                    | Runs OpenRouter's OAuth sign-in through Chrome's managed web-auth flow | The OAuth callback code                                 |
| `contextMenus`                | Adds **Correct selected text with Localix Grammar** to the right-click menu | The text you selected, when you choose that item        |
| `https://openrouter.ai/*`     | Lets the service worker call the model you selected                  | Text submitted for a check, and the OpenRouter key      |
| Content scripts on HTTP(S) pages | Shows the Localix button and panel in editors across websites and frames | Text in the editor you are checking, when a check runs  |

It does not ask for `tabs`, browsing history, cookies, the clipboard, downloads, notifications or
location. Chrome's own pages, extension pages and local `file://` documents are not matched.

## Why content scripts run on every site

The product works in editors on any website, so its content script has to be able to load on any
of them. What it actually reads is narrowed at run time: only the editor you are checking, never
the fields listed under [fields it leaves alone](editors.md#fields-it-leaves-alone), and nothing
before you type or ask for a check. Network access from the extension itself is limited to
`https://openrouter.ai/*`.

## Where the key and the text go

```text
the editor you are checking
  └─ its text ─► the extension's content script (isolated from the page)
       └─ a typed message ─► the extension's service worker
            ├─ the API key, read from extension storage
            └─ the text ─► OpenRouter ─► the model you selected
```

The key never enters a content script, so the page and its scripts cannot reach it. The extension's
pages allow scripts, styles, fonts and images only from the package itself, and network requests
only to `https://openrouter.ai`.

## Stored on your device

- the OpenRouter API key
- the selected model
- the global and automatic-check switches, and the check delay
- the list of sites where it is paused
- the theme

Submitted text and its results are kept only in memory, for up to five minutes, and are cleared when
you disconnect. The full reasoning is in the repository's
[permissions and privacy notes](https://github.com/localixai/localix-grammar/blob/main/docs/permissions-and-privacy.md);
the commitments are in the [privacy policy](privacy.md).
