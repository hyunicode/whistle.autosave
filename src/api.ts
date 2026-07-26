export type MockType = 'json' | 'sse' | 'text';

export interface MockEntry {
  file: string;
  pattern: string;
  type: MockType;
  delay: number;
  enabled: boolean;
}

export interface FileInfo {
  name: string;
  size: number;
  mtime: number;
  url?: string;
  contentType?: string;
}

export interface Settings {
  ec: number;
  em?: string;
  active?: boolean;
  sessionsDir?: string;
  filterText?: string;
  mockActive?: boolean;
  mockEntries?: MockEntry[];
}

export interface ActiveResult {
  ec: number;
  active: boolean;
}

export interface ListFilesResult {
  ec: number;
  dir: string;
  files: FileInfo[];
}

export interface SetMockResult {
  ec: number;
  em?: string;
  entries?: MockEntry[];
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch('cgi-bin/get-settings', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('load failed');
  return res.json() as Promise<Settings>;
}

export async function listFiles(dir: string): Promise<ListFilesResult> {
  const res = await fetch(`cgi-bin/list-files?dir=${encodeURIComponent(dir)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('load failed');
  return res.json() as Promise<ListFilesResult>;
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

export function setActive(active: boolean, type?: 'save' | 'mock'): Promise<ActiveResult> {
  const data: Record<string, string> = { active: active ? '1' : '0' };
  if (type) {
    data.type = type;
  }
  return postForm<ActiveResult>('cgi-bin/active', data);
}

export function setSettings(settings: { sessionsDir: string; filterText: string }): Promise<Settings> {
  return postForm<Settings>('cgi-bin/set-settings', settings);
}

export function setMock(entries: MockEntry[]): Promise<SetMockResult> {
  return postForm<SetMockResult>('cgi-bin/set-mock', { entries: JSON.stringify(entries) });
}
