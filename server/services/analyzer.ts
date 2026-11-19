import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import { chromium } from 'playwright';
import type {
  AnalysisStageId,
  AnalysisStageProgress,
  DomSectionSummary,
  ResponsiveObservation,
  TypographyToken,
  WebsiteAnalysis,
  WebsiteAsset,
} from '../../src/types/studio.ts';
import { isPrivateOrReservedIp, sanitizeUntrustedText, validatePublicHttpUrl } from '../security.ts';

export type StageCallback = (stages: AnalysisStageProgress[]) => void;

const INITIAL_STAGES: AnalysisStageProgress[] = [
  { id: 'connecting', label: 'Connecting to website', status: 'pending' },
  { id: 'screenshots', label: 'Capturing screenshots (1440×900, 768×1024, 390×844)', status: 'pending' },
  { id: 'dom', label: 'Analyzing HTML structure', status: 'pending' },
  { id: 'design-system', label: 'Extracting design system', status: 'pending' },
  { id: 'components', label: 'Identifying components', status: 'pending' },
  { id: 'responsive', label: 'Understanding responsive layouts', status: 'pending' },
  { id: 'blueprint', label: 'Generating website blueprint', status: 'pending' },
];

export function createInitialStages(): AnalysisStageProgress[] {
  return INITIAL_STAGES.map((s) => ({ ...s }));
}

async function isSubresourceUrlSafe(rawUrl: string): Promise<boolean> {
  try {
    const u = new URL(rawUrl);
    if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') {
      return true;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return false;
    }
    if (net.isIP(host)) {
      return !isPrivateOrReservedIp(host);
    }
    const records = await dns.lookup(host, { all: true }).catch(() => []);
    return records.every((r) => !isPrivateOrReservedIp(r.address));
  } catch {
    return false;
  }
}

export async function analyzeWebsiteWithPlaywright(
  rawUrl: string,
  assetDir: string,
  projectId: string,
  onStage: StageCallback,
  stagesRef: AnalysisStageProgress[]
): Promise<WebsiteAnalysis> {
  const updateStage = (id: AnalysisStageId, patch: Partial<AnalysisStageProgress>) => {
    const target = stagesRef.find((s) => s.id === id);
    if (target) {
      Object.assign(target, patch);
    }
    onStage(stagesRef.map((s) => ({ ...s })));
  };

  // Stage 1: Connecting to website (with SSRF validation)
  const tConnect = Date.now();
  updateStage('connecting', { status: 'running', detail: 'Validating URL and resolving public DNS' });
  const validation = await validatePublicHttpUrl(rawUrl);
  if (!validation.valid) {
    updateStage('connecting', { status: 'failed', detail: validation.error });
    throw new Error(validation.error);
  }

  const targetUrl = validation.url.toString();
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: false,
    });

    await context.addInitScript('window.__name = window.__name || function(t) { return t; };');

    const page = await context.newPage();

    // Enforce SSRF protection for redirects & subresource requests
    await page.route('**/*', async (route) => {
      const reqUrl = route.request().url();
      const safe = await isSubresourceUrlSafe(reqUrl);
      if (!safe) {
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    updateStage('connecting', { status: 'running', detail: `Navigating to ${targetUrl}` });
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 22000 });
    if (!response) {
      throw new Error('The target website did not return an HTTP response.');
    }
    if (response.status() >= 400) {
      throw new Error(`Website returned HTTP ${response.status()} (${response.statusText()}).`);
    }

    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);

    const finalUrl = page.url();
    const title = sanitizeUntrustedText(await page.title(), 200) || validation.url.hostname;
    const description = sanitizeUntrustedText(
      await page
        .$eval('meta[name="description"]', (el) => el.getAttribute('content') || '')
        .catch(() => ''),
      400
    );

    updateStage('connecting', {
      status: 'completed',
      detail: `Connected (${response.status()})`,
      durationMs: Date.now() - tConnect,
    });

    // Stage 2: Capturing screenshots across Desktop, Tablet, Mobile
    const tShots = Date.now();
    updateStage('screenshots', { status: 'running', detail: 'Capturing Desktop 1440×900' });

    await fs.mkdir(assetDir, { recursive: true });

    const captureViewport = async (
      name: 'desktop' | 'tablet' | 'mobile',
      width: number,
      height: number
    ) => {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(350);
      const fileName = `orig-${name}.png`;
      const fullName = `orig-${name}-full.png`;
      await page.screenshot({ path: path.join(assetDir, fileName), fullPage: false });
      await page.screenshot({ path: path.join(assetDir, fullName), fullPage: true }).catch(() => {});
      return {
        viewport: name,
        width,
        height,
        url: `/api/assets/${projectId}/${fileName}`,
        fullPageUrl: `/api/assets/${projectId}/${fullName}`,
      };
    };

    const desktopShot = await captureViewport('desktop', 1440, 900);
    updateStage('screenshots', { status: 'running', detail: 'Capturing Tablet 768×1024' });
    const tabletShot = await captureViewport('tablet', 768, 1024);
    updateStage('screenshots', { status: 'running', detail: 'Capturing Mobile 390×844' });
    const mobileShot = await captureViewport('mobile', 390, 844);

    // Reset to desktop for primary inspection
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);

    updateStage('screenshots', {
      status: 'completed',
      detail: 'Captured Desktop, Tablet, and Mobile',
      durationMs: Date.now() - tShots,
    });

    // Stage 3: Analyzing HTML structure
    const tDom = Date.now();
    updateStage('dom', { status: 'running', detail: 'Inspecting semantic DOM tree and sections' });

    const domData = await page.evaluate(() => {
      const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'form'];
      const semanticElements: Record<string, number> = {};
      for (const tag of semanticTags) {
        semanticElements[tag] = document.querySelectorAll(tag).length;
      }

      const navLinks = Array.from(document.querySelectorAll('header a, nav a'))
        .map((a) => ({
          label: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          href: a.getAttribute('href') || '#',
        }))
        .filter((l) => l.label.length > 0 && l.label.length <= 40)
        .slice(0, 14);

      const candidateSections = Array.from(
        document.querySelectorAll('header, main > section, main > div, body > section, body > div, footer')
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.height >= 48 && rect.width >= 200;
      });

      const sections: Array<{
        tag: string;
        role: string;
        heading?: string;
        textPreview: string;
        linksCount: number;
        buttonsCount: number;
        imagesCount: number;
        formsCount: number;
        boundingBox: { x: number; y: number; width: number; height: number };
        computedBackground: string;
        computedPadding: string;
      }> = candidateSections.slice(0, 16).map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const headingEl = el.querySelector('h1, h2, h3');
        return {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          heading: headingEl ? (headingEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140) : undefined,
          textPreview: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 260),
          linksCount: el.querySelectorAll('a').length,
          buttonsCount: el.querySelectorAll('button, [role="button"], a[class*="btn"], a[class*="button"]').length,
          imagesCount: el.querySelectorAll('img, svg').length,
          formsCount: el.querySelectorAll('form').length,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          computedBackground: style.backgroundColor,
          computedPadding: style.padding,
        };
      });

      // Detect repeated card/grid patterns
      const gridContainers = Array.from(document.querySelectorAll('div, ul, section')).filter((el) => {
        const style = window.getComputedStyle(el);
        return (style.display === 'grid' || style.display === 'flex') && el.children.length >= 3;
      });
      const repeatedComponents = gridContainers.slice(0, 6).map((el) => ({
        pattern: `${el.tagName.toLowerCase()}.${Array.from(el.classList).slice(0, 2).join('.') || 'container'}`,
        count: el.children.length,
      }));

      const outlineLines: string[] = [];
      sections.forEach((s, idx) => {
        outlineLines.push(
          `[${idx + 1}] <${s.tag}> ${s.boundingBox.width}x${s.boundingBox.height} | h="${s.heading || ''}" | text="${s.textPreview.slice(0, 120)}"`
        );
      });

      return {
        semanticElements,
        navLinks,
        sections,
        repeatedComponents,
        outline: outlineLines.join('\n'),
        buttonCount: document.querySelectorAll('button, [role="button"]').length,
        formCount: document.querySelectorAll('form').length,
      };
    });

    updateStage('dom', {
      status: 'completed',
      detail: `${domData.sections.length} structural blocks, ${domData.navLinks.length} nav links`,
      durationMs: Date.now() - tDom,
    });

    // Stage 4: Extracting design system (typography, colors, CSS vars, assets)
    const tDesign = Date.now();
    updateStage('design-system', { status: 'running', detail: 'Extracting computed typography, colors, and assets' });

    const designData = await page.evaluate(() => {
      const parseHex = function (color: string): string | null {
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return null;
        const hex = [m[1], m[2], m[3]]
          .map((n) => Number(n).toString(16).padStart(2, '0'))
          .join('');
        return `#${hex}`.toUpperCase();
      };

      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);
      const bgHex = parseHex(bodyStyle.backgroundColor) || parseHex(htmlStyle.backgroundColor) || '#FFFFFF';
      const textHex = parseHex(bodyStyle.color) || '#111827';

      const colorCounts = new Map<string, number>();
      const bgCounts = new Map<string, number>();
      const borderRadii = new Set<string>();
      const shadows = new Set<string>();

      const sampleEls = Array.from(document.querySelectorAll('body, header, main, section, div, a, button, h1, h2, p, footer')).slice(0, 220);
      for (const el of sampleEls) {
        const st = window.getComputedStyle(el);
        const c = parseHex(st.color);
        const bg = parseHex(st.backgroundColor);
        if (c) colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        if (bg) bgCounts.set(bg, (bgCounts.get(bg) || 0) + 1);
        if (st.borderRadius && st.borderRadius !== '0px') borderRadii.add(st.borderRadius);
        if (st.boxShadow && st.boxShadow !== 'none') shadows.add(st.boxShadow);
      }

      const primaryBtn = document.querySelector('button, a[class*="btn"], a[class*="button"], header a:last-child');
      const btnStyle = primaryBtn ? window.getComputedStyle(primaryBtn) : null;
      const buttonBg = (btnStyle && parseHex(btnStyle.backgroundColor)) || '#2563EB';
      const buttonText = (btnStyle && parseHex(btnStyle.color)) || '#FFFFFF';

      const palette = Array.from(
        new Set([
          bgHex,
          textHex,
          buttonBg,
          ...Array.from(bgCounts.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]),
          ...Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]),
        ])
      ).slice(0, 10);

      const primaryAccent =
        palette.find((hex) => hex !== bgHex && hex !== textHex && hex !== '#FFFFFF' && hex !== '#000000') || buttonBg;

      const roleSelectors: Array<{ role: string; selector: string }> = [
        { role: 'Heading 1', selector: 'h1' },
        { role: 'Heading 2', selector: 'h2' },
        { role: 'Heading 3', selector: 'h3' },
        { role: 'Body', selector: 'p, body' },
        { role: 'Navigation Link', selector: 'header a, nav a' },
        { role: 'Button', selector: 'button, a[class*="btn"]' },
      ];

      const tokens: Array<{
        role: string;
        fontFamily: string;
        fontSize: string;
        fontWeight: string;
        lineHeight: string;
        letterSpacing: string;
      }> = [];
      const families = new Set<string>();

      for (const item of roleSelectors) {
        const el = document.querySelector(item.selector);
        if (el) {
          const st = window.getComputedStyle(el);
          const fam = st.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          if (fam) families.add(fam);
          tokens.push({
            role: item.role,
            fontFamily: fam || 'sans-serif',
            fontSize: st.fontSize,
            fontWeight: st.fontWeight,
            lineHeight: st.lineHeight,
            letterSpacing: st.letterSpacing,
          });
        }
      }

      // Assets
      const assets: Array<{
        id: string;
        kind: 'logo' | 'image' | 'icon' | 'background' | 'font' | 'illustration';
        url: string;
        alt?: string;
        width?: number;
        height?: number;
      }> = [];

      const imgs = Array.from(document.querySelectorAll('img')).slice(0, 40);
      imgs.forEach((img, idx) => {
        const src = img.currentSrc || img.getAttribute('src') || '';
        if (!src || src.startsWith('data:image/svg+xml')) return;
        const rect = img.getBoundingClientRect();
        const isLogo =
          (img.closest('header, nav') !== null && rect.height <= 90) ||
          (img.alt || '').toLowerCase().includes('logo') ||
          src.toLowerCase().includes('logo');
        assets.push({
          id: `img-${idx + 1}`,
          kind: isLogo ? 'logo' : 'image',
          url: src,
          alt: (img.alt || '').trim().slice(0, 100) || undefined,
          width: Math.round(img.naturalWidth || rect.width),
          height: Math.round(img.naturalHeight || rect.height),
        });
      });

      const svgs = Array.from(document.querySelectorAll('svg')).slice(0, 12);
      svgs.forEach((svg, idx) => {
        const rect = svg.getBoundingClientRect();
        const isLogo = svg.closest('header, nav') !== null && rect.width > 28;
        assets.push({
          id: `svg-${idx + 1}`,
          kind: isLogo ? 'logo' : 'icon',
          url: `inline-svg://${idx + 1}`,
          alt: svg.getAttribute('aria-label') || (isLogo ? 'Brand vector logo' : 'UI vector icon'),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      });

      return {
        bgHex,
        textHex,
        primaryAccent,
        buttonBg,
        buttonText,
        palette,
        borderRadii: Array.from(borderRadii).slice(0, 5),
        shadows: Array.from(shadows).slice(0, 4),
        families: Array.from(families),
        tokens,
        assets,
      };
    });

    updateStage('design-system', {
      status: 'completed',
      detail: `${designData.palette.length} colors, ${designData.families.length} font families, ${designData.assets.length} assets`,
      durationMs: Date.now() - tDesign,
    });

    // Stage 5: Identifying components
    const tComponents = Date.now();
    updateStage('components', { status: 'running', detail: 'Classifying header, hero, grids, forms, and footer' });
    const hasHeader = domData.semanticElements.header > 0 || domData.navLinks.length > 0;
    const hasHero = domData.sections.some((s) => s.tag !== 'header' && s.boundingBox.y < 700 && s.boundingBox.height >= 240);
    const hasFooter = domData.semanticElements.footer > 0;
    updateStage('components', {
      status: 'completed',
      detail: `Mapped ${domData.sections.length} layout sections and ${domData.repeatedComponents.length} repeated patterns`,
      durationMs: Date.now() - tComponents,
    });

    // Stage 6: Understanding responsive layouts
    const tResp = Date.now();
    updateStage('responsive', { status: 'running', detail: 'Comparing layout shifts across 1440px, 768px, and 390px' });

    const inspectViewport = async (
      viewport: 'desktop' | 'tablet' | 'mobile',
      width: number,
      height: number
    ): Promise<ResponsiveObservation> => {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(220);
      return page.evaluate(
        ({ vp, w }) => {
          const visibleNavLinks = Array.from(document.querySelectorAll('header a, nav a')).filter((a) => {
            const st = window.getComputedStyle(a);
            const r = a.getBoundingClientRect();
            return st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          }).length;

          const hasHamburgerToggle = Array.from(document.querySelectorAll('header button, nav button')).some((btn) => {
            const st = window.getComputedStyle(btn);
            return st.display !== 'none' && st.visibility !== 'hidden';
          });

          const gridCols = new Set<number>();
          document.querySelectorAll('div, section, ul').forEach((el) => {
            const st = window.getComputedStyle(el);
            if (st.display === 'grid' && st.gridTemplateColumns && st.gridTemplateColumns !== 'none') {
              const count = st.gridTemplateColumns.split(' ').filter(Boolean).length;
              if (count > 0 && count <= 12) gridCols.add(count);
            }
          });

          const h1 = document.querySelector('h1');
          const h1Size = h1 ? window.getComputedStyle(h1).fontSize : '36px';
          const bodySize = window.getComputedStyle(document.body).fontSize;
          const overflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

          return {
            viewport: vp,
            width: w,
            navVisibleLinks: visibleNavLinks,
            hasHamburgerToggle,
            gridColumnsDetected: Array.from(gridCols).slice(0, 6),
            h1FontSize: h1Size,
            bodyFontSize: bodySize,
            horizontalOverflowPx: overflow,
          };
        },
        { vp: viewport, w: width }
      );
    };

    const responsive: ResponsiveObservation[] = [
      await inspectViewport('desktop', 1440, 900),
      await inspectViewport('tablet', 768, 1024),
      await inspectViewport('mobile', 390, 844),
    ];

    updateStage('responsive', {
      status: 'completed',
      detail: 'Evaluated 3 viewport breakpoints',
      durationMs: Date.now() - tResp,
    });

    const safeSections: DomSectionSummary[] = domData.sections.map((s) => ({
      ...s,
      heading: s.heading ? sanitizeUntrustedText(s.heading, 140) : undefined,
      textPreview: sanitizeUntrustedText(s.textPreview, 260),
    }));

    const safeTokens: TypographyToken[] = designData.tokens;
    const safeAssets: WebsiteAsset[] = designData.assets;

    return {
      url: targetUrl,
      finalUrl,
      title,
      description,
      analyzedAt: new Date().toISOString(),
      engine: 'playwright-chromium',
      screenshots: {
        desktop: desktopShot,
        tablet: tabletShot,
        mobile: mobileShot,
      },
      visualSummary: {
        hasHeader,
        hasHero,
        hasFooter,
        sectionCount: safeSections.length,
        cardGridCount: domData.repeatedComponents.length,
        buttonCount: domData.buttonCount,
        formCount: domData.formCount,
        borderRadii: designData.borderRadii,
        shadows: designData.shadows,
      },
      domSummary: {
        semanticElements: domData.semanticElements,
        navLinks: domData.navLinks.map((l) => ({
          label: sanitizeUntrustedText(l.label, 40),
          href: l.href,
        })),
        sections: safeSections,
        repeatedComponents: domData.repeatedComponents,
        rawSanitizedOutline: sanitizeUntrustedText(domData.outline, 4000),
      },
      typography: {
        families: designData.families,
        tokens: safeTokens,
      },
      colors: {
        primary: designData.primaryAccent,
        secondary: designData.palette[1] || '#334155',
        background: designData.bgHex,
        surface: designData.palette.find((c) => c !== designData.bgHex && c !== designData.textHex) || designData.bgHex,
        text: designData.textHex,
        mutedText: '#64748B',
        border: '#E2E8F0',
        buttonBg: designData.buttonBg,
        buttonText: designData.buttonText,
        palette: designData.palette,
        cssVariables: {
          '--color-primary': designData.primaryAccent,
          '--color-secondary': designData.palette[1] || '#334155',
          '--color-background': designData.bgHex,
          '--color-surface': designData.palette[2] || designData.bgHex,
          '--color-text': designData.textHex,
          '--color-button-bg': designData.buttonBg,
          '--color-button-text': designData.buttonText,
        },
      },
      assets: safeAssets,
      responsive,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
