import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Pencil,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
} from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import type { BlueprintComponentNode } from '../../types/studio';
import { Button, Input, Select, Textarea } from '../ui/primitives';

const QUICK_PROMPTS = [
  'Make the website look more premium',
  'Change the primary color to deep cobalt blue',
  'Make the navigation sticky',
  'Add a pricing section with 3 tiers',
  'Create a testimonials section',
  'Change the website to a dark theme',
];

export const VisualEditorPanels: React.FC = () => {
  const {
    activeProject,
    selectedComponentId,
    setSelectedComponentId,
    viewport,
    setViewport,
    rightPanelTab,
    setRightPanelTab,
    previewHtml,
    previewCompileError,
    isCompilingPreview,
    isBusyAi,
    updateComponentNode,
    reorderComponent,
    toggleComponentVisibility,
    renameComponent,
    updateDesignSystem,
    sendAiEdit,
  } = useStudioStore();

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({ root: true });
  const [renamingCompId, setRenamingCompId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [chatInput, setChatInput] = useState('');

  // Listen to click-to-select messages from the sandboxed preview iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RTW_SELECT_COMPONENT' && typeof event.data.componentId === 'string') {
        setSelectedComponentId(event.data.componentId);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setSelectedComponentId]);

  if (!activeProject || !activeProject.blueprint) {
    return (
      <div className="p-8 text-sm text-zinc-400">
        No blueprint loaded for this project.
      </div>
    );
  }

  const blueprint = activeProject.blueprint;
  const components = blueprint.components;
  const selectedComp: BlueprintComponentNode | undefined = components.find(
    (c) => c.id === selectedComponentId
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isBusyAi) return;
    const msg = chatInput.trim();
    setChatInput('');
    await sendAiEdit(msg);
  };

  const viewportWidthClass =
    viewport === 'desktop'
      ? 'w-full'
      : viewport === 'tablet'
        ? 'w-[768px] max-w-full'
        : 'w-[390px] max-w-full';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-7.5rem)] overflow-hidden">
      {/* LEFT PANEL: Component Explorer */}
      <aside className="lg:col-span-3 xl:col-span-2 border-r border-white/[0.08] bg-[#111114] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-200">Component Explorer</span>
          <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
            {components.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          <button
            type="button"
            onClick={() => toggleExpand('root')}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.04] rounded cursor-pointer"
          >
            {expandedIds.root ?? true ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>Home Page</span>
          </button>

          {(expandedIds.root ?? true) && (
            <div className="pl-3 space-y-1">
              {components.map((comp, idx) => {
                const isSelected = comp.id === selectedComponentId;
                const isExpanded = expandedIds[comp.id] ?? false;

                return (
                  <div key={comp.id} className="space-y-0.5">
                    <div
                      className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                          : 'text-zinc-300 hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleExpand(comp.id)}
                          aria-label="Toggle component details"
                          className="text-zinc-500 hover:text-zinc-200 shrink-0 cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {renamingCompId === comp.id ? (
                          <input
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            autoFocus
                            onBlur={() => {
                              renameComponent(comp.id, renameText);
                              setRenamingCompId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                renameComponent(comp.id, renameText);
                                setRenamingCompId(null);
                              }
                            }}
                            className="w-full bg-[#09090B] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedComponentId(comp.id)}
                            className={`truncate text-left flex-1 cursor-pointer ${
                              !comp.visible ? 'opacity-45 line-through' : ''
                            }`}
                          >
                            {comp.name}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => {
                            setRenamingCompId(comp.id);
                            setRenameText(comp.name);
                          }}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          title="Move up"
                          disabled={idx === 0}
                          onClick={() => reorderComponent(comp.id, 'up')}
                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={idx === components.length - 1}
                          onClick={() => reorderComponent(comp.id, 'down')}
                          className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown size={11} />
                        </button>
                        <button
                          type="button"
                          title={comp.visible ? 'Hide section' : 'Show section'}
                          onClick={() => toggleComponentVisibility(comp.id)}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          {comp.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pl-6 py-1 space-y-1 text-[11px] text-zinc-500 font-mono">
                        {comp.props.heading && <div className="truncate">Heading</div>}
                        {comp.props.subheading && <div className="truncate">Description</div>}
                        {comp.props.ctaLabel && <div className="truncate">Button</div>}
                        {comp.props.imageUrl && <div className="truncate">Image</div>}
                        {comp.props.items && <div>Items ({comp.props.items.length})</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* CENTER PANEL: Sandboxed Live Preview */}
      <main className="lg:col-span-6 xl:col-span-7 bg-[#09090B] flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#111114] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-md bg-[#09090B] p-0.5 border border-white/[0.08]">
            {[
              { id: 'desktop', label: 'Desktop', icon: Monitor },
              { id: 'tablet', label: 'Tablet', icon: Tablet },
              { id: 'mobile', label: 'Mobile', icon: Smartphone },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewport(item.id as typeof viewport)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    viewport === item.id
                      ? 'bg-[#202024] text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-2">
            {isCompilingPreview ? (
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <Loader2 size={12} className="animate-spin" />
                <span>Compiling preview</span>
              </span>
            ) : (
              <span>Click any element in preview to inspect</span>
            )}
          </div>
        </div>

        {previewCompileError && (
          <div className="px-4 py-2 bg-red-950/60 border-b border-red-500/30 text-xs text-red-200 font-mono truncate">
            {previewCompileError}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center bg-[#09090B]">
          <div
            className={`${viewportWidthClass} h-full min-h-[540px] rounded-lg border border-white/[0.1] bg-white overflow-hidden transition-all duration-200 shadow-2xl`}
          >
            {previewHtml ? (
              <iframe
                title="Live React Preview"
                sandbox="allow-scripts"
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-white"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#111114] text-xs text-zinc-400">
                Building sandboxed React preview...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* RIGHT PANEL: Properties Editor & AI Assistant */}
      <aside className="lg:col-span-3 border-l border-white/[0.08] bg-[#111114] flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-white/[0.08] flex items-center gap-1">
          <button
            type="button"
            onClick={() => setRightPanelTab('properties')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              rightPanelTab === 'properties'
                ? 'bg-[#202024] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setRightPanelTab('assistant')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              rightPanelTab === 'assistant'
                ? 'bg-[#202024] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles size={12} className="text-indigo-400" />
            <span>AI Assistant</span>
          </button>
        </div>

        {rightPanelTab === 'properties' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {selectedComp ? (
              <>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">{selectedComp.name}</div>
                    <div className="text-[11px] font-mono text-zinc-500">
                      #{selectedComp.id} · {selectedComp.type}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComponentVisibility(selectedComp.id)}
                  >
                    {selectedComp.visible ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {/* Content Props */}
                <div className="space-y-3">
                  <div className="text-[11px] font-medium text-zinc-400">Content</div>

                  {selectedComp.props.heading !== undefined && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Heading Text</label>
                      <Input
                        value={selectedComp.props.heading || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            props: { ...n.props, heading: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}

                  {selectedComp.props.subheading !== undefined && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Subheading</label>
                      <Textarea
                        rows={3}
                        value={selectedComp.props.subheading || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            props: { ...n.props, subheading: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}

                  {selectedComp.props.body !== undefined && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Body Copy</label>
                      <Textarea
                        rows={3}
                        value={selectedComp.props.body || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            props: { ...n.props, body: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}

                  {selectedComp.props.ctaLabel !== undefined && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Button Label</label>
                      <Input
                        value={selectedComp.props.ctaLabel || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            props: { ...n.props, ctaLabel: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}

                  {selectedComp.props.imageUrl !== undefined && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Image URL</label>
                      <Input
                        value={selectedComp.props.imageUrl || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            props: { ...n.props, imageUrl: e.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Layout & Dimensions */}
                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <div className="text-[11px] font-medium text-zinc-400">Dimensions & Spacing</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Width</label>
                      <Input
                        placeholder="auto"
                        value={selectedComp.styles.width || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, width: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Min Height</label>
                      <Input
                        placeholder="auto"
                        value={selectedComp.styles.height || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, height: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Padding</label>
                      <Input
                        placeholder="64px 24px"
                        value={selectedComp.styles.padding || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, padding: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Margin</label>
                      <Input
                        placeholder="0px"
                        value={selectedComp.styles.margin || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, margin: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Alignment</label>
                      <Select
                        value={selectedComp.styles.textAlign || 'left'}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: {
                              ...n.styles,
                              textAlign: e.target.value as 'left' | 'center' | 'right',
                            },
                          }))
                        }
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Border Radius</label>
                      <Input
                        placeholder="8px"
                        value={selectedComp.styles.borderRadius || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, borderRadius: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Colors & Typography */}
                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <div className="text-[11px] font-medium text-zinc-400">Colors & Typography</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Background</label>
                      <div className="flex gap-1.5">
                        <input
                          type="color"
                          value={selectedComp.styles.backgroundColor || blueprint.designSystem.backgroundColor}
                          onChange={(e) =>
                            updateComponentNode(selectedComp.id, (n) => ({
                              ...n,
                              styles: { ...n.styles, backgroundColor: e.target.value },
                            }))
                          }
                          className="h-9 w-9 rounded bg-transparent border border-white/10 cursor-pointer shrink-0"
                        />
                        <Input
                          value={selectedComp.styles.backgroundColor || ''}
                          placeholder="inherit"
                          onChange={(e) =>
                            updateComponentNode(selectedComp.id, (n) => ({
                              ...n,
                              styles: { ...n.styles, backgroundColor: e.target.value || undefined },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Text Color</label>
                      <div className="flex gap-1.5">
                        <input
                          type="color"
                          value={selectedComp.styles.textColor || blueprint.designSystem.textColor}
                          onChange={(e) =>
                            updateComponentNode(selectedComp.id, (n) => ({
                              ...n,
                              styles: { ...n.styles, textColor: e.target.value },
                            }))
                          }
                          className="h-9 w-9 rounded bg-transparent border border-white/10 cursor-pointer shrink-0"
                        />
                        <Input
                          value={selectedComp.styles.textColor || ''}
                          placeholder="inherit"
                          onChange={(e) =>
                            updateComponentNode(selectedComp.id, (n) => ({
                              ...n,
                              styles: { ...n.styles, textColor: e.target.value || undefined },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Border Color</label>
                      <Input
                        placeholder="#E2E8F0"
                        value={selectedComp.styles.borderColor || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, borderColor: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Font Size</label>
                      <Input
                        placeholder="inherit"
                        value={selectedComp.styles.fontSize || ''}
                        onChange={(e) =>
                          updateComponentNode(selectedComp.id, (n) => ({
                            ...n,
                            styles: { ...n.styles, fontSize: e.target.value || undefined },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-400">
                Select a component from the explorer or preview to edit its properties.
              </div>
            )}

            {/* Global Design System Tokens */}
            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              <div className="text-[11px] font-medium text-zinc-400">Global Design System</div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Primary Accent</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={blueprint.designSystem.primaryColor}
                      onChange={(e) => updateDesignSystem({ primaryColor: e.target.value })}
                      className="h-9 w-9 rounded bg-transparent border border-white/10 cursor-pointer shrink-0"
                    />
                    <Input
                      value={blueprint.designSystem.primaryColor}
                      onChange={(e) => updateDesignSystem({ primaryColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Canvas Bg</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={blueprint.designSystem.backgroundColor}
                      onChange={(e) => updateDesignSystem({ backgroundColor: e.target.value })}
                      className="h-9 w-9 rounded bg-transparent border border-white/10 cursor-pointer shrink-0"
                    />
                    <Input
                      value={blueprint.designSystem.backgroundColor}
                      onChange={(e) => updateDesignSystem({ backgroundColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Display Font Family</label>
                <Select
                  value={blueprint.designSystem.displayFontFamily}
                  onChange={(e) => updateDesignSystem({ displayFontFamily: e.target.value })}
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Fraunces">Fraunces</option>
                  <option value="Playfair Display">Playfair Display</option>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          /* AI ASSISTANT TAB */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeProject.aiHistory.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Ask Gemini to modify the layout, refine typography, add new sections, or update styles. Only affected React files are modified.
                  </p>
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-zinc-500">Suggested Edits</div>
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={isBusyAi}
                        onClick={() => void sendAiEdit(q)}
                        className="w-full text-left px-3 py-2 rounded-md border border-white/[0.08] bg-[#18181B] hover:border-white/20 text-xs text-zinc-300 transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeProject.aiHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg p-3 text-xs space-y-2 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-zinc-100 ml-4'
                      : 'bg-[#18181B] border border-white/[0.08] text-zinc-200 mr-2'
                  }`}
                >
                  <div className="text-[10px] font-mono text-zinc-500">
                    {msg.role === 'user' ? 'You' : 'Gemini Assistant'}
                  </div>
                  <p className="leading-relaxed">{msg.content}</p>
                  {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-1">
                      <div className="text-[10px] font-mono text-zinc-400">Modified Files</div>
                      {msg.proposedChanges.map((ch) => (
                        <div key={ch.path} className="text-[11px] font-mono text-indigo-300 truncate">
                          {ch.action}: {ch.path}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isBusyAi && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span>Applying targeted code changes...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-white/[0.08] space-y-2">
              {selectedComponentId && (
                <div className="text-[11px] font-mono text-zinc-500 truncate">
                  Context: #{selectedComponentId}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe a change..."
                  disabled={isBusyAi}
                />
                <Button type="submit" variant="primary" size="md" disabled={isBusyAi || !chatInput.trim()}>
                  <Send size={13} />
                </Button>
              </div>
            </form>
          </div>
        )}
      </aside>
    </div>
  );
};
