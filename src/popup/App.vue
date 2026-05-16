<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loadConfig, saveConfig, useKeenetic } from './useKeenetic';
import type { KeeneticConfig } from '../core/keenetic';

const ipAddr = ref('192.168.1.1');
const login  = ref('admin');
const passw  = ref('');
const saved  = ref(false);

const { status, error, data, fetchRci } = useKeenetic();

onMounted(async () => {
  const cfg = await loadConfig();
  if (cfg) {
    ipAddr.value = cfg.ipAddr;
    login.value  = cfg.login;
    passw.value  = cfg.passw;
  }
});

async function handleSave(): Promise<void> {
  const cfg: KeeneticConfig = {
    ipAddr: ipAddr.value.trim(),
    login:  login.value.trim(),
    passw:  passw.value,
  };
  await saveConfig(cfg);
  saved.value = true;
  setTimeout(() => { saved.value = false; }, 2000);
}

function handleTest(): void {
  fetchRci('rci/show/interface/WifiMaster0');
}
</script>

<template>
  <div class="popup">
    <h1 class="title">Keenetic <span class="accent">Auth</span></h1>
    <p class="hint">При открытии страницы роутера вход выполняется автоматически.</p>

    <section class="form">
      <label>
        IP:Порт
        <input v-model="ipAddr" placeholder="192.168.1.1" spellcheck="false" />
      </label>
      <label>
        Логин
        <input v-model="login" placeholder="admin" autocomplete="username" />
      </label>
      <label>
        Пароль
        <input v-model="passw" type="password" placeholder="••••••••" autocomplete="current-password" />
      </label>

      <div class="actions">
        <button class="btn-save" @click="handleSave">
          {{ saved ? '✓ Сохранено' : 'Сохранить' }}
        </button>
        <button class="btn-test" @click="handleTest" :disabled="status === 'loading'">
          {{ status === 'loading' ? '…' : 'Тест' }}
        </button>
      </div>
    </section>

    <div v-if="status === 'ok'" class="result ok">
      <p>✓ Авторизация успешна</p>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </div>
    <div v-if="status === 'error'" class="result err">
      ✗ {{ error }}
    </div>
  </div>
</template>

<style scoped>
.popup {
  box-sizing: border-box;
  width: 320px;
  min-height: 100%;
  padding: 16px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  color: #e2e8f0;
  background: #0f172a;
}
.title { margin: 0 0 8px; font-size: 18px; font-weight: 700; }
.hint { margin: 0 0 16px; font-size: 11px; color: #64748b; line-height: 1.4; }
.accent { color: #38bdf8; }
.form { display: flex; flex-direction: column; gap: 10px; }
label {
  display: flex; flex-direction: column; gap: 4px;
  color: #94a3b8; font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
input {
  background: #1e293b; border: 1px solid #334155;
  border-radius: 6px; color: #e2e8f0;
  padding: 6px 10px; font-size: 13px;
  outline: none; transition: border-color .2s;
}
input:focus { border-color: #38bdf8; }
.actions { display: flex; gap: 8px; margin-top: 4px; }
button {
  flex: 1; padding: 8px; border-radius: 6px;
  border: none; cursor: pointer;
  font-size: 13px; font-weight: 600; transition: opacity .2s;
}
button:disabled { opacity: .5; cursor: default; }
.btn-save { background: #0ea5e9; color: #fff; }
.btn-test { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
.result { margin-top: 12px; border-radius: 6px; padding: 10px; font-size: 12px; }
.result.ok  { background: #052e16; color: #4ade80; }
.result.err { background: #2d0a0a; color: #f87171; }
pre { margin: 6px 0 0; font-size: 11px; white-space: pre-wrap; overflow: auto; max-height: 180px; }
</style>
