/**
 * Connection Form Component
 * Form for creating new database connections
 */

import { Form, Input, Select, message } from 'antd';
import type { DbType } from '../types';

interface ConnectionFormData {
  displayName: string;
  connectionUrl: string;
  dbType: DbType;
}

interface ConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConnectionForm({ onSuccess, onCancel }: ConnectionFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = async (values: ConnectionFormData) => {
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
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to create connection');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ dbType: 'mysql' }}
    >
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
        rules={[{ required: true }]}
      >
        <Select>
          <Select.Option value="mysql">MySQL</Select.Option>
        </Select>
      </Form.Item>
    </Form>
  );
}

export default ConnectionForm;
