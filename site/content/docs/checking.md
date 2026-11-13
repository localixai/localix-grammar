# Checking your writing

There are three ways to check text: in the editor you are typing in, in the popup with text pasted
from anywhere, and on a selection through the right-click menu. Each shows the corrections as
tracked changes: removed words struck through, corrected words beside them.

## In an editor

Focus a text field or a rich-text editor. The Localix button sits at the lower-right corner of the
field.

- With **Check while typing** on (the default), a check runs after a 700-millisecond pause, once the
  editor holds at least three words. Requests made obsolete by further typing are cancelled.
- Select the button to check now, or to open the suggestions.

The panel lists the number of improvements and the corrected text with each change marked.

- **Apply all** writes every change into the editor, keeping links, emphasis and paragraphs.
- **Copy text** copies the corrected text, for an editor that does not take changes from an
  extension.
- **Escape** or the close button closes the panel.

Before a change is applied, the extension checks that the text it was made for is still there. If
you edited the field while the model was answering, that answer is discarded; run the check again.

A result is kept in memory for five minutes, so the same text with the same model is not sent
again. That memory is never written to disk and is cleared when you disconnect.

## In the popup

Open the popup and paste text into **Check text**, up to 20,000 characters, then select **Check**.
The corrections appear as tracked changes under it. **Copy text** copies the corrected text, and
**Undo** restores what you pasted.

## On a selection

Select text on a page, right-click, and choose **Correct selected text with Localix Grammar**. The
selection opens in the popup checker and is corrected there, which also works for text in rich-text
frames. Use **Copy text** to paste the result back.

## What a check does not change

The prompt asks for errors only: spelling, grammar, punctuation, capitalization and spacing. It does
not reword, does not answer questions the text asks, and leaves code, URLs and names as they are.
See [how a check works](how-it-works.md).
