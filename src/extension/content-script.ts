import { loadConfig, isRouterHost, shouldSkipAutoAuth } from '../core/config';

const OVERLAY_ID = 'keenetic-auto-auth-overlay';
let authStarted = false;

function injectStyles(): void {
  if (document.getElementById('keenetic-auto-auth-styles')) return;

  const style = document.createElement('style');
  style.id = 'keenetic-auto-auth-styles';
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.88);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    #${OVERLAY_ID} .ka-card {
      min-width: 280px; max-width: 90vw; padding: 28px 32px;
      background: #1e293b; border: 1px solid #334155; border-radius: 12px;
      box-shadow: 0 24px 48px rgba(0,0,0,.45); text-align: center;
      color: #e2e8f0;
    }
    #${OVERLAY_ID} .ka-title {
      margin: 0 0 8px; font-size: 18px; font-weight: 700;
    }
    #${OVERLAY_ID} .ka-title span { color: #38bdf8; }
    #${OVERLAY_ID} .ka-msg {
      margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;
    }
    #${OVERLAY_ID} .ka-msg.err { color: #f87171; }
    #${OVERLAY_ID} .ka-spinner {
      width: 36px; height: 36px; margin: 0 auto 16px;
      border: 3px solid #334155; border-top-color: #38bdf8;
      border-radius: 50%; animation: ka-spin .8s linear infinite;
    }
    @keyframes ka-spin { to { transform: rotate(360deg); } }
    #${OVERLAY_ID} .ka-btn {
      margin-top: 16px; padding: 8px 20px; border: none; border-radius: 6px;
      background: #334155; color: #e2e8f0; font-size: 13px; cursor: pointer;
    }
    #${OVERLAY_ID} .ka-btn:hover { background: #475569; }
  `;
  document.documentElement.appendChild(style);
}

function createOverlay(): {
  showLoading: (text: string) => void;
  showError: (text: string) => void;
  remove: () => void;
} {
  injectStyles();

  let root = document.getElementById(OVERLAY_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = OVERLAY_ID;
    (document.body ?? document.documentElement).appendChild(root);
  }

  const setContent = (html: string): void => {
    root!.innerHTML = html;
  };

  return {
    showLoading(text: string) {
      setContent(`
        <div class="ka-card">
          <div class="ka-spinner"></div>
          <h1 class="ka-title">Keenetic <span>Auth</span></h1>
          <p class="ka-msg">${escapeHtml(text)}</p>
        </div>
      `);
    },
    showError(text: string) {
      setContent(`
        <div class="ka-card">
          <h1 class="ka-title">Keenetic <span>Auth</span></h1>
          <p class="ka-msg err">✗ ${escapeHtml(text)}</p>
          <button type="button" class="ka-btn" id="ka-dismiss">Закрыть</button>
        </div>
      `);
      document.getElementById('ka-dismiss')?.addEventListener('click', () => {
        root?.remove();
      });
    },
    remove() {
      root?.remove();
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function runAutoAuth(): Promise<void> {
  if (authStarted || shouldSkipAutoAuth()) return;

  const cfg = await loadConfig();
  if (!cfg?.ipAddr || !cfg.login || !cfg.passw) return;
  if (!isRouterHost(cfg)) return;

  authStarted = true;
  const overlay = createOverlay();
  overlay.showLoading('Авторизация…');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'KEENETIC_AUTH',
      cfg,
    }) as { ok?: boolean; error?: string };

    if (response?.error) throw new Error(response.error);

    overlay.showLoading('Вход выполнен, переход в панель…');
    window.location.assign('/dashboard');
  } catch (err) {
    overlay.showError((err as Error).message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void runAutoAuth(); });
} else {
  void runAutoAuth();
}
