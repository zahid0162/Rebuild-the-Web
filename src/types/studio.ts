export type ProjectStatus = 'draft' | 'analyzing' | 'blueprint_ready' | 'completed' | 'error';

export type ReconstructionMode = 'rebuild' | 'redesign';

export type AiProviderChoice = 'auto' | 'gemini-hydrogen' | 'gemini-flash-lite' | 'hf-qwen';

export type RedesignDirection =
  | 'minimalist'
  | 'corporate'
  | 'modern-saas'
  | 'luxury'
  | 'creative'
  | 'editorial'
  | 'ecommerce';

export type AnalysisStageId =
  | 'connecting'
  | 'screenshots'
  | 'dom'
  | 'design-system'
  | 'components'
  | 'responsive'
  | 'blueprint';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AnalysisStageProgress {
  id: AnalysisStageId;
  label: string;
  status: StageStatus;
  detail?: string;
  durationMs?: number;
}

export interface ViewportScreenshot {
  viewport: 'desktop' | 'tablet' | 'mobile';
  width: number;
  height: number;
  url: string;
  fullPageUrl?: string;
}

export interface TypographyToken {
  role: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface ColorTokens {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  buttonBg: string;
  buttonText: string;
  palette: string[];
  cssVariables: Record<string, string>;
}

export interface WebsiteAsset {
  id: string;
  kind: 'logo' | 'image' | 'icon' | 'background' | 'font' | 'illustration';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  selector?: string;
}

export interface DomSectionSummary {
  tag: string;
  role: string;
  heading?: string;
  textPreview: string;
  linksCount: number;
  buttonsCount: number;
  imagesCount: number;
  formsCount: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  computedBackground?: string;
  computedPadding?: string;
}

export interface ResponsiveObservation {
  viewport: 'desktop' | 'tablet' | 'mobile';
  width: number;
  navVisibleLinks: number;
  hasHamburgerToggle: boolean;
  gridColumnsDetected: number[];
  h1FontSize: string;
  bodyFontSize: string;
  horizontalOverflowPx: number;
}

export interface WebsiteAnalysis {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  analyzedAt: string;
  engine: 'playwright-chromium' | 'http-cheerio-fallback';
  screenshots: {
    desktop?: ViewportScreenshot;
    tablet?: ViewportScreenshot;
    mobile?: ViewportScreenshot;
  };
  visualSummary: {
    hasHeader: boolean;
    hasHero: boolean;
    hasFooter: boolean;
    sectionCount: number;
    cardGridCount: number;
    buttonCount: number;
    formCount: number;
    borderRadii: string[];
    shadows: string[];
  };
  domSummary: {
    semanticElements: Record<string, number>;
    navLinks: Array<{ label: string; href: string }>;
    sections: DomSectionSummary[];
    repeatedComponents: Array<{ pattern: string; count: number }>;
    rawSanitizedOutline: string;
  };
  typography: {
    families: string[];
    tokens: TypographyToken[];
  };
  colors: ColorTokens;
  assets: WebsiteAsset[];
  responsive: ResponsiveObservation[];
}

export interface ComponentStyleProps {
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  layout?: 'stack' | 'row' | 'two-column' | 'three-column' | 'grid';
  gap?: string;
}

export interface ComponentContentProps {
  heading?: string;
  subheading?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  badgeText?: string;
  items?: Array<{
    id: string;
    title: string;
    description: string;
    meta?: string;
    imageUrl?: string;
  }>;
  links?: Array<{ label: string; href: string }>;
}

export interface BlueprintComponentNode {
  id: string;
  name: string;
  type:
    | 'navigation'
    | 'hero'
    | 'feature-grid'
    | 'content-split'
    | 'pricing'
    | 'testimonials'
    | 'stats'
    | 'cta'
    | 'footer'
    | 'custom';
  visible: boolean;
  locked?: boolean;
  props: ComponentContentProps;
  styles: ComponentStyleProps;
  children?: BlueprintComponentNode[];
}

export interface WebsiteBlueprint {
  project: {
    name: string;
    type: string;
    sourceUrl: string;
    mode: ReconstructionMode;
    redesignDirection?: RedesignDirection;
  };
  metadata: {
    title: string;
    description: string;
    language: string;
  };
  designSystem: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    fontFamily: string;
    displayFontFamily: string;
    borderRadius: string;
    spacingScale: string;
    cssVariables: Record<string, string>;
  };
  navigation: {
    brandName: string;
    sticky: boolean;
    links: Array<{ label: string; href: string }>;
    ctaLabel?: string;
  };
  responsiveRules: Array<{
    breakpoint: string;
    rule: string;
  }>;
  components: BlueprintComponentNode[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: 'typescript' | 'css' | 'html' | 'json';
}

export interface ProposedFileChange {
  path: string;
  action: 'update' | 'create' | 'delete';
  summary: string;
  content?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  proposedChanges?: ProposedFileChange[];
  updatedBlueprint?: WebsiteBlueprint;
  status?: 'pending' | 'applied' | 'reverted';
}

export interface ViewportComparisonMetric {
  viewport: 'desktop' | 'tablet' | 'mobile';
  width: number;
  height: number;
  originalUrl: string;
  reconstructedUrl: string;
  diffImageUrl?: string;
  pixelMatchPercent: number;
  colorSimilarityPercent: number;
  layoutAlignmentScore: number;
}

export interface VisualAuditFinding {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: 'positioning' | 'dimensions' | 'colors' | 'typography' | 'spacing' | 'images';
  componentId?: string;
  title: string;
  description: string;
  suggestedFix: string;
}

export interface VisualComparisonReport {
  id: string;
  createdAt: string;
  metrics: ViewportComparisonMetric[];
  summary: string;
  findings: VisualAuditFinding[];
}

export interface StudioProject {
  id: string;
  name: string;
  sourceUrl: string;
  mode: ReconstructionMode;
  redesignDirection?: RedesignDirection;
  aiProvider?: AiProviderChoice;
  status: ProjectStatus;
  isExample?: boolean;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  analysis?: WebsiteAnalysis;
  blueprint?: WebsiteBlueprint;
  files: GeneratedFile[];
  aiHistory: AiChatMessage[];
  comparisons: VisualComparisonReport[];
}
