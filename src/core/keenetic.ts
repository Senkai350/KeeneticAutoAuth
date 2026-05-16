// keenetic.ts
import md5 from 'js-md5';
import { sha256 } from 'js-sha256';

/** Web Crypto недоступен на http:// (не secure context) — только чистый JS. */
function sha256hex(message: string): string {
  return sha256(message);
}

export interface KeeneticConfig {
  ipAddr: string;
  login:  string;
  passw:  string;
  /** В браузере (контекст страницы роутера): cookies через credentials:'include' */
  useCredentials?: boolean;
}

export class KeeneticClient {
  private readonly baseUrl: string;
  private readonly login:   string;
  private readonly passw:   string;
  private readonly useCredentials: boolean;
  private sessionCookie: string | null = null;

  constructor({ ipAddr, login, passw, useCredentials = false }: KeeneticConfig) {
    this.baseUrl         = `http://${ipAddr}`;
    this.login           = login;
    this.passw           = passw;
    this.useCredentials  = useCredentials;
  }

  // ─── низкоуровневый fetch ────────────────────────────────────────────────

  private async request(
    query:  string,
    body:   object | null = null,
    cookie: string | null = null,
  ): Promise<Response> {
    const url     = `${this.baseUrl}/${query}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // В браузере заголовок Cookie из JS запрещён — только credentials:'include'
    if (!this.useCredentials && cookie) headers['Cookie'] = cookie;

    return fetch(url, {
      method:  body ? 'POST' : 'GET',
      headers,
      body:    body ? JSON.stringify(body) : undefined,
      credentials: this.useCredentials ? 'include' : 'omit',
    });
  }

  // ─── авторизация ─────────────────────────────────────────────────────────

  async auth(): Promise<void> {
    // Шаг 1: GET /auth — получаем challenge
    const probe = await this.request('auth');

    if (probe.status === 200) return; // уже залогинены

    if (probe.status !== 401) {
      throw new Error(`Неожиданный статус probe: ${probe.status}`);
    }

    const realm     = probe.headers.get('X-NDM-Realm');
    const challenge = probe.headers.get('X-NDM-Challenge');
    if (!realm || !challenge) {
      throw new Error('Нет X-NDM-Realm / X-NDM-Challenge в ответе');
    }

    // В Node читаем Set-Cookie вручную; в Chrome браузер сохранит куку сам (credentials)
    if (!this.useCredentials) {
      const setCookie = probe.headers.get('Set-Cookie');
      if (setCookie) {
        this.sessionCookie = setCookie.split(';')[0].trim();
      }
    }

    // Шаг 2: вычисляем ответ
    const md5hex = md5(`${this.login}:${realm}:${this.passw}`);
    const shahex = sha256hex(challenge + md5hex);

    // Шаг 3: POST /auth с той же сессионной кукой
    const resp = await this.request(
      'auth',
      { login: this.login, password: shahex },
      this.sessionCookie,
    );

    if (resp.status !== 200) {
      throw new Error(`Авторизация не удалась: статус ${resp.status}`);
    }

    if (!this.useCredentials) {
      const newCookie = resp.headers.get('Set-Cookie');
      if (newCookie) {
        this.sessionCookie = newCookie.split(';')[0].trim();
      }
    }
  }

  // ─── публичный метод запроса к RCI ───────────────────────────────────────

  async rci<T = unknown>(endpoint: string): Promise<T> {
    await this.auth();

    const resp = await this.request(endpoint, null, this.sessionCookie);

    if (!resp.ok) {
      throw new Error(`RCI "${endpoint}" вернул ${resp.status}`);
    }

    return resp.json() as Promise<T>;
  }
}
