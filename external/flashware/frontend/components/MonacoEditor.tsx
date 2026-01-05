import { Editor } from '@monaco-editor/react'

interface MonacoEditorProps {
  code: string
  readOnly?: boolean
}

export default function MonacoEditor({ code, readOnly = true }: MonacoEditorProps) {
  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="move"
        value={code}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
        }}
      />
    </div>
  )
}