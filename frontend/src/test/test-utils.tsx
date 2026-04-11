/* eslint-disable react-refresh/only-export-components */
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { AuthProvider } from '../auth/AuthContext'
import { theme } from '../theme'

function TestProviders({ children, route, userId }: PropsWithChildren<{ route: string; userId?: number }>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  if (userId) {
    window.localStorage.setItem('pipeline-monitor-demo-user', String(userId))
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export function renderWithProviders(ui: ReactNode, options: { route?: string; userId?: number } = {}) {
  return render(
    <TestProviders route={options.route ?? '/'} userId={options.userId}>
      {ui}
    </TestProviders>,
  )
}
