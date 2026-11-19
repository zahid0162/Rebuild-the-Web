import React from 'react';
import { AlertTriangle, CheckCircle2, Circle, Loader2, ArrowLeft } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { Button } from './ui/primitives';

export const AnalysisProgressView: React.FC = () => {
  const {
    activeProject,
    analysisStages,
    analysisStatus,
    analysisError,
    setView,
    openProject,
  } = useStudioStore();

  const desktopShot = activeProject?.analysis?.screenshots?.desktop?.url;
  const tabletShot = activeProject?.analysis?.screenshots?.tablet?.url;
  const mobileShot = activeProject?.analysis?.screenshots?.mobile?.url;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090B] text-zinc-100 py-12">
      <div className="mx-auto max-w-4xl px-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
              {analysisStatus === 'failed'
                ? 'Analysis Stopped'
                : analysisStatus === 'completed'
                  ? 'Reconstruction Ready'
                  : 'Analyzing Website Architecture'}
            </h1>
            <p className="text-xs font-mono text-zinc-400">
              {activeProject?.sourceUrl || 'Validating target URL...'}
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setView('dashboard')}>
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Button>
        </div>

        {analysisError && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-300">
              <AlertTriangle size={16} />
              <span>Could not complete website analysis</span>
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">{analysisError}</p>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setView('new-project')}>
                Try Another URL
              </Button>
            </div>
          </div>
        )}

        {/* 7 Real Backend Task Stages */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] divide-y divide-white/[0.06]">
          {analysisStages.map((stage, idx) => (
            <div key={stage.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  {stage.status === 'completed' ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : stage.status === 'running' ? (
                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                  ) : stage.status === 'failed' ? (
                    <AlertTriangle size={16} className="text-red-400" />
                  ) : (
                    <Circle size={16} className="text-zinc-600" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-zinc-100">
                    <span className="font-mono text-xs text-zinc-500 mr-2 tabular-nums">
                      0{idx + 1}
                    </span>
                    {stage.label}
                  </div>
                  {stage.detail && (
                    <div
                      className={`text-xs ${
                        stage.status === 'failed' ? 'text-red-300' : 'text-zinc-400'
                      }`}
                    >
                      {stage.detail}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs font-mono text-zinc-500 tabular-nums shrink-0">
                {stage.status === 'completed' && stage.durationMs !== undefined
                  ? `${(stage.durationMs / 1000).toFixed(1)}s`
                  : stage.status === 'running'
                    ? 'Running'
                    : stage.status === 'failed'
                      ? 'Failed'
                      : 'Queued'}
              </div>
            </div>
          ))}
        </div>

        {/* Captured Screenshots Preview as they arrive */}
        {(desktopShot || tabletShot || mobileShot) && (
          <div className="space-y-3">
            <h2 className="font-display text-sm font-semibold text-zinc-200">
              Captured Viewport Snapshots
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Desktop · 1440×900', url: desktopShot },
                { label: 'Tablet · 768×1024', url: tabletShot },
                { label: 'Mobile · 390×844', url: mobileShot },
              ].map((shot) => (
                <div
                  key={shot.label}
                  className="rounded-lg border border-white/[0.08] bg-[#111114] overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
                    {shot.label}
                  </div>
                  <div className="aspect-[4/3] bg-[#09090B]">
                    {shot.url ? (
                      <img
                        src={shot.url}
                        alt={shot.label}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisStatus === 'completed' && activeProject && (
          <div className="flex justify-end">
            <Button variant="primary" size="lg" onClick={() => void openProject(activeProject.id)}>
              Open Visual Editor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
