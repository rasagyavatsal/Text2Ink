import type { HandwritingSettings, PageSettings } from '@/lib/types';

export type ChromeTheme = 'light' | 'dark';

type Palette = {
  color: {
    brand: {
      primary: string;
      primaryHover: string;
      primarySoft: string;
      onPrimary: string;
    };
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      500: string;
      700: string;
      900: string;
      950: string;
    };
    accent: {
      info: string;
      infoSoft: string;
      onInfo: string;
    };
    status: {
      success: string;
      warning: string;
      danger: string;
    };
    surface: {
      app: string;
      header: string;
      panel: string;
      panelMuted: string;
      card: string;
      raised: string;
      overlay: string;
    };
    content: {
      strong: string;
      normal: string;
      muted: string;
      subtle: string;
      inverse: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
      focus: string;
    };
    state: {
      selectedBackground: string;
      selectedBorder: string;
      hoverBackground: string;
      activeBackground: string;
    };
  };
  typography: {
    fontSans: string;
    labelLetterSpacing: string;
  };
  spacing: {
    sidebarWidth: number;
    shellGutter: number;
    sectionGap: number;
    rowGap: number;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    panel: string;
  };
  elevation: {
    low: string;
    medium: string;
    high: string;
  };
  motion: {
    fast: string;
    normal: string;
  };
  layer: {
    header: number;
    sidebar: number;
    overlay: number;
  };
};

const shared = {
  color: {
    brand: {
      primary: '#E0A32A',
      primaryHover: '#C99225',
      primarySoft: 'rgba(224, 163, 42, 0.12)',
      onPrimary: '#111827',
    },
    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      500: '#64748B',
      700: '#334155',
      900: '#0F172A',
      950: '#020617',
    },
    accent: {
      info: '#4F46E5',
      infoSoft: 'rgba(79, 70, 229, 0.12)',
      onInfo: '#FFFFFF',
    },
    status: {
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
  },
  typography: {
    fontSans: 'var(--font-inter)',
    labelLetterSpacing: '0.08em',
  },
  spacing: {
    sidebarWidth: 384,
    shellGutter: 24,
    sectionGap: 18,
    rowGap: 12,
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    panel: '1.5rem',
  },
  elevation: {
    low: '0 1px 2px rgba(15, 23, 42, 0.06)',
    medium: '0 14px 34px rgba(15, 23, 42, 0.10)',
    high: '0 24px 70px rgba(15, 23, 42, 0.20)',
  },
  motion: {
    fast: '150ms ease',
    normal: '220ms ease',
  },
  layer: {
    header: 30,
    sidebar: 20,
    overlay: 50,
  },
} as const;

const lightTheme: Palette = {
  ...shared,
  color: {
    ...shared.color,
    surface: {
      app: '#F6F7F9',
      header: 'rgba(255, 255, 255, 0.92)',
      panel: '#FFFFFF',
      panelMuted: '#F8FAFC',
      card: '#FFFFFF',
      raised: '#FFFFFF',
      overlay: 'rgba(15, 23, 42, 0.42)',
    },
    content: {
      strong: '#0F172A',
      normal: '#334155',
      muted: '#64748B',
      subtle: '#94A3B8',
      inverse: '#FFFFFF',
    },
    border: {
      subtle: '#EEF2F7',
      default: '#DDE4EE',
      strong: '#CBD5E1',
      focus: '#4F46E5',
    },
    state: {
      selectedBackground: '#EEF2FF',
      selectedBorder: '#C7D2FE',
      hoverBackground: '#F1F5F9',
      activeBackground: '#E2E8F0',
    },
  },
};

const darkTheme: Palette = {
  ...shared,
  color: {
    ...shared.color,
    surface: {
      app: '#0B1120',
      header: 'rgba(15, 23, 42, 0.88)',
      panel: '#111827',
      panelMuted: '#0F172A',
      card: '#172033',
      raised: '#1E293B',
      overlay: 'rgba(2, 6, 23, 0.72)',
    },
    content: {
      strong: '#F8FAFC',
      normal: '#CBD5E1',
      muted: '#94A3B8',
      subtle: '#64748B',
      inverse: '#020617',
    },
    border: {
      subtle: 'rgba(148, 163, 184, 0.16)',
      default: 'rgba(148, 163, 184, 0.24)',
      strong: 'rgba(203, 213, 225, 0.34)',
      focus: '#818CF8',
    },
    state: {
      selectedBackground: 'rgba(79, 70, 229, 0.20)',
      selectedBorder: 'rgba(129, 140, 248, 0.44)',
      hoverBackground: 'rgba(148, 163, 184, 0.12)',
      activeBackground: 'rgba(148, 163, 184, 0.18)',
    },
  },
};

export const DESIGN_TOKEN_CONTRACT = lightTheme;

export const CHROME_THEMES: Record<ChromeTheme, Palette> = {
  light: lightTheme,
  dark: darkTheme,
};

export function resolveChromeTheme(theme: ChromeTheme): Palette {
  return CHROME_THEMES[theme];
}

export type DocumentPreviewAppearance = {
  inkColor: string;
  paperColor: string;
  lineColor: string;
};

export function getDocumentPreviewAppearance({
  settings,
  pageSettings,
}: {
  settings: HandwritingSettings;
  pageSettings: PageSettings;
  chromeTheme: ChromeTheme;
}): DocumentPreviewAppearance {
  return {
    inkColor: pageSettings.inkColor ?? settings.inkColor,
    paperColor: pageSettings.paperColor ?? settings.paperColor,
    lineColor: pageSettings.lineColor ?? settings.lineColor,
  };
}
