/**
 * The SDK's own messages quote the raw response ("Status 502 … Body: <!DOCTYPE html>…").
 * People see ours instead: what happened, and what to do about it.
 */
export function openRouterErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const { name, statusCode } = error as { name?: unknown; statusCode?: unknown };
  if (name === "RequestAbortedError" || name === "AbortError") return "The check was cancelled.";
  if (name === "RequestTimeoutError" || name === "TimeoutError") {
    return "OpenRouter took too long to answer. Try again, or pick a faster model.";
  }
  if (name === "ConnectionError") return "Could not reach OpenRouter. Check your connection.";
  if (statusCode === 401) return "OpenRouter rejected the API key. Reconnect in the popup.";
  if (statusCode === 404) return "This model is not available. Choose another one in the popup.";
  if (statusCode === 429) return "OpenRouter is rate limiting requests. Try again in a moment.";
  // OpenRouter's own sentence ("Code expired", "Insufficient credits") says more than ours.
  const stated = statedReason(error);
  if (stated) return stated;
  if (typeof statusCode !== "number") return fallback;
  if (statusCode === 402) return "Your OpenRouter balance is too low for this model.";
  if (statusCode === 403) return "OpenRouter refused this request for your account or model.";
  if (statusCode === 408 || statusCode === 504 || statusCode === 524) {
    return "The model took too long to answer. Try again, or pick a faster model.";
  }
  if (statusCode >= 500) return "OpenRouter or the model provider is having trouble. Try again.";
  return fallback;
}

/** The error's message, when it is a sentence for a person and not a dump of the response. */
function statedReason(error: object): string | null {
  // OpenRouter answers with `{ error: { message } }`: typed SDK errors expose it parsed,
  // untyped ones only as the raw body.
  let parsed = (error as { error?: unknown }).error;
  const raw = (error as { body?: unknown }).body;
  if (!parsed && typeof raw === "string" && raw.startsWith("{")) {
    try {
      parsed = (JSON.parse(raw) as { error?: unknown }).error;
    } catch {
      // Not JSON: an HTML error page from a proxy, for example.
    }
  }
  const fromBody = (parsed as { message?: unknown } | null | undefined)?.message;
  const message =
    typeof fromBody === "string" ? fromBody : (error as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const text = message.trim();
  return text && text.length <= 200 && !/^Status \d|Body:|<[a-z!/]|[{}]|\n/iu.test(text)
    ? text
    : null;
}

/** Thrown for a failed OpenRouter call: a message for people, and the status for the code. */
export class OpenRouterRequestError extends Error {
  readonly statusCode: number | null;
  constructor(error: unknown, fallback: string) {
    super(openRouterErrorMessage(error, fallback));
    this.statusCode = openRouterStatusCode(error);
  }
}

export function openRouterStatusCode(error: unknown): number | null {
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}
