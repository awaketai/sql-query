/**
 * Result Table Component
 * Ant Design Table that renders query results
 */

import { Table, Empty, Tag, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { QueryResponse } from '../types';

interface ResultTableProps {
  result: QueryResponse | null;
  loading: boolean;
}

export function ResultTable({ result, loading }: ResultTableProps) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Typography.Text type="secondary">Executing query...</Typography.Text>
      </div>
    );
  }

  if (!result) {
    return <Empty description="Execute a query to see results" />;
  }

  // Build columns from result
  const columns: ColumnsType<Record<string, unknown>> = result.columns.map(
    (col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
      sorter: (a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal === null || aVal === undefined) return -1;
        if (bVal === null || bVal === undefined) return 1;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        return String(aVal).localeCompare(String(bVal));
      },
      render: (value: unknown) => {
        if (value === null) {
          return <Typography.Text type="secondary">NULL</Typography.Text>;
        }
        if (value === undefined) {
          return <Typography.Text type="secondary">-</Typography.Text>;
        }
        if (typeof value === 'boolean') {
          return value ? 'true' : 'false';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      },
    })
  );

  // Build data source with keys
  const dataSource = result.rows.map((row, index) => ({
    ...row,
    _key: `row-${index}`,
  }));

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Tag color="blue">{result.rowCount} rows</Tag>
          <Tag color="default">{result.executionTimeMs}ms</Tag>
          {result.limitApplied && (
            <Tag color="orange">LIMIT 1000 auto-applied</Tag>
          )}
        </Space>
      </div>

      {result.rows.length === 0 ? (
        <Empty
          description={
            <span>
              No results found
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Query returned 0 rows
              </Typography.Text>
            </span>
          }
        >
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">
              Columns: {result.columns.join(', ')}
            </Typography.Text>
          </div>
        </Empty>
      ) : (
        <Table
          dataSource={dataSource}
          columns={columns}
          rowKey="_key"
          scroll={{ x: 'max-content', y: 400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} rows`,
          }}
          size="small"
          bordered
        />
      )}
    </div>
  );
}

export default ResultTable;
