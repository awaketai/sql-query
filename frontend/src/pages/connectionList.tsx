/**
 * Connection List Page
 * Manages database connections - list, add, delete, refresh metadata
 */

import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { DatabaseConnection, DbType } from '../types';

interface ConnectionFormData {
  displayName: string;
  connectionUrl: string;
  dbType: DbType;
}

export function ConnectionList() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      setConnections(data);
    } catch (error) {
      message.error('Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleCreate = async (values: ConnectionFormData) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create connection');
      }

      message.success('Connection created successfully');
      setModalOpen(false);
      form.resetFields();
      fetchConnections();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to create connection');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }

      message.success('Connection deleted');
      fetchConnections();
    } catch (error) {
      message.error('Failed to delete connection');
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      const response = await fetch(`/api/connections/${id}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh metadata');
      }

      const data = await response.json();
      message.success(`Metadata refreshed: ${data.tablesCount} tables, ${data.viewsCount} views`);
    } catch (error) {
      message.error('Failed to refresh metadata');
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      inactive: 'default',
      error: 'red',
    };
    return <Tag color={colors[status] || 'default'}>{status}</Tag>;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string) => (
        <Space>
          <DatabaseOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'dbType',
      key: 'dbType',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: DatabaseConnection) => (
        <Space>
          <Button
            icon={<SyncOutlined />}
            onClick={() => handleRefresh(record.id)}
            size="small"
          >
            Refresh
          </Button>
          <Popconfirm
            title="Delete this connection?"
            description="This will also delete all cached metadata."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger size="small">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Database Connections</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          Add Connection
        </Button>
      </div>

      <Table
        dataSource={connections}
        columns={columns}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="Add Database Connection"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Connect"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="My Database" />
          </Form.Item>

          <Form.Item
            name="connectionUrl"
            label="Connection URL"
            rules={[{ required: true, message: 'Please enter a connection URL' }]}
          >
            <Input.Password placeholder="mysql://user:pass@host:3306/database" />
          </Form.Item>

          <Form.Item
            name="dbType"
            label="Database Type"
            initialValue="mysql"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="mysql">MySQL</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
