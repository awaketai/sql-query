import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Tag, Badge, App as AntApp } from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  CodeOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

import { App as AntAppHook } from 'antd';
import { ConnectionList } from './pages/connectionList';
import { DatabaseExplorer } from './pages/databaseExplorer';
import { QueryWorkspace } from './pages/queryWorkspace';
import type { DatabaseConnection } from './types';
import { api } from './api';
import { setupMessage } from './message';

const { Sider, Content, Header } = Layout;

/** Injects antd's context-aware message API into our global holder. */
function MessageSetup() {
  const { message } = AntAppHook.useApp();
  useEffect(() => {
    setupMessage(message);
  }, [message]);
  return null;
}

function ConnectionStatusIndicator() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const location = useLocation();

  useEffect(() => {
    fetchConnections();
  }, [location]);

  const fetchConnections = async () => {
    try {
      const data = await api.connections.list();
      setConnections(data);
    } catch {
      // Ignore errors for status indicator
    }
  };

  const activeCount = connections.filter((c) => c.status === 'active').length;
  const errorCount = connections.filter((c) => c.status === 'error').length;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Badge status={activeCount > 0 ? 'success' : 'default'} />
      <span style={{ color: '#666' }}>
        {activeCount} active connection{activeCount !== 1 ? 's' : ''}
      </span>
      {errorCount > 0 && (
        <Tag color="error" icon={<CloseCircleOutlined />}>
          {errorCount} error{errorCount !== 1 ? 's' : ''}
        </Tag>
      )}
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/explorer')) return 'explorer';
    if (location.pathname.startsWith('/query')) return 'query';
    return 'connections';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light">
        <div
          style={{
            padding: '16px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <DatabaseOutlined style={{ marginRight: 8 }} />
          DB Query
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: 'connections',
              icon: <DatabaseOutlined />,
              label: 'Connections',
            },
            {
              key: 'explorer',
              icon: <TableOutlined />,
              label: 'Database Explorer',
            },
            {
              key: 'query',
              icon: <CodeOutlined />,
              label: 'Query Workspace',
            },
          ]}
          onClick={({ key }) => {
            const paths: Record<string, string> = {
              connections: '/connections',
              explorer: '/explorer',
              query: '/query',
            };
            navigate(paths[key] || '/');
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <ConnectionStatusIndicator />
        </Header>
        <Content style={{ padding: '24px', background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <ConfigProvider>
      <AntApp>
        <MessageSetup />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/connections" replace />} />
              <Route path="/connections" element={<ConnectionList />} />
              <Route path="/explorer" element={<DatabaseExplorer />} />
              <Route path="/query" element={<QueryWorkspace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
