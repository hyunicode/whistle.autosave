const REG_EXP_RE = /^\/(.+)\/(i)?$/;

export interface FilterRule {
  not: boolean;
  pattern: RegExp | null;
  str: string;
}

let filterList: FilterRule[] | null = null;

const toRegExp = (str: string): RegExp | null => {
  const matched = REG_EXP_RE.exec(str);
  if (!matched) {
    return null;
  }
  try {
    return new RegExp(matched[1], matched[2] ?? '');
  } catch {
    return null;
  }
};

export function update(text: unknown): void {
  // 每次更新都全量重建，避免历史条件残留
  filterList = null;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) {
    return;
  }
  const lines = trimmed.substring(0, 3072).split(/\r\n|\r|\n/);
  for (const line of lines) {
    let str = line;
    const not = str[0] === '!';
    if (not) {
      str = str.substring(1);
    }
    str = str.trim();
    if (!str) {
      continue;
    }
    const pattern = toRegExp(str);
    filterList = filterList ?? [];
    filterList.push({ not, pattern, str });
  }
}

export function check(url?: string | null): boolean {
  if (!filterList) {
    return true;
  }
  if (!url) {
    return false;
  }
  for (const { not, pattern, str } of filterList) {
    const result = pattern ? pattern.test(url) : url.includes(str);
    if (not ? !result : result) {
      return true;
    }
  }
  return false;
}
