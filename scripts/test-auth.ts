/**
 * Проверка авторизации вне расширения.
 * Повторяет логику useKeenetic.fetchRci + тестовый endpoint из App.vue.
 * Вместо chrome.storage (keenetic_config) конфиг читается из .env.
 */
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KeeneticClient, type KeeneticConfig } from '../src/core/keenetic';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env') });

const TEST_ENDPOINT =
  process.env.KEENETIC_TEST_ENDPOINT ?? 'rci/show/interface/WifiMaster0';

function loadConfigFromEnv(): KeeneticConfig {
  const ipAddr = process.env.KEENETIC_IP?.trim();
  const login  = process.env.KEENETIC_LOGIN?.trim();
  const passw  = process.env.KEENETIC_PASSWORD ?? '';

  const missing: string[] = [];
  if (!ipAddr) missing.push('KEENETIC_IP');
  if (!login)  missing.push('KEENETIC_LOGIN');
  if (!passw)  missing.push('KEENETIC_PASSWORD');

  if (missing.length) {
    throw new Error(
      `Заполните в .env: ${missing.join(', ')} (см. .env.example)`,
    );
  }

  return { ipAddr, login, passw };
}

async function main(): Promise<void> {
  const cfg = loadConfigFromEnv();
  console.log(`→ Роутер: http://${cfg.ipAddr}`);
  console.log(`→ Логин: ${cfg.login}`);
  console.log(`→ Тестовый RCI: ${TEST_ENDPOINT}`);

  const client = new KeeneticClient(cfg);

  try {
    const data = await client.rci(TEST_ENDPOINT);
    console.log('\n✓ Авторизация успешна');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Ошибка:', (err as Error).message);
    process.exit(1);
  }
}

main();
