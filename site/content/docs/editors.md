# Editors and fields

Localix Grammar works in the text fields and rich-text editors of ordinary web pages, and stays out
of fields where checking text would be wrong or unsafe. This page lists both, and how the extension
can be used from the keyboard.

## Where it works

- `<textarea>`
- prose `<input type="text">` and `<input type="search">`
- standard `contenteditable` editors, including formatting split across several text nodes
- editors inside frames, from the same site or another

Rich-text corrections keep the elements around them: links, emphasis and paragraphs. One check takes
up to 20,000 characters; a longer editor is refused with an error rather than checked in part, since
a partial check could look like a clean result.

In an editor that does not take changes from an extension, use **Copy text** in the panel and paste
the result yourself.

## Fields it leaves alone

- passwords and one-time codes;
- payment, identity, address, phone and contact fields;
- numeric and telephone inputs, and widget-style controls;
- disabled and read-only fields;
- spreadsheet cells;
- anything marked `data-localix-grammar-ignore`, `data-grammar-ignore` or
  `data-enable-grammarly="false"`;
- Google Docs, whose document is drawn on a canvas rather than written in the page's text.

Focusing a field sends nothing. An automatic check starts only after you type: input made by the
page's own scripts, and clicks a script makes on the Localix button, are ignored.

## Keyboard and accessibility

- **Tab** reaches the popup's controls, the Localix button beside a field, and the panel's actions.
- **Enter** or **Space** activates the focused control.
- **Escape** closes the panel, or returns from the model list.
- Status, errors, progress, the current model and the number of suggestions are announced to
  assistive technology.
- Motion is turned off when the system asks for reduced motion.
