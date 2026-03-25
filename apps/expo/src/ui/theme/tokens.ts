export const theme = {
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
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999
  },
  type: {
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
  },
  layout: {
    contentWidth: 720,
    maxWidth: 1120
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
} as const;

export type Theme = typeof theme;
