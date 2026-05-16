// useKeenetic.ts
import { ref, readonly } from 'vue';
import { loadConfig, saveConfig } from '../core/config';
import { rciViaRouterPage } from '../extension/extension-bridge';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export { loadConfig, saveConfig };

export function useKeenetic() {
  const status = ref<Status>('idle');
  const error  = ref<string | null>(null);
  const data   = ref<unknown>(null);

  async function fetchRci(endpoint: string): Promise<void> {
    status.value = 'loading';
    error.value  = null;
    data.value   = null;

    try {
      const cfg = await loadConfig();
      if (!cfg) throw new Error('Конфиг не найден — заполните настройки');

      data.value = await rciViaRouterPage(cfg, endpoint);
      status.value = 'ok';
    } catch (err) {
      error.value  = (err as Error).message;
      status.value = 'error';
    }
  }

  return {
    status:   readonly(status),
    error:    readonly(error),
    data:     readonly(data),
    fetchRci,
  };
}
