import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded'
import RuleRoundedIcon from '@mui/icons-material/RuleRounded'
import SchemaRoundedIcon from '@mui/icons-material/SchemaRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useMemo, useState, type PropsWithChildren } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'

import { useAuth } from '../../auth/AuthContext'

const drawerWidth = 280

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', icon: <MonitorHeartRoundedIcon />, match: '/dashboard' },
  { label: 'Datasets', to: '/datasets', icon: <StorageRoundedIcon />, match: '/datasets' },
  { label: 'Pipelines', to: '/pipelines', icon: <SchemaRoundedIcon />, match: '/pipelines' },
  { label: 'Runs', to: '/runs', icon: <PlaylistPlayRoundedIcon />, match: '/runs' },
  { label: 'Alert Rules', to: '/alert-rules', icon: <RuleRoundedIcon />, match: '/alert-rules' },
  { label: 'Alerts', to: '/alerts', icon: <NotificationsActiveRoundedIcon />, match: '/alerts' },
]

export function AppShell({ children }: PropsWithChildren) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const location = useLocation()
  const { currentUser, users, setCurrentUserId } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentSection = useMemo(
    () => navigationItems.find((item) => location.pathname.startsWith(item.match))?.label ?? 'Overview',
    [location.pathname],
  )

  const drawer = (
    <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '0.16em' }}>
          Monitor
        </Typography>
        <Typography variant="h5" sx={{ mt: 1 }}>
          Big Data Pipeline Control
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          Simulated orchestration, real monitoring, mobile-friendly navigation.
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const selected = location.pathname.startsWith(item.match)
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 3,
                mb: 0.75,
                '&.Mui-selected': {
                  bgcolor: 'rgba(11, 93, 92, 0.12)',
                },
              }}
            >
              <ListItemIcon sx={{ color: selected ? 'primary.main' : 'text.secondary', minWidth: 42 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          Current section
        </Typography>
        <Typography variant="h6">{currentSection}</Typography>
      </Box>
    </Box>
  )

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(255, 107, 53, 0.14), transparent 30%), linear-gradient(180deg, #f8f5ee 0%, #f0ece2 100%)',
      }}
    >
      <AppBar position="fixed" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                display: 'grid',
                height: 44,
                width: 44,
                placeItems: 'center',
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.18)',
              }}
            >
              <MonitorHeartRoundedIcon />
            </Box>
            <Box>
              <Typography variant="h6">Pipeline Monitor</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Demo auth ready for Keycloak later
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <FormControl size="small" sx={{ minWidth: 220, bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 3 }}>
            <Select
              value={String(currentUser.id)}
              onChange={(event) => setCurrentUserId(Number(event.target.value))}
              sx={{ color: 'common.white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' } }}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={String(user.id)}>
                  {user.displayName} | {user.role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip label={currentUser.role} sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }} />
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', pt: '72px' }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          slotProps={{
            paper: {
              sx: {
                width: drawerWidth,
                boxSizing: 'border-box',
                borderRight: '1px solid rgba(11, 93, 92, 0.08)',
                backgroundColor: 'rgba(255, 250, 242, 0.95)',
                backgroundImage:
                  'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,250,242,0.95) 100%)',
              },
            },
          }}
        >
          {drawer}
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3.5 } }}>
          <Box sx={{ mx: 'auto', maxWidth: 1440 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  )
}
