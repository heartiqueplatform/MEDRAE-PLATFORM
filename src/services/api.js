const API_URL = "http://localhost:5000"; // your backend server

export async function sendMessage(message) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  return response.json();
}
