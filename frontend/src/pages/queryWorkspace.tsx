/**
 * Query Workspace Page
 * Write and execute SQL queries with Monaco Editor
 * Supports manual SQL and natural language generation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Select,
  Button,
  Card,
  Alert,
  Tabs,
  Input,
  Typography,
  Divider,
  Tree,
  Tag,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  TableOutlined,
  EyeOutlined,
  KeyOutlined,
  DatabaseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { DatabaseConnection, QueryResponse, TableListItem, TableDetail } from '../types';
import { SqlEditor } from '../components/sqlEditor';
import type { SqlEditorHandle } from '../components/sqlEditor';
import { ResultTable } from '../components/resultTable';
import { api, getErrorMessage } from '../api';
import { msg } from '../message';

const { TextArea } = Input;
const { Text } = Typography;

type QueryMode = 'sql' | 'natural';

interface SchemaTreeNode {
  key: string;
  title: React.ReactNode;
  children?: SchemaTreeNode[];
  isLeaf?: boolean;
}

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

  // Schema sidebar state
  const [tables, setTables] = useState<TableListItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableDetails, setTableDetails] = useState<Record<number, TableDetail>>({});
  const [loadingTableIds, setLoadingTableIds] = useState<Set<number>>(new Set());

  const editorRef = useRef<SqlEditorHandle>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const data = await api.call(() => api.connections.list(), 'Failed to fetch connections');
    if (data) {
      setConnections(data);
      if (data.length > 0 && !selectedConnection) {
        setSelectedConnection(data[0].id);
      }
    }
  };

  // Fetch tables when connection changes
  useEffect(() => {
    if (selectedConnection) {
      fetchTables(selectedConnection);
    } else {
      setTables([]);
      setTableDetails({});
    }
  }, [selectedConnection]);

  const fetchTables = async (connectionId: number) => {
    setTablesLoading(true);
    setTableDetails({});
    const data = await api.call(() => api.tables.list(connectionId), 'Failed to fetch tables');
    setTables(data ?? []);
    setTablesLoading(false);
  };

  const fetchTableDetail = useCallback(async (tableId: number) => {
    if (!selectedConnection || tableDetails[tableId]) return;
    setLoadingTableIds((prev) => new Set(prev).add(tableId));
    const data = await api.call(
      () => api.tables.get(selectedConnection, tableId),
      'Failed to fetch columns',
    );
    if (data) {
      setTableDetails((prev) => ({ ...prev, [tableId]: data }));
    }
    setLoadingTableIds((prev) => {
      const next = new Set(prev);
      next.delete(tableId);
      return next;
    });
  }, [selectedConnection, tableDetails]);

  const insertIntoSql = (text: string) => {
    editorRef.current?.insertText(text);
  };

  const handleGenerateSql = async () => {
    if (!selectedConnection || !naturalLanguage.trim()) {
      msg.warning('Please select a connection and describe your query');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedExplanation(null);

    try {
      const data = await api.generation.generateSql(selectedConnection, naturalLanguage);
      setSql(data.generatedSql);
      setGeneratedExplanation(data.explanation);
      setQueryMode('sql');
      msg.success('SQL generated successfully');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'SQL generation failed');
      setError(errorMsg);
      msg.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedConnection || !sql.trim()) {
      msg.warning('Please select a connection and enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.queries.execute(selectedConnection, {
        sql,
        source: queryMode === 'natural' ? 'llmGenerated' : 'manual',
      });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Query execution failed'));
    } finally {
      setLoading(false);
    }
  };

  const getKeyIcon = (keyType: string) => {
    switch (keyType) {
      case 'primary':
        return <Tag color="gold" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>PK</Tag>;
      case 'foreign':
        return <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>FK</Tag>;
      case 'unique':
        return <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>UNQ</Tag>;
      default:
        return null;
    }
  };

  const buildSchemaTree = (): SchemaTreeNode[] => {
    const tableItems = tables.filter((t) => t.type === 'TABLE');
    const viewItems = tables.filter((t) => t.type === 'VIEW');

    const buildChildren = (items: TableListItem[]): SchemaTreeNode[] =>
      items.map((table) => {
        const detail = tableDetails[table.id];
        const isLoading = loadingTableIds.has(table.id);
        const children: SchemaTreeNode[] = detail
          ? detail.columns.map((col) => ({
              key: `col-${col.id}`,
              isLeaf: true,
              title: (
                <Tooltip title={`Click to insert "${col.name}" into editor`}>
                  <span
                    onClick={() => insertIntoSql(col.name)}
                    style={{ cursor: 'pointer', fontSize: 12 }}
                  >
                    {col.name}{' '}
                    <span style={{ color: '#999' }}>{col.dataType}</span>
                    {' '}{getKeyIcon(col.keyType)}
                  </span>
                </Tooltip>
              ),
            }))
          : [{ key: `placeholder-${table.id}`, title: <Spin size="small" />, isLeaf: true }];

        return {
          key: `table-${table.id}`,
          title: (
            <span>
              <TableOutlined style={{ marginRight: 4, fontSize: 12, color: '#888' }} />
              {table.name}
              {isLoading && <LoadingOutlined style={{ marginLeft: 6, fontSize: 11 }} />}
            </span>
          ),
          children,
        };
      });

    const result: SchemaTreeNode[] = [];
    if (tableItems.length > 0) {
      result.push({
        key: 'tables',
        title: (
          <span>
            <TableOutlined style={{ marginRight: 6 }} />
            Tables ({tableItems.length})
          </span>
        ),
        children: buildChildren(tableItems),
      });
    }
    if (viewItems.length > 0) {
      result.push({
        key: 'views',
        title: (
          <span>
            <EyeOutlined style={{ marginRight: 6 }} />
            Views ({viewItems.length})
          </span>
        ),
        children: buildChildren(viewItems),
      });
    }
    return result;
  };

  const handleTreeExpand = (expandedKeys: React.Key[]) => {
    // Lazy-load column details when a table node is expanded
    for (const key of expandedKeys) {
      const match = String(key).match(/^table-(\d+)$/);
      if (match) {
        fetchTableDetail(Number(match[1]));
      }
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
            ref={editorRef}
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
          onChange={(value) => {
            setSelectedConnection(value);
            setResult(null);
            setError(null);
          }}
          options={connections.map((c) => ({
            value: c.id,
            label: `${c.displayName} (${c.dbType.toUpperCase()})`,
          }))}
        />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Schema Sidebar */}
        <Card
          size="small"
          title={
            <span>
              <DatabaseOutlined style={{ marginRight: 6 }} />
              Schema
            </span>
          }
          extra={
            selectedConnection && (
              <Tooltip title="Refresh metadata">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={async () => {
                    if (!selectedConnection) return;
                    const data = await api.call(
                      () => api.connections.refresh(selectedConnection),
                      'Failed to refresh',
                    );
                    if (data) {
                      msg.success(`Refreshed: ${data.tablesCount} tables, ${data.viewsCount} views`);
                      fetchTables(selectedConnection);
                    }
                  }}
                />
              </Tooltip>
            )
          }
          style={{ width: 280, flexShrink: 0, maxHeight: 'calc(100vh - 140px)', overflow: 'auto' }}
        >
          {!selectedConnection ? (
            <Empty description="Select a connection" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : tablesLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : tables.length === 0 ? (
            <Empty description="No tables found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <>
              <div style={{ marginBottom: 8, color: '#999', fontSize: 11 }}>
                Click column name to insert into editor
              </div>
              <Tree
                treeData={buildSchemaTree()}
                defaultExpandedKeys={['tables', 'views']}
                onExpand={handleTreeExpand}
                blockNode
                style={{ whiteSpace: 'nowrap' }}
              />
            </>
          )}
        </Card>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
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
      </div>
    </div>
  );
}

export default QueryWorkspace;
