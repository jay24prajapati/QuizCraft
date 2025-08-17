"use client"

import { createContext, useState, useMemo, useEffect } from "react"
import { createTheme, responsiveFontSizes } from "@mui/material/styles"
import { CssBaseline, ThemeProvider as MUIThemeProvider } from "@mui/material"

export const ThemeModeContext = createContext({
  toggleThemeMode: () => {},
  mode: "light",
})

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          primary: { main: "#007AFF", light: "#E3F2FD", contrastText: "#ffffff" }, // Apple Blue
          secondary: { main: "#8A8A8E" }, // Neutral Grey
          background: { default: "#F2F2F7", paper: "#FFFFFF" },
          text: { primary: "#1D1D1F", secondary: "#6E6E73" },
          success: { main: "#34C759", light: "#E5F9EA" }, // Apple Green
          error: { main: "#FF3B30", light: "#FFEBEA" }, // Apple Red
          warning: { main: "#FF9500", light: "#FFF6E0" }, // Apple Orange
          info: { main: "#007AFF" }, // Using primary for info
          divider: "rgba(0, 0, 0, 0.12)",
          action: {
            active: "rgba(0, 0, 0, 0.54)",
            hover: "rgba(0, 0, 0, 0.04)",
            selected: "rgba(0, 0, 0, 0.08)",
            disabled: "rgba(0, 0, 0, 0.26)",
            disabledBackground: "rgba(0, 0, 0, 0.12)",
          },
        }
      : {
          primary: { main: "#0A84FF", light: "#1A8EFF", contrastText: "#ffffff" }, 
          secondary: { main: "#8E8E93" },
          background: { default: "#000000", paper: "#1C1C1E" }, 
          text: { primary: "#FFFFFF", secondary: "#EBEBF599" }, 
          success: { main: "#30D158", light: "#249A40" }, 
          error: { main: "#FF453A", light: "#D32F2F" }, 
          warning: { main: "#FF9F0A", light: "#F57C00" }, 
          info: { main: "#0A84FF" },
          divider: "rgba(255, 255, 255, 0.15)",
          action: {
            active: "#ffffff",
            hover: "rgba(255, 255, 255, 0.08)",
            selected: "rgba(255, 255, 255, 0.16)",
            disabled: "rgba(255, 255, 255, 0.3)",
            disabledBackground: "rgba(255, 255, 255, 0.12)",
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: "0.01em" },
  },
  shape: {
    borderRadius: 10, 
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { padding: "10px 22px" }, 
        containedPrimary: {
          boxShadow: "none", 
          "&:hover": {
            boxShadow: "none",
          },
        },
        outlinedPrimary: {
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow:
            theme.palette.mode === "light" ? "0px 4px 24px rgba(0, 0, 0, 0.06)" : "0px 4px 24px rgba(0, 0, 0, 0.2)",
          transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow:
            theme.palette.mode === "light" ? "0px 2px 8px rgba(0, 0, 0, 0.05)" : "0px 2px 8px rgba(0, 0, 0, 0.3)",
        }),
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          "&:before": { display: "none" },
          boxShadow: "none",
          borderRadius: theme.shape.borderRadius,
          "&.Mui-expanded": {
            margin: "0", 
          },
        }),
        summary: ({ theme }) => ({
          "&.Mui-expanded": {
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
        }),
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: ({ theme }) => ({
          "& .MuiOutlinedInput-root": {
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.light,
            },
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, padding: "4px 2px" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600, 
          fontSize: "0.95rem",
          padding: "12px 20px",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: ({ theme }) => ({
          height: "3px",
          borderTopLeftRadius: "3px",
          borderTopRightRadius: "3px",
        }),
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
          },
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: ({ theme }) => ({
          backdropFilter: "blur(3px)", 
        }),
      },
    },
  },
})

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    try {
      const storedMode = typeof window !== "undefined" ? localStorage.getItem("themeMode") : "light"
      return storedMode ? storedMode : "light"
    } catch (error) {
      return "light"
    }
  })

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("themeMode", mode)
        document.documentElement.setAttribute("data-theme", mode) 
      }
    } catch (error) {
      console.error("Could not save theme mode to localStorage:", error)
    }
  }, [mode])

  const themeMode = useMemo(
    () => ({
      toggleThemeMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"))
      },
      mode,
    }),
    [mode],
  )

  let theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode])
  theme = responsiveFontSizes(theme) 

  return (
    <ThemeModeContext.Provider value={themeMode}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </MUIThemeProvider>
    </ThemeModeContext.Provider>
  )
}
