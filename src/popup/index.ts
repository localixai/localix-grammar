import type {
  CheckResult,
  Message,
  MessageResponse,
  ModelInfo,
  Preferences,
  SettingsView,
  ThemeMode,
} from "../shared/types";
import { MAX_CHECK_TEXT_LENGTH } from "../shared/types";
import { correctedText } from "../shared/utils/corrected-text";
import { renderDiff } from "../shared/utils/diff-segments";
import {
  isPendingSelection,
  PENDING_SELECTION_KEY,
  type PendingSelection,
} from "../shared/utils/pending-selection";
import { sendRuntimeMessage } from "../shared/utils/runtime-message";

const THEME_ICON: Record<ThemeMode, string> = {
  dark: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.7 12.7A6.5 6.5 0 0 1 7.3 4.3 6.5 6.5 0 1 0 15.7 12.7Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  light:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.3 4.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  system:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3.5" width="15" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 17h6m-3-2.5V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing popup element #${id}`);
  return value as T;
}

/** Longer than the service worker's own deadline for each task, so its answer always arrives. */
const MESSAGE_TIMEOUT_MS: Partial<Record<Message["type"], number>> = {
  CHECK_TEXT: 70_000,
  FETCH_MODELS: 30_000,
  INITIATE_OAUTH: 300_000,
  CONNECT_API_KEY: 20_000,
};

function sendMessage(message: Message): Promise<MessageResponse> {
  return sendRuntimeMessage(
    message,
    MESSAGE_TIMEOUT_MS[message.type] ?? 10_000,
    "Localix Grammar did not respond. Try again.",
  );
}

const THEME_CACHE_KEY = "localix-theme";

/** The theme last used, so the popup opens in it instead of flashing the other one. */
function cachedTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_CACHE_KEY);
    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}

function isSettingsView(value: unknown): value is SettingsView {
  return (
    !!value &&
    typeof value === "object" &&
    "connected" in value &&
    typeof (value as { connected?: unknown }).connected === "boolean" &&
    "disabledHere" in value &&
    typeof (value as { disabledHere?: unknown }).disabledHere === "boolean"
  );
}

function nextTheme(theme: ThemeMode): ThemeMode {
  if (theme === "dark") return "light";
  if (theme === "light") return "system";
  return "dark";
}

function resolveTheme(theme: ThemeMode): "dark" | "light" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

async function activeHostname(): Promise<string | null> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    return null;
  }
  const tabId = tabs[0]?.id;
  if (tabId === undefined) return null;
  try {
    const response: unknown = await chrome.tabs.sendMessage(
      tabId,
      { type: "GET_LOCALIX_SITE_CONTEXT" },
      { frameId: 0 },
    );
    const hostname =
      response && typeof response === "object" && "hostname" in response ? response.hostname : null;
    return typeof hostname === "string" &&
      hostname.length > 0 &&
      hostname.length <= 253 &&
      !/[\s/?#@]/u.test(hostname)
      ? hostname.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

const loadingView = element("loadingView");
const connectView = element("connectView");
const checkView = element("checkView");
const settingsView = element("settingsView");
const modelsView = element("modelsView");
const popupNav = element("popupNav");
const checkTab = element<HTMLButtonElement>("checkTab");
const settingsTab = element<HTMLButtonElement>("settingsTab");
const connectButton = element<HTMLButtonElement>("connectButton");
const tokenToggleButton = element<HTMLButtonElement>("tokenToggleButton");
const tokenPanel = element<HTMLFormElement>("tokenPanel");
const apiKeyInput = element<HTMLInputElement>("apiKeyInput");
const tokenVisibilityButton = element<HTMLButtonElement>("tokenVisibilityButton");
const connectTokenButton = element<HTMLButtonElement>("connectTokenButton");
const connectError = element("connectError");
const disconnectButton = element<HTMLButtonElement>("disconnectButton");
const enabledToggle = element<HTMLInputElement>("enabledToggle");
const autoCheckToggle = element<HTMLInputElement>("autoCheckToggle");
const siteSetting = element("siteSetting");
const siteToggle = element<HTMLInputElement>("siteToggle");
const siteTitle = element("siteTitle");
const siteSubtitle = element("siteSubtitle");
const themeButton = element<HTMLButtonElement>("themeButton");
const modelButton = element<HTMLButtonElement>("modelButton");
const modelName = element("modelName");
const modelId = element("modelId");
const modelsBackButton = element<HTMLButtonElement>("modelsBackButton");
const modelSearch = element<HTMLInputElement>("modelSearch");
const modelSort = element<HTMLSelectElement>("modelSort");
const modelList = element("modelList");
const popupAlert = element("popupAlert");
const quickCheckForm = element<HTMLFormElement>("quickCheckForm");
const quickCheckInput = element<HTMLTextAreaElement>("quickCheckInput");
const quickCheckButton = element<HTMLButtonElement>("quickCheckButton");
const quickCheckCount = element("quickCheckCount");
const quickCheckStatus = element("quickCheckStatus");
const quickCheckCopy = element<HTMLButtonElement>("quickCheckCopy");
const quickCheckDiff = element("quickCheckDiff");
const quickCheckUndo = element<HTMLButtonElement>("quickCheckUndo");

let settings: SettingsView | null = null;
let hostname: string | null = null;
let models: ModelInfo[] = [];
let modelsLoading: Promise<void> | null = null;
let modelsError = "";
/** The text as it was before the last check replaced it. */
let textBeforeCheck: string | null = null;
let alertTimer: number | undefined;
let quickCheckRequestId: string | null = null;
let connectedView: "check" | "settings" = "check";
let queuedSelection: PendingSelection | null = null;
let consumedSelectionId: string | null = null;

function consumeSelection(value: unknown): void {
  if (!isPendingSelection(value) || consumedSelectionId === value.id) return;
  if (Date.now() - value.createdAt > 60_000 || !value.text.trim()) return;
  if (!settings) {
    queuedSelection = value;
    return;
  }
  consumedSelectionId = value.id;
  quickCheckInput.value = value.text.slice(0, MAX_CHECK_TEXT_LENGTH);
  quickCheckInput.dispatchEvent(new Event("input", { bubbles: true }));
  if (value.truncated) {
    quickCheckStatus.textContent = "Only the first 20,000 characters were selected.";
  } else if (settings.connected) {
    connectedView = "check";
    show(checkView);
    quickCheckForm.requestSubmit();
  }
  void chrome.storage.session.remove(PENDING_SELECTION_KEY);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session") consumeSelection(changes[PENDING_SELECTION_KEY]?.newValue);
});

function clearQuickCheckDiff(): void {
  quickCheckDiff.replaceChildren();
  quickCheckDiff.classList.add("hidden");
  textBeforeCheck = null;
  quickCheckUndo.classList.add("hidden");
}

function setQuickCheckText(text: string): void {
  quickCheckInput.value = text;
  quickCheckCount.textContent = `${text.length.toLocaleString()} / ${MAX_CHECK_TEXT_LENGTH.toLocaleString()}`;
  quickCheckCount.classList.toggle("over-limit", text.length > MAX_CHECK_TEXT_LENGTH);
  const hasText = !!text.trim();
  quickCheckButton.disabled = !hasText || text.length > MAX_CHECK_TEXT_LENGTH;
  quickCheckCopy.disabled = !hasText;
}

function renderQuickCheck(result: CheckResult): void {
  clearQuickCheckDiff();
  if (result.errors.length === 0) {
    quickCheckStatus.textContent = "No corrections needed";
    return;
  }
  setQuickCheckText(correctedText(result));
  textBeforeCheck = result.originalText;
  quickCheckUndo.classList.remove("hidden");
  quickCheckStatus.textContent = `${result.errors.length} ${result.errors.length === 1 ? "correction" : "corrections"} applied`;
  quickCheckDiff.append(renderDiff(result, document));
  quickCheckDiff.classList.remove("hidden");
}

function cancelQuickCheck(): void {
  if (!quickCheckRequestId) return;
  void sendMessage({ type: "CANCEL_CHECK", payload: { requestId: quickCheckRequestId } });
  quickCheckRequestId = null;
  quickCheckButton.textContent = "Check";
}

quickCheckInput.addEventListener("input", () => {
  cancelQuickCheck();
  setQuickCheckText(quickCheckInput.value);
  quickCheckStatus.textContent =
    quickCheckInput.value.length > MAX_CHECK_TEXT_LENGTH
      ? `Shorten the text to ${MAX_CHECK_TEXT_LENGTH.toLocaleString()} characters to check it.`
      : "";
  clearQuickCheckDiff();
});

quickCheckUndo.addEventListener("click", () => {
  if (textBeforeCheck === null) return;
  const original = textBeforeCheck;
  clearQuickCheckDiff();
  setQuickCheckText(original);
  quickCheckStatus.textContent = "Original text restored";
  quickCheckInput.focus();
});

// A check the popup no longer waits for should not keep spending tokens.
window.addEventListener("pagehide", cancelQuickCheck);

quickCheckForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = quickCheckInput.value;
  if (!text.trim() || text.length > MAX_CHECK_TEXT_LENGTH || quickCheckRequestId) return;
  const requestId = crypto.randomUUID();
  quickCheckRequestId = requestId;
  quickCheckButton.disabled = true;
  quickCheckButton.textContent = "Checking…";
  quickCheckStatus.textContent = "";
  void (async (): Promise<void> => {
    const response = await sendMessage({ type: "CHECK_TEXT", payload: { requestId, text } });
    if (quickCheckRequestId !== requestId) return;
    quickCheckRequestId = null;
    // Whatever went wrong, make sure the service worker is not still working on it.
    if (!response.success) void sendMessage({ type: "CANCEL_CHECK", payload: { requestId } });
    quickCheckButton.disabled = false;
    quickCheckButton.textContent = "Check";
    if (quickCheckInput.value !== text) return;
    if (
      !response.success ||
      !response.data ||
      !Array.isArray((response.data as CheckResult).errors)
    ) {
      quickCheckStatus.textContent = response.success
        ? "Could not read the result."
        : response.error;
      return;
    }
    renderQuickCheck(response.data as CheckResult);
  })();
});

quickCheckCopy.addEventListener("click", () => {
  if (!quickCheckInput.value) return;
  void (async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(quickCheckInput.value);
      quickCheckStatus.textContent = "Text copied";
    } catch {
      quickCheckStatus.textContent = "Could not copy. Select the text above.";
    }
  })();
});

quickCheckButton.disabled = true;

function show(view: HTMLElement): void {
  for (const candidate of [loadingView, connectView, checkView, settingsView, modelsView]) {
    candidate.classList.toggle("hidden", candidate !== view);
  }
  popupNav.classList.toggle("hidden", view !== checkView && view !== settingsView);
  checkTab.setAttribute("aria-current", view === checkView ? "page" : "false");
  settingsTab.setAttribute("aria-current", view === settingsView ? "page" : "false");
}

checkTab.addEventListener("click", () => {
  connectedView = "check";
  show(checkView);
});
settingsTab.addEventListener("click", () => {
  connectedView = "settings";
  show(settingsView);
});

function showAlert(message: string): void {
  window.clearTimeout(alertTimer);
  popupAlert.textContent = message;
  popupAlert.title = "Click to dismiss";
  popupAlert.classList.remove("hidden");
  alertTimer = window.setTimeout(() => popupAlert.classList.add("hidden"), 6_000);
}

popupAlert.addEventListener("click", () => clearAlert());

function clearAlert(): void {
  window.clearTimeout(alertTimer);
  popupAlert.classList.add("hidden");
  popupAlert.textContent = "";
}

function showConnectError(message: string): void {
  connectError.textContent = message;
  connectError.classList.remove("hidden");
}

function clearConnectError(): void {
  connectError.textContent = "";
  connectError.classList.add("hidden");
}

function setConnectBusy(busy: boolean): void {
  connectButton.disabled = busy;
  tokenToggleButton.disabled = busy;
  apiKeyInput.disabled = busy;
  tokenVisibilityButton.disabled = busy;
  connectTokenButton.disabled = busy;
}

function resetConnectionForm(): void {
  setConnectBusy(false);
  connectButton.textContent = "Continue with OpenRouter";
  connectTokenButton.textContent = "Connect with API key";
  apiKeyInput.value = "";
  apiKeyInput.type = "password";
  tokenVisibilityButton.textContent = "Show";
  tokenVisibilityButton.setAttribute("aria-label", "Show API key");
  tokenPanel.classList.add("hidden");
  tokenToggleButton.setAttribute("aria-expanded", "false");
  clearConnectError();
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset["theme"] = resolveTheme(theme);
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // Storage can be unavailable; the popup then opens in the system theme.
  }
  themeButton.innerHTML = THEME_ICON[theme];
  const next = nextTheme(theme);
  themeButton.setAttribute("aria-label", `Theme: ${theme}. Switch to ${next}.`);
  themeButton.title = `Theme: ${theme}`;
}

function modelLabel(id: string): string {
  return models.find((model) => model.id === id)?.name ?? id.split("/").pop() ?? id;
}

function renderSelectedModel(): void {
  if (!settings) return;
  modelName.textContent = modelLabel(settings.model);
  modelId.textContent = settings.model;
}

function modelCost(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return "—";
  if (value === 0) return "$0";
  return `$${value < 0.01 ? value.toFixed(4) : value.toFixed(2)}`;
}

function renderSettings(): void {
  if (!settings) return;
  applyTheme(settings.theme);
  enabledToggle.checked = settings.enabled;
  autoCheckToggle.checked = settings.autoCheck;
  renderSelectedModel();
  siteSetting.classList.toggle("hidden", hostname === null);
  if (hostname) {
    siteTitle.textContent = hostname;
    siteSubtitle.textContent = settings.disabledSites.includes(hostname)
      ? "Grammar is paused here"
      : "Use Grammar on this site";
    siteToggle.checked = !settings.disabledSites.includes(hostname);
  }
  show(
    settings.connected ? (connectedView === "settings" ? settingsView : checkView) : connectView,
  );
}

async function updatePreferences(patch: Partial<Preferences>): Promise<boolean> {
  const response = await sendMessage({ type: "SET_SETTINGS", payload: patch });
  if (!response.success) {
    showAlert(`Could not save this setting: ${response.error}`);
    return false;
  }
  clearAlert();
  if (settings) settings = { ...settings, ...patch };
  return true;
}

/** Loads the catalog in the background; the popup is usable before it arrives. */
function loadModels(): Promise<void> {
  modelsLoading ??= (async (): Promise<void> => {
    modelsError = "";
    const response = await sendMessage({ type: "FETCH_MODELS" });
    if (response.success && Array.isArray(response.data)) models = response.data;
    else modelsError = response.success ? "Could not read the model list." : response.error;
    modelsLoading = null;
    renderSelectedModel();
    if (!modelsView.classList.contains("hidden")) renderModels(modelSearch.value);
  })();
  return modelsLoading;
}

function modelListNote(message: string, retry = false): void {
  const note = document.createElement("div");
  note.className = "empty-models";
  note.setAttribute("role", "status");
  note.textContent = message;
  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-button";
    button.textContent = "Retry";
    button.addEventListener("click", () => {
      void loadModels();
      renderModels(modelSearch.value);
    });
    note.append(document.createElement("br"), button);
  }
  modelList.appendChild(note);
}

function renderModels(query = ""): void {
  modelList.replaceChildren();
  if (!settings) return;
  if (models.length === 0) {
    if (modelsLoading) modelListNote("Loading models…");
    else modelListNote(modelsError || "Could not load the model list.", true);
    return;
  }
  const normalized = query.trim().toLowerCase();
  const filtered = models.filter(
    (model) =>
      !normalized ||
      model.name.toLowerCase().includes(normalized) ||
      model.id.toLowerCase().includes(normalized),
  );
  filtered.sort((a, b) => {
    if (modelSort.value !== "name") {
      if (a.createdAt === undefined)
        return b.createdAt === undefined ? a.name.localeCompare(b.name) : 1;
      if (b.createdAt === undefined) return -1;
      const dateOrder =
        modelSort.value === "oldest" ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
      if (dateOrder !== 0) return dateOrder;
    }
    return a.name.localeCompare(b.name);
  });
  if (filtered.length === 0) {
    modelListNote("No models match your search");
    return;
  }
  // The model in use is always the first thing in an unfiltered list.
  const current = filtered.findIndex((model) => model.id === settings?.model);
  if (!normalized && current > 0) filtered.unshift(...filtered.splice(current, 1));

  for (const model of filtered) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "model-item";
    if (model.id === settings.model) item.setAttribute("aria-current", "true");
    const name = document.createElement("strong");
    name.textContent = model.name;
    const id = document.createElement("small");
    id.textContent = model.id;
    const cost = document.createElement("span");
    cost.className = "model-cost";
    cost.textContent = `${modelCost(model.inputCostPerMillion)} in · ${modelCost(
      model.outputCostPerMillion,
    )} out / 1M`;
    item.append(name, id, cost);
    item.addEventListener("click", () => {
      void (async (): Promise<void> => {
        if (!(await updatePreferences({ model: model.id })) || !settings) return;
        renderSettings();
        modelButton.focus();
      })();
    });
    modelList.appendChild(item);
  }
}

themeButton.addEventListener("click", () => {
  if (!settings) return;
  const theme = nextTheme(settings.theme);
  void (async (): Promise<void> => {
    themeButton.disabled = true;
    const saved = await updatePreferences({ theme });
    themeButton.disabled = false;
    if (saved) applyTheme(theme);
  })();
});

connectButton.addEventListener("click", () => {
  void (async (): Promise<void> => {
    setConnectBusy(true);
    connectButton.textContent = "Connecting…";
    clearConnectError();
    const response = await sendMessage({ type: "INITIATE_OAUTH" });
    setConnectBusy(false);
    connectButton.textContent = "Continue with OpenRouter";
    if (!response.success) {
      showConnectError(response.error);
      return;
    }
    apiKeyInput.value = "";
    await initialize();
  })();
});

tokenToggleButton.addEventListener("click", () => {
  const expanded = tokenToggleButton.getAttribute("aria-expanded") === "true";
  tokenToggleButton.setAttribute("aria-expanded", String(!expanded));
  tokenPanel.classList.toggle("hidden", expanded);
  clearConnectError();
  if (!expanded) apiKeyInput.focus();
});

tokenVisibilityButton.addEventListener("click", () => {
  const reveal = apiKeyInput.type === "password";
  apiKeyInput.type = reveal ? "text" : "password";
  tokenVisibilityButton.textContent = reveal ? "Hide" : "Show";
  tokenVisibilityButton.setAttribute("aria-label", `${reveal ? "Hide" : "Show"} API key`);
  apiKeyInput.focus();
});

tokenPanel.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async (): Promise<void> => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey.length < 8) {
      showConnectError("Enter a valid OpenRouter API key.");
      apiKeyInput.focus();
      return;
    }

    setConnectBusy(true);
    connectTokenButton.textContent = "Verifying…";
    clearConnectError();
    const response = await sendMessage({ type: "CONNECT_API_KEY", payload: { apiKey } });
    setConnectBusy(false);
    connectTokenButton.textContent = "Connect with API key";
    if (!response.success) {
      showConnectError(response.error);
      apiKeyInput.focus();
      return;
    }
    apiKeyInput.value = "";
    await initialize();
  })();
});

disconnectButton.addEventListener("click", () => {
  void (async (): Promise<void> => {
    disconnectButton.disabled = true;
    const response = await sendMessage({ type: "DISCONNECT" });
    disconnectButton.disabled = false;
    if (response.success && settings) {
      clearAlert();
      settings = { ...settings, connected: false };
      resetConnectionForm();
      renderSettings();
      connectButton.focus();
    } else if (!response.success) {
      showAlert(`Could not disconnect: ${response.error}`);
    }
  })();
});

enabledToggle.addEventListener("change", () => {
  void (async (): Promise<void> => {
    enabledToggle.disabled = true;
    const saved = await updatePreferences({ enabled: enabledToggle.checked });
    enabledToggle.disabled = false;
    if (!saved) renderSettings();
  })();
});

autoCheckToggle.addEventListener("change", () => {
  void (async (): Promise<void> => {
    autoCheckToggle.disabled = true;
    const saved = await updatePreferences({ autoCheck: autoCheckToggle.checked });
    autoCheckToggle.disabled = false;
    if (!saved) renderSettings();
  })();
});

siteToggle.addEventListener("change", () => {
  if (!hostname || !settings) return;
  const sites = new Set(settings.disabledSites);
  if (siteToggle.checked) sites.delete(hostname);
  else sites.add(hostname);
  const disabledSites = [...sites].sort();
  void (async (): Promise<void> => {
    siteToggle.disabled = true;
    const saved = await updatePreferences({ disabledSites });
    siteToggle.disabled = false;
    renderSettings();
    if (!saved) siteToggle.focus();
  })();
});

modelButton.addEventListener("click", () => {
  modelSearch.value = "";
  if (models.length === 0) void loadModels();
  renderModels();
  show(modelsView);
  modelSearch.focus();
});

function closeModels(): void {
  renderSettings();
  modelButton.focus();
}

modelsBackButton.addEventListener("click", closeModels);
modelSearch.addEventListener("input", () => renderModels(modelSearch.value));
modelSearch.addEventListener("keydown", (event) => {
  const first = modelList.querySelector<HTMLButtonElement>(".model-item");
  if (!first) return;
  if (event.key === "Enter") {
    event.preventDefault();
    first.click();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    first.focus();
  }
});
modelList.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const item = (event.target as Element).closest<HTMLButtonElement>(".model-item");
  if (!item) return;
  event.preventDefault();
  const next = event.key === "ArrowDown" ? item.nextElementSibling : item.previousElementSibling;
  if (next instanceof HTMLElement) next.focus();
  else if (event.key === "ArrowUp") modelSearch.focus();
});
modelSort.addEventListener("change", () => renderModels(modelSearch.value));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modelsView.classList.contains("hidden")) {
    event.preventDefault();
    closeModels();
  }
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
  if (settings?.theme === "system") applyTheme("system");
});

async function initialize(): Promise<void> {
  show(loadingView);
  const [settingsResponse, activeSite] = await Promise.all([
    sendMessage({ type: "GET_SETTINGS" }),
    activeHostname(),
  ]);
  hostname = activeSite;
  if (!settingsResponse.success || !isSettingsView(settingsResponse.data)) {
    connectError.textContent = settingsResponse.success
      ? "Invalid settings response."
      : settingsResponse.error;
    connectError.classList.remove("hidden");
    show(connectView);
    return;
  }
  settings = settingsResponse.data;
  applyTheme(settings.theme);
  if (settings.connected) void loadModels();
  renderSettings();
  const stored = await chrome.storage.session.get(PENDING_SELECTION_KEY);
  consumeSelection(queuedSelection ?? stored[PENDING_SELECTION_KEY]);
}

document.documentElement.dataset["theme"] = resolveTheme(cachedTheme());
void initialize();
