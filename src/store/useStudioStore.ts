import { create } from 'zustand';
import type {
  AiProviderChoice,
  AnalysisStageProgress,
  BlueprintComponentNode,
  GeneratedFile,
  ReconstructionMode,
  RedesignDirection,
  StudioProject,
  WebsiteBlueprint,
} from '../types/studio';

export type AppView = 'landing' | 'dashboard' | 'new-project' | 'analyzing' | 'workspace';
export type WorkspaceTab = 'visual' | 'code' | 'compare' | 'blueprint' | 'assets';
export type ViewportPreset = 'desktop' | 'tablet' | 'mobile';
export type RightPanelTab = 'properties' | 'assistant';

interface HistorySnapshot {
  blueprint: WebsiteBlueprint;
  files: GeneratedFile[];
}

interface StudioState {
  view: AppView;
  projects: StudioProject[];
  loadingProjects: boolean;
  activeProject: StudioProject | null;
  workspaceTab: WorkspaceTab;
  viewport: ViewportPreset;
  selectedComponentId: string | null;
  rightPanelTab: RightPanelTab;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];

  // Analysis SSE state
  analysisProjectId: string | null;
  analysisStatus: 'idle' | 'running' | 'completed' | 'failed';
  analysisStages: AnalysisStageProgress[];
  analysisError: string | null;

  // Preview state
  previewHtml: string;
  previewCompileError: string | null;
  isCompilingPreview: boolean;
  isBusyAi: boolean;
  isBusyCompare: boolean;
  toastMessage: { type: 'info' | 'error' | 'success'; text: string } | null;

  aiProvider: AiProviderChoice;
  hasGeminiKey: boolean;
  hasHuggingFaceToken: boolean;

  // Actions
  setView: (view: AppView) => void;
  setAiProvider: (provider: AiProviderChoice) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  setViewport: (vp: ViewportPreset) => void;
  setSelectedComponentId: (id: string | null) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  clearToast: () => void;
  showToast: (type: 'info' | 'error' | 'success', text: string) => void;

  loadProjects: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  startAnalysis: (
    url: string,
    mode: ReconstructionMode,
    redesignDirection?: RedesignDirection,
    projectName?: string,
    aiProviderOverride?: AiProviderChoice
  ) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  refreshPreview: (projectOverride?: StudioProject) => Promise<void>;
  pushHistorySnapshot: () => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  updateComponentNode: (componentId: string, updater: (node: BlueprintComponentNode) => BlueprintComponentNode) => void;
  reorderComponent: (componentId: string, direction: 'up' | 'down') => void;
  toggleComponentVisibility: (componentId: string) => void;
  renameComponent: (componentId: string, newName: string) => void;
  updateDesignSystem: (patch: Partial<WebsiteBlueprint['designSystem']>) => void;
  persistProjectState: (project: StudioProject) => Promise<void>;
  updateSingleFileContent: (path: string, content: string) => Promise<void>;

  sendAiEdit: (prompt: string) => Promise<void>;
  regenerateMode: (mode: ReconstructionMode, redesignDirection?: RedesignDirection) => Promise<void>;
  runVisualComparison: () => Promise<void>;
}

let activeEventSource: EventSource | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function syncTokensCssWithBlueprint(blueprint: WebsiteBlueprint, files: GeneratedFile[]): GeneratedFile[] {
  const ds = blueprint.designSystem;
  return files.map((f) => {
    if (f.path !== 'src/styles/tokens.css') return f;
    return {
      ...f,
      content: `:root {
  --color-primary: ${ds.primaryColor};
  --color-secondary: ${ds.secondaryColor};
  --color-bg: ${ds.backgroundColor};
  --color-surface: ${ds.surfaceColor};
  --color-text: ${ds.textColor};
  --color-muted: ${ds.mutedTextColor};
  --color-border: ${ds.borderColor};
  --font-display: '${ds.displayFontFamily}', sans-serif;
  --font-body: '${ds.fontFamily}', sans-serif;
  --radius-base: ${ds.borderRadius};
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  margin: 0;
}
`,
    };
  });
}

export const useStudioStore = create<StudioState>((set, get) => ({
  view: 'landing',
  projects: [],
  loadingProjects: false,
  activeProject: null,
  workspaceTab: 'visual',
  viewport: 'desktop',
  selectedComponentId: null,
  rightPanelTab: 'properties',
  undoStack: [],
  redoStack: [],

  analysisProjectId: null,
  analysisStatus: 'idle',
  analysisStages: [],
  analysisError: null,

  previewHtml: '',
  previewCompileError: null,
  isCompilingPreview: false,
  isBusyAi: false,
  isBusyCompare: false,
  toastMessage: null,
  aiProvider: 'auto',
  hasGeminiKey: true,
  hasHuggingFaceToken: false,

  setView: (view) => set({ view }),
  setAiProvider: (aiProvider) => set({ aiProvider }),
  setWorkspaceTab: (workspaceTab) => set({ workspaceTab }),
  setViewport: (viewport) => set({ viewport }),
  setSelectedComponentId: (selectedComponentId) => {
    set({ selectedComponentId });
    const proj = get().activeProject;
    if (proj) {
      void get().refreshPreview(proj);
    }
  },
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  clearToast: () => set({ toastMessage: null }),
  showToast: (type, text) => {
    set({ toastMessage: { type, text } });
    setTimeout(() => {
      if (get().toastMessage?.text === text) {
        set({ toastMessage: null });
      }
    }, 4500);
  },

  loadProjects: async () => {
    set({ loadingProjects: true });
    try {
      const [projRes, healthRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/health').catch(() => null),
      ]);
      const data = await projRes.json();
      if (projRes.ok) {
        set({ projects: data.projects || [] });
      }
      if (healthRes && healthRes.ok) {
        const h = await healthRes.json();
        set({
          hasGeminiKey: Boolean(h.hasGeminiKey),
          hasHuggingFaceToken: Boolean(h.hasHuggingFaceToken),
        });
      }
    } catch {
      // ignore transient error
    } finally {
      set({ loadingProjects: false });
    }
  },

  openProject: async (id) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (!res.ok || !data.project) {
        get().showToast('error', data.error || 'Could not load project.');
        return;
      }
      const project: StudioProject = data.project;
      const firstComp = project.blueprint?.components?.[0]?.id || null;
      set({
        activeProject: project,
        selectedComponentId: firstComp,
        undoStack: [],
        redoStack: [],
        workspaceTab: 'visual',
        view: 'workspace',
      });
      await get().refreshPreview(project);
    } catch {
      get().showToast('error', 'Failed to open project.');
    }
  },

  startAnalysis: async (url, mode, redesignDirection, projectName, aiProviderOverride) => {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    const chosenProvider = aiProviderOverride || get().aiProvider;

    set({
      analysisStatus: 'running',
      analysisError: null,
      analysisStages: [],
      view: 'analyzing',
    });

    try {
      const res = await fetch('/api/analyze/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          mode,
          redesignDirection,
          name: projectName,
          aiProvider: chosenProvider,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        set({
          analysisStatus: 'failed',
          analysisError: data.error || 'URL validation or analysis initialization failed.',
        });
        return;
      }

      const project: StudioProject = data.project;
      set({
        analysisProjectId: project.id,
        analysisStages: data.stages || [],
        activeProject: project,
      });

      const es = new EventSource(`/api/analyze/events/${project.id}`);
      activeEventSource = es;

      es.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.stages) {
            set({ analysisStages: payload.stages });
          }

          // Refresh partial project when screenshots arrive
          const stages: AnalysisStageProgress[] = payload.stages || [];
          const shotsDone = stages.find((s) => s.id === 'screenshots')?.status === 'completed';
          if (shotsDone) {
            const pRes = await fetch(`/api/projects/${project.id}`);
            if (pRes.ok) {
              const pJson = await pRes.json();
              if (pJson.project) set({ activeProject: pJson.project });
            }
          }

          if (payload.status === 'completed') {
            es.close();
            activeEventSource = null;
            set({ analysisStatus: 'completed' });
            await get().loadProjects();
            await get().openProject(project.id);
          } else if (payload.status === 'failed') {
            es.close();
            activeEventSource = null;
            set({
              analysisStatus: 'failed',
              analysisError: payload.error || 'Analysis failed.',
            });
            await get().loadProjects();
          }
        } catch {
          // ignore malformed SSE chunk
        }
      };

      es.onerror = () => {
        // EventSource closes automatically when server closes stream
      };
    } catch (err: unknown) {
      set({
        analysisStatus: 'failed',
        analysisError: err instanceof Error ? err.message : 'Network error starting analysis.',
      });
    }
  },

  renameProject: async (id, name) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      set((s) => ({
        projects: s.projects.map((p) => (p.id === id ? data.project : p)),
        activeProject: s.activeProject?.id === id ? data.project : s.activeProject,
      }));
      get().showToast('success', 'Project renamed.');
    }
  },

  duplicateProject: async (id) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duplicateFromId: id }),
    });
    if (res.ok) {
      await get().loadProjects();
      get().showToast('success', 'Project duplicated.');
    }
  },

  deleteProject: async (id) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        activeProject: s.activeProject?.id === id ? null : s.activeProject,
      }));
      get().showToast('info', 'Project deleted.');
    }
  },

  refreshPreview: async (projectOverride) => {
    const project = projectOverride || get().activeProject;
    if (!project || project.files.length === 0) return;

    set({ isCompilingPreview: true });
    try {
      const res = await fetch(`/api/projects/${project.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedComponentId: get().selectedComponentId,
          blueprintOverride: project.blueprint,
          filesOverride: project.files,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        set({
          previewHtml: data.html || '',
          previewCompileError: data.compileError || null,
        });
      }
    } catch {
      // ignore transient compile error
    } finally {
      set({ isCompilingPreview: false });
    }
  },

  pushHistorySnapshot: () => {
    const proj = get().activeProject;
    if (!proj || !proj.blueprint) return;
    set((s) => ({
      undoStack: [
        ...s.undoStack.slice(-24),
        {
          blueprint: structuredClone(proj.blueprint!),
          files: structuredClone(proj.files),
        },
      ],
      redoStack: [],
    }));
  },

  undo: async () => {
    const { undoStack, activeProject } = get();
    if (undoStack.length === 0 || !activeProject || !activeProject.blueprint) return;
    const prev = undoStack[undoStack.length - 1];
    const currentSnapshot: HistorySnapshot = {
      blueprint: structuredClone(activeProject.blueprint),
      files: structuredClone(activeProject.files),
    };
    const nextProject: StudioProject = {
      ...activeProject,
      blueprint: prev.blueprint,
      files: prev.files,
    };
    set((s) => ({
      activeProject: nextProject,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, currentSnapshot],
    }));
    await get().persistProjectState(nextProject);
    await get().refreshPreview(nextProject);
  },

  redo: async () => {
    const { redoStack, activeProject } = get();
    if (redoStack.length === 0 || !activeProject || !activeProject.blueprint) return;
    const next = redoStack[redoStack.length - 1];
    const currentSnapshot: HistorySnapshot = {
      blueprint: structuredClone(activeProject.blueprint),
      files: structuredClone(activeProject.files),
    };
    const nextProject: StudioProject = {
      ...activeProject,
      blueprint: next.blueprint,
      files: next.files,
    };
    set((s) => ({
      activeProject: nextProject,
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, currentSnapshot],
    }));
    await get().persistProjectState(nextProject);
    await get().refreshPreview(nextProject);
  },

  persistProjectState: async (project) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint: project.blueprint,
          files: project.files,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        set((s) => ({
          projects: s.projects.map((p) => (p.id === project.id ? data.project : p)),
        }));
      }
    } catch {
      // ignore background save failure
    }
  },

  updateComponentNode: (componentId, updater) => {
    const proj = get().activeProject;
    if (!proj || !proj.blueprint) return;
    get().pushHistorySnapshot();

    const nextComponents = proj.blueprint.components.map((c) =>
      c.id === componentId ? updater(c) : c
    );
    const nextBlueprint: WebsiteBlueprint = {
      ...proj.blueprint,
      components: nextComponents,
    };
    const nextProject: StudioProject = {
      ...proj,
      blueprint: nextBlueprint,
    };
    set({ activeProject: nextProject });
    void get().refreshPreview(nextProject);

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void get().persistProjectState(nextProject);
    }, 350);
  },

  reorderComponent: (componentId, direction) => {
    const proj = get().activeProject;
    if (!proj || !proj.blueprint) return;
    const list = [...proj.blueprint.components];
    const idx = list.findIndex((c) => c.id === componentId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    get().pushHistorySnapshot();
    const [item] = list.splice(idx, 1);
    list.splice(targetIdx, 0, item);

    const nextProject: StudioProject = {
      ...proj,
      blueprint: { ...proj.blueprint, components: list },
    };
    set({ activeProject: nextProject });
    void get().refreshPreview(nextProject);
    void get().persistProjectState(nextProject);
  },

  toggleComponentVisibility: (componentId) => {
    get().updateComponentNode(componentId, (node) => ({
      ...node,
      visible: !node.visible,
    }));
  },

  renameComponent: (componentId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    get().updateComponentNode(componentId, (node) => ({
      ...node,
      name: trimmed,
    }));
  },

  updateDesignSystem: (patch) => {
    const proj = get().activeProject;
    if (!proj || !proj.blueprint) return;
    get().pushHistorySnapshot();

    const nextBlueprint: WebsiteBlueprint = {
      ...proj.blueprint,
      designSystem: {
        ...proj.blueprint.designSystem,
        ...patch,
      },
    };
    const nextFiles = syncTokensCssWithBlueprint(nextBlueprint, proj.files);
    const nextProject: StudioProject = {
      ...proj,
      blueprint: nextBlueprint,
      files: nextFiles,
    };
    set({ activeProject: nextProject });
    void get().refreshPreview(nextProject);

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void get().persistProjectState(nextProject);
    }, 350);
  },

  updateSingleFileContent: async (filePath, content) => {
    const proj = get().activeProject;
    if (!proj) return;
    get().pushHistorySnapshot();

    const nextFiles = proj.files.map((f) => (f.path === filePath ? { ...f, content } : f));
    const nextProject: StudioProject = {
      ...proj,
      files: nextFiles,
    };
    set({ activeProject: nextProject });
    await get().persistProjectState(nextProject);
    await get().refreshPreview(nextProject);
    get().showToast('success', `Saved ${filePath}`);
  },

  sendAiEdit: async (prompt) => {
    const proj = get().activeProject;
    if (!proj || !prompt.trim()) return;
    get().pushHistorySnapshot();
    set({ isBusyAi: true });

    try {
      const res = await fetch(`/api/projects/${proj.id}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          selectedComponentId: get().selectedComponentId,
          aiProvider: get().aiProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        get().showToast('error', data.error || 'AI edit failed.');
        return;
      }

      const updated: StudioProject = data.project;
      set((s) => ({
        activeProject: updated,
        projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      }));
      await get().refreshPreview(updated);
      get().showToast('success', 'Applied AI modifications.');
    } catch {
      get().showToast('error', 'Network error calling AI assistant.');
    } finally {
      set({ isBusyAi: false });
    }
  },

  regenerateMode: async (mode, redesignDirection) => {
    const proj = get().activeProject;
    if (!proj) return;
    get().pushHistorySnapshot();
    set({ isBusyAi: true });

    try {
      const res = await fetch(`/api/projects/${proj.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, redesignDirection, aiProvider: get().aiProvider }),
      });
      const data = await res.json();
      if (!res.ok) {
        get().showToast('error', data.error || 'Regeneration failed.');
        return;
      }
      const updated: StudioProject = data.project;
      set((s) => ({
        activeProject: updated,
        projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      }));
      await get().refreshPreview(updated);
      get().showToast(
        'success',
        mode === 'rebuild' ? 'Regenerated in Rebuild mode.' : `Redesigned (${redesignDirection || 'modern-saas'}).`
      );
    } catch {
      get().showToast('error', 'Failed to regenerate project.');
    } finally {
      set({ isBusyAi: false });
    }
  },

  runVisualComparison: async () => {
    const proj = get().activeProject;
    if (!proj) return;
    set({ isBusyCompare: true });

    try {
      const res = await fetch(`/api/projects/${proj.id}/compare`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        get().showToast('error', data.error || 'Visual comparison failed.');
        return;
      }
      const updated: StudioProject = data.project;
      set((s) => ({
        activeProject: updated,
        projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      }));
      get().showToast('success', 'Visual comparison report updated.');
    } catch {
      get().showToast('error', 'Failed to run visual comparison.');
    } finally {
      set({ isBusyCompare: false });
    }
  },
}));
