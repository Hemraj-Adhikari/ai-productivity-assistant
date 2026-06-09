// ============================================================
//  AI Productivity Assistant — script.js
//  Using Google Gemini API (Free Tier)
// ============================================================

// ── DOM References ───────────────────────────────────────────
const chat      = document.getElementById("chat");
const prompt    = document.getElementById("prompt");
const sendBtn   = document.getElementById("sendBtn");
const themeBtn  = document.getElementById("themeBtn");
const exportBtn = document.getElementById("exportBtn");
const voiceBtn  = document.getElementById("voiceBtn");

// ── Config ───────────────────────────────────────────────────
// ⚠️  PASTE YOUR NEW API KEY HERE (revoke the old one first!)
const API_KEY       = "AQ.Ab8RN6J6bh_JpYOsSswRUzYhogKTEHrf733py26HsefsZwvPLw";
const MODEL         = "gemini-1.5-flash";
const API_URL       = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const SYSTEM_PROMPT = "You are a helpful, friendly AI productivity assistant. Format responses using markdown where helpful.";

// ── State ────────────────────────────────────────────────────
let conversationHistory = [];
let isLoading           = false;
let isDarkMode          = localStorage.getItem("theme") === "dark";

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  loadChatHistory();
  prompt.focus();
  addWelcomeMessage();
});

// ── Welcome ──────────────────────────────────────────────────
function addWelcomeMessage() {
  if (chat.querySelectorAll(".message-row").length === 0) {
    addBotMessage("👋 Hi! I'm your AI Productivity Assistant, designed and developed by Hemraj Adhikari. Ask me anything — I remember our conversation context.");
  }
}

// ── Theme ────────────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle("dark", isDarkMode);
  if (themeBtn) themeBtn.textContent = isDarkMode ? "☀️" : "🌙";
}

themeBtn?.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  applyTheme();
});

// ── Send ─────────────────────────────────────────────────────
async function sendMessage() {
  const message = prompt.value.trim();
  if (!message || isLoading) return;
  addUserMessage(message);
  prompt.value = "";
  autoResize();
  await askGemini(message);
}

sendBtn?.addEventListener("click", sendMessage);

prompt?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

prompt?.addEventListener("input", autoResize);

function autoResize() {
  prompt.style.height = "auto";
  prompt.style.height = Math.min(prompt.scrollHeight, 140) + "px";
}

// ── Gemini API ───────────────────────────────────────────────
async function askGemini(message) {
  isLoading = true;
  setSendState(false);
  showTyping();

  // Add user message to history (Gemini format: role + parts)
  conversationHistory.push({
    role: "user",
    parts: [{ text: message }]
  });

  // Build request body
  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: conversationHistory,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

    // Add model reply to history (Gemini uses "model" not "assistant")
    conversationHistory.push({
      role: "model",
      parts: [{ text: reply }]
    });

    hideTyping();
    addBotMessage(reply);
    saveChatHistory();

  } catch (error) {
    hideTyping();
    addBotMessage(`⚠️ **Error:** ${error.message}`);
    // Remove the last user message from history on error
    conversationHistory.pop();
  } finally {
    isLoading = false;
    setSendState(true);
    prompt.focus();
  }
}

// ── Render Messages ──────────────────────────────────────────
function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user-row";

  const bubble = document.createElement("div");
  bubble.className = "message user-message";
  bubble.textContent = text;

  const time = document.createElement("span");
  time.className = "msg-time";
  time.textContent = formatTime();
  bubble.appendChild(time);

  const avatar = document.createElement("div");
  avatar.className = "avatar user-avatar";
  avatar.textContent = "You";

  row.appendChild(bubble);
  row.appendChild(avatar);
  chat.appendChild(row);
  scrollToBottom();
}

function addBotMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row bot-row";

  const avatar = document.createElement("div");
  avatar.className = "avatar bot-avatar";
  avatar.textContent = "AI";

  const wrap = document.createElement("div");
  wrap.style.flex = "1";

  const bubble = document.createElement("div");
  bubble.className = "message bot-message";
  bubble.innerHTML = marked.parse(text);

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
    });
  });

  const time = document.createElement("span");
  time.className = "msg-time";
  time.textContent = formatTime();

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.appendChild(copyBtn);
  meta.appendChild(time);

  wrap.appendChild(bubble);
  wrap.appendChild(meta);
  row.appendChild(avatar);
  row.appendChild(wrap);
  chat.appendChild(row);
  scrollToBottom();
  saveChatHistory();
}

// ── Typing Indicator ─────────────────────────────────────────
function showTyping() {
  removeTyping();
  const row = document.createElement("div");
  row.className = "message-row bot-row";
  row.id = "typing-row";

  const avatar = document.createElement("div");
  avatar.className = "avatar bot-avatar";
  avatar.textContent = "AI";

  const bubble = document.createElement("div");
  bubble.className = "message bot-message typing-bubble";
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

  row.appendChild(avatar);
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollToBottom();
}

function hideTyping() { removeTyping(); }
function removeTyping() {
  document.getElementById("typing-row")?.remove();
}

// ── Scroll ───────────────────────────────────────────────────
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// ── Send Button State ────────────────────────────────────────
function setSendState(enabled) {
  if (sendBtn) {
    sendBtn.disabled = !enabled;
    sendBtn.textContent = enabled ? "Send" : "…";
  }
}

// ── Export ───────────────────────────────────────────────────
exportBtn?.addEventListener("click", () => {
  const rows = [...chat.querySelectorAll(".message-row")];
  const lines = rows.map((row) => {
    const isUser = row.classList.contains("user-row");
    const text = row.querySelector(".message")?.innerText?.trim() || "";
    return `[${isUser ? "You" : "AI"}]: ${text}`;
  });
  const content = `AI Productivity Assistant — Chat Export\n${new Date().toLocaleString()}\n${"─".repeat(50)}\n\n${lines.join("\n\n")}`;
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `chat-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── Voice Input ──────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && voiceBtn) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart  = () => { voiceBtn.textContent = "🔴"; voiceBtn.title = "Listening…"; };
  recognition.onend    = () => { voiceBtn.textContent = "🎤"; voiceBtn.title = "Voice input"; };
  recognition.onerror  = () => { voiceBtn.textContent = "🎤"; };
  recognition.onresult = (e) => {
    prompt.value = e.results[0][0].transcript;
    autoResize();
    prompt.focus();
  };

  voiceBtn.textContent = "🎤";
  voiceBtn.title = "Voice input";
  voiceBtn.addEventListener("click", () => {
    try { recognition.start(); } catch (e) {}
  });
} else if (voiceBtn) {
  voiceBtn.textContent = "🎤";
  voiceBtn.disabled = true;
  voiceBtn.title = "Voice not supported";
  voiceBtn.style.opacity = "0.4";
}

// ── localStorage ─────────────────────────────────────────────
function saveChatHistory() {
  try {
    const rows = [...chat.querySelectorAll(".message-row")];
    const msgs = rows.map((r) => ({
      type: r.classList.contains("user-row") ? "user" : "bot",
      text: r.querySelector(".message")?.innerText?.trim() || "",
    }));
    localStorage.setItem("ai_chat_v3", JSON.stringify(msgs));
    localStorage.setItem("ai_conv_v3", JSON.stringify(conversationHistory));
  } catch (e) {}
}

function loadChatHistory() {
  try {
    const savedConv = localStorage.getItem("ai_conv_v3");
    if (savedConv) conversationHistory = JSON.parse(savedConv);

    const savedMsgs = localStorage.getItem("ai_chat_v3");
    if (savedMsgs) {
      JSON.parse(savedMsgs).forEach((m) => {
        if (m.type === "user") addUserMessage(m.text);
        else addBotMessage(m.text);
      });
    }
  } catch (e) {}
}

// ── Helpers ──────────────────────────────────────────────────
function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
