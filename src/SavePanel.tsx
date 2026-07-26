import { useRef, useState } from 'react';
import { App as AntApp, Button, Input, Switch, Typography } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { setActive, setSettings } from './api';

const { Text, Paragraph, Link } = Typography;

const FILTER_PLACEHOLDER = `# 注释
ke.qq.com !/test=1/ /autosave/i
!m.ke.qq.com`;

interface Props {
  initialActive: boolean;
  initialDir: string;
  initialFilter: string;
  onDirSaved: (dir: string) => void;
}

export default function SavePanel({ initialActive, initialDir, initialFilter, onDirSaved }: Props) {
  const { message, modal } = AntApp.useApp();
  const [active, setActiveState] = useState(initialActive);
  const [sessionsDir, setSessionsDir] = useState(initialDir);
  const [filterText, setFilterText] = useState(initialFilter);
  const [dirty, setDirty] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const activePending = useRef(false);

  function handleToggle(checked: boolean) {
    if (activePending.current) {
      setActiveState(!checked);
      return;
    }
    activePending.current = true;
    setActiveState(checked);
    setActive(checked)
      .then(() => {
        activePending.current = false;
        message[checked ? 'success' : 'info'](checked ? '已启用自动保存' : '已关闭自动保存');
      })
      .catch(() => {
        activePending.current = false;
        setActiveState(!checked);
        message.error('提交失败，请稍后重试');
      });
  }

  function handleSave() {
    const dir = sessionsDir.trim();
    const filter = filterText.trim();
    setSettings({ sessionsDir: dir, filterText: filter })
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '更新失败');
          return;
        }
        setDirty(false);
        message.success('配置已更新');
        onDirSaved(dir);
        if (dir && !active) {
          modal.confirm({
            title: '是否立即启用自动保存？',
            okText: '启用',
            cancelText: '暂不',
            onOk: () => handleToggle(true),
          });
        }
      })
      .catch(() => message.error('提交失败，请稍后重试'));
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <CloudDownloadOutlined className="panel-icon" />
          <span>自动保存</span>
        </div>
        <span className="switch-row">
          <Text type="secondary">启用</Text>
          <Switch checked={active} onChange={handleToggle} />
        </span>
      </div>
      <Text type="secondary" className="panel-desc">
        自动捕获匹配请求的响应内容（JSON / 文本 / 流式），保存为本地文件并记录来源索引。
      </Text>

      <div className="field">
        <Text strong className="field-label">存储目录</Text>
        <Input
          id="sessionsDir"
          maxLength={3072}
          placeholder="本地保存目录（需已存在）"
          value={sessionsDir}
          onChange={(e) => {
            setSessionsDir(e.target.value);
            setDirty(true);
          }}
        />
      </div>

      <div className="field">
        <Text strong className="field-label">过滤条件</Text>
        <div className="cm-wrapper">
          <CodeMirror
            value={filterText}
            placeholder={FILTER_PLACEHOLDER}
            theme="dark"
            minHeight="140px"
            maxHeight="360px"
            extensions={[]}
            onChange={(val) => {
              setFilterText(val);
              setDirty(true);
            }}
          />
        </div>
      </div>

      <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setShowHelp((v) => !v)}>
        {showHelp ? '收起说明' : '查看说明'}
      </Button>
      {showHelp && (
        <Paragraph type="secondary" className="help">
          支持字符串 / 正则匹配请求 URL，<Text strong>!</Text> 取非，多条件用空格或换行分隔。例如：
          <pre>{`# 注释
ke.qq.com !/test=1/ /autosave/i
!m.ke.qq.com`}</pre>
          即 URL 包含 <Text strong>ke.qq.com</Text>，或不匹配 <Text strong>/test=1/</Text>，
          或匹配 <Text strong>/autosave/i</Text>，或不包含 <Text strong>m.ke.qq.com</Text>：
          <pre>{`if (url.indexOf('ke.qq.com') !== -1
  || !/test=1/.test(url)
  || /autosave/i.test(url)
  || url.indexOf('m.ke.qq.com') === -1) {
  // auto save
}`}</pre>
          更复杂的需求可参考
          <Link href="https://github.com/whistle-plugins/whistle.autosave" target="_blank" rel="noreferrer">
            whistle.autosave
          </Link>{' '}
          自行实现。
        </Paragraph>
      )}

      <div className="actions">
        <Button type="primary" disabled={!dirty} onClick={handleSave}>
          更新配置
        </Button>
      </div>
    </section>
  );
}
