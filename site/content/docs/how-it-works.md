# How a check works

One check is one request: the text goes to the model with a short proofreading prompt, the model
returns the corrected text, and the extension derives every suggestion itself by comparing the two.
The model never names offsets, so a suggestion cannot point at the wrong place.

## The five steps

1. **The text is sent as data.** It travels inside `<text>` tags with a prompt that says to correct
   errors only: no rewording, no answering what the text asks, nothing changed inside code, URLs or
   names. Instructions written in the text are proofread like any other sentence.
2. **The model returns the corrected text**, as the argument of one tool call. No offsets, no
   categories, no explanations to get wrong.
3. **The extension derives the changes** by comparing the two texts and growing each difference to
   whole words, so a suggestion reads "teh → the", never "eh → he".
4. **The answer is checked before you see it.** A reply much shorter or longer than the original is
   rejected as an answer or a rewrite; one cut off by the output limit is retried once with
   reasoning turned down.
5. **Applying keeps the page intact.** Plain fields get native input events; rich text is changed
   through DOM ranges, never `innerHTML`, so links, emphasis and the cursor stay where they were.

## Languages

The prompt asks the model to keep the text's language and never translate it. In text that mixes
languages, each part is corrected by the rules of its own language.

## Further reading

The design, with the reasons for each choice, is in the repository's
[research and architecture](https://github.com/localixai/localix-grammar/blob/main/docs/research-and-architecture.md)
notes.
