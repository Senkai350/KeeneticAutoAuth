import type { KeeneticConfig } from '../core/keenetic';

interface RciResponse {
  data?: unknown;
  error?: string;
}

export function rciViaRouterPage(
  cfg: KeeneticConfig,
  endpoint: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'KEENETIC_RCI', cfg, endpoint },
      (response: RciResponse | undefined) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response?.data);
      },
    );
  });
}
