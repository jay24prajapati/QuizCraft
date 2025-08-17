"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { fetchAuthSession } from "@aws-amplify/auth"
import { Link as RouterLink } from "react-router-dom"
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Divider,
  Paper,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Modal,
  IconButton,
  Tabs,
  Tab,
  styled,
  useTheme,
  Fade,
  Grow,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import RefreshIcon from "@mui/icons-material/Refresh"
import PendingActionsIcon from "@mui/icons-material/PendingActions"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import LightbulbIcon from "@mui/icons-material/Lightbulb"
import ArticleIcon from "@mui/icons-material/Article"
import TopicIcon from "@mui/icons-material/Topic"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import VisibilityIcon from "@mui/icons-material/Visibility"
import CloseIcon from "@mui/icons-material/Close"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import HighlightOffIcon from "@mui/icons-material/HighlightOff"
import CloudUploadIcon from "@mui/icons-material/CloudUpload"
import PlaylistAddCheck from "@mui/icons-material/PlaylistAddCheck"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import AutorenewIcon from "@mui/icons-material/Autorenew"

import awsmobile from "./aws-exports"

const DropzoneContainer = styled("div")(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3, 2),
  textAlign: "center",
  cursor: "pointer",
  backgroundColor: isDragActive
    ? theme.palette.action.hover
    : theme.palette.mode === "light"
      ? theme.palette.grey[50]
      : theme.palette.grey[900],
  transition: "background-color 0.2s ease-in-out, border-color 0.2s ease-in-out",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 180,
  "&:hover": {
    borderColor: theme.palette.primary.light,
    backgroundColor: theme.palette.action.hover,
  },
}))

const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3, 0),
}))

function QuizList() {
  const [quizzes, setQuizzes] = useState([])
  const [groupedQuizzes, setGroupedQuizzes] = useState({})
  const [userAttempts, setUserAttempts] = useState([])
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false)
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false)
  const [file, setFile] = useState(null)
  const [topic, setTopic] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [notification, setNotification] = useState({ open: false, message: "", severity: "info" })
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(null)
  const fileInputRef = useRef(null)
  const API_BASE_URL = awsmobile.API_ENDPOINT
  const theme = useTheme()

  const [generationTab, setGenerationTab] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState("")
  const [dialogTopicId, setDialogTopicId] = useState(null)

  const [openAttemptModal, setOpenAttemptModal] = useState(false)
  const [selectedAttemptDetails, setSelectedAttemptDetails] = useState(null)
  const [isAttemptModalLoading, setIsAttemptModalLoading] = useState(false)

  const fetchQuizzesAndAttempts = useCallback(
    async (showAutoRefreshIndicator = false, isNewQuiz = false) => {
      if (showAutoRefreshIndicator) {
        setIsAutoRefreshing(true)
      } else {
        setIsLoadingQuizzes(true)
        setIsLoadingAttempts(true)
      }

      try {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()
        if (!idToken) throw new Error("Unable to retrieve user token.")

        const quizResponse = await fetch(`${API_BASE_URL}/quiz`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        })
        if (!quizResponse.ok) {
          const errorData = await quizResponse.json()
          throw new Error(errorData.error || "Failed to fetch quizzes")
        }
        const quizData = await quizResponse.json()

        const sortedQuizzes = (quizData.quizzes || []).sort((a, b) => {
          const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0
          const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0
          if (createdAtA !== createdAtB) {
            return createdAtB - createdAtA
          }
          return (b.quiz_id || "").localeCompare(a.quiz_id || "")
        })

        setQuizzes(sortedQuizzes)

        const grouped = sortedQuizzes.reduce((acc, quiz) => {
          const { topic_id, topic_name } = quiz
          if (!acc[topic_id]) {
            acc[topic_id] = { topic_name, quizzes: [] }
          }
          acc[topic_id].quizzes.push(quiz)
          return acc
        }, {})
        setGroupedQuizzes(grouped)
      } catch (error) {
        console.error("Error fetching quizzes:", error)
        if (!showAutoRefreshIndicator) {
          setNotification({ open: true, message: `Failed to fetch quizzes: ${error.message}`, severity: "error" })
        }
      } finally {
        if (showAutoRefreshIndicator) {
          setIsAutoRefreshing(false)
        } else {
          setIsLoadingQuizzes(false)
        }
      }

      try {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()
        if (!idToken) throw new Error("Unable to retrieve user token for attempts.")

        const attemptResponse = await fetch(`${API_BASE_URL}/profile`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        })
        if (!attemptResponse.ok) {
          const errorData = await attemptResponse.json()
          throw new Error(errorData.error || "Failed to fetch attempts")
        }
        const attemptData = await attemptResponse.json()
        setUserAttempts(attemptData.attempts || [])
      } catch (error) {
        console.error("Error fetching attempts:", error)
        if (!showAutoRefreshIndicator) {
          setNotification({ open: true, message: `Failed to fetch attempts: ${error.message}`, severity: "error" })
        }
      } finally {
        if (!showAutoRefreshIndicator) {
          setIsLoadingAttempts(false)
        }
      }
    },
    [API_BASE_URL],
  )

  useEffect(() => {
    fetchQuizzesAndAttempts()
  }, [fetchQuizzesAndAttempts])

  useEffect(() => {
    const hasProcessingQuizzes = quizzes.some((quiz) => quiz.status === "pending" || quiz.status === "processing")

    if (hasProcessingQuizzes && !pollingInterval) {
      const interval = setInterval(() => {
        fetchQuizzesAndAttempts(true)
      }, 3000)
      setPollingInterval(interval)
    } else if (!hasProcessingQuizzes && pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [quizzes, pollingInterval, fetchQuizzesAndAttempts])

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setNotification({ open: true, message: "File size exceeds 5MB limit.", severity: "warning" })
        return
      }
      if (selectedFile.type !== "application/pdf") {
        setNotification({ open: true, message: "Invalid file type. Only PDF is allowed.", severity: "warning" })
        return
      }
      setFile(selectedFile)
      setTopic("")
    }
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleTopicChange = (event) => {
    setTopic(event.target.value)
    if (file) {
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = null
    }
  }

  const handleGenerateQuiz = async (regenerate = false, topicId = null) => {
    const currentGenerationMode = generationTab === 0 ? "pdf" : "topic";
    if (
      !regenerate &&
      ((currentGenerationMode === "pdf" && !file) ||
        (currentGenerationMode === "topic" && !topic.trim()))
    ) {
      setNotification({
        open: true,
        message: "Please provide input for the selected generation method.",
        severity: "warning",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) throw new Error("Unable to retrieve user token.");

      let body;
      let headers = { Authorization: `Bearer ${idToken}` };
      if (regenerate && topicId) {
        body = { regenerate: true, topic_id: topicId };
        headers["Content-Type"] = "application/json";
      } else if (currentGenerationMode === "pdf" && file) {
        const formData = new FormData();
        formData.append("pdf", file);
        body = formData;
        // Do not set Content-Type manually; fetch will set it with the boundary
        console.log("Sending PDF with FormData field 'pdf':", file.name); // Debugging
      } else if (currentGenerationMode === "topic" && topic.trim()) {
        body = { topic: topic.trim() };
        headers["Content-Type"] = "application/json";
      } else {
        throw new Error("Invalid generation mode or missing input.");
      }

      const response = await fetch(`${API_BASE_URL}/quiz`, {
        method: "POST",
        headers: headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.topic_id) {
          setDialogMessage(errorData.error);
          setDialogTopicId(errorData.topic_id);
          setDialogOpen(true);
        } else {
          throw new Error(errorData.error || "Failed to generate quiz");
        }
      } else {
        await response.json();
        setNotification({
          open: true,
          message: "Quiz generation started! We'll automatically update the status.",
          severity: "success",
        });
        setTimeout(() => fetchQuizzesAndAttempts(false, true), 500);
        setTimeout(() => fetchQuizzesAndAttempts(true, true), 2000);
        setTimeout(() => fetchQuizzesAndAttempts(true, true), 5000);
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      setNotification({
        open: true,
        message: `Failed to generate quiz: ${error.message}`,
        severity: "error",
      });
    } finally {
      setIsGenerating(false);
      if (!regenerate) {
        setFile(null);
        setTopic("");
        if (fileInputRef.current) fileInputRef.current.value = null;
      }
    }
  };

  const handleRegenerateConfirm = () => {
    setDialogOpen(false)
    handleGenerateQuiz(true, dialogTopicId)
  }

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) return
    try {
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken?.toString()
      if (!idToken) throw new Error("Unable to retrieve user token.")
      const response = await fetch(`${API_BASE_URL}/quiz/${quizId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete quiz")
      }
      setNotification({ open: true, message: "Quiz deleted successfully!", severity: "success" })
      fetchQuizzesAndAttempts()
    } catch (error) {
      console.error("Error deleting quiz:", error)
      setNotification({ open: true, message: `Failed to delete quiz: ${error.message}`, severity: "error" })
    }
  }

  const getStatusChip = (status) => {
    switch (status) {
      case "completed":
        return (
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label="Ready"
            sx={{
              bgcolor: "success.main",
              color: "success.contrastText",
              fontWeight: 600,
              borderRadius: 2,
              "& .MuiChip-icon": { color: "success.contrastText" },
            }}
          />
        )
      case "pending":
      case "processing":
        return (
          <Chip
            icon={<CircularProgress size={16} color="inherit" />}
            label="Processing"
            sx={{
              bgcolor: "info.main",
              color: "info.contrastText",
              fontWeight: 600,
              borderRadius: 2,
            }}
          />
        )
      case "failed":
        return (
          <Chip
            icon={<ErrorOutlineIcon fontSize="small" />}
            label="Failed"
            sx={{
              bgcolor: "error.main",
              color: "error.contrastText",
              fontWeight: 600,
              borderRadius: 2,
              "& .MuiChip-icon": { color: "error.contrastText" },
            }}
          />
        )
      default:
        return <Chip label={status || "Unknown"} variant="outlined" />
    }
  }

  const handleCloseNotification = (event, reason) => {
    if (reason === "clickaway") return
    setNotification({ ...notification, open: false })
  }

  const handleOpenAttemptModal = async (attemptId) => {
    setIsAttemptModalLoading(true)
    setOpenAttemptModal(true)
    try {
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken?.toString()
      const response = await fetch(`${API_BASE_URL}/attempt/${attemptId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      })
      if (!response.ok) throw new Error("Failed to fetch attempt details")
      const data = await response.json()
      setSelectedAttemptDetails(data)
    } catch (err) {
      console.error("Error fetching attempt details:", err)
      setNotification({ open: true, message: `Failed to fetch attempt details: ${err.message}`, severity: "error" })
      setOpenAttemptModal(false)
    } finally {
      setIsAttemptModalLoading(false)
    }
  }

  const handleCloseAttemptModal = () => {
    setOpenAttemptModal(false)
    setSelectedAttemptDetails(null)
  }

  const handleTabChange = (event, newValue) => {
    setGenerationTab(newValue)
    setFile(null)
    setTopic("")
    if (fileInputRef.current) fileInputRef.current.value = null
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 0, px: { xs: 1, sm: 2 }, overflowY: "auto", minHeight: "100vh" }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 3, border: 1, borderColor: "divider" }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "medium", mb: 2, textAlign: "left" }}>
          Create a New Quiz
        </Typography>
        <Tabs
          value={generationTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<ArticleIcon />} iconPosition="start" label="From PDF Document" />
          <Tab icon={<TopicIcon />} iconPosition="start" label="From a Topic" />
        </Tabs>

        <Fade in={generationTab === 0} timeout={300} unmountOnExit>
          <StyledTabPanel>
            <DropzoneContainer
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragActive={isDragActive}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf"
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
              <CloudUploadIcon sx={{ fontSize: { xs: 40, sm: 50 }, color: "primary.main", mb: 1.5 }} />
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}>
                {file ? file.name : "Drag & drop PDF here, or click"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Max file size: 5MB. Only .pdf files.
              </Typography>
            </DropzoneContainer>
          </StyledTabPanel>
        </Fade>

        <Fade in={generationTab === 1} timeout={300} unmountOnExit>
          <StyledTabPanel>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <LightbulbIcon sx={{ fontSize: { xs: 40, sm: 50 }, color: "primary.main", mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Describe Your Quiz Topic
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Quiz Topic"
              multiline
              rows={4}
              placeholder="e.g., The Renaissance Period, Quantum Physics Basics, Culinary Arts of France"
              value={topic}
              onChange={handleTopicChange}
              sx={{ mt: 1 }}
            />
          </StyledTabPanel>
        </Fade>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => handleGenerateQuiz()}
            disabled={isGenerating || (generationTab === 0 && !file) || (generationTab === 1 && !topic.trim())}
            startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ minWidth: { xs: 150, sm: 200 } }}
          >
            {isGenerating ? "Generating..." : "Generate Quiz"}
          </Button>
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Duplicate Detected</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRegenerateConfirm} color="primary">Regenerate Quiz</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: "left", fontWeight: "medium", mb: 0 }}>
          Your Quizzes
        </Typography>
        <Button
          variant="outlined"
          onClick={() => fetchQuizzesAndAttempts()}
          disabled={isLoadingQuizzes || isLoadingAttempts}
          startIcon={
            isLoadingQuizzes || isLoadingAttempts ? (
              <CircularProgress size={20} />
            ) : isAutoRefreshing ? (
              <CircularProgress size={20} color="success" />
            ) : (
              <RefreshIcon />
            )
          }
          sx={{
            ...(isAutoRefreshing && {
              color: "success.main",
              borderColor: "success.main",
            }),
          }}
        >
          {isAutoRefreshing ? "Auto-updating..." : "Refresh"}
        </Button>
      </Box>

      {(isLoadingQuizzes || isLoadingAttempts) && quizzes.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : Object.keys(groupedQuizzes).length === 0 ? (
        <Paper
          sx={{
            p: 3,
            textAlign: "center",
            mt: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <PlaylistAddCheck sx={{ fontSize: 60, color: "text.secondary" }} />
          <Typography variant="h6" color="text.secondary">
            No quizzes created yet.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0 }}>
            Use the section above to generate your first quiz!
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ width: "100%", overflowY: "auto" }}>
          {Object.entries(groupedQuizzes).map(([topicId, { topic_name, quizzes }], index) => (
            <Box key={topicId} sx={{ mb: 4 }}>
              <Grow in={true} timeout={300 + index * 50}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${
                      theme.palette.mode === "light" ? "#fafafa" : "#1a1a1a"
                    } 100%)`,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {topic_name}
                  </Typography>
                </Paper>
              </Grow>
              {quizzes.map((quiz, idx) => {
                const relevantAttempts = userAttempts
                  .filter((attempt) => attempt.quiz_id === quiz.quiz_id)
                  .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))

                const getStatusIcon = (status) => {
                  switch (status) {
                    case "completed":
                      return <CheckCircleIcon sx={{ fontSize: 24, color: "success.main" }} />
                    case "pending":
                    case "processing":
                      return <PendingActionsIcon sx={{ fontSize: 24, color: "info.main" }} />
                    case "failed":
                      return <ErrorOutlineIcon sx={{ fontSize: 24, color: "error.main" }} />
                    default:
                      return <TopicIcon sx={{ fontSize: 24, color: "text.secondary" }} />
                  }
                }

                const getBestScore = () => {
                  if (relevantAttempts.length === 0) return null
                  return Math.max(...relevantAttempts.map((a) => Math.round((a.score / a.total_questions) * 100)))
                }

                const bestScore = getBestScore()

                return (
                  <Box key={quiz.quiz_id} sx={{ width: "100%", mb: 2 }}>
                    <Grow in={true} timeout={300 + (index * quizzes.length + idx) * 50}>
                      <Card
                        elevation={0}
                        sx={{
                          width: "100%",
                          border: 2,
                          borderColor: "divider",
                          borderRadius: 3,
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${
                            theme.palette.mode === "light" ? "#fafafa" : "#1a1a1a"
                          } 100%)`,
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: `0 8px 24px ${
                              theme.palette.mode === "light" ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.25)"
                            }`,
                            borderColor: "primary.main",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            height: 4,
                            backgroundColor:
                              quiz.status === "completed"
                                ? theme.palette.success.main
                                : quiz.status === "failed"
                                  ? theme.palette.error.main
                                  : theme.palette.info.main,
                            borderRadius: "12px 12px 0 0",
                          }}
                        />
                        <CardContent sx={{ p: 3 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 2,
                              minHeight: 48,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", flex: 1, mr: 2, minWidth: 0 }}>
                              <Box sx={{ mr: 2, flexShrink: 0 }}>{getStatusIcon(quiz.status)}</Box>
                              <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                  fontWeight: 600,
                                  color: "text.primary",
                                  fontSize: { xs: "1.1rem", sm: "1.25rem" },
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                Quiz {idx + 1}
                              </Typography>
                            </Box>
                            <Box sx={{ flexShrink: 0 }}>{getStatusChip(quiz.status)}</Box>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              mb: 2,
                              pl: 5,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {quiz.attempt_count || 0} attempt{(quiz.attempt_count || 0) !== 1 ? "s" : ""}
                            </Typography>
                            {bestScore !== null && (
                              <>
                                <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "divider" }} />
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <EmojiEventsIcon sx={{ fontSize: 16, color: "warning.main" }} />
                                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                                    Best: {bestScore}%
                                  </Typography>
                                </Box>
                              </>
                            )}
                          </Box>

                          {quiz.status === "failed" && (
                            <Alert
                              severity="error"
                              variant="filled"
                              sx={{
                                borderRadius: 2,
                                mb: 2,
                                ml: 5,
                                "& .MuiAlert-icon": { fontSize: 18 },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {quiz.error_message || "Quiz generation failed. Please try again."}
                              </Typography>
                            </Alert>
                          )}

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              pt: 2,
                              borderTop: 1,
                              borderColor: "divider",
                              ml: 5,
                            }}
                          >
                            <Box sx={{ display: "flex", gap: 2 }}>
                              <Button
                                component={RouterLink}
                                to={`/quiz/${quiz.quiz_id}`}
                                variant="contained"
                                color="primary"
                                size="medium"
                                startIcon={<PlayArrowIcon />}
                                disabled={quiz.status !== "completed"}
                                sx={{
                                  borderRadius: 2,
                                  px: 3,
                                  py: 1,
                                  fontWeight: 600,
                                  textTransform: "none",
                                  boxShadow: "none",
                                  "&:hover": {
                                    boxShadow: `0 4px 12px ${theme.palette.primary.main}30`,
                                  },
                                }}
                              >
                                {quiz.status === "completed" ? "Take Quiz" : "Processing..."}
                              </Button>
                              <Button
                                variant="outlined"
                                color="secondary"
                                size="medium"
                                startIcon={<AutorenewIcon />}
                                onClick={() => handleGenerateQuiz(true, quiz.topic_id)}
                                disabled={isGenerating}
                                sx={{
                                  borderRadius: 2,
                                  px: 3,
                                  py: 1,
                                  fontWeight: 600,
                                  textTransform: "none",
                                }}
                              >
                                Regenerate
                              </Button>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              {relevantAttempts.length > 0 && (
                                <Chip
                                  label={`${relevantAttempts.length} attempt${relevantAttempts.length !== 1 ? "s" : ""}`}
                                  variant="outlined"
                                  size="small"
                                  sx={{ borderRadius: 1.5, fontWeight: 500 }}
                                />
                              )}
                              <Tooltip title="Delete Quiz" arrow>
                                <IconButton
                                  color="error"
                                  onClick={() => handleDeleteQuiz(quiz.quiz_id)}
                                  size="medium"
                                  sx={{
                                    borderRadius: 2,
                                    "&:hover": {
                                      backgroundColor: "error.main",
                                      color: "error.contrastText",
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>

                        {relevantAttempts.length > 0 && (
                          <Accordion
                            disableGutters
                            elevation={0}
                            sx={{
                              borderTop: 1,
                              borderColor: "divider",
                              "&.MuiAccordion-root": {
                                borderRadius: "0 0 12px 12px",
                                margin: 0,
                                backgroundColor: "transparent",
                              },
                              "&.MuiAccordion-root:before": { display: "none" },
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              sx={{
                                px: 3,
                                py: 2,
                                "&:hover": { backgroundColor: theme.palette.action.hover },
                                "& .MuiAccordionSummary-content": { alignItems: "center" },
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <VisibilityIcon sx={{ fontSize: 20, color: "primary.main" }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  View Attempt History ({relevantAttempts.length})
                                </Typography>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0, maxHeight: 250, overflowY: "auto" }}>
                              <List dense>
                                {relevantAttempts.map((attempt, idx) => (
                                  <ListItem
                                    key={attempt.attempt_id}
                                    secondaryAction={
                                      <IconButton
                                        edge="end"
                                        onClick={() => handleOpenAttemptModal(attempt.attempt_id)}
                                        sx={{ color: "primary.main" }}
                                      >
                                        <VisibilityIcon fontSize="small" />
                                      </IconButton>
                                    }
                                    sx={{
                                      borderBottom:
                                        idx < relevantAttempts.length - 1 ? `1px solid ${theme.palette.divider}` : "none",
                                      "&:hover": { backgroundColor: theme.palette.action.hover },
                                    }}
                                  >
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            Score: {attempt.score}/{attempt.total_questions}
                                          </Typography>
                                          <Chip
                                            label={`${Math.round((attempt.score / attempt.total_questions) * 100)}%`}
                                            size="small"
                                            sx={{
                                              bgcolor:
                                                attempt.score / attempt.total_questions >= 0.7
                                                  ? "success.main"
                                                  : attempt.score / attempt.total_questions >= 0.4
                                                    ? "warning.main"
                                                    : "error.main",
                                              color: "white",
                                              fontWeight: 600,
                                              height: 20,
                                            }}
                                          />
                                        </Box>
                                      }
                                      secondary={attempt.timestamp ? new Date(attempt.timestamp).toLocaleString() : ""}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        )}
                      </Card>
                    </Grow>
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      )}

      <Modal open={openAttemptModal} onClose={handleCloseAttemptModal} aria-labelledby="attempt-details-title">
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: 600, md: 700 },
            maxHeight: "90vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" id="attempt-details-title" sx={{ fontWeight: 600 }}>
              Attempt Details
            </Typography>
            <IconButton onClick={handleCloseAttemptModal} aria-label="Close modal">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: { xs: 2, sm: 3 }, overflowY: "auto", flexGrow: 1 }}>
            {isAttemptModalLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              selectedAttemptDetails && (
                <>
                  <Typography variant="h5" gutterBottom sx={{ color: "primary.main", fontWeight: 600 }}>
                    Score: {selectedAttemptDetails.score} / {selectedAttemptDetails.total_questions}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {selectedAttemptDetails.questions.map((q, idx) => {
                    const userAnswer = selectedAttemptDetails.user_answers[String(idx)]
                    const correctAnswer = selectedAttemptDetails.correct_answers[String(idx)]
                    const isCorrect = userAnswer === correctAnswer
                    return (
                      <Paper
                        key={idx}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mt: 2,
                          borderColor: isCorrect ? "success.main" : "error.main",
                          borderWidth: "1.5px",
                          borderRadius: 1.5,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          {isCorrect ? (
                            <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
                          ) : (
                            <HighlightOffIcon color="error" sx={{ mr: 1 }} />
                          )}
                          <Typography variant="subtitle1" component="div" sx={{ fontWeight: "medium" }}>
                            Q{idx + 1}: {q.question}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ pl: 3.5, color: isCorrect ? "success.dark" : "error.dark" }}>
                          Your Answer:{" "}
                          <Box component="span" sx={{ fontWeight: "medium" }}>
                            {userAnswer || "No answer"}
                          </Box>
                        </Typography>
                        {!isCorrect && (
                          <Typography variant="body2" sx={{ pl: 3.5, color: "success.dark" }}>
                            Correct Answer:{" "}
                            <Box component="span" sx={{ fontWeight: "medium" }}>
                              {correctAnswer}
                            </Box>
                          </Typography>
                        )}
                      </Paper>
                    )
                  })}
                </>
              )
            )}
          </Box>
        </Paper>
      </Modal>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default QuizList