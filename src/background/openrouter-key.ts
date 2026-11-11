import { OpenRouterCore } from "@openrouter/sdk/core.js";
import { apiKeysGetCurrentKeyMetadata } from "@openrouter/sdk/funcs/apiKeysGetCurrentKeyMetadata.js";

import { OPENROUTER_APP } from "../shared/utils/openrouter-app";
import { openRouterErrorMessage, openRouterStatusCode } from "../shared/utils/openrouter-error";

interface KeyMetadata {
  readonly isManagementKey: boolean;
}

export type OpenRouterKeyVerifier = (apiKey: string) => Promise<KeyMetadata>;

async function verifyWithOpenRouter(apiKey: string): Promise<KeyMetadata> {
  const client = new OpenRouterCore({
    apiKey,
    ...OPENROUTER_APP,
    retryConfig: { strategy: "none" },
    timeoutMs: 15_000,
  });
  const result = await apiKeysGetCurrentKeyMetadata(client);
  if (!result.ok) {
    // Only a rejection says the key is wrong; an outage must not make a good key look bad.
    const status = openRouterStatusCode(result.error);
    throw new Error(
      status === 401 || status === 403
        ? "OpenRouter did not accept this API key. Check it and try again."
        : openRouterErrorMessage(
            result.error,
            "Could not reach OpenRouter to verify the key. Try again.",
          ),
    );
  }
  return { isManagementKey: result.value.data.isManagementKey };
}

export async function validateOpenRouterApiKey(
  value: string,
  verify: OpenRouterKeyVerifier = verifyWithOpenRouter,
): Promise<string> {
  const apiKey = value.trim();
  if (apiKey.length < 8 || apiKey.length > 8_192 || /[\s\u0000-\u001f\u007f]/u.test(apiKey)) {
    throw new Error("Enter a valid OpenRouter API key.");
  }

  const metadata = await verify(apiKey);
  if (metadata.isManagementKey) {
    throw new Error("Use an inference API key, not an OpenRouter management key.");
  }
  return apiKey;
}
