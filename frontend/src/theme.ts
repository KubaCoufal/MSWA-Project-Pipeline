import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0b5d5c',
      light: '#5da9a4',
      dark: '#083e3d',
    },
    secondary: {
      main: '#ff6b35',
      light: '#ff9b71',
      dark: '#bf4d22',
    },
    background: {
      default: '#f3efe6',
      paper: '#fffaf2',
    },
    success: {
      main: '#2c8c58',
    },
    warning: {
      main: '#c77f15',
    },
    error: {
      main: '#b73a3a',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.04em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(18px)',
          backgroundImage: 'linear-gradient(135deg, rgba(11, 93, 92, 0.95), rgba(255, 107, 53, 0.85))',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(11, 93, 92, 0.08)',
          boxShadow: '0 18px 45px rgba(11, 93, 92, 0.10)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
  },
})
