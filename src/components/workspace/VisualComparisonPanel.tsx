import React, { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStudioStore } from '../../store/useStudioStore';
import { Button, Input } from '../ui/primitives';

export const VisualComparisonPanel: React.FC = () => {
  const { activeProject, isBusyCompare, isBusyAi, runVisualComparison, sendAiEdit } = useStudioStore();
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'diff'>('side-by-side');
  const [viewportTab, setViewportTab] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [sliderPercent, setSliderPercent] = useState(50);
  const [fixNote, setFixNote] = useState('');

  if (!activeProject) return null;

  const latestReport = activeProject.comparisons[0];
  const metric = latestReport?.metrics.find((m) => m.viewport === viewportTab) || latestReport?.metrics[0];

  const chartData =
    latestReport?.metrics.map((m) => ({
      name: m.viewport.toUpperCase(),
      pixelMatch: m.pixelMatchPercent,
      colorMatch: m.colorSimilarityPercent,
      layoutScore: m.layoutAlignmentScore,
    })) || [];

  const handleRequestFix = async (promptText: string) => {
    if (!promptText.trim() || isBusyAi) return;
    await sendAiEdit(promptText.trim());
    setFixNote('');
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] overflow-y-auto bg-[#09090B] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold text-white">
              Visual Comparison Engine
            </h2>
            <p className="text-xs text-zinc-400">
              Captures live Playwright screenshots of your reconstructed React project across 1440px, 768px, and 390px and audits visual fidelity against the original site.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            disabled={isBusyCompare}
            onClick={() => void runVisualComparison()}
          >
            {isBusyCompare ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            <span>{isBusyCompare ? 'Capturing & Auditing...' : 'Run Visual Comparison'}</span>
          </Button>
        </div>

        {!latestReport ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-12 text-center space-y-4">
            <p className="text-sm text-zinc-300">
              No visual comparison run yet for this project.
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Click Run Visual Comparison to render your React app in headless Chromium, compute pixel-difference heatmaps, and run Gemini Vision layout auditing.
            </p>
            <Button
              variant="secondary"
              size="md"
              disabled={isBusyCompare}
              onClick={() => void runVisualComparison()}
            >
              Capture Reconstructed Screenshots
            </Button>
          </div>
        ) : (
          <>
            {/* Controls + Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1 rounded-lg bg-[#111114] p-1 border border-white/[0.08]">
                {(['desktop', 'tablet', 'mobile'] as const).map((vp) => (
                  <button
                    key={vp}
                    type="button"
                    onClick={() => setViewportTab(vp)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize cursor-pointer ${
                      viewportTab === vp ? 'bg-[#202024] text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {vp}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-[#111114] p-1 border border-white/[0.08]">
                {[
                  { id: 'side-by-side', label: 'Side-by-Side' },
                  { id: 'overlay', label: 'Overlay Slider' },
                  { id: 'diff', label: 'Difference Highlight' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id as typeof viewMode)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      viewMode === m.id ? 'bg-[#202024] text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Viewport Comparison Canvas */}
            {metric && (
              <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-4 space-y-4">
                {viewMode === 'side-by-side' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-zinc-400">
                        Original Website ({metric.width}×{metric.height})
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-[#09090B] overflow-hidden aspect-[16/10]">
                        {metric.originalUrl ? (
                          <img
                            src={metric.originalUrl}
                            alt="Original website capture"
                            className="w-full h-full object-contain object-top"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                            Original URL screenshot unavailable (example template)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono text-zinc-400">
                        Reconstructed React App ({metric.width}×{metric.height})
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-[#09090B] overflow-hidden aspect-[16/10]">
                        <img
                          src={metric.reconstructedUrl}
                          alt="Reconstructed React capture"
                          className="w-full h-full object-contain object-top"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'overlay' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Original vs Reconstructed Split</span>
                      <span className="font-mono tabular-nums">{sliderPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderPercent}
                      onChange={(e) => setSliderPercent(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="relative rounded-lg border border-white/[0.08] bg-[#09090B] overflow-hidden aspect-[16/9] max-h-[520px] mx-auto">
                      <img
                        src={metric.reconstructedUrl}
                        alt="Reconstructed"
                        className="absolute inset-0 w-full h-full object-contain object-top"
                        referrerPolicy="no-referrer"
                      />
                      {metric.originalUrl && (
                        <div
                          className="absolute inset-0 overflow-hidden border-r-2 border-indigo-400"
                          style={{ width: `${sliderPercent}%` }}
                        >
                          <img
                            src={metric.originalUrl}
                            alt="Original"
                            className="w-full h-full object-contain object-top max-w-none"
                            style={{ width: `${(100 / Math.max(sliderPercent, 1)) * 100}%` }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewMode === 'diff' && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-zinc-400">
                      Pixel Difference Heatmap (Red highlights spatial/color deltas)
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-[#09090B] overflow-hidden aspect-[16/9] max-h-[520px] mx-auto">
                      {metric.diffImageUrl ? (
                        <img
                          src={metric.diffImageUrl}
                          alt="Visual difference heatmap"
                          className="w-full h-full object-contain object-top"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                          Diff heatmap requires an original URL capture.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Metrics & Vision Findings */}
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-4">
                <h3 className="font-display text-sm font-semibold text-zinc-200">
                  Viewport Parity Metrics
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181B',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="pixelMatch" name="Pixel Match %" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="colorMatch" name="Color Similarity %" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{latestReport.summary}</p>
              </div>

              <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-zinc-200">
                    Gemini Visual Audit & Automated Corrections
                  </h3>
                  {latestReport.findings.length > 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isBusyAi}
                      onClick={() =>
                        void handleRequestFix(
                          `Fix these visual comparison discrepancies:\n${latestReport.findings
                            .map((f) => `- ${f.title}: ${f.suggestedFix}`)
                            .join('\n')}`
                        )
                      }
                    >
                      <Sparkles size={13} />
                      <span>Auto-Fix All Findings</span>
                    </Button>
                  )}
                </div>

                {latestReport.findings.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    No automated discrepancies logged yet. Describe any visual adjustment below to let Gemini refine the components.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {latestReport.findings.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-white/[0.08] bg-[#09090B] p-3.5 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-zinc-100">
                            {f.title}
                            <span className="ml-2 font-mono text-[11px] text-zinc-500">
                              {f.category} · {f.severity}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">{f.description}</p>
                          <p className="text-xs text-indigo-300">Suggested fix: {f.suggestedFix}</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusyAi}
                          onClick={() =>
                            void handleRequestFix(
                              `Fix visual issue in ${f.componentId || 'layout'}: ${f.title}. ${f.suggestedFix}`
                            )
                          }
                        >
                          Fix
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRequestFix(fixNote);
                  }}
                  className="pt-2 flex gap-2"
                >
                  <Input
                    value={fixNote}
                    onChange={(e) => setFixNote(e.target.value)}
                    placeholder="e.g., The hero section is too tall and button spacing needs tightening..."
                  />
                  <Button type="submit" variant="primary" size="md" disabled={isBusyAi || !fixNote.trim()}>
                    Apply Visual Fix
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
