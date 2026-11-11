// Captures README and Chrome Web Store screenshots from the production build in dist/.
// The UI is the real extension; OpenRouter is replaced by fixed responses, so the images
// contain no account data and no personal writing. Run with: npm run screenshots
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { chromium } from "@playwright/test";

const README_DIR = resolve("docs/assets");
const STORE_DIR = resolve("store-assets/screenshots");
const VIEWPORT = { width: 1280, height: 800 };

const DRAFT =
  "Our team have been working on the new onboarding flow for the last three month, and we beleive it is finaly ready for review. Their are a few known issues, but the progress bar dont update on Safari.";
const CORRECTED =
  "Our team has been working on the new onboarding flow for the last three months, and we believe it is finally ready for review. There are a few known issues, but the progress bar doesn't update on Safari.";
const QUICK_DRAFT =
  "Thanks for the quick reply, I will sent the updated contract tommorow morning.";
const QUICK_CORRECTED =
  "Thanks for the quick reply, I will send the updated contract tomorrow morning.";

const MODELS = [
  ["anthropic/claude-haiku-5.5", "Anthropic: Claude Haiku 5.5", "0.0000001", "0.0000005"],
  ["openai/gpt-6-luna", "OpenAI: GPT-6 Luna", "0.00000005", "0.00000025"],
  ["deepseek/deepseek-v4.1-flash", "DeepSeek: DeepSeek V4.1 Flash", "0.00000005", "0.00000057"],
  ["google/gemini-3.8-flash", "Google: Gemini 3.8 Flash", "0.00000038", "0.00000188"],
].map(([id, name, prompt, completion], index) => ({
  id,
  canonical_slug: id,
  name,
  created: 1_790_000_000 - index * 1_000_000,
  description: "",
  context_length: 400_000,
  architecture: { modality: "text->text", input_modalities: ["text"], output_modalities: ["text"] },
  pricing: { prompt, completion },
  top_provider: { context_length: 400_000, max_completion_tokens: 128_000, is_moderated: false },
  per_request_limits: null,
  supported_parameters: ["tools", "max_completion_tokens"],
  default_parameters: null,
  supported_voices: null,
  endpoints: [],
  links: { details: `https://openrouter.ai/${id}` },
}));

const json = (body) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function serveFixtures() {
  const server = createServer(async (request, response) => {
    try {
      const name = new URL(request.url ?? "/", "http://localhost").pathname.replace(/^\/+/u, "");
      const file = await readFile(join(resolve("tests/fixtures"), name.replace(/\.\./gu, "")));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(file);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function mockOpenRouter(context) {
  await context.route(/https:\/\/openrouter\.ai\/api\/v1\/models(?:\?.*)?$/u, (route) =>
    route.fulfill(json({ data: MODELS, links: { next: null }, total_count: MODELS.length })),
  );
  await context.route("https://openrouter.ai/api/v1/chat/completions", (route) => {
    const sent = route.request().postData() ?? "";
    const correctedText = sent.includes("quick reply") ? QUICK_CORRECTED : CORRECTED;
    return route.fulfill(
      json({
        id: "screenshot",
        object: "chat.completion",
        created: 0,
        model: MODELS[0].id,
        system_fingerprint: null,
        choices: [
          {
            index: 0,
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "report",
                  type: "function",
                  function: {
                    name: "report_corrected_text",
                    arguments: JSON.stringify({ correctedText }),
                  },
                },
              ],
            },
          },
        ],
      }),
    );
  });
}

/** Present the 360px popup on a full-bleed 1280×800 stage, as the store requires. */
const POPUP_STAGE = `
  /* A blinking caret or a running transition would make two captures differ. */
  *, *::before, *::after { caret-color: transparent !important; animation: none !important; transition: none !important; }
  html { width: 100% !important; height: 100%; }
  body {
    width: 100% !important; height: 100vh; max-height: none !important; overflow: hidden !important;
    display: grid; place-items: center;
    background:
      radial-gradient(circle at 84% 12%, rgba(105, 192, 127, .13), transparent 30%),
      radial-gradient(circle at 12% 92%, rgba(90, 137, 230, .12), transparent 32%),
      #070707 !important;
  }
  html[data-theme="light"] body {
    background:
      radial-gradient(circle at 84% 12%, rgba(60, 160, 100, .16), transparent 30%),
      radial-gradient(circle at 12% 92%, rgba(70, 110, 220, .14), transparent 32%),
      #ececec !important;
  }
  .shell {
    width: 360px; zoom: var(--stage-zoom, 1.55); overflow: hidden;
    background: var(--background);
    border: 1px solid var(--border); border-radius: 18px;
    box-shadow: 0 40px 120px -30px rgba(0, 0, 0, .7);
    padding-bottom: 8px;
  }
`;

/** The popup's CSP forbids inline styles; a constructed stylesheet is allowed. */
const stage = (page) =>
  page.evaluate((css) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }, POPUP_STAGE);

/** Scale the popup so the whole of the current view fits the stage. */
const fit = (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    root.style.setProperty("--stage-zoom", "1");
    const height = document.querySelector(".shell").getBoundingClientRect().height;
    root.style.setProperty("--stage-zoom", String(Math.min(1.55, 720 / height)));
  });

/** The archive is what gets uploaded to the Chrome Web Store dashboard. */
async function zipStoreScreenshots() {
  const archive = resolve("store-assets/chrome-web-store-screenshots.zip");
  const images = (await readdir(STORE_DIR)).filter((name) => name.endsWith(".jpg")).sort();
  await rm(archive, { force: true });
  // zip records modification times; a fixed one keeps the archive stable across runs.
  const epoch = new Date("2026-01-01T00:00:00Z");
  for (const name of images) await utimes(join(STORE_DIR, name), epoch, epoch);
  // -X and a fixed order keep the archive identical when the images are.
  execFileSync("zip", ["-Xjq", archive, ...images.map((name) => join(STORE_DIR, name))]);
}

async function main() {
  await mkdir(README_DIR, { recursive: true });
  await mkdir(STORE_DIR, { recursive: true });
  const { server, origin } = await serveFixtures();
  const profile = await mkdtemp(join(tmpdir(), "localix-grammar-shots-"));
  const extension = resolve("dist");
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    await mockOpenRouter(context);
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker", { timeout: 15_000 }));
    const extensionId = new URL(worker.url()).host;
    const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`;
    const setState = (theme, connected = true) =>
      worker.evaluate(
        async ({ theme, connected, model }) => {
          await chrome.storage.local.clear();
          await chrome.storage.local.set({
            ...(connected ? { openrouterApiKey: "screenshot-placeholder" } : {}),
            preferences: {
              model,
              enabled: true,
              autoCheck: true,
              checkDelayMs: 1200,
              disabledSites: [],
              theme,
            },
          });
        },
        { theme, connected, model: MODELS[0].id },
      );
    /** Capture until two consecutive frames match, so late paints never reach the file. */
    const settled = async (subject, options) => {
      let previous = await subject.screenshot(options);
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((done) => setTimeout(done, 150));
        const next = await subject.screenshot(options);
        if (next.equals(previous)) return next;
        previous = next;
      }
      return previous;
    };
    /** README images are 2× PNG; store images must be exactly 1280×800. */
    const shoot = async (page, name, { store } = {}) => {
      const popup = name.startsWith("popup");
      if (popup) await fit(page);
      // Move the pointer away so no control is captured in its hover state.
      await page.mouse.move(40, 760);
      // The README shows the popup alone; the store needs it on a full-bleed stage.
      const subject = popup ? page.locator(".shell") : page;
      await writeFile(join(README_DIR, `${name}.png`), await settled(subject, { type: "png" }));
      if (store) {
        const image = await settled(page, { type: "jpeg", quality: 92, scale: "css" });
        await writeFile(join(STORE_DIR, `${store}.jpg`), image);
      }
      console.log(`captured ${name}`);
    };

    for (const theme of ["dark", "light"]) {
      await setState(theme);

      const page = await context.newPage();
      await page.goto(`${origin}/editor.html`);
      await page.locator("#editor").fill(DRAFT);
      await page.locator("#editor").focus();
      const root = page.locator("localix-grammar-root");
      await root.locator(".trigger").click();
      await root.locator(".corrected-preview ins").first().waitFor();
      await shoot(
        page,
        `overlay-${theme}`,
        theme === "dark" ? { store: "01-review-in-place" } : {},
      );
      await page.close();

      const popup = await context.newPage();
      await popup.goto(popupUrl);
      await stage(popup);
      await popup.locator("#quickCheckInput").fill(QUICK_DRAFT);
      await popup.locator("#quickCheckButton").click();
      await popup.locator("#quickCheckDiff ins").first().waitFor();
      await shoot(
        popup,
        `popup-check-${theme}`,
        theme === "dark" ? { store: "02-check-any-text" } : {},
      );

      await popup.locator("#settingsTab").click();
      await popup.getByText("OpenRouter connected").waitFor();
      await shoot(
        popup,
        `popup-settings-${theme}`,
        theme === "dark" ? { store: "03-settings" } : {},
      );

      await popup.locator("#modelButton").click();
      await popup.locator(".model-item").first().waitFor();
      await shoot(
        popup,
        `popup-models-${theme}`,
        theme === "dark" ? { store: "04-choose-your-model" } : {},
      );
      await popup.close();

      await setState(theme, false);
      const connect = await context.newPage();
      await connect.goto(popupUrl);
      await stage(connect);
      await connect.getByRole("button", { name: "Continue with OpenRouter" }).waitFor();
      await shoot(
        connect,
        `popup-connect-${theme}`,
        theme === "dark" ? { store: "05-connect-openrouter" } : {},
      );
      await connect.close();
    }
    await zipStoreScreenshots();
  } finally {
    await context.close();
    server.close();
    await rm(profile, { recursive: true, force: true });
  }
}

await main();
