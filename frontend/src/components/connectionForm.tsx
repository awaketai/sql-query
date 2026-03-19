/**
 * Connection Form Component
 * Form for creating new database connections
 */

import { Form, Input, Select } from 'antd';
import type { CreateConnectionRequest } from '../types';
import { api, getErrorMessage } from '../api';
import { msg } from '../message';

interface ConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConnectionForm({ onSuccess, onCancel }: ConnectionFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = async (values: CreateConnectionRequest) => {
    try {
      await api.connections.create(values);
      msg.success('Connection created successfully');
      form.resetFields();
      onSuccess();
    } catch (error) {
      msg.error(getErrorMessage(error, 'Failed to create connection'));
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
