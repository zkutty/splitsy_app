const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999
} as const;

const type = {
  size: {
    caption: 12,
    bodySm: 14,
    body: 16,
    titleSm: 20,
    titleMd: 28,
    titleLg: 36
  },
  lineHeight: {
    bodySm: 20,
    body: 24,
    titleSm: 26,
    titleMd: 34,
    titleLg: 42
  },
  weight: {
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    black: "800" as const
  }
} as const;

const layout = {
  contentWidth: 720,
  maxWidth: 1120
} as const;

const themes = {
  splittripLight: {
    colors: {
      accent: {
        primary: "#2563EB",
        success: "#10B981",
        purple: "#7C3AED",
        warning: "#F59E0B",
        danger: "#EF4444"
      },
      background: {
        canvas: "#F8FAFC",
        muted: "#EEF4FF",
        spotlight: "#DBEAFE"
      },
      surface: {
        base: "#FFFFFF",
        muted: "#F8FAFC",
        hero: "#0F172A"
      },
      text: {
        primary: "#0F172A",
        secondary: "#334155",
        muted: "#64748B",
        inverse: "#FFFFFF",
        accent: "#DBEAFE"
      },
      border: {
        subtle: "#E2E8F0",
        strong: "#CBD5E1"
      },
      status: {
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444"
      }
    },
    shadow: {
      card: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 2
      }
    }
  },
  splittripDark: {
    colors: {
      accent: {
        primary: "#60A5FA",
        success: "#34D399",
        purple: "#A78BFA",
        warning: "#FBBF24",
        danger: "#F87171"
      },
      background: {
        canvas: "#0B1120",
        muted: "#111C34",
        spotlight: "#1D4ED8"
      },
      surface: {
        base: "#111827",
        muted: "#0F172A",
        hero: "#020617"
      },
      text: {
        primary: "#E5EEF8",
        secondary: "#CBD5E1",
        muted: "#94A3B8",
        inverse: "#FFFFFF",
        accent: "#BFDBFE"
      },
      border: {
        subtle: "#243041",
        strong: "#334155"
      },
      status: {
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171"
      }
    },
    shadow: {
      card: {
        shadowColor: "#000000",
        shadowOpacity: 0.3,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3
      }
    }
  },
  gruvboxLight: {
    colors: {
      accent: {
        primary: "#458588",
        success: "#98971A",
        purple: "#B16286",
        warning: "#D79921",
        danger: "#CC241D"
      },
      background: {
        canvas: "#FBF1C7",
        muted: "#F2E5BC",
        spotlight: "#EBDAB4"
      },
      surface: {
        base: "#FEF7D6",
        muted: "#F2E5BC",
        hero: "#3C3836"
      },
      text: {
        primary: "#3C3836",
        secondary: "#504945",
        muted: "#7C6F64",
        inverse: "#FBF1C7",
        accent: "#F9F5D7"
      },
      border: {
        subtle: "#D5C4A1",
        strong: "#BDAE93"
      },
      status: {
        success: "#98971A",
        warning: "#D79921",
        error: "#CC241D"
      }
    },
    shadow: {
      card: {
        shadowColor: "#3C3836",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2
      }
    }
  },
  gruvboxDark: {
    colors: {
      accent: {
        primary: "#83A598",
        success: "#B8BB26",
        purple: "#D3869B",
        warning: "#FABD2F",
        danger: "#FB4934"
      },
      background: {
        canvas: "#1D2021",
        muted: "#282828",
        spotlight: "#3C3836"
      },
      surface: {
        base: "#282828",
        muted: "#32302F",
        hero: "#141617"
      },
      text: {
        primary: "#EBDBB2",
        secondary: "#D5C4A1",
        muted: "#A89984",
        inverse: "#FBF1C7",
        accent: "#F9F5D7"
      },
      border: {
        subtle: "#504945",
        strong: "#665C54"
      },
      status: {
        success: "#B8BB26",
        warning: "#FABD2F",
        error: "#FB4934"
      }
    },
    shadow: {
      card: {
        shadowColor: "#000000",
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3
      }
    }
  }
} as const;

export type ThemeName = keyof typeof themes;

export const themeOptions: Array<{ id: ThemeName; label: string; description: string }> = [
  { id: "splittripLight", label: "SplitTrip Light", description: "Default bright travel palette." },
  { id: "splittripDark", label: "SplitTrip Dark", description: "Default dark mode with cooler contrast." },
  { id: "gruvboxLight", label: "Gruvbox Light", description: "Warm parchment tones with muted contrast." },
  { id: "gruvboxDark", label: "Gruvbox Dark", description: "Warm dark palette with amber and moss accents." }
];

export const appThemes = Object.fromEntries(
  Object.entries(themes).map(([name, palette]) => [
    name,
    {
      ...palette,
      spacing,
      radius,
      type,
      layout
    }
  ])
) as {
  [K in ThemeName]: {
    colors: (typeof themes)[K]["colors"];
    shadow: (typeof themes)[K]["shadow"];
    spacing: typeof spacing;
    radius: typeof radius;
    type: typeof type;
    layout: typeof layout;
  };
};

export const theme = appThemes.splittripLight;

export type Theme = (typeof appThemes)[ThemeName];
