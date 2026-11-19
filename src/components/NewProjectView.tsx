import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Globe, ShieldCheck } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { AiProviderChoice, ReconstructionMode, RedesignDirection } from '../types/studio';
import { Button, Input, Select } from './ui/primitives';

const DIRECTIONS: Array<{ id: RedesignDirection; title: string; desc: string }> = [
  { id: 'minimalist', title: 'Minimalist', desc: 'Clean negative space and subtle hairline borders.' },
  { id: 'corporate', title: 'Corporate', desc: 'Structured enterprise grid and high-contrast clarity.' },
  { id: 'modern-saas', title: 'Modern SaaS', desc: 'Linear/Vercel precision with sharp focal contrast.' },
  { id: 'luxury', title: 'Luxury', desc: 'Refined editorial restraint and understated obsidian warmth.' },
  { id: 'creative', title: 'Creative', desc: 'Asymmetric layouts and expressive display sizing.' },
  { id: 'editorial', title: 'Editorial', desc: 'Publication reading flow with crisp visual rhythm.' },
  { id: 'ecommerce', title: 'E-commerce', desc: 'Product showcase cards and conversion-focused hierarchy.' },
];

export const NewProjectView: React.FC = () => {
  const { startAnalysis, setView, aiProvider, setAiProvider, hasHuggingFaceToken } = useStudioStore();
  const [url, setUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState<ReconstructionMode>('rebuild');
  const [direction, setDirection] = useState<RedesignDirection>('modern-saas');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a valid public http:// or https:// website URL.');
      return;
    }
    setError(null);
    await startAnalysis(
      url.trim(),
      mode,
      mode === 'redesign' ? direction : undefined,
      projectName.trim() || undefined
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090B] text-zinc-100 py-12">
      <div className="mx-auto max-w-3xl px-6 space-y-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
            New Website Reconstruction
          </h1>
          <p className="text-sm text-zinc-400">
            Playwright will capture Desktop (1440×900), Tablet (768×1024), and Mobile (390×844) views, extract the DOM and design system, and synthesize a structured React project via Gemini.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/[0.08] bg-[#111114] p-6 md:p-8 space-y-6"
        >
          <div className="space-y-2">
            <label htmlFor="target-url" className="block text-xs font-medium text-zinc-300">
              Target Website URL
            </label>
            <div className="relative">
              <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                id="target-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://example.com"
                className="pl-9 h-10 text-sm"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="project-name" className="block text-xs font-medium text-zinc-300">
              Project Name (Optional)
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Auto-detected from page title or domain"
              className="h-10"
            />
          </div>

          <div className="space-y-3">
            <div className="text-xs font-medium text-zinc-300">Reconstruction Mode</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('rebuild')}
                className={`rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                  mode === 'rebuild'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/[0.08] bg-[#18181B] hover:border-white/20'
                }`}
              >
                <div className="font-display text-sm font-semibold text-white">Mode A · Rebuild</div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Faithfully match original layout, colors, typography, spacing, and components.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('redesign')}
                className={`rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                  mode === 'redesign'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/[0.08] bg-[#18181B] hover:border-white/20'
                }`}
              >
                <div className="font-display text-sm font-semibold text-white">Mode B · Redesign</div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Keep core brand content while elevating visual polish into a chosen direction.
                </p>
              </button>
            </div>
          </div>

          {mode === 'redesign' && (
            <div className="space-y-3 pt-1">
              <div className="text-xs font-medium text-zinc-300">Select Design Direction</div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDirection(d.id)}
                    className={`rounded-md border p-3 text-left transition-colors cursor-pointer ${
                      direction === d.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-white/[0.08] bg-[#18181B] hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-100">{d.title}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="ai-provider" className="block text-xs font-medium text-zinc-300">
              AI Model Engine
            </label>
            <Select
              id="ai-provider"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as AiProviderChoice)}
              className="h-10"
            >
              <option value="auto">
                Auto (Gemini 4 Hydrogen → Flash Lite{hasHuggingFaceToken ? ' → Qwen Failover' : ''})
              </option>
              <option value="gemini-hydrogen">Gemini 4 Hydrogen</option>
              <option value="gemini-flash-lite">Gemini 3.1 Flash Lite (Fast Fallback)</option>
              <option value="hf-qwen">
                Hugging Face · Qwen 2.5 ({hasHuggingFaceToken ? 'Connected' : 'Requires HF_TOKEN in Secrets'})
              </option>
            </Select>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-white/[0.08] bg-[#09090B] p-3.5 text-xs text-zinc-400">
            <ShieldCheck size={16} className="text-zinc-400 shrink-0 mt-0.5" />
            <span>
              SSRF guard active: private IP ranges, loopback hosts, and cloud metadata endpoints are blocked. Extracted website content is treated as untrusted data.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size="md" onClick={() => setView('dashboard')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg">
              <span>Analyze Website</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
