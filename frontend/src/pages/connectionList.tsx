/**
 * Connection List Page
 * Manages database connections - list, add, delete, refresh metadata
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  DatabaseOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { DatabaseConnection, CreateConnectionRequest } from '../types';
import { api, getErrorMessage } from '../api';
import { msg } from '../message';

export function ConnectionList() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchConnections = async () => {
    setLoading(true);
    const data = await api.call(() => api.connections.list(), 'Failed to fetch connections');
    if (data) setConnections(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleCreate = async (values: CreateConnectionRequest) => {
    try {
      await api.connections.create(values);
      msg.success('Connection created successfully');
      setModalOpen(false);
      form.resetFields();
      fetchConnections();
    } catch (error) {
      msg.error(getErrorMessage(error, 'Failed to create connection'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.connections.delete(id);
      msg.success('Connection deleted');
      fetchConnections();
    } catch (error) {
      msg.error(getErrorMessage(error, 'Failed to delete connection'));
    }
  };

  const handleRefresh = async (id: number) => {
    const data = await api.call(() => api.connections.refresh(id), 'Failed to refresh metadata');
    if (data) {
      msg.success(`Metadata refreshed: ${data.tablesCount} tables, ${data.viewsCount} views`);
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
            icon={<TableOutlined />}
            onClick={() => navigate(`/explorer?connectionId=${record.id}`)}
            size="small"
          >
            Explore
          </Button>
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
            <Input.Password placeholder="mysql://user:pass@host:3306/database or postgresql://user:pass@host:5432/database" />
          </Form.Item>

          <Form.Item
            name="dbType"
            label="Database Type"
            initialValue="mysql"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="mysql">MySQL</Select.Option>
              <Select.Option value="postgresql">PostgreSQL</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
