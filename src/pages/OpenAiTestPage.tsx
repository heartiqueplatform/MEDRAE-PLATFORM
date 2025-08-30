"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function OpenAiTestPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setResponse("");

    const res = await fetch("/api/gpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setResponse(data.result || "No response");
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <Textarea
        placeholder="Type a prompt..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <Button onClick={handleSend} disabled={loading}>
        {loading ? "Sending..." : "Send to GPT"}
      </Button>
      {response && (
        <div className="mt-4 p-4 bg-muted rounded">
          <strong>Response:</strong>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
