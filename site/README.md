# The site

The landing page and the docs of Localix Grammar, served at <https://grammar.localix.ai>, as a
folder of the product's repository. It was made from the
[llx-sitekit](https://github.com/rsaryev/llx-sitekit) template (its commit `6d1d483`) and keeps the
template's layout, so [AGENTS.md](AGENTS.md) here holds for every change in this folder.

```sh
cd site
npm install
npm run dev          # http://localhost:5173
npm run check        # the layers, the types, the build, the docs' standard
```

## What is whose

| Path | Owner | |
| --- | --- | --- |
| `content/` | the site | `site.ts` (name, address, the install command), `landing.ts` (the landing's words and pictures), `docs/` (the pages and `nav.ts`), `theme.css` |
| `public/` | the site | the icons, the link preview (`og.png`, drawn from `og-card.html`), `llms.txt`, `robots.txt`, `_redirects` |
| `public/shots` | the product | a link to `docs/assets/`: the screenshots `npm run screenshots` captures, in light and dark |
| `src/`, `scripts/`, the configs | the template | change one only where the site cannot say it in `content/` |

## What differs from a site cloned from the template

- **It has no repository of its own.** `content/site.ts` says so with `sourceDir: 'site'`, which
  `sourceUrl` in `src/shared/config/index.ts` puts into a page's "Edit on GitHub".
- **Its pictures follow the reader's theme.** The page is the template's dark one, but a screenshot
  can name a `dark` file beside its light one (`Shot` in `src/shared/config/types.ts`, drawn by
  `src/shared/ui/Picture.tsx`), and the hero takes a picture (`hero.shot`) instead of a recording.
- **The link preview is drawn larger**, 2400×1260; `image.width` and `image.height` say so in the
  page's head.
- **The privacy policy is a docs page**, `content/docs/privacy.md`, reached at `/docs/privacy` and
  at `/privacy` (`public/_redirects`). Its text is the repository's `PRIVACY_POLICY.md` with the
  overview as its opening paragraph: change both together.
- **Its workflow is the repository's**, `.github/workflows/site.yml`: a workflow in a folder never
  runs, so the template's own are not here.
- **`npm run sync` does not apply.** It merges the template's branch into a repository's root.
  Until the template can sync into a folder, an update of the template is carried over by hand:
  its `CHANGELOG.md` lists what changed and what a site has to change.

## Publishing

A push to `main` that touches `site/`, the screenshots in `docs/assets/` or the workflow runs
`site.yml`: the check, then `dist/` to the Cloudflare Pages project `localix-grammar` when the
repository has the two secrets the workflow names.
