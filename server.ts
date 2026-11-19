import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  AiChatMessage,
  AiProviderChoice,
  AnalysisStageProgress,
  ReconstructionMode,
  RedesignDirection,
  StudioProject,
  VisualComparisonReport,
} from './src/types/studio.ts';
import { projectRepository, STORAGE_ASSETS_ROOT } from './server/db/repository.ts';
import { isSafeProjectFilePath, validatePublicHttpUrl } from './server/security.ts';
import { analyzeWebsiteWithPlaywright, createInitialStages } from './server/services/analyzer.ts';
import {
  buildSandboxedPreviewHtml,
  captureReconstructedComparison,
  createProjectZipBuffer,
  validateGeneratedFiles,
} from './server/services/bundler.ts';
import {
  analyzeVisualComparisonWithGemini,
  applyAiAssistantEditWithGemini,
  generateBlueprintWithGemini,
  generateReactProjectWithGemini,
} from './server/services/gemini.ts';
import { getHuggingFaceToken } from './server/services/huggingface.ts';

const PORT = 3000;

interface AnalysisJob {
  projectId: string;
  stages: AnalysisStageProgress[];
  status: 'running' | 'completed' | 'failed';
  error?: string;
  listeners: Set<(payload: string) => void>;
}

const activeJobs = new Map<string, AnalysisJob>();

function broadcastJob(job: AnalysisJob) {
  const data = JSON.stringify({
    projectId: job.projectId,
    status: job.status,
    stages: job.stages,
    error: job.error,
  });
  for (const send of job.listeners) {
    send(data);
  }
}

async function runAnalysisPipeline(
  job: AnalysisJob,
  project: StudioProject,
  rawUrl: string,
  mode: ReconstructionMode,
  redesignDirection?: RedesignDirection,
  aiProvider: AiProviderChoice = 'auto'
) {
  const assetDir = await projectRepository.getAssetDir(project.id);
  try {
    const analysis = await analyzeWebsiteWithPlaywright(
      rawUrl,
      assetDir,
      project.id,
      () => broadcastJob(job),
      job.stages
    );

    const updatedProject: StudioProject = {
      ...project,
      name: project.name || analysis.title || new URL(analysis.finalUrl).hostname,
      sourceUrl: analysis.finalUrl,
      thumbnailUrl: analysis.screenshots.desktop?.url,
      analysis,
      status: 'analyzing',
    };
    await projectRepository.save(updatedProject);

    // Stage 7: Generating website blueprint + React code
    const bpStage = job.stages.find((s) => s.id === 'blueprint');
    if (bpStage) {
      bpStage.status = 'running';
      bpStage.detail =
        aiProvider === 'hf-qwen'
          ? 'Synthesizing structured blueprint and React project with Hugging Face Qwen'
          : 'Synthesizing structured blueprint and React project with AI';
    }
    broadcastJob(job);

    const tBp = Date.now();
    const blueprint = await generateBlueprintWithGemini(
      analysis,
      assetDir,
      mode,
      redesignDirection,
      aiProvider
    );

    const files = await generateReactProjectWithGemini(blueprint, analysis, assetDir, aiProvider);
    const validation = await validateGeneratedFiles(files);
    if (!validation.valid) {
      // One automatic repair attempt or surface diagnostic cleanly
      console.warn('Initial generated project validation diagnostic:', validation.errors);
    }

    if (bpStage) {
      bpStage.status = 'completed';
      bpStage.detail = `Generated ${blueprint.components.length} blueprint nodes and ${files.length} React files`;
      bpStage.durationMs = Date.now() - tBp;
    }

    const completedProject: StudioProject = {
      ...updatedProject,
      name: blueprint.project.name || updatedProject.name,
      blueprint,
      files,
      status: 'completed',
    };
    await projectRepository.save(completedProject);

    job.status = 'completed';
    broadcastJob(job);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Website analysis failed.';
    const runningStage = job.stages.find((s) => s.status === 'running');
    if (runningStage) {
      runningStage.status = 'failed';
      runningStage.detail = message;
    }
    job.status = 'failed';
    job.error = message;
    await projectRepository.save({
      ...project,
      status: 'error',
      errorMessage: message,
    });
    broadcastJob(job);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasHuggingFaceToken: Boolean(getHuggingFaceToken()),
    });
  });

  // Safe screenshot & diff asset serving
  app.get('/api/assets/:projectId/:filename', (req, res) => {
    const safeProjectId = path.basename(req.params.projectId);
    const safeFilename = path.basename(req.params.filename);
    const fullPath = path.join(STORAGE_ASSETS_ROOT, safeProjectId, safeFilename);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.sendFile(fullPath);
  });

  // List projects
  app.get('/api/projects', async (_req, res) => {
    try {
      const projects = await projectRepository.list();
      res.json({ projects });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list projects' });
    }
  });

  // Get single project
  app.get('/api/projects/:id', async (req, res) => {
    const project = await projectRepository.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ project });
  });

  // Duplicate or create project
  app.post('/api/projects', async (req, res) => {
    try {
      const { duplicateFromId, name } = req.body as { duplicateFromId?: string; name?: string };
      if (duplicateFromId) {
        const source = await projectRepository.get(duplicateFromId);
        if (!source) {
          res.status(404).json({ error: 'Source project not found' });
          return;
        }
        const now = new Date().toISOString();
        const copy: StudioProject = {
          ...structuredClone(source),
          id: `proj-${crypto.randomUUID().slice(0, 8)}`,
          name: name || `${source.name} (Copy)`,
          isExample: false,
          createdAt: now,
          updatedAt: now,
        };
        const saved = await projectRepository.save(copy);
        res.status(201).json({ project: saved });
        return;
      }
      res.status(400).json({ error: 'Missing duplicateFromId or analysis URL.' });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create project' });
    }
  });

  // Update project (rename, update blueprint, update files)
  app.patch('/api/projects/:id', async (req, res) => {
    try {
      const existing = await projectRepository.get(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const patch = req.body as Partial<StudioProject>;
      if (patch.files) {
        for (const f of patch.files) {
          if (!isSafeProjectFilePath(f.path)) {
            res.status(400).json({ error: `Invalid file path: ${f.path}` });
            return;
          }
        }
      }
      const next: StudioProject = {
        ...existing,
        ...(patch.name !== undefined ? { name: patch.name.trim() || existing.name } : {}),
        ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
        ...(patch.redesignDirection !== undefined ? { redesignDirection: patch.redesignDirection } : {}),
        ...(patch.aiProvider !== undefined ? { aiProvider: patch.aiProvider } : {}),
        ...(patch.blueprint !== undefined ? { blueprint: patch.blueprint } : {}),
        ...(patch.files !== undefined ? { files: patch.files } : {}),
        ...(patch.aiHistory !== undefined ? { aiHistory: patch.aiHistory } : {}),
      };
      const saved = await projectRepository.save(next);
      res.json({ project: saved });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update project' });
    }
  });

  // Delete project
  app.delete('/api/projects/:id', async (req, res) => {
    const deleted = await projectRepository.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ ok: true });
  });

  // Start URL analysis job
  app.post('/api/analyze/start', async (req, res) => {
    try {
      const { url, name, mode = 'rebuild', redesignDirection, aiProvider = 'auto' } = req.body as {
        url?: string;
        name?: string;
        mode?: ReconstructionMode;
        redesignDirection?: RedesignDirection;
        aiProvider?: AiProviderChoice;
      };

      if (!url) {
        res.status(400).json({ error: 'Please enter a website URL.' });
        return;
      }

      const validation = await validatePublicHttpUrl(url);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const projectId = `proj-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      const project: StudioProject = {
        id: projectId,
        name: name?.trim() || validation.url.hostname.replace(/^www\./, ''),
        sourceUrl: validation.url.toString(),
        mode,
        redesignDirection: mode === 'redesign' ? redesignDirection || 'modern-saas' : undefined,
        aiProvider,
        status: 'analyzing',
        createdAt: now,
        updatedAt: now,
        files: [],
        aiHistory: [],
        comparisons: [],
      };

      await projectRepository.save(project);

      const job: AnalysisJob = {
        projectId,
        stages: createInitialStages(),
        status: 'running',
        listeners: new Set(),
      };
      activeJobs.set(projectId, job);

      // Start background pipeline without blocking HTTP response
      void runAnalysisPipeline(job, project, validation.url.toString(), mode, redesignDirection, aiProvider);

      res.status(202).json({ project, stages: job.stages });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to start analysis' });
    }
  });

  // SSE stream of real analysis stage updates
  app.get('/api/analyze/events/:projectId', (req, res) => {
    const job = activeJobs.get(req.params.projectId);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!job) {
      res.write(`data: ${JSON.stringify({ projectId: req.params.projectId, status: 'not_found' })}\n\n`);
      res.end();
      return;
    }

    const send = (payload: string) => {
      res.write(`data: ${payload}\n\n`);
      if (job.status === 'completed' || job.status === 'failed') {
        res.end();
      }
    };

    job.listeners.add(send);
    send(
      JSON.stringify({
        projectId: job.projectId,
        status: job.status,
        stages: job.stages,
        error: job.error,
      })
    );

    if (job.status === 'completed' || job.status === 'failed') {
      job.listeners.delete(send);
      return;
    }

    req.on('close', () => {
      job.listeners.delete(send);
    });
  });

  // Regenerate React project code from current blueprint (Rebuild or Redesign)
  app.post('/api/projects/:id/regenerate', async (req, res) => {
    try {
      const project = await projectRepository.get(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const { mode, redesignDirection, aiProvider } = req.body as {
        mode?: ReconstructionMode;
        redesignDirection?: RedesignDirection;
        aiProvider?: AiProviderChoice;
      };

      const nextMode = mode || project.mode;
      const nextDir = nextMode === 'redesign' ? redesignDirection || project.redesignDirection || 'modern-saas' : undefined;
      const nextProvider = aiProvider || project.aiProvider || 'auto';
      const assetDir = project.analysis ? await projectRepository.getAssetDir(project.id) : null;

      let blueprint = project.blueprint;
      if (project.analysis && (mode || redesignDirection)) {
        blueprint = await generateBlueprintWithGemini(project.analysis, assetDir!, nextMode, nextDir, nextProvider);
      }
      if (!blueprint) {
        res.status(400).json({ error: 'Project has no blueprint yet.' });
        return;
      }

      blueprint.project.mode = nextMode;
      blueprint.project.redesignDirection = nextDir;

      const files = await generateReactProjectWithGemini(blueprint, project.analysis, assetDir, nextProvider);
      const saved = await projectRepository.save({
        ...project,
        mode: nextMode,
        redesignDirection: nextDir,
        aiProvider: nextProvider,
        blueprint,
        files,
        status: 'completed',
      });

      res.json({ project: saved });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to regenerate React code' });
    }
  });

  // Compile sandboxed HTML preview
  app.post('/api/projects/:id/preview', async (req, res) => {
    try {
      const project = await projectRepository.get(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const { selectedComponentId, blueprintOverride, filesOverride } = req.body as {
        selectedComponentId?: string | null;
        blueprintOverride?: StudioProject['blueprint'];
        filesOverride?: StudioProject['files'];
      };

      const tempProject: StudioProject = {
        ...project,
        ...(blueprintOverride ? { blueprint: blueprintOverride } : {}),
        ...(filesOverride ? { files: filesOverride } : {}),
      };

      const preview = await buildSandboxedPreviewHtml(tempProject, selectedComponentId, true);
      res.json(preview);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Preview compilation failed' });
    }
  });

  // Raw HTML endpoint for Playwright reconstructed screenshot capture
  app.get('/api/projects/:id/preview-html', async (req, res) => {
    const project = await projectRepository.get(req.params.id);
    if (!project) {
      res.status(404).send('Project not found');
      return;
    }
    const interactive = req.query.interactive !== '0';
    const preview = await buildSandboxedPreviewHtml(project, null, interactive);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(preview.html);
  });

  // Conversational AI assistant edit endpoint
  app.post('/api/projects/:id/ai-edit', async (req, res) => {
    try {
      const project = await projectRepository.get(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const { prompt, selectedComponentId, aiProvider } = req.body as {
        prompt?: string;
        selectedComponentId?: string | null;
        aiProvider?: AiProviderChoice;
      };
      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt is required.' });
        return;
      }

      const result = await applyAiAssistantEditWithGemini(
        project,
        prompt.trim(),
        selectedComponentId || null,
        project.aiHistory,
        aiProvider || project.aiProvider || 'auto'
      );

      // Apply proposed file edits immediately and validate compilation, while preserving undo snapshot client-side
      const nextFiles = [...project.files];
      for (const change of result.proposedChanges) {
        if (change.action === 'delete') {
          const idx = nextFiles.findIndex((f) => f.path === change.path);
          if (idx >= 0) nextFiles.splice(idx, 1);
        } else if (change.content !== undefined) {
          const idx = nextFiles.findIndex((f) => f.path === change.path);
          const lang = change.path.endsWith('.css')
            ? 'css'
            : change.path.endsWith('.html')
              ? 'html'
              : change.path.endsWith('.json')
                ? 'json'
                : 'typescript';
          if (idx >= 0) {
            nextFiles[idx] = { path: change.path, content: change.content, language: lang };
          } else {
            nextFiles.push({ path: change.path, content: change.content, language: lang });
          }
        }
      }

      const validation = await validateGeneratedFiles(nextFiles);

      const userMsg: AiChatMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        role: 'user',
        content: prompt.trim(),
        timestamp: new Date().toISOString(),
      };
      const assistantMsg: AiChatMessage = {
        id: `msg-${crypto.randomUUID().slice(0, 8)}`,
        role: 'assistant',
        content: validation.valid
          ? result.reply
          : `${result.reply} (Note: build check flagged: ${validation.errors[0]})`,
        timestamp: new Date().toISOString(),
        proposedChanges: result.proposedChanges,
        updatedBlueprint: result.updatedBlueprint,
        status: 'applied',
      };

      const saved = await projectRepository.save({
        ...project,
        files: nextFiles,
        blueprint: result.updatedBlueprint || project.blueprint,
        aiHistory: [...project.aiHistory, userMsg, assistantMsg],
      });

      res.json({ project: saved, userMsg, assistantMsg, validation });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'AI edit failed' });
    }
  });

  // Visual Comparison Engine
  app.post('/api/projects/:id/compare', async (req, res) => {
    try {
      const project = await projectRepository.get(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const assetDir = await projectRepository.getAssetDir(project.id);
      const previewBaseUrl = `http://127.0.0.1:${PORT}`;
      const capture = await captureReconstructedComparison(project, assetDir, previewBaseUrl);

      let summary = 'Captured Desktop, Tablet, and Mobile screenshots of the reconstructed React app.';
      let findings: VisualComparisonReport['findings'] = [];

      if (capture.origDesktopB64 && (process.env.GEMINI_API_KEY || getHuggingFaceToken())) {
        const visionAudit = await analyzeVisualComparisonWithGemini(
          project,
          capture.origDesktopB64,
          capture.reconDesktopB64,
          capture.origMobileB64,
          capture.reconMobileB64,
          project.aiProvider || 'auto'
        );
        summary = visionAudit.summary;
        findings = visionAudit.findings;
      } else if (!capture.origDesktopB64) {
        summary =
          'Captured reconstructed screenshots. Original website screenshots are only present for projects analyzed from a live URL.';
      }

      const report: VisualComparisonReport = {
        id: `cmp-${crypto.randomUUID().slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        metrics: capture.metrics,
        summary,
        findings,
      };

      const saved = await projectRepository.save({
        ...project,
        comparisons: [report, ...project.comparisons].slice(0, 5),
      });

      res.json({ project: saved, report });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Visual comparison failed' });
    }
  });

  // Export complete standalone React project ZIP
  app.get('/api/projects/:id/export', async (req, res) => {
    try {
      const project = await projectRepository.get(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const zipBuf = await createProjectZipBuffer(project);
      const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'generated-project';
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${slug}.zip"`);
      res.send(zipBuf);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
    }
  });

  // Vite middleware in dev, static dist in production
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rebuild the Web studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
