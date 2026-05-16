import {
  buildBackgroundTabUrl,
  buildMatchPatterns,
  CONTENT_SCRIPT_ID,
  loadConfig,
} from '../core/config';
import type { KeeneticConfig } from '../core/keenetic';

interface RciMessage {
  type: 'KEENETIC_RCI';
  cfg: KeeneticConfig;
  endpoint: string;
}

interface AuthMessage {
  type: 'KEENETIC_AUTH';
  cfg: KeeneticConfig;
}

type KeeneticMessage = RciMessage | AuthMessage;

interface RunResult {
  data?: unknown;
  error?: string;
}

function waitTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('Таймаут загрузки страницы роутера'));
    }, 30_000);

    const onUpdated = (
      id: number,
      info: chrome.tabs.TabChangeInfo,
    ): void => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);

    chrome.tabs.get(tabId).then(tab => {
      if (tab.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }).catch(reject);
  });
}

function isFrameRemovedError(err: unknown): boolean {
  const msg = (err as Error).message ?? '';
  return /frame with id \d+ was removed/i.test(msg);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, ms); });
}

async function injectPageRunner(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    files: ['assets/page-runner.js'],
  });
}

async function runInTabOnce<T>(
  tabId: number,
  run: 'auth' | 'rci',
  cfg: KeeneticConfig,
  endpoint?: string,
): Promise<T> {
  await injectPageRunner(tabId);

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (
      mode: 'auth' | 'rci',
      c: KeeneticConfig,
      ep: string,
    ): Promise<RunResult> => {
      try {
        if (mode === 'auth') {
          await window.__keeneticAuth(c);
          return { data: true };
        }
        const data = await window.__keeneticRci(c, ep);
        return { data };
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
    // Chrome не сериализует undefined в args — только JSON-типы
    args: [run, cfg, endpoint ?? ''],
  });

  const payload = result as RunResult | undefined;
  if (payload?.error) throw new Error(payload.error);
  return payload?.data as T;
}

async function runInTab<T>(
  tabId: number,
  run: 'auth' | 'rci',
  cfg: KeeneticConfig,
  endpoint?: string,
): Promise<T> {
  const attempts = 3;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await runInTabOnce(tabId, run, cfg, endpoint);
    } catch (err) {
      lastError = err;
      if (!isFrameRemovedError(err) || i === attempts - 1) throw err;
      await waitTabComplete(tabId);
      await delay(200);
    }
  }

  throw lastError;
}

async function runOnHiddenTab(
  cfg: KeeneticConfig,
  run: 'auth' | 'rci',
  endpoint?: string,
): Promise<unknown> {
  const url = buildBackgroundTabUrl(cfg.ipAddr);
  const tab = await chrome.tabs.create({ url, active: false });

  if (!tab.id) throw new Error('Не удалось открыть вкладку роутера');

  try {
    await waitTabComplete(tab.id);
    return await runInTab(tab.id, run, cfg, endpoint);
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

export async function syncContentScript(
  cfg: KeeneticConfig | null,
): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [CONTENT_SCRIPT_ID],
    });
  } catch {
    // ещё не регистрировался
  }

  if (!cfg?.ipAddr?.trim()) return;

  await chrome.scripting.registerContentScripts([{
    id:       CONTENT_SCRIPT_ID,
    js:       ['assets/content-script.js'],
    matches:  buildMatchPatterns(cfg.ipAddr),
    runAt:    'document_idle',
    persistAcrossSessions: true,
  }]);
}

async function initContentScript(): Promise<void> {
  const cfg = await loadConfig();
  await syncContentScript(cfg);
}

chrome.runtime.onInstalled.addListener(() => { void initContentScript(); });
chrome.runtime.onStartup.addListener(() => { void initContentScript(); });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.keenetic_config) return;
  void syncContentScript(
    (changes.keenetic_config.newValue as KeeneticConfig | undefined) ?? null,
  );
});

chrome.runtime.onMessage.addListener((
  message: KeeneticMessage,
  sender,
  sendResponse: (r: RunResult) => void,
): boolean => {
  if (message.type === 'KEENETIC_AUTH') {
    const tabId = sender.tab?.id;
    const task = tabId
      ? runInTab(tabId, 'auth', message.cfg)
      : runOnHiddenTab(message.cfg, 'auth');

    task
      .then(() => sendResponse({ data: true }))
      .catch(err => sendResponse({ error: (err as Error).message }));
    return true;
  }

  if (message.type === 'KEENETIC_RCI') {
    runOnHiddenTab(message.cfg, 'rci', message.endpoint)
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: (err as Error).message }));
    return true;
  }

  return false;
});
