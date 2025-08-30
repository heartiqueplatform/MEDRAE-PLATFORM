import fetch from "node-fetch";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  // Debug log
  console.log(" OpenAI API Key Loaded:", OPENAI_KEY ? " Yes" : " No");

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
    console.log("OpenAI raw response:", data);

    if (!data.choices || !data.choices[0]) {
      console.error("OpenAI error:", data.error || "No choices in response");
      return res.status(500).json({ error: data.error || "No response from OpenAI" });
    }

    // Send the AI reply
    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
