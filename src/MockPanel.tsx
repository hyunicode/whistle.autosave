import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App as AntApp,
  Button,
  Empty,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ApiOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { listFiles, setActive, setMock, type FileInfo, type MockEntry, type MockType } from './api';

const { Text } = Typography;

const TYPE_OPTIONS: { value: MockType; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'sse', label: 'SSE' },
  { value: 'text', label: '文本' },
];

const TYPE_TAG_COLOR: Record<MockType, string> = {
  json: 'green',
  sse: 'geekblue',
  text: 'default',
};

const typeLabel = (type: MockType): string => TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

const inferType = (file: FileInfo): MockType => {
  const ct = (file.contentType || '').toLowerCase();
  if (ct.includes('event-stream')) return 'sse';
  if (ct.includes('json') || file.name.endsWith('.json')) return 'json';
  return 'text';
};

const defaultPattern = (file: FileInfo): string => {
  if (file.url) {
    try {
      const u = new URL(file.url);
      return u.pathname === '/' ? u.hostname : u.pathname;
    } catch {
      // 索引中的 URL 异常时退回文件名推断
    }
  }
  return file.name.replace(/_\d+\.(json|txt)$/i, '');
};

const fmtSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Props {
  /** 已保存生效的存储目录 */
  dir: string;
  /** 目录保存成功后的递增版本号，用于触发重新扫描 */
  dirVersion: number;
  initialActive: boolean;
  initialEntries: MockEntry[];
}

export default function MockPanel({ dir, dirVersion, initialActive, initialEntries }: Props) {
  const { message, modal } = AntApp.useApp();
  const [active, setActiveState] = useState(initialActive);
  const [entries, setEntries] = useState<MockEntry[]>(initialEntries);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activePending = useRef(false);

  const loadFiles = useCallback(() => {
    if (!dir) {
      setFiles([]);
      setFilesLoaded(true);
      return;
    }
    setRefreshing(true);
    listFiles(dir)
      .then((data) => {
        setFiles(data.files || []);
        setFilesLoaded(true);
      })
      .catch(() => message.error('读取文件列表失败'))
      .finally(() => setRefreshing(false));
  }, [dir, message]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, dirVersion]);

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.file, e])), [entries]);
  const missingEntries = useMemo(
    () => entries.filter((e) => e.enabled && !files.some((f) => f.name === e.file)),
    [entries, files]
  );

  function updateEntry(name: string, patch: Partial<MockEntry>) {
    setEntries((prev) => prev.map((e) => (e.file === name ? { ...e, ...patch } : e)));
    setDirty(true);
  }

  function toggleFile(file: FileInfo, checked: boolean) {
    const existing = entryMap.get(file.name);
    if (checked) {
      if (existing) {
        updateEntry(file.name, { enabled: true });
      } else {
        setEntries((prev) => [
          ...prev,
          {
            file: file.name,
            pattern: defaultPattern(file),
            type: inferType(file),
            delay: 50,
            enabled: true,
          },
        ]);
        setDirty(true);
      }
    } else if (existing) {
      updateEntry(file.name, { enabled: false });
    }
  }

  function removeEntry(name: string) {
    setEntries((prev) => prev.filter((e) => e.file !== name));
    setDirty(true);
  }

  function handleToggleActive(checked: boolean) {
    if (activePending.current) {
      setActiveState(!checked);
      return;
    }
    activePending.current = true;
    setActiveState(checked);
    setActive(checked, 'mock')
      .then(() => {
        activePending.current = false;
        message[checked ? 'success' : 'info'](checked ? '已启用本地 Mock' : '已关闭本地 Mock');
      })
      .catch(() => {
        activePending.current = false;
        setActiveState(!checked);
        message.error('提交失败，请稍后重试');
      });
  }

  function handleSave() {
    // 清理文件已缺失且未启用的条目
    const cleaned = entries.filter((e) => e.enabled || files.some((f) => f.name === e.file));
    setSaving(true);
    setMock(cleaned)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '更新失败');
          return;
        }
        setEntries(cleaned);
        setDirty(false);
        message.success('Mock 配置已更新');
        if (!active && cleaned.some((e) => e.enabled)) {
          modal.confirm({
            title: '是否立即启用本地 Mock？',
            okText: '启用',
            cancelText: '暂不',
            onOk: () => handleToggleActive(true),
          });
        }
      })
      .catch(() => message.error('提交失败，请稍后重试'))
      .finally(() => setSaving(false));
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <ApiOutlined className="panel-icon" />
          <span>本地 Mock</span>
        </div>
        <span className="switch-row">
          <Text type="secondary">启用</Text>
          <Switch checked={active} onChange={handleToggleActive} />
        </span>
      </div>
      <Text type="secondary" className="panel-desc">
        命中匹配规则的请求将直接返回本地保存的响应，不再访问真实服务器；SSE 类型按事件逐段推送。
      </Text>

      <div className="list-toolbar">
        <Text type="secondary">已保存文件{files.length > 0 ? `（${files.length}）` : ''}</Text>
        <Tooltip title="刷新文件列表">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={loadFiles}
            disabled={!dir}
          />
        </Tooltip>
      </div>

      {!dir ? (
        <Empty description="请先在左侧配置存储目录" image={Empty.PRESENTED_IMAGE_SIMPLE} className="empty" />
      ) : !filesLoaded ? (
        <div className="empty">
          <Text type="secondary">加载中…</Text>
        </div>
      ) : files.length === 0 && missingEntries.length === 0 ? (
        <Empty
          description="目录中暂无已保存的响应文件"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="empty"
        />
      ) : (
        <div className="file-list">
          {missingEntries.map((entry) => (
            <div className="file-row missing" key={`missing-${entry.file}`}>
              <div className="row-main">
                <div className="file-info">
                  <span className="file-name" title={entry.file}>
                    {entry.file}
                  </span>
                  <span className="file-meta">
                    <Tag color="error" className="type-tag">
                      文件缺失
                    </Tag>
                  </span>
                </div>
                <Tooltip title="移除该条目">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeEntry(entry.file)} />
                </Tooltip>
              </div>
            </div>
          ))}
          {files.map((file) => {
            const entry = entryMap.get(file.name);
            const enabled = entry?.enabled === true;
            const type = inferType(file);
            return (
              <div className={`file-row${enabled ? ' enabled' : ''}`} key={file.name}>
                <div className="row-main">
                  <Switch size="small" checked={enabled} onChange={(checked) => toggleFile(file, checked)} />
                  <div className="file-info">
                    <span className="file-name" title={file.url || file.name}>
                      {file.name}
                    </span>
                    <span className="file-meta">
                      <Tag color={TYPE_TAG_COLOR[type]} className="type-tag">
                        {typeLabel(type)}
                      </Tag>
                      {fmtTime(file.mtime)} · {fmtSize(file.size)}
                    </span>
                  </div>
                </div>
                {enabled && entry && (
                  <div className="row-config">
                    <Input
                      size="small"
                      addonBefore="匹配"
                      value={entry.pattern}
                      maxLength={512}
                      placeholder="URL 子串 或 /正则/"
                      onChange={(e) => updateEntry(file.name, { pattern: e.target.value })}
                    />
                    <Select
                      size="small"
                      value={entry.type}
                      options={TYPE_OPTIONS}
                      style={{ width: 92, flex: 'none' }}
                      onChange={(val) => updateEntry(file.name, { type: val })}
                    />
                    {entry.type === 'sse' && (
                      <InputNumber
                        size="small"
                        min={0}
                        max={5000}
                        step={50}
                        value={entry.delay}
                        style={{ width: 118, flex: 'none' }}
                        addonAfter="ms"
                        placeholder="推送间隔"
                        onChange={(val) => updateEntry(file.name, { delay: typeof val === 'number' ? val : 50 })}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="actions">
        <Button type="primary" disabled={!dirty} loading={saving} onClick={handleSave}>
          更新配置
        </Button>
      </div>
    </section>
  );
}
