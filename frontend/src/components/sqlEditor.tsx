/**
 * SQL Editor Component
 * Monaco Editor wrapper with SQL language support
 */

import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  height?: number | string;
  readOnly?: boolean;
}

export function SqlEditor({
  value,
  onChange,
  onExecute,
  height = 200,
  readOnly = false,
}: SqlEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount = (
    editorInstance: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco
  ) => {
    editorRef.current = editorInstance;

    // Add keyboard shortcut for execute (Ctrl+Enter / Cmd+Enter)
    editorInstance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        onExecute();
      }
    );

    // Focus the editor
    editorInstance.focus();
  };

  return (
    <Editor
      height={height}
      defaultLanguage="sql"
      value={value}
      onChange={(v) => onChange(v || '')}
      onMount={handleEditorMount}
      theme="vs-light"
      options={{
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        fontSize: 14,
        fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        readOnly,
        folding: true,
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        roundedSelection: true,
        cursorStyle: 'line',
        cursorBlinking: 'smooth',
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}

export default SqlEditor;
