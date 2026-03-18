/**
 * Metadata Browser Component
 * Tree view of tables, views, and columns
 */

import { useState } from 'react';
import { Tree, Tag, Empty, Spin } from 'antd';
import {
  TableOutlined,
  EyeOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import type { TableListItem, TableDetail, ColumnMetadata } from '../types';

interface TreeNode {
  key: string;
  title: React.ReactNode;
  children?: TreeNode[];
}

interface MetadataBrowserProps {
  tables: TableListItem[];
  loading: boolean;
  onTableSelect: (tableId: number) => void;
}

export function MetadataBrowser({ tables, loading, onTableSelect }: MetadataBrowserProps) {
  if (loading) {
    return <Spin />;
  }

  if (tables.length === 0) {
    return <Empty description="No tables found" />;
  }

  const tableItems = tables.filter((t) => t.type === 'TABLE');
  const viewItems = tables.filter((t) => t.type === 'VIEW');

  const treeData: TreeNode[] = [
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
          <span onClick={() => onTableSelect(table.id)} style={{ cursor: 'pointer' }}>
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
          <span onClick={() => onTableSelect(view.id)} style={{ cursor: 'pointer' }}>
            {view.name}
            <Tag style={{ marginLeft: 8 }} color="default">
              {view.columnCount} cols
            </Tag>
          </span>
        ),
      })),
    },
  ];

  return (
    <Tree
      treeData={treeData}
      defaultExpandedKeys={['tables', 'views']}
    />
  );
}

interface ColumnListProps {
  table: TableDetail | null;
  loading: boolean;
}

export function ColumnList({ table, loading }: ColumnListProps) {
  if (loading) {
    return <Spin />;
  }

  if (!table) {
    return <Empty description="Select a table to view details" />;
  }

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
      <h3>
        {table.type === 'VIEW' ? <EyeOutlined /> : <TableOutlined />}{' '}
        {table.name}
        {table.comment && (
          <span style={{ fontWeight: 'normal', color: '#666', marginLeft: 8 }}>
            - {table.comment}
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
          {table.columns.map((col) => (
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
  );
}

export default MetadataBrowser;
