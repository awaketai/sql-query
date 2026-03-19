/**
 * Database Explorer Page
 * Browse tables, views, and columns for a selected connection
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Select,
  Tree,
  Card,
  Tag,
  Empty,
  Spin,
  Button,
} from 'antd';
import {
  TableOutlined,
  EyeOutlined,
  KeyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { DatabaseConnection, TableListItem, TableDetail } from '../types';
import { api } from '../api';
import { msg } from '../message';

interface TreeNode {
  key: string;
  title: React.ReactNode;
  children?: TreeNode[];
}

export function DatabaseExplorer() {
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [tables, setTables] = useState<TableListItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const data = await api.call(() => api.connections.list(), 'Failed to fetch connections');
    if (data) {
      setConnections(data);
      if (!selectedConnection) {
        const paramId = searchParams.get('connectionId');
        const initialId = paramId ? Number(paramId) : data[0]?.id;
        if (initialId && data.some((c) => c.id === initialId)) {
          setSelectedConnection(initialId);
        } else if (data.length > 0) {
          setSelectedConnection(data[0].id);
        }
      }
    }
  };

  useEffect(() => {
    if (selectedConnection) {
      fetchTables(selectedConnection);
    }
  }, [selectedConnection]);

  const fetchTables = async (connectionId: number) => {
    setLoading(true);
    const data = await api.call(() => api.tables.list(connectionId), 'Failed to fetch tables');
    setTables(data ?? []);
    setLoading(false);
  };

  const fetchTableDetail = async (tableId: number) => {
    if (!selectedConnection) return;

    setTableLoading(true);
    const data = await api.call(
      () => api.tables.get(selectedConnection, tableId),
      'Failed to fetch table details',
    );
    if (data) setSelectedTable(data);
    setTableLoading(false);
  };

  const handleRefresh = async () => {
    if (!selectedConnection) return;

    const data = await api.call(
      () => api.connections.refresh(selectedConnection),
      'Failed to refresh metadata',
    );
    if (data) {
      msg.success(`Refreshed: ${data.tablesCount} tables, ${data.viewsCount} views`);
      fetchTables(selectedConnection);
    }
  };

  const buildTreeData = (): TreeNode[] => {
    const tableItems = tables.filter((t) => t.type === 'TABLE');
    const viewItems = tables.filter((t) => t.type === 'VIEW');

    return [
      {
        key: 'tables',
        title: (
          <span>
            <TableOutlined style={{ marginRight: 8 }} />
            Tables ({tableItems.length})
          </span>
        ),
        children: tableItems.map((table) => ({
          key: `table-${table.id}`,
          title: (
            <span onClick={() => fetchTableDetail(table.id)} style={{ cursor: 'pointer' }}>
              {table.name}
              <Tag style={{ marginLeft: 8 }} color="default">
                {table.columnCount} cols
              </Tag>
            </span>
          ),
        })),
      },
      {
        key: 'views',
        title: (
          <span>
            <EyeOutlined style={{ marginRight: 8 }} />
            Views ({viewItems.length})
          </span>
        ),
        children: viewItems.map((view) => ({
          key: `view-${view.id}`,
          title: (
            <span onClick={() => fetchTableDetail(view.id)} style={{ cursor: 'pointer' }}>
              {view.name}
              <Tag style={{ marginLeft: 8 }} color="default">
                {view.columnCount} cols
              </Tag>
            </span>
          ),
        })),
      },
    ];
  };

  const getKeyTypeTag = (keyType: string) => {
    switch (keyType) {
      case 'primary':
        return <Tag color="gold" icon={<KeyOutlined />}>PK</Tag>;
      case 'foreign':
        return <Tag color="blue">FK</Tag>;
      case 'unique':
        return <Tag color="cyan">UNQ</Tag>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Database Explorer</h1>
        <Select
          style={{ width: 250 }}
          placeholder="Select a connection"
          value={selectedConnection}
          onChange={(value) => {
            setSelectedConnection(value);
            setSelectedTable(null);
          }}
          options={connections.map((c) => ({
            value: c.id,
            label: `${c.displayName} (${c.dbType.toUpperCase()})`,
          }))}
        />
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          Refresh Metadata
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ width: 350, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          <h3>Schema Browser</h3>
          {loading ? (
            <Spin />
          ) : tables.length === 0 ? (
            <Empty description="No tables found" />
          ) : (
            <Tree
              treeData={buildTreeData()}
              defaultExpandedKeys={['tables', 'views']}
            />
          )}
        </Card>

        <Card style={{ flex: 1, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {tableLoading ? (
            <Spin />
          ) : selectedTable ? (
            <div>
              <h3>
                {selectedTable.type === 'VIEW' ? <EyeOutlined /> : <TableOutlined />}{' '}
                {selectedTable.name}
                {selectedTable.comment && (
                  <span style={{ fontWeight: 'normal', color: '#666', marginLeft: 8 }}>
                    - {selectedTable.comment}
                  </span>
                )}
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>#</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Column</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Nullable</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Key</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTable.columns.map((col) => (
                    <tr key={col.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{col.ordinalPosition}</td>
                      <td style={{ padding: 8, fontWeight: 500 }}>{col.name}</td>
                      <td style={{ padding: 8 }}>
                        <Tag color="purple">{col.dataType}</Tag>
                      </td>
                      <td style={{ padding: 8 }}>
                        {col.nullable ? <Tag>NULL</Tag> : <Tag color="red">NOT NULL</Tag>}
                      </td>
                      <td style={{ padding: 8 }}>{getKeyTypeTag(col.keyType)}</td>
                      <td style={{ padding: 8, fontFamily: 'monospace' }}>
                        {col.defaultValue || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty description="Select a table to view details" />
          )}
        </Card>
      </div>
    </div>
  );
}
