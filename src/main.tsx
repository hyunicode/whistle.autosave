import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import 'antd/dist/reset.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#4cc38a',
        colorBgBase: '#0e0f13',
        borderRadius: 8,
        fontSize: 14,
      },
    }}
  >
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
);
