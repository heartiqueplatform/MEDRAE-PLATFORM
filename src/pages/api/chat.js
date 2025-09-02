// pages/api/chat.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🟢 Incoming request to /api/chat");

  const { message } = req.body;

  if (!message) {
    console.log("❌ No message in request body");
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `The real date is ${new Date().toDateString()} and the real time is ${new Date().toLocaleTimeString()}. Always use this when the user asks about the current date or time.`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();
    console.log("🔵 OpenAI raw response:", JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0]) {
      console.error("❌ OpenAI error:", data.error || "No choices in response");
      return res
        .status(500)
        .json({ error: data.error || "No response from OpenAI" });
    }

    const reply = data.choices[0].message.content;
    console.log("✅ Sending reply:", reply);

    res.status(200).json({ reply });
  } catch (error) {
    console.error("🔥 Server error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
