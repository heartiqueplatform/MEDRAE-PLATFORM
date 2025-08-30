import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Grab key from Vite-style env
const OPENAI_KEY = process.env.OPENAI_API_KEY;


// Debug log
console.log("🔑 OpenAI API Key Loaded:", OPENAI_KEY ? "✅ Yes" : "❌ No");

// Chat endpoint
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
       messages: [
  { 
    role: "system", 
    content: `The real date is ${new Date().toDateString()} and the real time is ${new Date().toLocaleTimeString()}. Always use this when the user asks about the current date or time.` 
  },
  { role: "user", content: message }
],

      }),
    });

    const data = await response.json();
    console.log("📩 OpenAI raw response:", data);

    if (!data.choices || !data.choices[0]) {
      console.error("❌ OpenAI error:", data.error || "No choices in response");
      return res.status(500).json({ error: data.error || "No response from OpenAI" });
    }

    res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("🔥 Server error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
