"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAuthSession } from "@aws-amplify/auth"
import { useParams, useNavigate, useBeforeUnload, unstable_usePrompt as usePrompt } from "react-router-dom"
import {
  Container,
  Typography,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Box,
  LinearProgress,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  useTheme,
} from "@mui/material"
import TimerIcon from "@mui/icons-material/Timer"
import awsmobile from "./aws-exports"

const useQuizPrompt = (when) => {
  usePrompt({ when, message: "Are you sure you want to leave? Your progress will be lost." })
}

function QuizPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const API_BASE_URL = awsmobile.API_ENDPOINT

  const handleAnswerChange = (questionIndex, option) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: option }))
  }

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setIsQuizActive(false)
    try {
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken?.toString()
      if (!idToken) throw new Error("Unable to retrieve user token.")
      const response = await fetch(`${API_BASE_URL}/quiz/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ answers }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit quiz")
      }
      const result = await response.json()
      navigate(`/results/${result.attempt_id}`)
    } catch (err) {
      console.error("Error submitting quiz:", err)
      setError(`Failed to submit quiz: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [id, answers, navigate, API_BASE_URL])

  useEffect(() => {
    const fetchQuiz = async () => {
      setError(null)
      try {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()
        if (!idToken) throw new Error("Unable to retrieve user token.")
        const response = await fetch(`${API_BASE_URL}/quiz/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        })
        if (!response.ok) {
          let errorMessage = `Failed to fetch quiz (status: ${response.status})`
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch (e) {
            /* Use default */
          }
          throw new Error(errorMessage)
        }
        const data = await response.json()
        setQuiz(data)
        setIsQuizActive(true)
      } catch (err) {
        console.error("Error fetching quiz:", err)
        setError(`Failed to fetch quiz: ${err.message}`)
      }
    }
    fetchQuiz()
  }, [id, API_BASE_URL])

  useEffect(() => {
    if (!isQuizActive) return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, handleSubmit, isQuizActive])

  useQuizPrompt(isQuizActive && !isSubmitting)
  useBeforeUnload(
    useCallback(
      (event) => {
        if (isQuizActive && !isSubmitting) {
          event.preventDefault()
          event.returnValue = "Are you sure you want to leave? Your progress will be lost."
        }
      },
      [isQuizActive, isSubmitting],
    ),
  )

  if (error)
    return (
      <Container sx={{ mt: 4, py: 2 }}>
        <Alert severity="error" variant="filled" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    )
  if (!quiz)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={50} />
      </Box>
    )

  let content
  try {
    const quizContent = quiz.quiz_content
    content = typeof quizContent === "string" ? JSON.parse(quizContent) : quizContent
    if (!Array.isArray(content)) throw new Error("Quiz content is not an array.")
  } catch (e) {
    console.error("Error parsing quiz content:", e)
    return (
      <Container sx={{ mt: 4, py: 2 }}>
        <Alert severity="error" variant="filled">
          Error: Invalid quiz content format.
        </Alert>
      </Container>
    )
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {quiz.topic || "Quiz Challenge"}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", color: timeLeft < 60 ? "error.main" : "text.secondary" }}>
          <TimerIcon sx={{ mr: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {formatTime(timeLeft)}
          </Typography>
        </Box>
      </Paper>
      <LinearProgress
        variant="determinate"
        value={(timeLeft / 600) * 100}
        sx={{ mb: { xs: 3, sm: 4 }, height: 10, borderRadius: 5 }} // Thicker progress bar
        color={timeLeft < 60 ? "error" : "primary"}
      />

      {content.map((q, idx) => (
        <Card
          key={idx}
          elevation={0}
          sx={{
            mb: 3,
            border: 1,
            borderColor: "divider",
            "&:hover": { transform: "none", boxShadow: theme.shadows[2] }, // Subtle hover shadow
          }}
        >
          <CardContent sx={{ paddingBottom: 1.5 }}>
            {" "}
            {/* Use theme spacing, 1.5 * 8px = 12px */}
            <Typography variant="h6" component="div" sx={{ mb: 2, fontWeight: 500 }}>
              <Box component="span" sx={{ color: "text.secondary", mr: 1, fontWeight: 400 }}>
                {idx + 1}/{content.length}
              </Box>
              {q.question}
            </Typography>
            <RadioGroup
              name={`q${idx}`}
              value={answers[idx] || ""}
              onChange={(e) => handleAnswerChange(idx, e.target.value)}
            >
              {q.options.map((opt, i) => (
                <FormControlLabel
                  key={i}
                  value={opt}
                  control={<Radio />}
                  label={<Typography variant="body1">{opt}</Typography>}
                  disabled={isSubmitting}
                  sx={{
                    mb: 1,
                    p: 1.5, 
                    borderRadius: 1.5,
                    width: "100%",
                    transition: "background-color 0.2s",
                    "&:hover": { backgroundColor: "action.hover" },
                    "&.Mui-selected, &.Mui-checked": {
                    },
                    "& .MuiRadio-root": {
                      // color: 'primary.main',
                    },
                  }}
                />
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}
      {error && (
        <Alert severity="error" variant="filled" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(answers).length !== content.length}
          sx={{ minWidth: { xs: "80%", sm: 280 }, py: 1.5, fontSize: "1.1rem" }}
          startIcon={isSubmitting ? <CircularProgress size={24} color="inherit" /> : null}
        >
          {isSubmitting ? "Submitting..." : "Submit Quiz"}
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 1.5, height: "20px", color: "text.secondary" }}>
          {Object.keys(answers).length !== content.length ? "Please answer all questions to submit." : ""}
        </Typography>
      </Box>
    </Container>
  )
}

export default QuizPage
