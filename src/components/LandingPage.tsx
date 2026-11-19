import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Code2,
  Columns,
  Eye,
  Globe,
  Layers,
  LayoutTemplate,
  Monitor,
  Palette,
  Sliders,
  Smartphone,
  Tablet,
  Wand2,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { AiProviderChoice, ReconstructionMode, RedesignDirection } from '../types/studio';
import { Button } from './ui/primitives';

const REDESIGN_DIRECTIONS: Array<{ id: RedesignDirection; label: string; summary: string }> = [
  { id: 'minimalist', label: 'Minimalist', summary: 'Expanded whitespace, hairline rules, and restrained monochrome contrast.' },
  { id: 'corporate', label: 'Corporate', summary: 'Structured institutional grid, clear hierarchy, and high-trust typography.' },
  { id: 'modern-saas', label: 'Modern SaaS', summary: 'Crisp dark or neutral surfaces with focused interactive action anchors.' },
  { id: 'luxury', label: 'Luxury', summary: 'Measured editorial pacing, warm obsidian tones, and refined framing.' },
  { id: 'creative', label: 'Creative', summary: 'Asymmetric editorial proportions and expressive display typography.' },
  { id: 'editorial', label: 'Editorial', summary: 'Long-form reading rhythm, serif/sans pairing, and broadsheet structure.' },
  { id: 'ecommerce', label: 'E-commerce', summary: 'Product-first showcase geometry, clear pricing hierarchy, and variant clarity.' },
];

export const LandingPage: React.FC = () => {
  const { projects, startAnalysis, openProject, setView, aiProvider, setAiProvider, hasHuggingFaceToken } =
    useStudioStore();
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<ReconstructionMode>('rebuild');
  const [direction, setDirection] = useState<RedesignDirection>('modern-saas');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedDirectionPreview, setSelectedDirectionPreview] = useState<RedesignDirection>('modern-saas');

  const exampleProjects = projects.filter((p) => p.isExample).slice(0, 3);

  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('Enter a publicly accessible website URL to begin analysis.');
      return;
    }
    setUrlError(null);
    await startAnalysis(trimmed, mode, mode === 'redesign' ? direction : undefined);
  };

  return (
    <div className="bg-[#09090B] text-zinc-100">
      {/* HERO SECTION */}
      <section className="relative border-b border-white/[0.08] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79, 70, 229, 0.16), transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-20 lg:pt-24 lg:pb-24">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-7 space-y-7"
            >
              <p className="text-xs font-medium tracking-wide text-zinc-400">
                Any Website. Your Code. Your Creativity.
              </p>

              <h1
                className="font-display font-semibold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', textWrap: 'balance' }}
              >
                Turn Any Website Into Your Next React Project.
              </h1>

              <p className="max-w-2xl text-base md:text-lg leading-relaxed text-zinc-400">
                Analyze, reconstruct, redesign, and edit any publicly accessible website with the power of Gemini AI.
              </p>

              {/* Mode toggle + URL launch bar */}
              <form onSubmit={handleHeroSubmit} className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-lg bg-[#111114] p-1 border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setMode('rebuild')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        mode === 'rebuild'
                          ? 'bg-[#202024] text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Rebuild Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('redesign')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        mode === 'redesign'
                          ? 'bg-[#202024] text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Redesign Mode
                    </button>
                    {mode === 'redesign' && (
                      <select
                        aria-label="Redesign direction"
                        value={direction}
                        onChange={(e) => setDirection(e.target.value as RedesignDirection)}
                        className="ml-1 bg-[#18181B] text-xs text-zinc-200 border border-white/10 rounded px-2 py-1 focus:outline-none"
                      >
                        {REDESIGN_DIRECTIONS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <select
                    aria-label="AI Model Provider"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value as AiProviderChoice)}
                    className="h-9 rounded-lg bg-[#111114] text-xs text-zinc-300 border border-white/[0.08] px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                  >
                    <option value="auto">Auto (Gemini + Failover)</option>
                    <option value="gemini-hydrogen">Gemini 4 Hydrogen</option>
                    <option value="gemini-flash-lite">Gemini 3.1 Flash Lite</option>
                    <option value="hf-qwen">
                      Hugging Face · Qwen {hasHuggingFaceToken ? '' : '(HF_TOKEN)'}
                    </option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Globe
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (urlError) setUrlError(null);
                      }}
                      placeholder="Paste a website URL..."
                      aria-label="Website URL"
                      className="w-full h-11 rounded-lg bg-[#111114] border border-white/12 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg">
                    <span>Analyze Website</span>
                    <ArrowRight size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() =>
                      document.getElementById('analysis-features')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Explore Features
                  </Button>
                </div>

                {urlError && (
                  <p className="text-xs text-red-400" role="alert">
                    {urlError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-1">
                  <span>Try live public URLs:</span>
                  {['https://example.com', 'https://stripe.com', 'https://linear.app'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setUrlInput(sample)}
                      className="font-mono text-zinc-400 hover:text-zinc-200 underline underline-offset-4 cursor-pointer"
                    >
                      {sample.replace('https://', '')}
                    </button>
                  ))}
                </div>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="lg:col-span-5"
            >
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111114]">
                <img
                  src="/src/assets/images/hero_studio_showcase_1795070818043.jpg"
                  alt="Rebuild the Web architectural design and wireframe reconstruction studio"
                  className="w-full aspect-[16/10] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="border-t border-white/[0.08] px-5 py-4 flex items-center justify-between gap-4 text-xs text-zinc-400">
                  <span>Playwright Chromium + Gemini Multimodal Blueprint</span>
                  <span className="font-mono tabular-nums text-zinc-300">1440 · 768 · 390</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 1. HOW IT WORKS */}
      <section id="how-it-works" className="border-b border-white/[0.08] py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
              How It Works
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              Every URL moves through a deterministic capture, inspection, and code synthesis pipeline—never static screenshots disguised as templates.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: '01',
                title: 'Playwright Capture',
                desc: 'Headless Chromium renders the target URL across 1440px, 768px, and 390px viewports with SSRF network guards.',
              },
              {
                num: '02',
                title: 'DOM & Token Extraction',
                desc: 'Computed styles yield exact font families, spacing scales, CSS color variables, semantic sections, and public assets.',
              },
              {
                num: '03',
                title: 'Structured AI Blueprint',
                desc: 'Gemini combines visual screenshots with DOM structure to author a typed JSON component hierarchy.',
              },
              {
                num: '04',
                title: 'Live React Studio & Export',
                desc: 'Inspect, visually edit, refine with the AI assistant, compare pixel parity, and export a standalone Vite React ZIP.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-lg border border-white/[0.08] bg-[#111114] p-6 space-y-3"
              >
                <div className="font-mono text-xs text-indigo-400 tabular-nums">{step.num}.</div>
                <h3 className="font-display text-base font-semibold text-zinc-100">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. WEBSITE ANALYSIS FEATURES */}
      <section id="analysis-features" className="border-b border-white/[0.08] py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Six-Layer Website Inspection
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              Before writing a single line of JSX, the analyzer decomposes visual, structural, typographic, chromatic, asset, and responsive behavior.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 rounded-lg border border-white/[0.08] bg-[#111114] p-7 space-y-4">
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Eye size={18} className="text-indigo-400" />
                <h3 className="font-display text-lg font-semibold">Visual & Responsive Breakpoint Diffing</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Captures synchronous viewports at Desktop (1440×900), Tablet (768×1024), and Mobile (390×844) to detect navigation collapse, grid column shifts, typography scaling, and overflow constraints.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono text-zinc-300 tabular-nums">
                <div className="rounded border border-white/[0.08] bg-[#18181B] px-3 py-2.5 flex items-center gap-2">
                  <Monitor size={14} className="text-zinc-400" />
                  <span>1440 × 900</span>
                </div>
                <div className="rounded border border-white/[0.08] bg-[#18181B] px-3 py-2.5 flex items-center gap-2">
                  <Tablet size={14} className="text-zinc-400" />
                  <span>768 × 1024</span>
                </div>
                <div className="rounded border border-white/[0.08] bg-[#18181B] px-3 py-2.5 flex items-center gap-2">
                  <Smartphone size={14} className="text-zinc-400" />
                  <span>390 × 844</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 rounded-lg border border-white/[0.08] bg-[#111114] p-7 space-y-4">
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Palette size={18} className="text-indigo-400" />
                <h3 className="font-display text-lg font-semibold">Color & CSS Token Synthesis</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Samples computed foreground, surface, button, and border colors across DOM nodes and compiles clean CSS custom properties.
              </p>
              <div className="font-mono text-xs rounded border border-white/[0.08] bg-[#09090B] p-3.5 text-zinc-300 space-y-1">
                <div>--color-primary: #4F46E5;</div>
                <div>--color-surface: #111114;</div>
                <div>--color-border: rgba(255,255,255,0.08);</div>
              </div>
            </div>

            <div className="md:col-span-4 rounded-lg border border-white/[0.08] bg-[#111114] p-6 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200">
                <Layers size={17} className="text-indigo-400" />
                <h3 className="font-display text-base font-semibold">DOM Hierarchy</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Maps semantic tags, repeated card grids, navigation anchors, forms, and section bounding boxes.
              </p>
            </div>

            <div className="md:col-span-4 rounded-lg border border-white/[0.08] bg-[#111114] p-6 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200">
                <LayoutTemplate size={17} className="text-indigo-400" />
                <h3 className="font-display text-base font-semibold">Typography Scale</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Extracts active font families, heading sizes, weights, line heights, and letter spacing for H1–H3 and body copy.
              </p>
            </div>

            <div className="md:col-span-4 rounded-lg border border-white/[0.08] bg-[#111114] p-6 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200">
                <Globe size={17} className="text-indigo-400" />
                <h3 className="font-display text-base font-semibold">Organized Asset Library</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Catalogs logos, photography, inline SVG vectors, and web font descriptors into a reusable studio asset drawer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI-POWERED RECONSTRUCTION & 4. VISUAL EDITOR */}
      <section className="border-b border-white/[0.08] py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-16">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
                AI-Powered React Code Generation
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
                Instead of dumping monolithic HTML into one file, Gemini generates a structured Website Blueprint first, then synthesizes modular TypeScript React components, layouts, and CSS variable tokens validated with esbuild.
              </p>
              <div className="space-y-2 pt-2 text-sm text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <Code2 size={15} className="text-indigo-400 shrink-0" />
                  <span>Typed component files under src/components/</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Columns size={15} className="text-indigo-400 shrink-0" />
                  <span>Full Monaco Editor + live esbuild recompilation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Sliders size={15} className="text-indigo-400 shrink-0" />
                  <span>Targeted AI assistant edits with Undo / Redo</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#111114] overflow-hidden">
              <div className="border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>blueprint.json → generated-project/src/</span>
                <span>TypeScript + Tailwind</span>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
                <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`{
  "project": {
    "name": "Meridian Treasury",
    "mode": "rebuild"
  },
  "designSystem": {
    "primaryColor": "#2563EB",
    "fontFamily": "DM Sans"
  },
  "components": [
    { "id": "navbar", "type": "navigation" },
    { "id": "hero", "type": "hero" },
    { "id": "features", "type": "feature-grid" }
  ]
}`}
                </pre>
                <div className="p-4 text-xs font-mono text-zinc-400 space-y-1.5">
                  <div className="text-zinc-200">generated-project/</div>
                  <div className="pl-3">src/components/Navbar.tsx</div>
                  <div className="pl-3">src/components/HeroSection.tsx</div>
                  <div className="pl-3">src/components/FeaturesSection.tsx</div>
                  <div className="pl-3">src/components/Footer.tsx</div>
                  <div className="pl-3">src/layouts/MainLayout.tsx</div>
                  <div className="pl-3">src/pages/HomePage.tsx</div>
                  <div className="pl-3">src/styles/tokens.css</div>
                  <div className="pl-3">package.json</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Visual Website Editor highlight */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-7 lg:p-9 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Three-Panel Visual Website Editor
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Click any section directly inside the sandboxed live preview to inspect and modify copy, typography, spacing, colors, borders, layout, or ask the AI assistant for targeted adjustments.
                </p>
              </div>
              <Button variant="secondary" size="md" onClick={() => setView('dashboard')}>
                Open Workspace
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-white/[0.08] bg-[#09090B] p-4 space-y-2">
                <div className="font-medium text-zinc-200">Left · Component Explorer</div>
                <p className="text-zinc-400 leading-relaxed">
                  Expand, rename, reorder, and toggle visibility across Home Page sections.
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#09090B] p-4 space-y-2">
                <div className="font-medium text-zinc-200">Center · Sandboxed Live Preview</div>
                <p className="text-zinc-400 leading-relaxed">
                  Compiled React app rendered in an isolated iframe with Desktop, Tablet, and Mobile viewports.
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#09090B] p-4 space-y-2">
                <div className="font-medium text-zinc-200">Right · Properties & AI Assistant</div>
                <p className="text-zinc-400 leading-relaxed">
                  Real-time token and layout editing paired with conversational targeted code modifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. REBUILD VS REDESIGN */}
      <section className="border-b border-white/[0.08] py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Rebuild Faithfully or Redesign With Purpose
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              Choose faithful visual parity when porting an existing web property to React, or pivot into a curated design direction while keeping your authentic content intact.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-lg border border-white/[0.08] bg-[#111114] p-6 space-y-4">
              <div className="text-xs font-mono text-zinc-400">Mode A</div>
              <h3 className="font-display text-xl font-semibold text-white">Rebuild</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Prioritizes visual similarity, exact color palette, original typography hierarchy, spacing rhythm, component cadence, and responsive breakpoints—verified with the Visual Comparison Engine.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-lg border border-white/[0.08] bg-[#111114] p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-indigo-400">Mode B</div>
                  <h3 className="font-display text-xl font-semibold text-white">Redesign</h3>
                </div>
                <Wand2 size={18} className="text-indigo-400" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REDESIGN_DIRECTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDirectionPreview(d.id)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedDirectionPreview === d.id
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-[#18181B] text-zinc-300 border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {REDESIGN_DIRECTIONS.find((d) => d.id === selectedDirectionPreview)?.summary}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EXAMPLE PROJECTS */}
      <section id="example-projects" className="border-b border-white/[0.08] py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Example Studio Projects
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Inspect pre-built example templates in the Visual Editor to test component selection, property overrides, Monaco code editing, and ZIP export right away.
              </p>
            </div>
            <Button variant="secondary" size="md" onClick={() => setView('dashboard')}>
              View All Projects
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {exampleProjects.map((project) => (
              <div
                key={project.id}
                className="group rounded-lg border border-white/[0.08] bg-[#111114] overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#18181B] border-b border-white/[0.08]">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={`${project.name} preview`}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-semibold text-zinc-100">
                      {project.name}
                    </h3>
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>{project.mode === 'rebuild' ? 'Rebuild' : `Redesign · ${project.redesignDirection}`}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{project.files.length} files</span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void openProject(project.id)}
                    className="w-full"
                  >
                    Open in Visual Editor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION */}
      <section className="border-b border-white/[0.08] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
          <h2
            className="font-display text-2xl md:text-4xl font-semibold tracking-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            Start reverse-engineering your next React codebase.
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
            Paste any public URL to launch Playwright capture, Gemini blueprint synthesis, and interactive visual editing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="primary" size="lg" onClick={() => setView('new-project')}>
              Launch New Reconstruction
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setView('dashboard')}>
              Open Workspace Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="space-y-1">
            <div className="font-display text-sm font-medium text-zinc-300">Rebuild the Web</div>
            <div>Any Website. Your Code. Your Creativity.</div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button type="button" onClick={() => setView('dashboard')} className="hover:text-zinc-300 cursor-pointer">
              Dashboard
            </button>
            <button type="button" onClick={() => setView('new-project')} className="hover:text-zinc-300 cursor-pointer">
              New Project
            </button>
            <span>SSRF-Protected Playwright + Gemini Studio</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
