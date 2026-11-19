import type { GeneratedFile, StudioProject, WebsiteBlueprint } from '../../src/types/studio.ts';

function buildFilesFromBlueprint(bp: WebsiteBlueprint): GeneratedFile[] {
  const ds = bp.designSystem;
  const hero = bp.components.find((c) => c.type === 'hero');
  const features = bp.components.find((c) => c.type === 'feature-grid');
  const split = bp.components.find((c) => c.type === 'content-split');
  const footer = bp.components.find((c) => c.type === 'footer');

  const tokensCss = `:root {
  --color-primary: ${ds.primaryColor};
  --color-secondary: ${ds.secondaryColor};
  --color-bg: ${ds.backgroundColor};
  --color-surface: ${ds.surfaceColor};
  --color-text: ${ds.textColor};
  --color-muted: ${ds.mutedTextColor};
  --color-border: ${ds.borderColor};
  --font-display: '${ds.displayFontFamily}', sans-serif;
  --font-body: '${ds.fontFamily}', sans-serif;
  --radius-base: ${ds.borderRadius};
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  margin: 0;
}
`;

  const navbarTsx = `import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  brandName: string;
  links: Array<{ label: string; href: string }>;
  ctaLabel?: string;
  sticky?: boolean;
  styles?: React.CSSProperties;
}

export const Navbar: React.FC<NavbarProps> = ({
  brandName,
  links,
  ctaLabel = 'Get Started',
  sticky = true,
  styles = {},
}) => {
  const [open, setOpen] = useState(false);

  return (
    <header
      data-component-id="navbar"
      style={{
        backgroundColor: styles.backgroundColor || 'var(--color-bg)',
        color: styles.color || 'var(--color-text)',
        borderColor: styles.borderColor || 'var(--color-border)',
        ...styles,
      }}
      className={\`\${sticky ? 'sticky top-0 z-40 backdrop-blur-md' : ''} border-b\`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <a href="#top" className="text-lg font-semibold tracking-tight whitespace-nowrap shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
          {brandName}
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--color-muted)' }}>
          {links.map((link) => (
            <a key={link.label} href={link.href} className="hover:opacity-100 opacity-85 transition-opacity whitespace-nowrap shrink-0">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center shrink-0">
          <a
            href="#cta"
            className="px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-base)',
            }}
          >
            {ctaLabel}
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="md:hidden p-2 rounded border"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t px-6 py-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          {links.map((link) => (
            <a key={link.label} href={link.href} className="block text-sm py-1">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
};
`;

  const heroTsx = `import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  heading: string;
  subheading: string;
  ctaLabel: string;
  secondaryCtaLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  styles?: React.CSSProperties;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  heading,
  subheading,
  ctaLabel,
  secondaryCtaLabel,
  imageUrl,
  imageAlt = 'Featured visual',
  styles = {},
}) => {
  return (
    <section
      data-component-id="hero"
      style={{
        backgroundColor: styles.backgroundColor || 'transparent',
        color: styles.color || 'var(--color-text)',
        padding: styles.padding || '80px 24px',
        ...styles,
      }}
      className="border-b"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6 space-y-6">
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {heading}
          </h1>
          <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {subheading}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-base)',
              }}
            >
              <span>{ctaLabel}</span>
              <ArrowRight size={15} />
            </a>
            {secondaryCtaLabel && (
              <a
                href="#overview"
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium border transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-base)',
                }}
              >
                {secondaryCtaLabel}
              </a>
            )}
          </div>
        </div>
        <div className="lg:col-span-6">
          {imageUrl ? (
            <div className="overflow-hidden border" style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-base)' }}>
              <img src={imageUrl} alt={imageAlt} className="w-full h-[360px] object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
`;

  const featuresTsx = `import React from 'react';

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  meta?: string;
}

interface FeaturesSectionProps {
  heading: string;
  subheading?: string;
  items: FeatureItem[];
  styles?: React.CSSProperties;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  heading,
  subheading,
  items,
  styles = {},
}) => {
  return (
    <section
      id="features"
      data-component-id="features"
      style={{
        backgroundColor: styles.backgroundColor || 'transparent',
        color: styles.color || 'var(--color-text)',
        padding: styles.padding || '72px 24px',
        ...styles,
      }}
      className="border-b"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {heading}
          </h2>
          {subheading && (
            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {subheading}
            </p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, idx) => (
            <article
              key={item.id}
              className="p-6 border space-y-3"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-base)',
              }}
            >
              <div className="text-xs font-mono opacity-60">0{idx + 1}</div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
`;

  const splitTsx = `import React from 'react';

interface ContentSplitProps {
  heading: string;
  body: string;
  ctaLabel?: string;
  styles?: React.CSSProperties;
}

export const ContentSplit: React.FC<ContentSplitProps> = ({
  heading,
  body,
  ctaLabel,
  styles = {},
}) => {
  return (
    <section
      id="overview"
      data-component-id="overview"
      style={{
        backgroundColor: styles.backgroundColor || 'transparent',
        color: styles.color || 'var(--color-text)',
        padding: styles.padding || '72px 24px',
        ...styles,
      }}
      className="border-b"
    >
      <div className="mx-auto max-w-6xl grid gap-8 md:grid-cols-12 items-center">
        <div className="md:col-span-7 space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {heading}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {body}
          </p>
        </div>
        <div className="md:col-span-5 flex md:justify-end">
          {ctaLabel && (
            <a
              href="#cta"
              className="px-5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-base)',
              }}
            >
              {ctaLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
`;

  const footerTsx = `import React from 'react';

interface FooterProps {
  brandName: string;
  body: string;
  links?: Array<{ label: string; href: string }>;
  styles?: React.CSSProperties;
}

export const Footer: React.FC<FooterProps> = ({
  brandName,
  body,
  links = [],
  styles = {},
}) => {
  return (
    <footer
      id="cta"
      data-component-id="footer"
      style={{
        backgroundColor: styles.backgroundColor || 'var(--color-surface)',
        color: styles.color || 'var(--color-text)',
        borderColor: 'var(--color-border)',
        padding: styles.padding || '48px 24px',
        ...styles,
      }}
      className="border-t"
    >
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {brandName}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {body}
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-xs" style={{ color: 'var(--color-muted)' }}>
          {links.map((link) => (
            <a key={link.label} href={link.href} className="hover:opacity-100 opacity-80">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
`;

  const mainLayoutTsx = `import React from 'react';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="min-h-screen flex flex-col">{children}</div>;
};
`;

  const homePageTsx = `import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { ContentSplit } from '../components/ContentSplit';
import { Footer } from '../components/Footer';

export const HomePage: React.FC = () => {
  return (
    <MainLayout>
      <Navbar
        brandName=${JSON.stringify(bp.navigation.brandName)}
        links={${JSON.stringify(bp.navigation.links)}}
        ctaLabel=${JSON.stringify(bp.navigation.ctaLabel || 'Get Started')}
        sticky={${bp.navigation.sticky}}
      />
      ${hero && hero.visible ? `<HeroSection
        heading=${JSON.stringify(hero.props.heading || bp.project.name)}
        subheading=${JSON.stringify(hero.props.subheading || '')}
        ctaLabel=${JSON.stringify(hero.props.ctaLabel || 'Learn More')}
        secondaryCtaLabel=${JSON.stringify(hero.props.secondaryCtaLabel || '')}
        imageUrl=${JSON.stringify(hero.props.imageUrl || '')}
        imageAlt=${JSON.stringify(hero.props.imageAlt || bp.project.name)}
      />` : ''}
      ${features && features.visible ? `<FeaturesSection
        heading=${JSON.stringify(features.props.heading || 'Capabilities')}
        subheading=${JSON.stringify(features.props.subheading || '')}
        items={${JSON.stringify(features.props.items || [])}}
      />` : ''}
      ${split && split.visible ? `<ContentSplit
        heading=${JSON.stringify(split.props.heading || 'Architecture')}
        body=${JSON.stringify(split.props.body || '')}
        ctaLabel=${JSON.stringify(split.props.ctaLabel || 'Explore')}
      />` : ''}
      ${footer && footer.visible ? `<Footer
        brandName=${JSON.stringify(bp.navigation.brandName)}
        body=${JSON.stringify(footer.props.body || `© 2026 ${bp.navigation.brandName}.`)}
        links={${JSON.stringify(footer.props.links || bp.navigation.links)}}
      />` : ''}
    </MainLayout>
  );
};
`;

  const appTsx = `import React from 'react';
import './styles/tokens.css';
import { HomePage } from './pages/HomePage';

export default function App() {
  return <HomePage />;
}
`;

  const mainTsx = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';

createRoot(document.getElementById('root')!).render(<App />);
`;

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${bp.metadata.title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  const packageJson = JSON.stringify(
    {
      name: bp.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        'lucide-react': '^0.500.0',
      },
      devDependencies: {
        '@tailwindcss/vite': '^4.1.0',
        '@vitejs/plugin-react': '^4.3.4',
        tailwindcss: '^4.1.0',
        typescript: '^5.7.2',
        vite: '^6.1.0',
      },
    },
    null,
    2
  );

  return [
    { path: 'src/styles/tokens.css', content: tokensCss, language: 'css' },
    { path: 'src/layouts/MainLayout.tsx', content: mainLayoutTsx, language: 'typescript' },
    { path: 'src/components/Navbar.tsx', content: navbarTsx, language: 'typescript' },
    { path: 'src/components/HeroSection.tsx', content: heroTsx, language: 'typescript' },
    { path: 'src/components/FeaturesSection.tsx', content: featuresTsx, language: 'typescript' },
    { path: 'src/components/ContentSplit.tsx', content: splitTsx, language: 'typescript' },
    { path: 'src/components/Footer.tsx', content: footerTsx, language: 'typescript' },
    { path: 'src/pages/HomePage.tsx', content: homePageTsx, language: 'typescript' },
    { path: 'src/App.tsx', content: appTsx, language: 'typescript' },
    { path: 'src/main.tsx', content: mainTsx, language: 'typescript' },
    { path: 'index.html', content: indexHtml, language: 'html' },
    { path: 'package.json', content: packageJson, language: 'json' },
  ];
}

export function createExampleProjects(): StudioProject[] {
  const now = new Date().toISOString();

  const meridianBlueprint: WebsiteBlueprint = {
    project: {
      name: 'Meridian Treasury',
      type: 'Institutional Fintech Platform',
      sourceUrl: 'https://example-meridian-treasury.org',
      mode: 'rebuild',
    },
    metadata: {
      title: 'Meridian Treasury — Automated Liquidity & Yield Infrastructure',
      description: 'Institutional cash management and automated multi-currency settlement.',
      language: 'en',
    },
    designSystem: {
      primaryColor: '#2563EB',
      secondaryColor: '#0F172A',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      mutedTextColor: '#475569',
      borderColor: '#E2E8F0',
      fontFamily: 'DM Sans',
      displayFontFamily: 'Plus Jakarta Sans',
      borderRadius: '8px',
      spacingScale: '8px',
      cssVariables: {
        '--color-primary': '#2563EB',
        '--color-bg': '#F8FAFC',
        '--color-surface': '#FFFFFF',
        '--color-text': '#0F172A',
      },
    },
    navigation: {
      brandName: 'Meridian Treasury',
      sticky: true,
      links: [
        { label: 'Liquidity', href: '#features' },
        { label: 'Settlement', href: '#overview' },
        { label: 'Security', href: '#features' },
        { label: 'Documentation', href: '#cta' },
      ],
      ctaLabel: 'Open Treasury Account',
    },
    responsiveRules: [
      { breakpoint: '1440px', rule: 'Two-column hero split with 3-column capability grid.' },
      { breakpoint: '768px', rule: 'Single-column hero stack with collapsible navigation drawer.' },
      { breakpoint: '390px', rule: 'Mobile compact padding (16px) and single-column cards.' },
    ],
    components: [
      {
        id: 'navbar',
        name: 'Top Navigation',
        type: 'navigation',
        visible: true,
        props: {
          heading: 'Meridian Treasury',
          ctaLabel: 'Open Treasury Account',
          links: [
            { label: 'Liquidity', href: '#features' },
            { label: 'Settlement', href: '#overview' },
            { label: 'Security', href: '#features' },
            { label: 'Documentation', href: '#cta' },
          ],
        },
        styles: { backgroundColor: '#FFFFFF', textColor: '#0F172A', borderColor: '#E2E8F0' },
      },
      {
        id: 'hero',
        name: 'Hero Section',
        type: 'hero',
        visible: true,
        props: {
          heading: 'Institutional cash management built for real-time settlement.',
          subheading:
            'Unify multi-entity bank accounts, automate short-duration treasury sweeps, and reconcile global disbursements from a single ledger.',
          ctaLabel: 'Explore Infrastructure',
          secondaryCtaLabel: 'Read Technical Brief',
          imageUrl: '/src/assets/images/example_fintech_preview_1795070818851.jpg',
          imageAlt: 'Meridian Treasury architectural glass atrium',
        },
        styles: {
          backgroundColor: '#F8FAFC',
          textColor: '#0F172A',
          padding: '80px 24px',
          layout: 'two-column',
        },
      },
      {
        id: 'features',
        name: 'Capabilities Grid',
        type: 'feature-grid',
        visible: true,
        props: {
          heading: 'Core Treasury Primitives',
          subheading: 'Designed for CFOs, controllers, and platform engineering teams operating across 40+ currencies.',
          items: [
            {
              id: 'f1',
              title: 'Automated Liquidity Sweeps',
              description: 'Route idle operating balances into sovereign T-bill ladders at market close with zero manual wire approvals.',
            },
            {
              id: 'f2',
              title: 'Deterministic Ledger Sync',
              description: 'Double-entry journal exports reconcile directly with NetSuite, SAP, and custom ERP pipelines in under 30 seconds.',
            },
            {
              id: 'f3',
              title: 'Granular Approval Policies',
              description: 'Enforce hardware-key quorum rules across subsidiaries, currency corridors, and daily disbursement thresholds.',
            },
          ],
        },
        styles: { backgroundColor: '#FFFFFF', textColor: '#0F172A', padding: '72px 24px', layout: 'three-column' },
      },
      {
        id: 'overview',
        name: 'Architecture Split',
        type: 'content-split',
        visible: true,
        props: {
          heading: 'Direct bank rail connectivity without middleware drift.',
          body: 'Meridian connects directly to Tier-1 clearing partners via ISO 20022 messaging, eliminating brittle screen-scraping aggregators.',
          ctaLabel: 'Schedule Architecture Review',
        },
        styles: { backgroundColor: '#F8FAFC', textColor: '#0F172A', padding: '72px 24px' },
      },
      {
        id: 'footer',
        name: 'Footer',
        type: 'footer',
        visible: true,
        props: {
          body: '© 2026 Meridian Treasury Infrastructure Ltd. Example template project.',
          links: [
            { label: 'System Status', href: '#top' },
            { label: 'SOC 2 Report', href: '#features' },
            { label: 'API Reference', href: '#overview' },
          ],
        },
        styles: { backgroundColor: '#FFFFFF', textColor: '#0F172A', padding: '48px 24px' },
      },
    ],
  };

  const kansoBlueprint: WebsiteBlueprint = {
    project: {
      name: 'Kanso Acoustics',
      type: 'Audio Hardware Storefront',
      sourceUrl: 'https://example-kanso-acoustics.design',
      mode: 'redesign',
      redesignDirection: 'luxury',
    },
    metadata: {
      title: 'Kanso Acoustics — Reference Studio Monitors',
      description: 'CNC-milled anodized aluminum acoustic monitors engineered in Kyoto.',
      language: 'en',
    },
    designSystem: {
      primaryColor: '#D97706',
      secondaryColor: '#27272A',
      backgroundColor: '#09090B',
      surfaceColor: '#121215',
      textColor: '#F4F4F5',
      mutedTextColor: '#A1A1AA',
      borderColor: '#27272A',
      fontFamily: 'DM Sans',
      displayFontFamily: 'Plus Jakarta Sans',
      borderRadius: '4px',
      spacingScale: '8px',
      cssVariables: {
        '--color-primary': '#D97706',
        '--color-bg': '#09090B',
        '--color-surface': '#121215',
        '--color-text': '#F4F4F5',
      },
    },
    navigation: {
      brandName: 'Kanso Acoustics',
      sticky: true,
      links: [
        { label: 'Model 01', href: '#features' },
        { label: 'Engineering', href: '#overview' },
        { label: 'Listening Rooms', href: '#cta' },
      ],
      ctaLabel: 'Configure Pair',
    },
    responsiveRules: [
      { breakpoint: '1440px', rule: 'Wide asymmetrical showcase layout with 4px industrial radius.' },
      { breakpoint: '390px', rule: 'Stacked vertical spec cards and sticky bottom purchase bar.' },
    ],
    components: [
      {
        id: 'navbar',
        name: 'Top Navigation',
        type: 'navigation',
        visible: true,
        props: {
          heading: 'Kanso Acoustics',
          ctaLabel: 'Configure Pair',
          links: [
            { label: 'Model 01', href: '#features' },
            { label: 'Engineering', href: '#overview' },
            { label: 'Listening Rooms', href: '#cta' },
          ],
        },
        styles: { backgroundColor: '#09090B', textColor: '#F4F4F5', borderColor: '#27272A' },
      },
      {
        id: 'hero',
        name: 'Hero Showcase',
        type: 'hero',
        visible: true,
        props: {
          heading: 'Precision acoustic monitors milled from solid aluminum.',
          subheading:
            'Zero-resonance enclosures paired with custom beryllium tweeters for mastering rooms and discerning listening spaces.',
          ctaLabel: 'Explore Model 01',
          secondaryCtaLabel: 'Acoustic Measurements',
          imageUrl: '/src/assets/images/example_hardware_preview_1795070818384.jpg',
          imageAlt: 'Kanso Model 01 matte black aluminum monitor on basalt stone',
        },
        styles: { backgroundColor: '#09090B', textColor: '#F4F4F5', padding: '80px 24px', layout: 'two-column' },
      },
      {
        id: 'features',
        name: 'Acoustic Specifications',
        type: 'feature-grid',
        visible: true,
        props: {
          heading: 'Measured Transparency',
          subheading: 'Every serialized pair is calibrated in our Kyoto anechoic chamber within ±0.4 dB.',
          items: [
            {
              id: 'k1',
              title: 'Monoblock Enclosure',
              description: '5-axis CNC machined 6061 aluminum cabinet eliminates internal standing waves and baffle diffraction.',
            },
            {
              id: 'k2',
              title: 'Class-AB Bi-Amplification',
              description: 'Discrete 180W low-frequency and 90W high-frequency stages tuned for effortless transient response.',
            },
            {
              id: 'k3',
              title: 'Room Boundary DSP',
              description: 'Subtle analog-voiced parametric trim compensates for near-wall desk placement.',
            },
          ],
        },
        styles: { backgroundColor: '#09090B', textColor: '#F4F4F5', padding: '72px 24px', layout: 'three-column' },
      },
      {
        id: 'overview',
        name: 'Craftsmanship Note',
        type: 'content-split',
        visible: true,
        props: {
          heading: 'Built to outlast format cycles.',
          body: 'Modular amplifier backplates and serviceable transducers ensure every Kanso monitor remains field-maintainable for decades.',
          ctaLabel: 'Book Private Audition',
        },
        styles: { backgroundColor: '#121215', textColor: '#F4F4F5', padding: '72px 24px' },
      },
      {
        id: 'footer',
        name: 'Footer',
        type: 'footer',
        visible: true,
        props: {
          body: '© 2026 Kanso Acoustics Studio. Example template project.',
          links: [
            { label: 'Warranty', href: '#top' },
            { label: 'Spec Sheets', href: '#features' },
          ],
        },
        styles: { backgroundColor: '#09090B', textColor: '#F4F4F5', padding: '48px 24px' },
      },
    ],
  };

  const atelierBlueprint: WebsiteBlueprint = {
    project: {
      name: 'Atelier Monograph',
      type: 'Architectural Journal',
      sourceUrl: 'https://example-atelier-monograph.press',
      mode: 'rebuild',
    },
    metadata: {
      title: 'Atelier Monograph — Spatial Architecture & Concrete Studies',
      description: 'Quarterly architectural monograph examining daylight, concrete, and civic space.',
      language: 'en',
    },
    designSystem: {
      primaryColor: '#18181B',
      secondaryColor: '#71717A',
      backgroundColor: '#F5F4F0',
      surfaceColor: '#FFFFFF',
      textColor: '#18181B',
      mutedTextColor: '#52525B',
      borderColor: '#E4E2DC',
      fontFamily: 'DM Sans',
      displayFontFamily: 'Plus Jakarta Sans',
      borderRadius: '2px',
      spacingScale: '8px',
      cssVariables: {
        '--color-primary': '#18181B',
        '--color-bg': '#F5F4F0',
        '--color-surface': '#FFFFFF',
        '--color-text': '#18181B',
      },
    },
    navigation: {
      brandName: 'Atelier Monograph',
      sticky: false,
      links: [
        { label: 'Issues', href: '#features' },
        { label: 'Essays', href: '#overview' },
        { label: 'Archive', href: '#cta' },
      ],
      ctaLabel: 'Subscribe Print',
    },
    responsiveRules: [
      { breakpoint: '1440px', rule: 'Editorial 12-column grid with generous vertical margins.' },
      { breakpoint: '390px', rule: 'Single-column reading measure capped at 65ch.' },
    ],
    components: [
      {
        id: 'navbar',
        name: 'Editorial Masthead',
        type: 'navigation',
        visible: true,
        props: {
          heading: 'Atelier Monograph',
          ctaLabel: 'Subscribe Print',
          links: [
            { label: 'Issues', href: '#features' },
            { label: 'Essays', href: '#overview' },
            { label: 'Archive', href: '#cta' },
          ],
        },
        styles: { backgroundColor: '#F5F4F0', textColor: '#18181B', borderColor: '#E4E2DC' },
      },
      {
        id: 'hero',
        name: 'Lead Essay Feature',
        type: 'hero',
        visible: true,
        props: {
          heading: 'Daylight geometry and board-formed concrete in civic galleries.',
          subheading:
            'Issue 14 investigates how northern European and Japanese museum pavilions choreograph natural light without mechanical glare.',
          ctaLabel: 'Read Issue 14',
          secondaryCtaLabel: 'Browse Archive',
          imageUrl: '/src/assets/images/example_editorial_preview_1795070817445.jpg',
          imageAlt: 'Modernist concrete gallery with natural window shadows',
        },
        styles: { backgroundColor: '#F5F4F0', textColor: '#18181B', padding: '80px 24px', layout: 'two-column' },
      },
      {
        id: 'features',
        name: 'Featured Monographs',
        type: 'feature-grid',
        visible: true,
        props: {
          heading: 'Recent Field Studies',
          subheading: 'Documented with large-format photography, section drawings, and material notes.',
          items: [
            {
              id: 'a1',
              title: 'Naoshima Timber & Stone',
              description: 'Spatial sequencing along coastal topography and quiet threshold transitions.',
            },
            {
              id: 'a2',
              title: 'Basel Thermal Baths',
              description: 'Compression, acoustic stillness, and mineral weathering over twenty winters.',
            },
            {
              id: 'a3',
              title: 'Zurich Civic Courtyards',
              description: 'How shared semi-public passages stitch dense residential blocks together.',
            },
          ],
        },
        styles: { backgroundColor: '#FFFFFF', textColor: '#18181B', padding: '72px 24px', layout: 'three-column' },
      },
      {
        id: 'overview',
        name: 'Print Edition Note',
        type: 'content-split',
        visible: true,
        props: {
          heading: 'Printed quarterly on uncoated Munken Kristall stock.',
          body: 'Each 180-page volume ships worldwide without advertising, funded solely by studio and reader subscriptions.',
          ctaLabel: 'Order Back Issues',
        },
        styles: { backgroundColor: '#F5F4F0', textColor: '#18181B', padding: '72px 24px' },
      },
      {
        id: 'footer',
        name: 'Footer',
        type: 'footer',
        visible: true,
        props: {
          body: '© 2026 Atelier Monograph Press. Example template project.',
          links: [
            { label: 'Colophon', href: '#top' },
            { label: 'Submissions', href: '#overview' },
          ],
        },
        styles: { backgroundColor: '#FFFFFF', textColor: '#18181B', padding: '48px 24px' },
      },
    ],
  };

  return [
    {
      id: 'example-meridian',
      name: 'Meridian Treasury',
      sourceUrl: 'https://example-meridian-treasury.org',
      mode: 'rebuild',
      status: 'completed',
      isExample: true,
      thumbnailUrl: '/src/assets/images/example_fintech_preview_1795070818851.jpg',
      createdAt: now,
      updatedAt: now,
      blueprint: meridianBlueprint,
      files: buildFilesFromBlueprint(meridianBlueprint),
      aiHistory: [],
      comparisons: [],
    },
    {
      id: 'example-kanso',
      name: 'Kanso Acoustics',
      sourceUrl: 'https://example-kanso-acoustics.design',
      mode: 'redesign',
      redesignDirection: 'luxury',
      status: 'completed',
      isExample: true,
      thumbnailUrl: '/src/assets/images/example_hardware_preview_1795070818384.jpg',
      createdAt: now,
      updatedAt: now,
      blueprint: kansoBlueprint,
      files: buildFilesFromBlueprint(kansoBlueprint),
      aiHistory: [],
      comparisons: [],
    },
    {
      id: 'example-atelier',
      name: 'Atelier Monograph',
      sourceUrl: 'https://example-atelier-monograph.press',
      mode: 'rebuild',
      status: 'completed',
      isExample: true,
      thumbnailUrl: '/src/assets/images/example_editorial_preview_1795070817445.jpg',
      createdAt: now,
      updatedAt: now,
      blueprint: atelierBlueprint,
      files: buildFilesFromBlueprint(atelierBlueprint),
      aiHistory: [],
      comparisons: [],
    },
  ];
}
