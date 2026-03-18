/**
 * Query Workspace Page
 * Write and execute SQL queries with Monaco Editor
 * Supports manual SQL and natural language generation
 */

import { useState, useEffect } from 'react';
import {
  Select,
  Button,
  Card,
  Alert,
  message,
  Space,
  Tabs,
  Input,
  Typography,
  Divider,
} from 'antd';
import {
  PlayCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { DatabaseConnection, QueryResponse } from '../types';
import { SqlEditor } from '../components/sqlEditor';
import { ResultTable } from '../components/resultTable';

const { TextArea } = Input;
const { Text } = Typography;

type QueryMode = 'sql' | 'natural';

export function QueryWorkspace() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [queryMode, setQueryMode] = useState<QueryMode>('sql');
  const [sql, setSql] = useState('SELECT * FROM ');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [generatedExplanation, setGeneratedExplanation] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      setConnections(data);
      if (data.length > 0 && !selectedConnection) {
        setSelectedConnection(data[0].id);
      }
    } catch (error) {
      message.error('Failed to fetch connections');
    }
  };

  const handleGenerateSql = async () => {
    if (!selectedConnection || !naturalLanguage.trim()) {
      message.warning('Please select a connection and describe your query');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedExplanation(null);

    try {
      const response = await fetch(
        `/api/connections/${selectedConnection}/generate-sql`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ naturalLanguage }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'SQL generation failed');
      }

      setSql(data.generatedSql);
      setGeneratedExplanation(data.explanation);
      setQueryMode('sql'); // Switch to SQL mode to show generated query
      message.success('SQL generated successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'SQL generation failed';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedConnection || !sql.trim()) {
      message.warning('Please select a connection and enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/connections/${selectedConnection}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, source: queryMode === 'natural' ? 'llmGenerated' : 'manual' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Query execution failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'sql',
      label: (
        <span>
          <ThunderboltOutlined />
          SQL Editor
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
            Write SQL queries directly. Press Ctrl+Enter (or Cmd+Enter) to execute.
          </div>
          <SqlEditor
            value={sql}
            onChange={setSql}
            onExecute={handleExecute}
            height={180}
          />
        </div>
      ),
    },
    {
      key: 'natural',
      label: (
        <span>
          <RobotOutlined />
          Natural Language
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
            Describe what you want to query in plain English. The AI will generate SQL for you.
          </div>
          <TextArea
            value={naturalLanguage}
            onChange={(e) => setNaturalLanguage(e.target.value)}
            placeholder="e.g., show me all users created in the last 30 days"
            rows={4}
            style={{ marginBottom: 12 }}
          />
          <Button
            type="primary"
            icon={generating ? <LoadingOutlined /> : <RobotOutlined />}
            onClick={handleGenerateSql}
            disabled={generating || !selectedConnection || !naturalLanguage.trim()}
          >
            Generate SQL
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Query Workspace</h1>
        <Select
          style={{ width: 250 }}
          placeholder="Select a connection"
          value={selectedConnection}
          onChange={setSelectedConnection}
          options={connections.map((c) => ({
            value: c.id,
            label: `${c.displayName} (${c.dbType.toUpperCase()})`,
          }))}
        />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={queryMode}
          onChange={(key) => setQueryMode(key as QueryMode)}
          items={tabItems}
        />

        {generatedExplanation && (
          <Alert
            type="info"
            icon={<InfoCircleOutlined />}
            message="Generated Query"
            description={
              <div>
                <Text>{generatedExplanation}</Text>
                <Divider style={{ margin: '8px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Review and edit the generated SQL above, then click "Run Query" to execute.
                </Text>
              </div>
            }
            style={{ marginTop: 12 }}
            closable
            onClose={() => setGeneratedExplanation(null)}
          />
        )}

        <div style={{ marginTop: 12 }}>
          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <PlayCircleOutlined />}
            onClick={handleExecute}
            disabled={loading || !selectedConnection || !sql.trim()}
            size="large"
          >
            Run Query
          </Button>
        </div>
      </Card>

      {error && (
        <Alert
          type="error"
          message="Error"
          description={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      <Card title="Results">
        <ResultTable result={result} loading={loading} />
      </Card>
    </div>
  );
}

export default QueryWorkspace;
