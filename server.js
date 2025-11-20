import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== Gemini 初始化 ======
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

// ====== 前端頁面（整合版） ======
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8" />
<title>AI 行事曆分析系統</title>
<style>
  body { font-family: sans-serif; padding: 20px; background: #f1f1f1; }
  #chat { width: 100%; max-width: 600px; margin: auto; }
  .msg { padding: 10px; background: white; margin: 10px 0; border-radius: 8px; }
  .ai { border-left: 4px solid #3b82f6; }
</style>
</head>
<body>
<h2>AI 行事曆分析系統</h2>

<div id="chat"></div>

<input id="message" placeholder="輸入訊息…" style="width:75%" />
<input type="file" id="imageInput" accept="image/*" />
<button onclick="send()">送出</button>

<script>
async function send() {
  const msg = document.getElementById("message").value;
  const img = document.getElementById("imageInput").files[0];

  const formData = new FormData();
  formData.append("message", msg);
  if (img) formData.append("image", img);

  const res = await fetch("/api/chat", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("chat").innerHTML += 
    '<div class="msg ai">' + data.reply + '</div>';

  document.getElementById("message").value = "";
  document.getElementById("imageInput").value = "";
}
</script>

</body>
</html>
  `);
});

// ====== 核心 API：圖片 + 文字 ======
app.post("/api/chat", upload.single("image"), async (req, res) => {
  try {
    const userMessage = req.body.message || "";
    const imageFile = req.file;

    const parts = [];

    if (userMessage) {
      parts.push({ text: userMessage });
    }

    if (imageFile) {
      parts.push({
        inlineData: {
          mimeType: imageFile.mimetype,
          data: imageFile.buffer.toString("base64"),
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ====== Render / 本地啟動 ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("伺服器已啟動 Port:", PORT));
