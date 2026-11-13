# Settings

The popup's **Settings** view holds the connection, where and when checks run, the model, and the
theme. Every setting is stored in Chrome's extension storage on your device.

## The settings

| Setting                | What it does                                                               |
| ---------------------- | -------------------------------------------------------------------------- |
| **Grammar everywhere** | Turns the extension on, or pauses it on every site                         |
| **Check while typing** | Runs a check after a short pause in your typing; off, checks run only when you select the button |
| **This site**          | Turns it on, or pauses it, for the current site only                       |
| **Model**              | The OpenRouter model checks use, chosen from the live catalog with its price per million tokens |
| Theme button           | Cycles the popup and the panel between dark, light and the system theme    |
| **Disconnect**         | Deletes the stored OpenRouter key                                          |

Changing the model sets aside current results; a cached answer from one model is never shown for
another.

## Choosing a model

**Model** opens the list of tool-capable models from OpenRouter's catalog. Search it by name, sort
it newest first, oldest first or by name, and select one. **Escape** returns from the list. A fresh
install uses `~anthropic/claude-haiku-latest`, which follows the newest Claude Haiku.

## Pausing it

To keep Localix Grammar off a site for good, open the popup on that site and turn off **This site**.
To stop it everywhere for a while, turn off **Grammar everywhere**. Pages can also opt a field out
themselves; see [editors and fields](editors.md#fields-it-leaves-alone).
