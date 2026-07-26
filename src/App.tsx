import { useEffect, useState } from 'react';
import { Typography } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { getSettings, type Settings } from './api';
import MockPanel from './MockPanel';
import SavePanel from './SavePanel';

const { Title, Text } = Typography;

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedDir, setSavedDir] = useState('');
  const [dirVersion, setDirVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    (function load() {
      getSettings()
        .then((data) => {
          if (!alive) return;
          setSettings(data);
          setSavedDir(data.sessionsDir || '');
        })
        .catch(() => {
          if (alive) setTimeout(load, 1000);
        });
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!settings) {
    return (
      <div className="app-loading">
        <Text type="secondary">加载中…</Text>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-badge">
            <CloudDownloadOutlined />
          </span>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              AutoSave
            </Title>
            <Text type="secondary" className="brand-sub">
              自动保存抓包响应 · 基于本地文件 Mock
            </Text>
          </div>
        </div>
      </header>

      <div className="layout">
        <SavePanel
          initialActive={!!settings.active}
          initialDir={settings.sessionsDir || ''}
          initialFilter={settings.filterText || ''}
          onDirSaved={(dir) => {
            setSavedDir(dir);
            setDirVersion((v) => v + 1);
          }}
        />
        <MockPanel
          dir={savedDir}
          dirVersion={dirVersion}
          initialActive={!!settings.mockActive}
          initialEntries={settings.mockEntries ?? []}
        />
      </div>
    </div>
  );
}
