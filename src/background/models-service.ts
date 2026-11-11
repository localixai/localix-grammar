import { OpenRouterCore } from "@openrouter/sdk/core.js";
import { modelsList } from "@openrouter/sdk/funcs/modelsList.js";

import type { ModelInfo } from "../shared/types";
import { openRouterErrorMessage } from "../shared/utils/openrouter-error";
import { OPENROUTER_APP } from "../shared/utils/openrouter-app";

const MODEL_CACHE_TTL_MS = 15 * 60 * 1_000;
const MAX_CATALOG_MODELS = 1_000;

export interface CatalogModel {
  readonly id: string;
  readonly name: string;
  readonly created?: number;
  readonly contextLength: number | null;
  readonly pricing: {
    readonly prompt: string;
    readonly completion: string;
    readonly discount?: number | undefined;
  };
  readonly supportedParameters: readonly string[];
}
export type ModelCatalogLoader = () => Promise<readonly CatalogModel[]>;

function costPerMillion(value: string, discount = 0): number | undefined {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  const boundedDiscount = Number.isFinite(discount) ? Math.max(0, Math.min(1, discount)) : 0;
  return amount * (1 - boundedDiscount) * 1_000_000;
}

export function normalizeModelCatalog(catalog: readonly CatalogModel[]): ModelInfo[] {
  const seen = new Set<string>();
  const normalized: ModelInfo[] = [];
  for (const model of catalog.slice(0, MAX_CATALOG_MODELS)) {
    const id = model.id.trim();
    const name = model.name.trim();
    if (
      !id ||
      id.length > 200 ||
      !name ||
      name.length > 200 ||
      /[\u0000-\u001f\u007f]/u.test(id + name) ||
      seen.has(id) ||
      !model.supportedParameters.includes("tools")
    ) {
      continue;
    }
    seen.add(id);
    const discount = model.pricing.discount ?? 0;
    const inputCostPerMillion = costPerMillion(model.pricing.prompt, discount);
    const outputCostPerMillion = costPerMillion(model.pricing.completion, discount);
    normalized.push({
      id,
      name,
      ...(typeof model.created === "number" &&
      Number.isSafeInteger(model.created) &&
      model.created > 0
        ? { createdAt: model.created }
        : {}),
      ...(typeof model.contextLength === "number" &&
      Number.isFinite(model.contextLength) &&
      model.contextLength > 0
        ? { contextWindow: Math.round(model.contextLength) }
        : {}),
      ...(inputCostPerMillion === undefined ? {} : { inputCostPerMillion }),
      ...(outputCostPerMillion === undefined ? {} : { outputCostPerMillion }),
    });
  }
  return normalized.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadOfficialCatalog(): Promise<readonly CatalogModel[]> {
  const client = new OpenRouterCore({
    ...OPENROUTER_APP,
    retryConfig: {
      strategy: "backoff",
      backoff: {
        initialInterval: 500,
        maxInterval: 4_000,
        exponent: 2,
        maxElapsedTime: 10_000,
      },
      retryConnectionErrors: true,
    },
    timeoutMs: 15_000,
  });
  const result = await modelsList(client, {
    limit: 1_000,
    outputModalities: "text",
    supportedParameters: "tools",
  });
  if (!result.ok) {
    throw new Error(
      openRouterErrorMessage(result.error, "Could not load the OpenRouter model list."),
    );
  }
  return result.value.result.data;
}

interface StoredCatalog {
  readonly models: ModelInfo[];
  readonly expiresAt: number;
}

/** Where the catalog outlives the service worker, which sleeps after about 30 idle seconds. */
export interface ModelCatalogStore {
  read(): Promise<unknown>;
  write(catalog: StoredCatalog): Promise<void>;
}

function storedCatalog(value: unknown): StoredCatalog | null {
  if (!value || typeof value !== "object") return null;
  const { models, expiresAt } = value as Partial<StoredCatalog>;
  return Array.isArray(models) && models.length > 0 && typeof expiresAt === "number"
    ? { models, expiresAt }
    : null;
}

export function createModelCatalogService(
  loader: ModelCatalogLoader,
  now: () => number = Date.now,
  store?: ModelCatalogStore,
): () => Promise<ModelInfo[]> {
  let cached: ModelInfo[] | undefined;
  let expiresAt = 0;
  let loading: Promise<void> | undefined;
  const refresh = async (): Promise<void> => {
    if (!cached && store) {
      const stored = storedCatalog(await store.read().catch(() => null));
      if (stored) ({ models: cached, expiresAt } = stored);
    }
    if (cached && now() < expiresAt) return;
    try {
      const fresh = normalizeModelCatalog(await loader());
      if (fresh.length === 0) throw new Error("OpenRouter returned no tool-capable models.");
      cached = fresh;
      expiresAt = now() + MODEL_CACHE_TTL_MS;
      await store?.write({ models: fresh, expiresAt }).catch(() => undefined);
    } catch (error) {
      // A stale list still lets people pick a model.
      if (!cached) throw error;
    }
  };
  return async (): Promise<ModelInfo[]> => {
    if (!cached || now() >= expiresAt) {
      // Concurrent callers share one request.
      loading ??= refresh().finally(() => (loading = undefined));
      await loading;
    }
    return cached!.map((model) => ({ ...model }));
  };
}

const CATALOG_STORAGE_KEY = "modelCatalog";

export const listModels = createModelCatalogService(loadOfficialCatalog, Date.now, {
  read: async () => (await chrome.storage.session.get(CATALOG_STORAGE_KEY))[CATALOG_STORAGE_KEY],
  write: async (catalog) => chrome.storage.session.set({ [CATALOG_STORAGE_KEY]: catalog }),
});
