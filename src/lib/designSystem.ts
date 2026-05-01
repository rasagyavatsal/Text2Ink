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
    controlSheet: number;
    floatingSurface: number;
    modalDialog: number;
  };
};

export const CHROME_LAYER_VARS = {
  controlSheet: '--t2i-layer-control-sheet',
  floatingSurface: '--t2i-layer-floating-surface',
  modalDialog: '--t2i-layer-modal-dialog',
} as const;

export const CHROME_LAYER_Z_INDEX = {
  controlSheet: `var(${CHROME_LAYER_VARS.controlSheet})`,
  floatingSurface: `var(${CHROME_LAYER_VARS.floatingSurface})`,
  modalDialog: `var(${CHROME_LAYER_VARS.modalDialog})`,
} as const;

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
    sm: '0.375rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1rem',
    panel: '1rem',
  },
  elevation: {
    low: '0 1px 2px rgba(17, 24, 39, 0.04)',
    medium: '0 10px 24px rgba(17, 24, 39, 0.08)',
    high: '0 18px 48px rgba(17, 24, 39, 0.14)',
  },
  motion: {
    fast: '140ms ease',
    normal: '200ms ease',
  },
  layer: {
    header: 30,
    sidebar: 20,
    controlSheet: 40,
    floatingSurface: 50,
    modalDialog: 60,
  },
} as const;

const lightTheme: Palette = {
  ...shared,
  color: {
    ...shared.color,
    surface: {
      app: '#F7F7F5',
      header: 'rgba(255, 255, 255, 0.90)',
      panel: '#FFFFFF',
      panelMuted: '#F4F4F2',
      card: '#FFFFFF',
      raised: '#FFFFFF',
      overlay: 'rgba(17, 24, 39, 0.40)',
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
    brand: {
      ...shared.color.brand,
      primaryHover: '#F0B946',
      primarySoft: 'rgba(224, 163, 42, 0.16)',
    },
    accent: {
      info: '#818CF8',
      infoSoft: 'rgba(129, 140, 248, 0.16)',
      onInfo: '#050505',
    },
    surface: {
      app: '#000000',
      header: 'rgba(0, 0, 0, 0.86)',
      panel: '#090909',
      panelMuted: '#0F0F10',
      card: '#111111',
      raised: '#161616',
      overlay: 'rgba(0, 0, 0, 0.72)',
    },
    content: {
      strong: '#F8F8F8',
      normal: '#D4D4D4',
      muted: '#A3A3A3',
      subtle: '#737373',
      inverse: '#050505',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      default: 'rgba(255, 255, 255, 0.14)',
      strong: 'rgba(255, 255, 255, 0.22)',
      focus: '#818CF8',
    },
    state: {
      selectedBackground: 'rgba(129, 140, 248, 0.16)',
      selectedBorder: 'rgba(129, 140, 248, 0.42)',
      hoverBackground: 'rgba(255, 255, 255, 0.08)',
      activeBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  elevation: {
    low: '0 1px 2px rgba(0, 0, 0, 0.28)',
    medium: '0 10px 24px rgba(0, 0, 0, 0.34)',
    high: '0 18px 48px rgba(0, 0, 0, 0.48)',
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
