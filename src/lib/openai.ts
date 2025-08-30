// src/lib/openai.ts
import axios from "axios";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_PROJECT_ID = import.meta.env.VITE_OPENAI_PROJECT_ID;

const client = axios.create({
  baseURL: "https://api.openai.com/v1",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "OpenAI-Organization": "org-DIBvL7am6XU7eWd7OhTIbHcd",
    "OpenAI-Project": OPENAI_PROJECT_ID,
  },
});

export async function generateResponse(prompt: string) {
  try {
    const res = await client.post("/chat/completions", {
      model: "gpt-3.5-turbo", // or gpt-4 if allowed
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const reply = res.data.choices[0].message.content;
    return reply;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Sorry, something went wrong with the AI.";
  }
}
