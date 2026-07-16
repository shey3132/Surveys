import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { Survey, SurveyResponse, ApiLog, Question } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database file path
const DB_PATH = path.join(process.cwd(), "db.json");

// Initial data structure
interface DbSchema {
  surveys: Survey[];
  responses: SurveyResponse[];
  logs: ApiLog[];
}

const defaultDb: DbSchema = {
  surveys: [
    {
      id: "demo-satisfaction",
      title: "סקר שביעות רצון לקוחות",
      description: "סקר דמו לבדיקת שביעות רצון של הלקוחות מהשירות הטלפוני.",
      createdAt: new Date().toISOString(),
      isOpen: true,
      questions: [
        {
          id: "q1",
          text: "שלום ותודה שהתקשרתם לסקר שביעות הרצון שלנו. נא להקיש את רמת שביעות הרצון שלכם מהשירות: 1 לשביעות רצון גבוהה מאוד, 2 לשביעות רצון בינונית, 3 לשביעות רצון נמוכה.",
          paramName: "Satisfaction",
          type: "digits",
          minDigits: 1,
          maxDigits: 1,
          choices: [
            { value: "1", label: "שביעות רצון גבוהה מאוד" },
            { value: "2", label: "שביעות רצון בינונית" },
            { value: "3", label: "שביעות רצון נמוכה" }
          ]
        },
        {
          id: "q2",
          text: "אנא הקלידו את גילכם ולאחריו סולמית.",
          paramName: "Age",
          type: "digits",
          minDigits: 1,
          maxDigits: 3
        },
        {
          id: "q3",
          text: "נא להקליט הערה קצרה או משוב קולי לאחר השמעת הצפצוף, ובסיום להקיש סולמית.",
          paramName: "VoiceFeedback",
          type: "record"
        }
      ]
    }
  ],
  responses: [],
  logs: []
};

// Database helper functions
function readDb(): DbSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, using default values:", error);
  }
  // If file doesn't exist or is corrupted, write the default database
  writeDb(defaultDb);
  return defaultDb;
}

function writeDb(data: DbSchema): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

// Ensure database file is initialized
readDb();

// ---------------- SURVEY API ROUTES ----------------

// Get all surveys
app.get("/api/surveys", (req, res) => {
  const db = readDb();
  let changed = false;

  db.surveys.forEach((s) => {
    if (s.isOpen !== false && s.expiresAt) {
      const expiry = new Date(s.expiresAt).getTime();
      if (Date.now() > expiry) {
        s.isOpen = false;
        s.isPublished = true; // Auto-publish on close/expiry!
        changed = true;
      }
    }
  });

  if (changed) {
    writeDb(db);
  }

  res.json(db.surveys);
});

// Get single survey
app.get("/api/surveys/:id", (req, res) => {
  const db = readDb();
  const survey = db.surveys.find((s) => s.id === req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  if (survey.isOpen !== false && survey.expiresAt) {
    const expiry = new Date(survey.expiresAt).getTime();
    if (Date.now() > expiry) {
      survey.isOpen = false;
      survey.isPublished = true; // Auto-publish on close/expiry!
      const index = db.surveys.findIndex((s) => s.id === req.params.id);
      db.surveys[index] = survey;
      writeDb(db);
    }
  }

  res.json(survey);
});

// Create new survey
app.post("/api/surveys", (req, res) => {
  const db = readDb();
  const { title, description, questions, durationMinutes } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const expiresAt = durationMinutes && durationMinutes > 0
    ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    : undefined;

  const newSurvey: Survey = {
    id: "survey-" + Math.random().toString(36).substring(2, 9),
    title,
    description: description || "",
    createdAt: new Date().toISOString(),
    questions: questions || [],
    isOpen: true,
    isPublished: false,
    durationMinutes: durationMinutes || undefined,
    expiresAt
  };

  db.surveys.push(newSurvey);
  writeDb(db);
  res.status(201).json(newSurvey);
});

// Update survey
app.put("/api/surveys/:id", (req, res) => {
  const db = readDb();
  const index = db.surveys.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const currentSurvey = db.surveys[index];
  const nextIsOpen = req.body.isOpen !== undefined ? req.body.isOpen : currentSurvey.isOpen;
  let nextIsPublished = req.body.isPublished !== undefined ? req.body.isPublished : currentSurvey.isPublished;

  // If changing from open to closed, auto-publish
  if (currentSurvey.isOpen !== false && nextIsOpen === false) {
    nextIsPublished = true;
  }

  const updatedSurvey: Survey = {
    ...currentSurvey,
    title: req.body.title ?? currentSurvey.title,
    description: req.body.description ?? currentSurvey.description,
    questions: req.body.questions ?? currentSurvey.questions,
    isOpen: nextIsOpen,
    isPublished: nextIsPublished,
    durationMinutes: req.body.durationMinutes ?? currentSurvey.durationMinutes,
    expiresAt: req.body.expiresAt ?? currentSurvey.expiresAt
  };

  db.surveys[index] = updatedSurvey;
  writeDb(db);
  res.json(updatedSurvey);
});

// Delete survey
app.delete("/api/surveys/:id", (req, res) => {
  const db = readDb();
  const surveyIndex = db.surveys.findIndex((s) => s.id === req.params.id);

  if (surveyIndex === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  db.surveys.splice(surveyIndex, 1);
  // Also filter out responses and logs for this survey
  db.responses = db.responses.filter((r) => r.surveyId !== req.params.id);
  db.logs = db.logs.filter((l) => l.surveyId !== req.params.id);

  writeDb(db);
  res.json({ success: true, message: "Survey deleted successfully" });
});

// Toggle survey open/closed
app.put("/api/surveys/:id/toggle", (req, res) => {
  const db = readDb();
  const index = db.surveys.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const currentSurvey = db.surveys[index];
  currentSurvey.isOpen = currentSurvey.isOpen === false ? true : false;
  
  // If we closed the survey, automatically publish results
  if (currentSurvey.isOpen === false) {
    currentSurvey.isPublished = true;
  }

  // If we open it, we should reset expired status if there was an expiresAt
  if (currentSurvey.isOpen && currentSurvey.expiresAt) {
    const isPast = new Date() > new Date(currentSurvey.expiresAt);
    if (isPast) {
      // Extend timer by original duration or 30 minutes if reopened
      const dur = currentSurvey.durationMinutes || 30;
      currentSurvey.expiresAt = new Date(Date.now() + dur * 60 * 1000).toISOString();
    }
  }

  db.surveys[index] = currentSurvey;
  writeDb(db);
  res.json(currentSurvey);
});

// Toggle survey results publication
app.put("/api/surveys/:id/toggle-publish", (req, res) => {
  const db = readDb();
  const index = db.surveys.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const currentSurvey = db.surveys[index];
  currentSurvey.isPublished = currentSurvey.isPublished === true ? false : true;

  db.surveys[index] = currentSurvey;
  writeDb(db);
  res.json(currentSurvey);
});

// Extend survey timer
app.post("/api/surveys/:id/extend", (req, res) => {
  const db = readDb();
  const index = db.surveys.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const { minutes } = req.body;
  if (!minutes || typeof minutes !== "number") {
    return res.status(400).json({ error: "Minutes parameter is required and must be a number" });
  }

  const currentSurvey = db.surveys[index];
  const currentExpiry = currentSurvey.expiresAt ? new Date(currentSurvey.expiresAt).getTime() : Date.now();
  // Extend based on current expiry or now, whichever is larger (to handle extending already expired timers)
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
  currentSurvey.expiresAt = new Date(baseTime + minutes * 60 * 1000).toISOString();
  currentSurvey.isOpen = true; // Make sure it's open if we extend it

  db.surveys[index] = currentSurvey;
  writeDb(db);
  res.json(currentSurvey);
});

// Get responses for a specific survey
app.get("/api/surveys/:id/responses", (req, res) => {
  const db = readDb();
  const surveyResponses = db.responses.filter((r) => r.surveyId === req.params.id);
  res.json(surveyResponses);
});

// Delete a specific response
app.delete("/api/responses/:id", (req, res) => {
  const db = readDb();
  const index = db.responses.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Response not found" });
  }
  db.responses.splice(index, 1);
  writeDb(db);
  res.json({ success: true });
});

// Get API logs for a specific survey
app.get("/api/surveys/:id/logs", (req, res) => {
  const db = readDb();
  const surveyLogs = db.logs.filter((l) => l.surveyId === req.params.id);
  res.json(surveyLogs.reverse().slice(0, 50)); // Return latest 50 logs
});

// Clear logs for a specific survey
app.delete("/api/surveys/:id/logs", (req, res) => {
  const db = readDb();
  db.logs = db.logs.filter((l) => l.surveyId !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

// ---------------- YEMOT HASHAMA WEBHOOK ENDPOINT ----------------

function sanitizeYemotText(text: string): string {
  if (!text) return "";
  // Keep only Hebrew letters, English letters, digits, and spaces. Remove all other symbols/punctuation.
  const regex = /[^a-zA-Z0-9\u0590-\u05FF\s]/g;
  return text.replace(regex, " ").replace(/\s+/g, " ").trim();
}

function handleYemotRequest(req: express.Request, res: express.Response) {
  const surveyId = req.params.surveyId;
  const db = readDb();

  // Find the survey
  const survey = db.surveys.find((s) => s.id === surveyId);
  if (!survey) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const sanitizedError = sanitizeYemotText("הסקר המבוקש לא נמצא במערכת");
    return res.send(`read=t-${sanitizedError}`);
  }

  // Check if survey is open or timer expired
  let isOpen = survey.isOpen !== false;
  if (survey.expiresAt) {
    const expiry = new Date(survey.expiresAt).getTime();
    if (Date.now() > expiry) {
      isOpen = false;
      if (survey.isOpen !== false) {
        // Automatically save to database that it has expired and auto-publish
        survey.isOpen = false;
        survey.isPublished = true;
        writeDb(db);
      }
    }
  }

  if (!isOpen) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const sanitizedClosed = sanitizeYemotText("הסקר סגור כעת");
    return res.send(`read=t-${sanitizedClosed}`);
  }

  // Yemot Hashama passes parameters via GET (query) or POST (body)
  const params = { ...req.query, ...req.body } as Record<string, string>;

  const apiCallId = params.ApiCallId;
  const apiPhone = params.ApiPhone || "unknown";
  const apiExtension = params.ApiExtension || "unknown";

  if (!apiCallId) {
    // Technical fallback if ApiCallId is missing
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const sanitizedErr = sanitizeYemotText("שגיאה טכנית חסר מזהה שיחה");
    return res.send(`read=t-${sanitizedErr}`);
  }

  // Find or create survey response session
  let responseIndex = db.responses.findIndex(
    (r) => r.surveyId === surveyId && r.apiCallId === apiCallId && !r.completed
  );

  let currentResponse: SurveyResponse;

  if (responseIndex === -1) {
    // This is the FIRST TURN of the call
    currentResponse = {
      id: "resp-" + Math.random().toString(36).substring(2, 9),
      surveyId,
      apiCallId,
      apiPhone,
      createdAt: new Date().toISOString(),
      answers: {},
      completed: false,
      currentQuestionIndex: 0
    };
    db.responses.push(currentResponse);
    responseIndex = db.responses.length - 1;
  } else {
    currentResponse = db.responses[responseIndex];
  }

  let finalPlainResponse = "";

  // If there are no questions in this survey, hang up immediately
  if (!survey.questions || survey.questions.length === 0) {
    currentResponse.completed = true;
    const sanitizedNoQ = sanitizeYemotText("אין שאלות מוגדרות בסקר זה");
    finalPlainResponse = `read=t-${sanitizedNoQ}`;
  } else {
    const currentQuestionIdx = currentResponse.currentQuestionIndex;
    
    // Check if we are receiving an answer from the previous question
    let receivedAnswer = true;
    if (currentQuestionIdx > 0) {
      const prevQuestion = survey.questions[currentQuestionIdx - 1];
      const answerVal = params[prevQuestion.paramName];
      
      if (answerVal !== undefined) {
        currentResponse.answers[prevQuestion.paramName] = answerVal;
      } else {
        // We expected an answer to the previous question but didn't receive it.
        // We will stay on the same question index.
        receivedAnswer = false;
      }
    }

    // Determine the next question to ask
    let questionToAskIdx = currentQuestionIdx;
    if (!receivedAnswer) {
      questionToAskIdx = currentQuestionIdx - 1;
    }

    if (questionToAskIdx < survey.questions.length) {
      const nextQuestion = survey.questions[questionToAskIdx];
      
      // Build the read command
      // Format: read=message=paramName,use_existing,min_digits,max_digits,sec_wait,data_type
      const sanitizedPromptText = sanitizeYemotText(nextQuestion.text);
      const textToPlay = `t-${sanitizedPromptText}`;
      const paramName = nextQuestion.paramName;
      const minDig = nextQuestion.minDigits ?? 1;
      const maxDig = nextQuestion.maxDigits ?? 1;
      
      // Mapping type to Yemot parameters
      let yType = "Numeric";
      let useExisting = "no";
      let secWait = 7;

      if (nextQuestion.type === "record") {
        yType = "record";
        useExisting = "";
      } else if (nextQuestion.type === "voice") {
        yType = "voice";
        useExisting = "no";
      } else {
        // digits/Numeric questions
        yType = "Numeric";
        useExisting = "no";
      }

      finalPlainResponse = `read=${textToPlay}=${paramName},${useExisting},${minDig},${maxDig},${secWait},${yType}`;
      
      // Update next question index in DB
      currentResponse.currentQuestionIndex = questionToAskIdx + 1;
    } else {
      // No more questions! Survey is finished.
      currentResponse.completed = true;
      const sanitizedThanks = sanitizeYemotText("תודה רבה על השתתפותכם בסקר");
      finalPlainResponse = `read=t-${sanitizedThanks}`;
    }
  }

  // Update DB with modified response session
  db.responses[responseIndex] = currentResponse;

  // Add API Log
  const logEntry: ApiLog = {
    id: "log-" + Math.random().toString(36).substring(2, 9),
    surveyId,
    apiCallId,
    phone: apiPhone,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    payload: params,
    response: finalPlainResponse
  };
  db.logs.push(logEntry);

  writeDb(db);

  // Return the plain text response required by Yemot Hashama
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  return res.send(finalPlainResponse);
}

// Support both GET and POST for Yemot webhook
app.get("/api/yemot/survey/:surveyId", handleYemotRequest);
app.post("/api/yemot/survey/:surveyId", handleYemotRequest);


// ---------------- VITE MIDDLEWARE & STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
