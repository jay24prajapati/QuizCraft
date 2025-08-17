"use client"

import { useState, useEffect } from "react"
import { fetchAuthSession } from "@aws-amplify/auth"
import { useParams, Link as RouterLink } from "react-router-dom"
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  useTheme,
} from "@mui/material"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import HighlightOffIcon from "@mui/icons-material/HighlightOff"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import HomeIcon from "@mui/icons-material/Home"
import ReplayIcon from "@mui/icons-material/Replay"
import awsmobile from "./aws-exports"

function ResultsPage() {
  const { attemptId } = useParams()
  const theme = useTheme()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const API_BASE_URL = awsmobile.API_ENDPOINT

  useEffect(() => {
    const fetchResult = async () => {
      setError(null)
      try {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()
        if (!idToken) throw new Error("Unable to retrieve user token.")
        const response = await fetch(`${API_BASE_URL}/attempt/${attemptId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch attempt details")
        }
        const data = await response.json()
        setResult(data)
      } catch (err) {
        console.error("Error fetching attempt:", err)
        setError(`Failed to fetch results: ${err.message}`)
      }
    }
    fetchResult()
  }, [attemptId, API_BASE_URL])

  if (error)
    return (
      <Container sx={{ mt: 4, py: 2 }}>
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
      </Container>
    )
  if (!result)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={50} />
      </Box>
    )

  const { questions, user_answers, correct_answers, score, total_questions, quiz_id } = result
  const percentage = total_questions > 0 ? Math.round((score / total_questions) * 100) : 0

  const getScorePaperStyles = () => {
    if (percentage >= 70) return { backgroundColor: theme.palette.success.light, color: theme.palette.success.dark }
    if (percentage >= 40) return { backgroundColor: theme.palette.warning.light, color: theme.palette.warning.dark }
    return { backgroundColor: theme.palette.error.light, color: theme.palette.error.dark }
  }

  const getScoreIconColor = () => {
    if (percentage >= 70) return theme.palette.success.main
    if (percentage >= 40) return theme.palette.warning.main
    return theme.palette.error.main
  }

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          mb: 4,
          textAlign: "center",
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          ...getScorePaperStyles(),
        }}
      >
        <EmojiEventsIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: getScoreIconColor(), mb: 1.5 }} />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: "text.primary" }}>
          Quiz Results
        </Typography>
        <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 500 }}>
          Your score:{" "}
          <Box component="span" sx={{ fontWeight: "bold" }}>
            {score} / {total_questions}
          </Box>{" "}
          ({percentage}%)
        </Typography>
      </Paper>

      <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Detailed Breakdown
      </Typography>
      {questions.map((q, idx) => {
        const userAnswer = user_answers[String(idx)]
        const correctAnswer = correct_answers[String(idx)]
        const isCorrect = userAnswer === correctAnswer
        return (
          <Card
            key={idx}
            elevation={0}
            sx={{
              mb: 2.5,
              border: 1,
              borderColor: "divider",
              borderLeft: `6px solid ${isCorrect ? theme.palette.success.main : theme.palette.error.main}`,
              "&:hover": { transform: "none", boxShadow: theme.shadows[2] },
              borderRadius: 1.5,
            }}
          >
            <CardContent sx={{ pb: 2 }}>
              {" "}
              {/* Consistent padding */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                {isCorrect ? (
                  <CheckCircleOutlineIcon color="success" sx={{ mr: 1.5, fontSize: "1.8rem" }} />
                ) : (
                  <HighlightOffIcon color="error" sx={{ mr: 1.5, fontSize: "1.8rem" }} />
                )}
                <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                  Q{idx + 1}: {q.question}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 0.5, pl: 4.5, color: "text.secondary" }}>
                Your answer:{" "}
                <Box component="span" sx={{ color: isCorrect ? "success.dark" : "error.dark", fontWeight: "medium" }}>
                  {userAnswer || "No answer"}
                </Box>
              </Typography>
              {!isCorrect && (
                <Typography variant="body1" sx={{ color: "success.dark", pl: 4.5 }}>
                  Correct answer:{" "}
                  <Box component="span" sx={{ fontWeight: "medium" }}>
                    {correctAnswer}
                  </Box>
                </Typography>
              )}
            </CardContent>
          </Card>
        )
      })}
      <Divider sx={{ my: 4 }} />
      <Grid container spacing={2} justifyContent="center">
        {quiz_id && (
          <Grid size={{ xs: 12, sm: "auto" }}>
            <Button
              component={RouterLink}
              to={`/quiz/${quiz_id}`}
              variant="outlined"
              color="primary"
              startIcon={<ReplayIcon />}
              fullWidth={!theme.breakpoints.up("sm")}
              size="large"
            >
              Try Again
            </Button>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: "auto" }}>
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            color="primary"
            startIcon={<HomeIcon />}
            fullWidth={!theme.breakpoints.up("sm")}
            size="large"
          >
            Back to Home
          </Button>
        </Grid>
      </Grid>
    </Container>
  )
}

export default ResultsPage
