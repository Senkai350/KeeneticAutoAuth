import type { KeeneticConfig } from './keenetic';

export const STORAGE_KEY = 'keenetic_config';
export const CONTENT_SCRIPT_ID = 'keenetic-auto-auth';

/** Служебные вкладки (кнопка «Тест», auth без sender.tab) — без content-script. */
export const BACKGROUND_TAB_PARAM = 'kaa_background';

export function loadConfig(): Promise<KeeneticConfig | null> {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEY, result => {
      resolve((result[STORAGE_KEY] as KeeneticConfig) ?? null);
    });
  });
}

export function saveConfig(cfg: KeeneticConfig): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: cfg }, resolve);
  });
}

export function buildMatchPatterns(ipAddr: string): string[] {
  const host = ipAddr.trim();
  return [`http://${host}/*`, `https://${host}/*`];
}

export function parseRouterHost(ipAddr: string): { hostname: string; port: string } {
  const trimmed = ipAddr.trim();
  const colon = trimmed.indexOf(':');
  if (colon === -1) return { hostname: trimmed, port: '' };
  return {
    hostname: trimmed.slice(0, colon),
    port:     trimmed.slice(colon + 1),
  };
}

export function isRouterHost(cfg: KeeneticConfig): boolean {
  const { hostname, port } = parseRouterHost(cfg.ipAddr);
  if (location.hostname !== hostname) return false;
  if (!port) return true;
  const pagePort = location.port || (location.protocol === 'https:' ? '443' : '80');
  return pagePort === port;
}

export function buildRouterUrl(ipAddr: string, search?: string): string {
  const base = `http://${ipAddr.trim()}/`;
  if (!search) return base;
  const q = search.startsWith('?') ? search.slice(1) : search;
  return `${base}?${q}`;
}

export function buildBackgroundTabUrl(ipAddr: string): string {
  return buildRouterUrl(
    ipAddr,
    `${BACKGROUND_TAB_PARAM}=1`,
  );
}

/** Не запускать авто-логин на дашборде и на служебных вкладках background. */
export function shouldSkipAutoAuth(): boolean {
  const path = location.pathname;
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return true;
  }
  return new URLSearchParams(location.search).has(BACKGROUND_TAB_PARAM);
}
