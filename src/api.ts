export interface Settings {
  ec: number;
  em?: string;
  active?: boolean;
  sessionsDir?: string;
  filterText?: string;
}

export interface ActiveResult {
  ec: number;
  active: boolean;
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch('cgi-bin/get-settings', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('load failed');
  return res.json() as Promise<Settings>;
}

async function postForm<T>(url: string, data: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
  });
  if (!res.ok) throw new Error('post failed');
  return res.json() as Promise<T>;
}

export function setActive(active: boolean): Promise<ActiveResult> {
  return postForm<ActiveResult>('cgi-bin/active', { active: active ? '1' : '0' });
}

export function setSettings(settings: { sessionsDir: string; filterText: string }): Promise<Settings> {
  return postForm<Settings>('cgi-bin/set-settings', settings);
}
