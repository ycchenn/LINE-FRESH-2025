const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { OpenAI } = require('openai');

// 初始化 Groq (使用 OpenAI 的 SDK 轉接)
const groq = new OpenAI({
    apiKey: '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', 
    baseURL: "https://api.groq.com/openai/v1" 
});

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DB_PATH = path.join(__dirname, "db.json");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

function loadDb() {
  if (!fs.existsSync(DB_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); }
  catch { return {}; }
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

let db = loadDb(); // { [id]: entry }

function nowIso() { return new Date().toISOString(); }
function genId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `e_${ts}_${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

/**
 * POST /v1/entries
 * form-data: audio(file), demoMode(true/false optional)
 */
app.post("/v1/entries", upload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "audio file is required" });

  const id = genId();
  const demoMode = (req.body?.demoMode ?? "true") !== "false";

  const entry = {
    id,
    createdAt: nowIso(),
    status: "UPLOADED",
    audio: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      localPath: path.join("uploads", req.file.filename)
    },
    transcript: null,
    ai: { summary3: [], emotion: null, quickReplies: [] },
    reply: { text: null, sentAt: null },
    notification: { text: null, sentAt: null },
    meta: { demoMode, processingMs: null }
  };

  db[id] = entry;
  saveDb(db);
  res.json({ id, status: entry.status });
});

/**
 * POST /v1/entries/:id/process
 * 真實 AI 處理：Groq Whisper 轉文字 + Groq Llama 3 摘要
 */
app.post("/v1/entries/:id/process", async (req, res) => {
  const { id } = req.params;
  const entry = db[id];
  if (!entry) return res.status(404).json({ error: "entry not found" });

  // 1. 進入處理中狀態
  entry.status = "PROCESSING";
  saveDb(db);
  const t0 = Date.now();

  try {
    console.log(`[Groq AI] 正在為 ID: ${id} 啟動真 AI 引擎...`);

    // 2. 語音轉文字 (Whisper-large-v3)
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(entry.audio.localPath),
      model: "whisper-large-v3",
      language: "zh", 
    });

    entry.transcript = transcription.text;
    console.log(`[Groq AI] 逐字稿完成: ${entry.transcript}`);

    // 3. LLM 摘要與分析 (Llama-3-8b)
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `你是一個溫暖的長輩關懷小助手。
          請將長輩的語音逐字稿轉化為晚輩易讀的摘要，並以「繁體中文」回傳 JSON。
          格式包含：
          - emotion: 情緒（例如：開心、擔心、平靜、寂寞）
          - summary3: 三行重點清單
          - quickReplies: 三個適合晚輩回覆長輩的溫馨短語`
        },
        { role: "user", content: `這是長輩說的話：${entry.transcript}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    // 4. 解析 AI 回傳的 JSON
    const aiResult = JSON.parse(chatCompletion.choices[0].message.content);
    
    // 5. 更新資料庫
    entry.ai = aiResult;
    entry.status = "READY";
    entry.meta.processingMs = Date.now() - t0;
    saveDb(db);

    console.log("[Groq AI] 全流程處理成功！");
    return res.json({ id, status: entry.status, ai: entry.ai });

  } catch (error) {
    console.error("[Groq AI 錯誤]:", error);
    entry.status = "FAILED";
    entry.meta.error = error.message;
    saveDb(db);
    return res.status(500).json({ error: "AI 處理失敗", detail: error.message });
  }
});

/**
 * GET /v1/entries/:id
 */
app.get("/v1/entries/:id", (req, res) => {
  const entry = db[req.params.id];
  if (!entry) return res.status(404).json({ error: "entry not found" });
  res.json(entry);
});

/**
 * POST /v1/entries/:id/reply
 * body: { text: string }
 */
app.post("/v1/entries/:id/reply", (req, res) => {
  const entry = db[req.params.id];
  if (!entry) return res.status(404).json({ error: "entry not found" });

  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  entry.reply.text = text;
  entry.reply.sentAt = nowIso();
  entry.status = "REPLIED";

  entry.notification.text = "孩子已回應 ❤️";
  entry.notification.sentAt = nowIso();

  saveDb(db);
  res.json({
    id: entry.id,
    status: entry.status,
    notification: entry.notification
  });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`SweetHome API running on http://localhost:${PORT}`);
});
