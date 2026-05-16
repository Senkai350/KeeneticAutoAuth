import type { KeeneticConfig } from './keenetic';

export const STORAGE_KEY = 'keenetic_config';
export const CONTENT_SCRIPT_ID = 'keenetic-auto-auth';

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

/** Не запускать авто-логин на дашборде. */
export function shouldSkipAutoAuth(): boolean {
  const path = location.pathname;
  return path === '/dashboard' || path.startsWith('/dashboard/');
}
