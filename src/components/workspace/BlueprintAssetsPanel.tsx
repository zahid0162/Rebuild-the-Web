import React from 'react';
import { Copy, Image as ImageIcon } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { Button } from '../ui/primitives';

export const BlueprintAssetsPanel: React.FC = () => {
  const { activeProject, showToast } = useStudioStore();

  if (!activeProject) return null;

  const blueprint = activeProject.blueprint;
  const analysis = activeProject.analysis;

  const handleCopyJson = async () => {
    if (!blueprint) return;
    await navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
    showToast('info', 'Blueprint JSON copied to clipboard.');
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] overflow-y-auto bg-[#09090B] p-6">
      <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-12">
        {/* Left: Design System Tokens + Assets */}
        <div className="lg:col-span-6 space-y-6">
          {blueprint && (
            <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-4">
              <h3 className="font-display text-sm font-semibold text-white">
                Extracted Design System & CSS Variables
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Primary', hex: blueprint.designSystem.primaryColor },
                  { label: 'Secondary', hex: blueprint.designSystem.secondaryColor },
                  { label: 'Background', hex: blueprint.designSystem.backgroundColor },
                  { label: 'Surface', hex: blueprint.designSystem.surfaceColor },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-lg border border-white/[0.08] bg-[#09090B] p-2.5 space-y-1.5"
                  >
                    <div
                      className="h-8 w-full rounded border border-white/10"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="text-[11px] text-zinc-300">{c.label}</div>
                    <div className="text-[11px] font-mono text-zinc-500">{c.hex}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis && (
            <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-4">
              <h3 className="font-display text-sm font-semibold text-white">
                Typography Scale ({analysis.typography.families.join(', ') || 'System'})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-zinc-400">
                      <th className="py-2 pr-3 font-medium">Role</th>
                      <th className="py-2 pr-3 font-medium">Family</th>
                      <th className="py-2 pr-3 font-medium">Size</th>
                      <th className="py-2 font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] font-mono tabular-nums text-zinc-300">
                    {analysis.typography.tokens.map((t) => (
                      <tr key={t.role}>
                        <td className="py-2 pr-3 font-sans text-zinc-200">{t.role}</td>
                        <td className="py-2 pr-3">{t.fontFamily}</td>
                        <td className="py-2 pr-3">{t.fontSize}</td>
                        <td className="py-2">{t.fontWeight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-white">
                Asset Library
              </h3>
              <span className="text-xs font-mono text-zinc-500 tabular-nums">
                {analysis?.assets.length || 0} detected
              </span>
            </div>

            {!analysis || analysis.assets.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Asset inventory is populated when analyzing a live website URL.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 max-h-96 overflow-y-auto pr-1">
                {analysis.assets.slice(0, 24).map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-lg border border-white/[0.08] bg-[#09090B] p-2.5 flex items-center gap-3"
                  >
                    <div className="h-12 w-12 rounded bg-[#18181B] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                      {asset.url.startsWith('http') ? (
                        <img
                          src={asset.url}
                          alt={asset.alt || asset.kind}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon size={16} className="text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-xs text-zinc-200 truncate">
                        {asset.alt || asset.kind}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate">
                        {asset.kind} {asset.width ? `· ${asset.width}×${asset.height}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Structured JSON Blueprint */}
        <div className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#111114] flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">
              Structured Website Blueprint (JSON)
            </h3>
            <Button variant="secondary" size="sm" onClick={() => void handleCopyJson()}>
              <Copy size={13} />
              <span>Copy Blueprint</span>
            </Button>
          </div>
          <pre className="flex-1 overflow-auto p-5 text-xs font-mono text-zinc-300 leading-relaxed">
            {blueprint ? JSON.stringify(blueprint, null, 2) : 'No blueprint generated yet.'}
          </pre>
        </div>
      </div>
    </div>
  );
};
