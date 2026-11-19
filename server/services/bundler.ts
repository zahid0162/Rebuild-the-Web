import fs from 'node:fs/promises';
import path from 'node:path';
import esbuild from 'esbuild';
import { compile as compileTailwind } from 'tailwindcss';
import JSZip from 'jszip';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import type {
  GeneratedFile,
  StudioProject,
  ViewportComparisonMetric,
  WebsiteBlueprint,
} from '../../src/types/studio.ts';

let cachedTailwindCssBase: string | null = null;

async function compileProjectTailwind(files: GeneratedFile[]): Promise<string> {
  try {
    if (!cachedTailwindCssBase) {
      const twPath = path.resolve(process.cwd(), 'node_modules/tailwindcss/index.css');
      cachedTailwindCssBase = await fs.readFile(twPath, 'utf8');
    }
    const twPath = path.resolve(process.cwd(), 'node_modules/tailwindcss/index.css');
    const compiler = await compileTailwind('@import "tailwindcss";', {
      loadStylesheet: async (id) => {
        if (id === 'tailwindcss') {
          return { path: twPath, base: path.dirname(twPath), content: cachedTailwindCssBase! };
        }
        throw new Error(`Unsupported stylesheet import: ${id}`);
      },
    });

    const candidateSet = new Set<string>([
      'min-h-screen',
      'flex',
      'flex-col',
      'grid',
      'border',
      'border-b',
      'border-t',
      'px-6',
      'py-4',
      'max-w-6xl',
      'mx-auto',
    ]);
    const tokenRegex = /[a-zA-Z0-9_:\-\/\[\]\.#%]+/g;
    for (const file of files) {
      if (file.language === 'typescript' || file.language === 'html') {
        const matches = file.content.match(tokenRegex);
        if (matches) {
          for (const m of matches) {
            if (m.length >= 2 && m.length <= 64) {
              candidateSet.add(m);
            }
          }
        }
      }
    }
    return compiler.build(Array.from(candidateSet));
  } catch {
    return '';
  }
}

function buildVirtualFsPlugin(files: GeneratedFile[]): esbuild.Plugin {
  const fileMap = new Map<string, string>();
  for (const f of files) {
    fileMap.set(path.posix.normalize(f.path), f.content);
  }

  return {
    name: 'virtual-project-fs',
    setup(build) {
      build.onResolve({ filter: /^virtual-entry$/ }, () => ({
        path: 'virtual-entry',
        namespace: 'virtual-entry-ns',
      }));

      build.onLoad({ filter: /.*/, namespace: 'virtual-entry-ns' }, () => ({
        contents: `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import App from './src/App.tsx';
          const rootEl = document.getElementById('root');
          if (rootEl) {
            createRoot(rootEl).render(React.createElement(App));
          }
        `,
        resolveDir: process.cwd(),
        loader: 'tsx',
      }));

      build.onResolve({ filter: /^\./ }, (args) => {
        const baseDir = args.importer === 'virtual-entry' ? '' : path.posix.dirname(args.importer);
        const rawTarget = path.posix.normalize(baseDir ? path.posix.join(baseDir, args.path) : args.path);

        const candidates = [
          rawTarget,
          `${rawTarget}.tsx`,
          `${rawTarget}.ts`,
          `${rawTarget}.jsx`,
          `${rawTarget}.js`,
          `${rawTarget}.css`,
          `${rawTarget}/index.tsx`,
          `${rawTarget}/index.ts`,
        ];

        for (const candidate of candidates) {
          const clean = candidate.replace(/^\.\//, '');
          if (fileMap.has(clean)) {
            return { path: clean, namespace: 'virtual-file' };
          }
        }
        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual-file' }, (args) => {
        const content = fileMap.get(args.path) || '';
        if (args.path.endsWith('.css')) {
          return { contents: content, loader: 'css' };
        }
        return {
          contents: content,
          loader: args.path.endsWith('.ts') ? 'ts' : 'tsx',
          resolveDir: process.cwd(),
        };
      });
    },
  };
}

export async function validateGeneratedFiles(files: GeneratedFile[]): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const result = await esbuild.build({
      stdin: {
        contents: `import App from './src/App.tsx'; export default App;`,
        resolveDir: process.cwd(),
        loader: 'tsx',
      },
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      jsx: 'automatic',
      plugins: [buildVirtualFsPlugin(files)],
      logLevel: 'silent',
    });

    if (result.errors.length > 0) {
      return { valid: false, errors: result.errors.map((e) => e.text) };
    }
    return { valid: true, errors: [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown compilation error';
    return { valid: false, errors: [message] };
  }
}

function buildBlueprintOverridesCss(blueprint?: WebsiteBlueprint): string {
  if (!blueprint) return '';
  const rules: string[] = [];

  for (const comp of blueprint.components) {
    if (!comp.visible) {
      rules.push(`[data-component-id="${comp.id}"] { display: none !important; }`);
      continue;
    }
    const decls: string[] = [];
    const s = comp.styles || {};
    if (s.width) decls.push(`width: ${s.width} !important;`);
    if (s.height) decls.push(`min-height: ${s.height} !important;`);
    if (s.padding) decls.push(`padding: ${s.padding} !important;`);
    if (s.margin) decls.push(`margin: ${s.margin} !important;`);
    if (s.textAlign) decls.push(`text-align: ${s.textAlign} !important;`);
    if (s.backgroundColor) decls.push(`background-color: ${s.backgroundColor} !important;`);
    if (s.textColor) decls.push(`color: ${s.textColor} !important;`);
    if (s.borderColor) decls.push(`border-color: ${s.borderColor} !important;`);
    if (s.borderWidth) decls.push(`border-width: ${s.borderWidth} !important;`);
    if (s.borderRadius) decls.push(`border-radius: ${s.borderRadius} !important;`);
    if (s.fontSize) decls.push(`font-size: ${s.fontSize} !important;`);
    if (s.fontWeight) decls.push(`font-weight: ${s.fontWeight} !important;`);
    if (s.fontFamily) decls.push(`font-family: ${s.fontFamily} !important;`);
    if (decls.length > 0) {
      rules.push(`[data-component-id="${comp.id}"] { ${decls.join(' ')} }`);
    }
  }
  return rules.join('\n');
}

export async function buildSandboxedPreviewHtml(
  project: StudioProject,
  selectedComponentId?: string | null,
  interactive = true
): Promise<{ html: string; compileError?: string }> {
  const files = project.files;
  const tokensCss = files.find((f) => f.path === 'src/styles/tokens.css')?.content || '';
  const tailwindCss = await compileProjectTailwind(files);
  const blueprintOverrides = buildBlueprintOverridesCss(project.blueprint);

  // Also inject runtime blueprint prop overrides via DOM patching for instant Visual Editor property binding
  const blueprintPatchPayload = JSON.stringify(
    (project.blueprint?.components || []).map((c) => ({
      id: c.id,
      visible: c.visible,
      props: c.props,
      styles: c.styles,
    }))
  );

  let bundledJs = '';
  let bundledCss = '';
  let compileError: string | undefined;

  try {
    const result = await esbuild.build({
      entryPoints: ['virtual-entry'],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      jsx: 'automatic',
      outdir: 'virtual-out',
      plugins: [buildVirtualFsPlugin(files)],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      logLevel: 'silent',
    });

    for (const out of result.outputFiles) {
      if (out.path.endsWith('.js')) {
        bundledJs = out.text;
      } else if (out.path.endsWith('.css')) {
        bundledCss += out.text;
      }
    }
  } catch (err: unknown) {
    compileError = err instanceof Error ? err.message : 'Failed to bundle generated React application.';
  }

  const fontFamilies = Array.from(
    new Set([
      project.blueprint?.designSystem?.displayFontFamily || 'Plus Jakarta Sans',
      project.blueprint?.designSystem?.fontFamily || 'DM Sans',
    ])
  )
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&');

  const inspectorScript = interactive
    ? `
    <script>
      (function() {
        var selectedId = ${JSON.stringify(selectedComponentId || null)};
        var overlay = document.createElement('div');
        overlay.id = '__rtw_hover_overlay';
        overlay.style.cssText = 'position:fixed;pointer-events:none;border:1.5px solid #6366f1;background:rgba(99,102,241,0.08);z-index:99999;display:none;transition:all 80ms ease;';
        var label = document.createElement('span');
        label.style.cssText = 'position:absolute;top:-20px;left:-1px;background:#4f46e5;color:#fff;font:600 10px/16px ui-monospace,monospace;padding:1px 6px;border-radius:3px 3px 0 0;white-space:nowrap;';
        overlay.appendChild(label);
        document.body.appendChild(overlay);

        var selectOverlay = document.createElement('div');
        selectOverlay.id = '__rtw_select_overlay';
        selectOverlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #4f46e5;z-index:99998;display:none;';
        document.body.appendChild(selectOverlay);

        function positionBox(box, el) {
          if (!el) { box.style.display = 'none'; return; }
          var r = el.getBoundingClientRect();
          box.style.display = 'block';
          box.style.left = r.left + 'px';
          box.style.top = r.top + 'px';
          box.style.width = r.width + 'px';
          box.style.height = r.height + 'px';
        }

        function refreshSelection() {
          if (!selectedId) { selectOverlay.style.display = 'none'; return; }
          var el = document.querySelector('[data-component-id="' + selectedId + '"]');
          positionBox(selectOverlay, el);
        }

        document.addEventListener('mouseover', function(e) {
          var target = e.target && e.target.closest ? e.target.closest('[data-component-id]') : null;
          if (!target) { overlay.style.display = 'none'; return; }
          label.textContent = target.getAttribute('data-component-id');
          positionBox(overlay, target);
        });

        document.addEventListener('click', function(e) {
          var target = e.target && e.target.closest ? e.target.closest('[data-component-id]') : null;
          if (target) {
            e.preventDefault();
            e.stopPropagation();
            selectedId = target.getAttribute('data-component-id');
            refreshSelection();
            window.parent.postMessage({ type: 'RTW_SELECT_COMPONENT', componentId: selectedId }, '*');
          }
        }, true);

        window.addEventListener('scroll', refreshSelection, true);
        window.addEventListener('resize', refreshSelection);
        setTimeout(refreshSelection, 120);

        // Apply live blueprint text/image patches cleanly on render
        var patches = ${blueprintPatchPayload};
        function applyLivePatches() {
          patches.forEach(function(p) {
            var root = document.querySelector('[data-component-id="' + p.id + '"]');
            if (!root) return;
            if (p.props && p.props.heading) {
              var h = root.querySelector('h1, h2, h3');
              if (h && h.textContent !== p.props.heading) h.textContent = p.props.heading;
            }
            if (p.props && p.props.subheading) {
              var sub = root.querySelector('p');
              if (sub && sub.textContent !== p.props.subheading) sub.textContent = p.props.subheading;
            }
            if (p.props && p.props.body && !p.props.subheading) {
              var bodyP = root.querySelector('p');
              if (bodyP && bodyP.textContent !== p.props.body) bodyP.textContent = p.props.body;
            }
            if (p.props && p.props.imageUrl) {
              var img = root.querySelector('img');
              if (img && img.getAttribute('src') !== p.props.imageUrl) img.setAttribute('src', p.props.imageUrl);
            }
          });
          refreshSelection();
        }
        setTimeout(applyLivePatches, 60);
      })();
    </script>`
    : '';

  const safeTitle = (project.blueprint?.metadata?.title || project.name).replace(/</g, '&lt;');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontFamilies}&display=swap" />
    <style>${tailwindCss}</style>
    <style>${tokensCss}</style>
    <style>${bundledCss}</style>
    <style>${blueprintOverrides}</style>
  </head>
  <body>
    ${
      compileError
        ? `<div style="padding:24px;font-family:monospace;background:#18181b;color:#fca5a5;min-height:100vh;">
             <h2 style="margin:0 0 12px 0;font-size:15px;">Preview Compilation Diagnostic</h2>
             <pre style="white-space:pre-wrap;font-size:12px;">${compileError.replace(/</g, '&lt;')}</pre>
           </div>`
        : `<div id="root"></div><script>${bundledJs}</script>${inspectorScript}`
    }
  </body>
</html>`;

  return { html, compileError };
}

export async function createProjectZipBuffer(project: StudioProject): Promise<Buffer> {
  const zip = new JSZip();
  const rootName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'generated-project';
  const folder = zip.folder(rootName)!;

  for (const file of project.files) {
    folder.file(file.path, file.content);
  }

  if (project.blueprint) {
    folder.file('blueprint.json', JSON.stringify(project.blueprint, null, 2));
  }

  const readme = `# ${project.name}

Generated by Rebuild the Web.
Source URL: ${project.sourceUrl}
Mode: ${project.mode}${project.redesignDirection ? ` (${project.redesignDirection})` : ''}

## Local Development
\`\`\`bash
npm install
npm run dev
\`\`\`

## Production Build
\`\`\`bash
npm run build
\`\`\`
`;
  folder.file('README.md', readme);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function computePngDiff(
  origBuffer: Buffer,
  reconBuffer: Buffer
): { diffBuffer: Buffer; pixelMatchPercent: number; colorSimilarityPercent: number } {
  const orig = PNG.sync.read(origBuffer);
  const recon = PNG.sync.read(reconBuffer);
  const width = Math.min(orig.width, recon.width);
  const height = Math.min(orig.height, recon.height);
  const diff = new PNG({ width, height });

  let matchedPixels = 0;
  let totalColorDistance = 0;
  const totalPixels = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxOrig = (orig.width * y + x) << 2;
      const idxRecon = (recon.width * y + x) << 2;
      const idxDiff = (width * y + x) << 2;

      const dr = Math.abs(orig.data[idxOrig] - recon.data[idxRecon]);
      const dg = Math.abs(orig.data[idxOrig + 1] - recon.data[idxRecon + 1]);
      const db = Math.abs(orig.data[idxOrig + 2] - recon.data[idxRecon + 2]);
      const delta = (dr + dg + db) / 3;
      totalColorDistance += delta;

      if (delta <= 18) {
        matchedPixels++;
        diff.data[idxDiff] = Math.round(recon.data[idxRecon] * 0.35);
        diff.data[idxDiff + 1] = Math.round(recon.data[idxRecon + 1] * 0.35);
        diff.data[idxDiff + 2] = Math.round(recon.data[idxRecon + 2] * 0.35);
        diff.data[idxDiff + 3] = 255;
      } else {
        diff.data[idxDiff] = 239;
        diff.data[idxDiff + 1] = 68;
        diff.data[idxDiff + 2] = 68;
        diff.data[idxDiff + 3] = 255;
      }
    }
  }

  const pixelMatchPercent = totalPixels > 0 ? Math.round((matchedPixels / totalPixels) * 1000) / 10 : 0;
  const avgDist = totalPixels > 0 ? totalColorDistance / totalPixels : 255;
  const colorSimilarityPercent = Math.max(0, Math.round((1 - avgDist / 255) * 1000) / 10);

  return {
    diffBuffer: PNG.sync.write(diff),
    pixelMatchPercent,
    colorSimilarityPercent,
  };
}

export async function captureReconstructedComparison(
  project: StudioProject,
  assetDir: string,
  previewBaseUrl: string
): Promise<{
  metrics: ViewportComparisonMetric[];
  origDesktopB64: string | null;
  reconDesktopB64: string;
  origMobileB64: string | null;
  reconMobileB64: string;
}> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Load compiled preview HTML directly via local loopback endpoint
    await page.goto(`${previewBaseUrl}/api/projects/${project.id}/preview-html?interactive=0`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(450);

    const viewports: Array<{ name: 'desktop' | 'tablet' | 'mobile'; width: number; height: number }> = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ];

    const metrics: ViewportComparisonMetric[] = [];
    let origDesktopB64: string | null = null;
    let reconDesktopB64 = '';
    let origMobileB64: string | null = null;
    let reconMobileB64 = '';

    await fs.mkdir(assetDir, { recursive: true });

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(250);
      const reconFile = `recon-${vp.name}.png`;
      const reconBuf = await page.screenshot({ path: path.join(assetDir, reconFile), fullPage: false });

      if (vp.name === 'desktop') reconDesktopB64 = reconBuf.toString('base64');
      if (vp.name === 'mobile') reconMobileB64 = reconBuf.toString('base64');

      const origPath = path.join(assetDir, `orig-${vp.name}.png`);
      let pixelMatchPercent = 0;
      let colorSimilarityPercent = 0;
      let diffImageUrl: string | undefined;
      let originalUrl = '';

      try {
        const origBuf = await fs.readFile(origPath);
        originalUrl = `/api/assets/${project.id}/orig-${vp.name}.png`;
        if (vp.name === 'desktop') origDesktopB64 = origBuf.toString('base64');
        if (vp.name === 'mobile') origMobileB64 = origBuf.toString('base64');

        const diffRes = computePngDiff(origBuf, reconBuf);
        pixelMatchPercent = diffRes.pixelMatchPercent;
        colorSimilarityPercent = diffRes.colorSimilarityPercent;
        const diffFile = `diff-${vp.name}.png`;
        await fs.writeFile(path.join(assetDir, diffFile), diffRes.diffBuffer);
        diffImageUrl = `/api/assets/${project.id}/${diffFile}?t=${Date.now()}`;
      } catch {
        // Original screenshot not present (e.g. template project)
      }

      metrics.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        originalUrl,
        reconstructedUrl: `/api/assets/${project.id}/${reconFile}?t=${Date.now()}`,
        diffImageUrl,
        pixelMatchPercent,
        colorSimilarityPercent,
        layoutAlignmentScore: Math.round((pixelMatchPercent * 0.4 + colorSimilarityPercent * 0.6) * 10) / 10,
      });
    }

    return { metrics, origDesktopB64, reconDesktopB64, origMobileB64, reconMobileB64 };
  } finally {
    await browser.close().catch(() => {});
  }
}
