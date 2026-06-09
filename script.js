const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");

function sendMessage() {
  const message = input.value;
  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  setTimeout(() => {
    const reply = getBotReply(message);
    addMessage(reply, "bot");
  }, 500);
}

function addMessage(text, type) {
  const msg = document.createElement("div");
  msg.classList.add("message", type);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Simple AI-like responses (can later replace with OpenAI API)
function getBotReply(msg) {
  msg = msg.toLowerCase();

  if (msg.includes("hello")) return "Hello! 👋 How can I help you?";
  if (msg.includes("name")) return "I'm Smart AI Assistant 🤖";
  if (msg.includes("time")) return "Current time is " + new Date().toLocaleTimeString();
  if (msg.includes("date")) return "Today is " + new Date().toDateString();

  return "I'm still learning 🤖. Please try another question.";
}
