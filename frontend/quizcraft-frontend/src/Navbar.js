"use client"
import { useContext } from "react"
import { Link as RouterLink } from "react-router-dom"
import { AppBar, Toolbar, Typography, Button, Box, Avatar, IconButton, Tooltip } from "@mui/material"
import QuizIcon from "@mui/icons-material/Quiz"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import { ThemeModeContext } from "./ThemeContext"

function Navbar({ signOut, user }) {
  const { mode, toggleThemeMode } = useContext(ThemeModeContext)

  const getInitials = (name) => {
    if (!name) return "?"
    const parts = name.split(" ")
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return parts[0].charAt(0).toUpperCase() + (parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "")
  }

  const userDisplayName = user?.attributes?.name || user?.username

  return (
    <AppBar position="sticky" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <QuizIcon sx={{ mr: 1, color: "primary.main", fontSize: "2rem" }} />
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{ fontWeight: "bold", textDecoration: "none", color: "primary.main" }}
          >
            QuizCraft
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
          <Tooltip title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton sx={{ ml: 1 }} onClick={toggleThemeMode} color="inherit">
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 500,
              color: "text.primary",
              "&:hover": { bgcolor: "action.hover" },
              px: { xs: 1, sm: 1.5 },
              display: { xs: "none", sm: "inline-flex" }, 
            }}
          >
            Home
          </Button>
          <Button variant="outlined" color="primary" onClick={signOut} sx={{ fontWeight: 600, px: { xs: 1, sm: 1.5 } }}>
            Sign Out
          </Button>
          {userDisplayName && (
            <Tooltip title={userDisplayName}>
              <Avatar sx={{ bgcolor: "primary.main", ml: { xs: 0.5, sm: 1 }, width: 38, height: 38, fontSize: "1rem" }}>
                {getInitials(userDisplayName)}
              </Avatar>
            </Tooltip>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
