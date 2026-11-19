import fs from 'node:fs/promises';
import path from 'node:path';
import type { StudioProject } from '../../src/types/studio.ts';
import { createExampleProjects } from './seedExamples.ts';

export interface ProjectRepository {
  list(): Promise<StudioProject[]>;
  get(id: string): Promise<StudioProject | null>;
  save(project: StudioProject): Promise<StudioProject>;
  delete(id: string): Promise<boolean>;
  getAssetDir(projectId: string): Promise<string>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const ASSETS_DIR = path.join(DATA_DIR, 'assets');

/**
 * File-backed repository implementing the async ProjectRepository contract.
 * Designed as a drop-in counterpart to a PostgreSQL adapter implementing server/db/schema.sql.
 */
export class FileProjectRepository implements ProjectRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  private async ensureInitialized(): Promise<StudioProject[]> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(ASSETS_DIR, { recursive: true });

    try {
      const raw = await fs.readFile(PROJECTS_FILE, 'utf8');
      const parsed = JSON.parse(raw) as StudioProject[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Seed initial example projects when storage is empty
    }

    const seeded = createExampleProjects();
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }

  private async persistAll(projects: StudioProject[]): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf8');
    });
    await this.writeQueue;
  }

  async list(): Promise<StudioProject[]> {
    const projects = await this.ensureInitialized();
    return [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async get(id: string): Promise<StudioProject | null> {
    const projects = await this.ensureInitialized();
    return projects.find((p) => p.id === id) ?? null;
  }

  async save(project: StudioProject): Promise<StudioProject> {
    const projects = await this.ensureInitialized();
    const updated: StudioProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = updated;
    } else {
      projects.unshift(updated);
    }
    await this.persistAll(projects);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const projects = await this.ensureInitialized();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) {
      return false;
    }
    await this.persistAll(filtered);
    const assetDir = path.join(ASSETS_DIR, path.basename(id));
    await fs.rm(assetDir, { recursive: true, force: true }).catch(() => {});
    return true;
  }

  async getAssetDir(projectId: string): Promise<string> {
    const safeId = path.basename(projectId);
    const dir = path.join(ASSETS_DIR, safeId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }
}

export const projectRepository: ProjectRepository = new FileProjectRepository();
export const STORAGE_ASSETS_ROOT = ASSETS_DIR;
