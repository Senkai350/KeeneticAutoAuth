// Выполняется в контексте страницы роутера (Origin = http://IP, не chrome-extension://)
import { KeeneticClient, type KeeneticConfig } from '../core/keenetic';

async function keeneticAuth(cfg: KeeneticConfig): Promise<void> {
  const client = new KeeneticClient({ ...cfg, useCredentials: true });
  await client.auth();
}

async function keeneticRci(
  cfg: KeeneticConfig,
  endpoint: string,
): Promise<unknown> {
  const client = new KeeneticClient({ ...cfg, useCredentials: true });
  return client.rci(endpoint);
}

declare global {
  interface Window {
    __keeneticAuth: typeof keeneticAuth;
    __keeneticRci: typeof keeneticRci;
  }
}

window.__keeneticAuth = keeneticAuth;
window.__keeneticRci  = keeneticRci;
