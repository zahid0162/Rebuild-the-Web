import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FolderOpen,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStudioStore } from '../store/useStudioStore';
import type { ProjectStatus, StudioProject } from '../types/studio';
import { Button, Input } from './ui/primitives';

function StatusLabel({ status }: { status: ProjectStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 size={13} />
        <span>Completed</span>
      </span>
    );
  }
  if (status === 'analyzing' || status === 'blueprint_ready') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
        <Clock size={13} />
        <span>In Progress</span>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle size={13} />
        <span>Needs Attention</span>
      </span>
    );
  }
  return <span className="text-xs text-zinc-400">Draft</span>;
}

export const DashboardPage: React.FC = () => {
  const {
    projects,
    loadingProjects,
    setView,
    openProject,
    renameProject,
    duplicateProject,
    deleteProject,
  } = useStudioStore();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const inProgress = projects.filter((p) => p.status === 'analyzing' || p.status === 'blueprint_ready').length;
    const uniqueHosts = new Set(
      projects.map((p) => {
        try {
          return new URL(p.sourceUrl).hostname;
        } catch {
          return p.sourceUrl;
        }
      })
    ).size;
    return { total, completed, inProgress, uniqueHosts };
  }, [projects]);

  const chartData = useMemo(() => {
    return projects.slice(0, 6).map((p) => ({
      name: p.name.length > 14 ? `${p.name.slice(0, 12)}…` : p.name,
      files: p.files.length,
      components: p.blueprint?.components.length || 0,
    }));
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sourceUrl.toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && p.status === 'completed') ||
        (statusFilter === 'in_progress' && (p.status === 'analyzing' || p.status === 'blueprint_ready'));
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  const handleRenameSubmit = async (project: StudioProject) => {
    if (renameValue.trim() && renameValue.trim() !== project.name) {
      await renameProject(project.id, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090B] text-zinc-100 py-10">
      <div className="mx-auto max-w-7xl px-6 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
              Workspace Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Manage reconstructed React projects, blueprints, and visual comparisons.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setView('new-project')}>
            <Plus size={16} />
            <span>New Project</span>
          </Button>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Projects', value: stats.total },
            { label: 'Completed Reconstructions', value: stats.completed },
            { label: 'Projects In Progress', value: stats.inProgress },
            { label: 'Recently Used Websites', value: stats.uniqueHosts },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-white/[0.08] bg-[#111114] px-5 py-4 space-y-1.5"
            >
              <div className="text-xs text-zinc-400">{kpi.label}</div>
              <div className="font-display text-2xl font-semibold text-white tabular-nums">
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity + Project Inventory Chart */}
        {projects.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 rounded-lg border border-white/[0.08] bg-[#111114] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-zinc-200">
                  Generated Project Structure Scale
                </h2>
                <span className="text-xs text-zinc-500">Files & Blueprint Nodes</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181B',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#f4f4f5',
                      }}
                    />
                    <Bar dataKey="files" name="React Files" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="components" name="Components" fill="#3f3f46" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-lg border border-white/[0.08] bg-[#111114] p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold text-zinc-200">
                Recently Used Websites
              </h2>
              <div className="divide-y divide-white/[0.06]">
                {projects.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void openProject(p.id)}
                    className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate">{p.name}</div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate">{p.sourceUrl}</div>
                    </div>
                    <ExternalLink size={13} className="text-zinc-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects or URLs..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#111114] p-1 border border-white/[0.08] self-start sm:self-auto">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'completed', label: 'Completed' },
              { id: 'in_progress', label: 'In Progress' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id ? 'bg-[#202024] text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {loadingProjects && projects.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-lg border border-white/[0.08] bg-[#111114] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-[#111114] p-12 text-center space-y-4">
            <Layers size={28} className="mx-auto text-zinc-500" />
            <div className="space-y-1">
              <h3 className="font-display text-base font-semibold text-zinc-200">No matching projects</h3>
              <p className="text-sm text-zinc-400">
                Start a new website reconstruction or clear your search filter.
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => setView('new-project')}>
              Start New Reconstruction
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border border-white/[0.08] bg-[#111114] overflow-hidden flex flex-col"
              >
                <div
                  onClick={() => void openProject(project.id)}
                  className="aspect-[16/10] bg-[#18181B] border-b border-white/[0.08] overflow-hidden cursor-pointer relative group"
                >
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.name}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                      No preview thumbnail yet
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    {renamingId === project.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRenameSubmit(project);
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onBlur={() => void handleRenameSubmit(project)}
                        />
                      </form>
                    ) : (
                      <h3 className="font-display text-base font-semibold text-zinc-100 truncate">
                        {project.name}
                      </h3>
                    )}

                    <div className="text-xs font-mono text-zinc-500 truncate">{project.sourceUrl}</div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 pt-1">
                      <StatusLabel status={project.status} />
                      <span aria-hidden="true">·</span>
                      <span>{project.mode === 'rebuild' ? 'Rebuild' : 'Redesign'}</span>
                      {project.isExample && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-zinc-500">Example Template</span>
                        </>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-500 tabular-nums space-y-0.5 pt-1">
                      <div>Created {new Date(project.createdAt).toLocaleDateString()}</div>
                      <div>Modified {new Date(project.updatedAt).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                    <Button variant="secondary" size="sm" onClick={() => void openProject(project.id)}>
                      <FolderOpen size={13} />
                      <span>Open</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Rename project"
                        aria-label="Rename project"
                        onClick={() => {
                          setRenamingId(project.id);
                          setRenameValue(project.name);
                        }}
                        className="p-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        title="Duplicate project"
                        aria-label="Duplicate project"
                        onClick={() => void duplicateProject(project.id)}
                        className="p-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        title="Delete project"
                        aria-label="Delete project"
                        onClick={() => void deleteProject(project.id)}
                        className="p-2 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
