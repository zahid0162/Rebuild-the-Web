/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnalysisProgressView } from './components/AnalysisProgressView';
import { DashboardPage } from './components/DashboardPage';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { NewProjectView } from './components/NewProjectView';
import { WorkspaceView } from './components/WorkspaceView';
import { useStudioStore } from './store/useStudioStore';

export default function App() {
  const { view, loadProjects, toastMessage, clearToast } = useStudioStore();

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      {view !== 'workspace' && <Navbar />}

      {view === 'landing' && <LandingPage />}
      {view === 'dashboard' && <DashboardPage />}
      {view === 'new-project' && <NewProjectView />}
      {view === 'analyzing' && <AnalysisProgressView />}
      {view === 'workspace' && <WorkspaceView />}

      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-xs shadow-xl ${
            toastMessage.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-100'
              : toastMessage.type === 'success'
                ? 'bg-[#18181B] border-emerald-500/40 text-zinc-100'
                : 'bg-[#18181B] border-white/15 text-zinc-100'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Dismiss notification"
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
