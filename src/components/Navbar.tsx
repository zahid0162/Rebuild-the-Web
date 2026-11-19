import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Button } from './ui/primitives';

export const Navbar: React.FC = () => {
  const { view, setView } = useStudioStore();

  const handleAnchor = (sectionId: string) => {
    if (view !== 'landing') {
      setView('landing');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090B]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-6">
        {/* Zone 1: Single clean wordmark */}
        <button
          type="button"
          onClick={() => setView('landing')}
          className="font-display text-base font-semibold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 cursor-pointer hover:text-white transition-colors"
        >
          Rebuild the Web
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
          <button
            type="button"
            onClick={() => handleAnchor('how-it-works')}
            className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleAnchor('analysis-features')}
            className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Analysis
          </button>
          <button
            type="button"
            onClick={() => handleAnchor('example-projects')}
            className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Examples
          </button>
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'dashboard' ? 'text-zinc-100 font-medium' : 'hover:text-zinc-100'
            }`}
          >
            Dashboard
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <Button variant="primary" size="md" onClick={() => setView('new-project')}>
            New Project
          </Button>
        </div>
      </div>
    </header>
  );
};
