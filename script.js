// ============================================================
//  AI Productivity Assistant — script.js
//  Matches: #chat, #prompt, #sendBtn, #themeBtn, #exportBtn, #voiceBtn
// ============================================================

// ── DOM References ───────────────────────────────────────────
const chat      = document.getElementById("chat");
const prompt    = document.getElementById("prompt");
const sendBtn   = document.getElementById("sendBtn");
const themeBtn  = document.getElementById("themeBtn");
const exportBtn = document.getElementById("exportBtn");
const voiceBtn  = document.getElementById("voiceBtn");

// ── Config ───────────────────────────────────────────────────
const API_URL       = "https://api.anthropic.com/v1/messages";
const API_KEY       = "YOUR_API_KEY_HERE"; // 🔑 Replace with your Anthropic API key
const MODEL         = "claude-sonnet-4-20250514";
const MAX_TOKENS    = 1024;
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
    addBotMessage("👋 Hi! I'm your AI Productivity Assistant. Ask me anything — I remember our conversation context.");
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
  await askClaude(message);
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

// ── Claude API ───────────────────────────────────────────────
async function askClaude(message) {
  isLoading = true;
  setSendState(false);
  showTyping();

  conversationHistory.push({ role: "user", content: message });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content?.map((b) => b.text || "").join("") || "No response.";
    conversationHistory.push({ role: "assistant", content: reply });
    hideTyping();
    addBotMessage(reply);
    saveChatHistory();

  } catch (error) {
    hideTyping();
    addBotMessage(`⚠️ **Error:** ${error.message}`);
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
