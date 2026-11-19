import React, { useState } from 'react';
import {
  ArrowLeft,
  Code2,
  Download,
  Eye,
  GitCompare,
  Layers,
  Loader2,
  Redo2,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { useStudioStore, type WorkspaceTab } from '../store/useStudioStore';
import type { AiProviderChoice, ReconstructionMode, RedesignDirection } from '../types/studio';
import { Button } from './ui/primitives';
import { BlueprintAssetsPanel } from './workspace/BlueprintAssetsPanel';
import { CodeEditorPanel } from './workspace/CodeEditorPanel';
import { VisualComparisonPanel } from './workspace/VisualComparisonPanel';
import { VisualEditorPanels } from './workspace/VisualEditorPanels';

const REDESIGN_OPTIONS: Array<{ id: RedesignDirection; label: string }> = [
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'modern-saas', label: 'Modern SaaS' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'creative', label: 'Creative' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'ecommerce', label: 'E-commerce' },
];

export const WorkspaceView: React.FC = () => {
  const {
    activeProject,
    workspaceTab,
    setWorkspaceTab,
    setView,
    undoStack,
    redoStack,
    undo,
    redo,
    isBusyAi,
    regenerateMode,
    aiProvider,
    setAiProvider,
    hasHuggingFaceToken,
  } = useStudioStore();

  const [selectedDirection, setSelectedDirection] = useState<RedesignDirection>(
    activeProject?.redesignDirection || 'modern-saas'
  );

  if (!activeProject) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-sm text-zinc-400">No active project selected.</p>
        <Button variant="secondary" onClick={() => setView('dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: 'visual', label: 'Visual Editor', icon: Eye },
    { id: 'code', label: 'Code & Monaco', icon: Code2 },
    { id: 'compare', label: 'Visual Compare', icon: GitCompare },
    { id: 'blueprint', label: 'Blueprint & Assets', icon: Layers },
  ];

  const handleModeSwitch = async (mode: ReconstructionMode) => {
    if (isBusyAi) return;
    await regenerateMode(mode, mode === 'redesign' ? selectedDirection : undefined);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      {/* Studio Workspace Toolbar */}
      <header className="h-14 border-b border-white/[0.08] bg-[#111114] px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
          <span className="text-zinc-700">/</span>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold text-white truncate">
              {activeProject.name}
            </div>
          </div>
        </div>

        {/* Center Studio View Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-[#09090B] p-1 border border-white/[0.08]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkspaceTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  workspaceTab === tab.id
                    ? 'bg-[#202024] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Rebuild/Redesign, Undo/Redo, Export ZIP */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-1 rounded-md bg-[#09090B] p-0.5 border border-white/[0.08]">
            <button
              type="button"
              disabled={isBusyAi}
              onClick={() => void handleModeSwitch('rebuild')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                activeProject.mode === 'rebuild'
                  ? 'bg-[#202024] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Rebuild
            </button>
            <button
              type="button"
              disabled={isBusyAi}
              onClick={() => void handleModeSwitch('redesign')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                activeProject.mode === 'redesign'
                  ? 'bg-[#202024] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Redesign
            </button>
            <select
              aria-label="Redesign direction"
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value as RedesignDirection)}
              className="bg-transparent text-xs text-zinc-300 px-1.5 py-1 focus:outline-none"
            >
              {REDESIGN_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#18181B]">
                  {opt.label}
                </option>
              ))}
            </select>
            {isBusyAi && <Loader2 size={12} className="animate-spin text-indigo-400 mx-1" />}
          </div>

          <div className="flex items-center gap-1 border-l border-white/[0.08] pl-2">
            <button
              type="button"
              title="Undo"
              disabled={undoStack.length === 0}
              onClick={() => void undo()}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              title="Redo"
              disabled={redoStack.length === 0}
              onClick={() => void redo()}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer"
            >
              <Redo2 size={14} />
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={isBusyAi}
            onClick={() => void regenerateMode(activeProject.mode, selectedDirection)}
            title="Regenerate React project from blueprint"
          >
            <RefreshCw size={13} className={isBusyAi ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Regenerate</span>
          </Button>

          <a
            href={`/api/projects/${activeProject.id}/export`}
            download
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/60 whitespace-nowrap shrink-0 transition-colors"
          >
            <Download size={13} />
            <span>Export ZIP</span>
          </a>
        </div>
      </header>

      {/* Secondary Sub-Bar showing URL, Active Mode, and AI Engine */}
      <div className="h-9 border-b border-white/[0.06] bg-[#09090B] px-4 flex items-center justify-between gap-4 text-[11px] text-zinc-500">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono truncate">{activeProject.sourceUrl}</span>
          <span aria-hidden="true">·</span>
          <span>
            {activeProject.mode === 'rebuild'
              ? 'Rebuild Mode'
              : `Redesign (${activeProject.redesignDirection || selectedDirection})`}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select
            aria-label="Workspace AI Model"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as AiProviderChoice)}
            className="bg-[#111114] text-[11px] text-zinc-300 border border-white/[0.08] rounded px-2 py-0.5 focus:outline-none"
          >
            <option value="auto">AI: Auto (Gemini + Failover)</option>
            <option value="gemini-hydrogen">AI: Gemini 4 Hydrogen</option>
            <option value="gemini-flash-lite">AI: Gemini 3.1 Flash Lite</option>
            <option value="hf-qwen">
              AI: Hugging Face Qwen {hasHuggingFaceToken ? '' : '(HF_TOKEN)'}
            </option>
          </select>
          <span className="font-mono tabular-nums">
            {activeProject.files.length} files · {activeProject.blueprint?.components.length || 0} components
          </span>
        </div>
      </div>

      {/* Active Studio Surface */}
      <div className="flex-1 overflow-hidden">
        {workspaceTab === 'visual' && <VisualEditorPanels />}
        {workspaceTab === 'code' && <CodeEditorPanel />}
        {workspaceTab === 'compare' && <VisualComparisonPanel />}
        {(workspaceTab === 'blueprint' || workspaceTab === 'assets') && <BlueprintAssetsPanel />}
      </div>
    </div>
  );
};
