import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Check, Copy, Download, FileCode2, Save } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { Button } from '../ui/primitives';

export const CodeEditorPanel: React.FC = () => {
  const { activeProject, updateSingleFileContent, showToast } = useStudioStore();
  const files = activeProject?.files || [];
  const [activePath, setActivePath] = useState<string>(files[0]?.path || '');
  const [draftCode, setDraftCode] = useState<string>(files[0]?.content || '');
  const [copied, setCopied] = useState(false);

  const activeFile = files.find((f) => f.path === activePath) || files[0];

  useEffect(() => {
    if (activeFile) {
      setActivePath(activeFile.path);
      setDraftCode(activeFile.content);
    }
  }, [activeFile?.path, activeFile?.content]);

  if (!activeProject || files.length === 0) {
    return (
      <div className="p-8 text-sm text-zinc-400">
        No source files generated yet.
      </div>
    );
  }

  const isDirty = activeFile && draftCode !== activeFile.content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftCode);
    setCopied(true);
    showToast('info', 'Code copied to clipboard.');
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSingle = () => {
    if (!activeFile) return;
    const blob = new Blob([draftCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.path.split('/').pop() || 'file.tsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const monacoLanguage =
    activeFile?.language === 'css'
      ? 'css'
      : activeFile?.language === 'html'
        ? 'html'
        : activeFile?.language === 'json'
          ? 'json'
          : 'typescript';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-7.5rem)] overflow-hidden">
      {/* File Tree */}
      <aside className="lg:col-span-3 border-r border-white/[0.08] bg-[#111114] overflow-y-auto">
        <div className="px-4 py-3 border-b border-white/[0.08] text-xs font-medium text-zinc-200 flex items-center justify-between">
          <span>Project Files</span>
          <span className="font-mono text-[11px] text-zinc-500 tabular-nums">{files.length}</span>
        </div>
        <div className="p-2 space-y-0.5">
          {files.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => {
                setActivePath(file.path);
                setDraftCode(file.content);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono text-left transition-colors cursor-pointer ${
                activeFile?.path === file.path
                  ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <FileCode2 size={13} className="shrink-0 text-zinc-500" />
              <span className="truncate">{file.path}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Monaco Editor */}
      <div className="lg:col-span-9 flex flex-col bg-[#09090B] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#111114] flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-xs text-zinc-300">
            {activeFile?.path}
            {isDirty && <span className="ml-2 text-amber-400">(unsaved)</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadSingle}>
              <Download size={13} />
              <span>Download File</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!isDirty}
              onClick={() => activeFile && void updateSingleFileContent(activeFile.path, draftCode)}
            >
              <Save size={13} />
              <span>Save & Recompile</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            theme="vs-dark"
            language={monacoLanguage}
            value={draftCode}
            onChange={(val) => setDraftCode(val ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 20,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
};
