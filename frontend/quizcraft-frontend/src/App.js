import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Authenticator } from "@aws-amplify/ui-react"
import "@aws-amplify/ui-react/styles.css" 
import { Amplify } from "aws-amplify"
import awsmobile from "./aws-exports"
import Navbar from "./Navbar"
import QuizList from "./QuizList"
import QuizPage from "./QuizPage"
import ResultsPage from "./ResultsPage"
import { Container, Typography, Box, CircularProgress } from "@mui/material"
import { ThemeModeProvider } from "./ThemeContext"

Amplify.configure(awsmobile)

function AppContent() {
  return (
    <Authenticator
      hideSignUp={false}
      components={{
        Header: () => (
          <Box sx={{ textAlign: "center", py: 3, backgroundColor: "primary.main", color: "primary.contrastText" }}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              QuizCraft
            </Typography>
          </Box>
        ),
      }}
    >
      {({ signOut, user }) => {
        if (!user) {
          return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
              <CircularProgress />
            </Box>
          )
        }

        const router = createBrowserRouter([
          {
            path: "/",
            element: (
              <>
                <Navbar signOut={signOut} user={user} />
                <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 3, md: 4 }, py: 2, textAlign: "center" }}>
                  <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom
                    sx={{ color: "text.primary", mb: 1, fontWeight: 700 }}
                  >
                    Welcome,{" "}
                    <Box component="span" sx={{ color: "primary.main", fontWeight: "bold" }}>
                      {user.attributes?.name || user.username}
                    </Box>
                    !
                  </Typography>
                  <Typography variant="h6" sx={{ color: "text.secondary", mb: { xs: 3, sm: 4 } }}>
                    Craft, conquer, and challenge with AI-powered quizzes.
                  </Typography>
                  <QuizList />
                </Container>
              </>
            ),
          },
          {
            path: "/quiz/:id",
            element: (
              <>
                <Navbar signOut={signOut} user={user} />
                <QuizPage />
              </>
            ),
          },
          {
            path: "/results/:attemptId",
            element: (
              <>
                <Navbar signOut={signOut} user={user} />
                <ResultsPage />
              </>
            ),
          },
        ])

        return <RouterProvider router={router} />
      }}
    </Authenticator>
  )
}

function App() {
  return (
    <ThemeModeProvider>
      <AppContent />
    </ThemeModeProvider>
  )
}

export default App
