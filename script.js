// ============================================================
//  Smart AI Chatbot — script.js
//  Features: Claude API, markdown, voice input, chat history,
//            export, theme toggle, typing indicator, multi-turn
// ============================================================

// ── DOM References ──────────────────────────────────────────
const chatBox       = document.getElementById("chat-box");
const userInput     = document.getElementById("user-input");
const sendBtn       = document.getElementById("send-btn");
const voiceBtn      = document.getElementById("voice-btn");
const exportBtn     = document.getElementById("export-btn");
const clearBtn      = document.getElementById("clear-btn");
const themeBtn      = document.getElementById("theme-btn");
const typingEl      = document.getElementById("typing-indicator");
const charCount     = document.getElementById("char-count");

// ── Config ───────────────────────────────────────────────────
const API_URL       = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-sonnet-4-20250514";
const MAX_TOKENS    = 1024;
const MAX_CHARS     = 1000;
const SYSTEM_PROMPT = "You are a helpful, friendly, and concise AI assistant. Format responses using markdown where helpful.";

// ── State ────────────────────────────────────────────────────
let conversationHistory = [];
let isLoading           = false;
let isDarkMode          = localStorage.getItem("theme") === "dark";

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  loadChatHistory();
  userInput.focus();
});

// ── Theme ────────────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle("dark", isDarkMode);
  if (themeBtn) {
    themeBtn.innerHTML = isDarkMode
      ? '<i class="ti ti-sun"></i>'
      : '<i class="ti ti-moon"></i>';
    themeBtn.title = isDarkMode ? "Switch to light mode" : "Switch to dark mode";
  }
}

themeBtn?.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  applyTheme();
});

// ── Send Message ─────────────────────────────────────────────
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isLoading) return;

  addMessage(message, "user");
  userInput.value = "";
  updateCharCount();
  await askClaude(message);
}

sendBtn?.addEventListener("click", sendMessage);

userInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

userInput?.addEventListener("input", updateCharCount);

function updateCharCount() {
  const len = userInput.value.length;
  if (charCount) {
    charCount.textContent = `${len}/${MAX_CHARS}`;
    charCount.style.color = len > MAX_CHARS * 0.9 ? "var(--color-danger)" : "var(--color-muted)";
  }
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
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
      headers: { "Content-Type": "application/json" },
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
    const reply = data.content?.map((b) => b.text || "").join("") || "No response received.";

    conversationHistory.push({ role: "assistant", content: reply });
    hideTyping();
    addMessage(reply, "bot");
    saveChatHistory();

  } catch (error) {
    hideTyping();
    addMessage(`⚠️ Error: ${error.message}`, "bot error");
    conversationHistory.pop();
  } finally {
    isLoading = false;
    setSendState(true);
    userInput.focus();
  }
}

// ── Message Rendering ────────────────────────────────────────
function addMessage(text, type) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper", type.includes("user") ? "user-wrapper" : "bot-wrapper");

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.innerHTML = type.includes("user")
    ? '<i class="ti ti-user"></i>'
    : '<i class="ti ti-robot"></i>';

  const bubble = document.createElement("div");
  bubble.classList.add("message", type);

  if (type.includes("bot")) {
    bubble.innerHTML = typeof marked !== "undefined"
      ? marked.parse(text)
      : escapeHtml(text);
  } else {
    bubble.textContent = text;
  }

  const meta = document.createElement("div");
  meta.classList.add("message-meta");
  meta.textContent = formatTime(new Date());

  if (type.includes("user")) {
    wrapper.appendChild(bubble);
    wrapper.appendChild(avatar);
    bubble.appendChild(meta);
  } else {
    wrapper.appendChild(avatar);
    const inner = document.createElement("div");
    inner.style.flex = "1";
    inner.appendChild(bubble);

    // Copy button for bot messages
    if (!type.includes("error")) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.title = "Copy response";
      copyBtn.innerHTML = '<i class="ti ti-copy"></i>';
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.innerHTML = '<i class="ti ti-check"></i>';
          setTimeout(() => { copyBtn.innerHTML = '<i class="ti ti-copy"></i>'; }, 1500);
        });
      });
      bubble.appendChild(copyBtn);
    }

    bubble.appendChild(meta);
    inner.appendChild(bubble);
    wrapper.appendChild(inner);
  }

  chatBox.insertBefore(wrapper, typingEl);
  scrollToBottom();
}

// ── Typing Indicator ─────────────────────────────────────────
function showTyping() {
  if (typingEl) {
    typingEl.style.display = "flex";
    scrollToBottom();
  }
}

function hideTyping() {
  if (typingEl) typingEl.style.display = "none";
}

// ── Scroll ───────────────────────────────────────────────────
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ── Send Button State ────────────────────────────────────────
function setSendState(enabled) {
  if (sendBtn) {
    sendBtn.disabled = !enabled;
    sendBtn.style.opacity = enabled ? "1" : "0.5";
  }
}

// ── Chat History (localStorage) ──────────────────────────────
function saveChatHistory() {
  try {
    const messages = [...chatBox.querySelectorAll(".message-wrapper")].map((w) => ({
      type: w.classList.contains("user-wrapper") ? "user" : "bot",
      text: w.querySelector(".message")?.innerText || "",
    }));
    localStorage.setItem("chatHistory_v2", JSON.stringify(messages));
    localStorage.setItem("chatConversation_v2", JSON.stringify(conversationHistory));
  } catch (e) {
    console.warn("Could not save chat:", e);
  }
}

function loadChatHistory() {
  try {
    const savedConv = localStorage.getItem("chatConversation_v2");
    if (savedConv) conversationHistory = JSON.parse(savedConv);

    const savedMsgs = localStorage.getItem("chatHistory_v2");
    if (savedMsgs) {
      const messages = JSON.parse(savedMsgs);
      messages.forEach((m) => addMessage(m.text, m.type));
    }
  } catch (e) {
    console.warn("Could not load chat:", e);
  }
}

// ── Clear Chat ───────────────────────────────────────────────
clearBtn?.addEventListener("click", () => {
  if (!confirm("Clear all chat history?")) return;
  chatBox.querySelectorAll(".message-wrapper").forEach((el) => el.remove());
  conversationHistory = [];
  localStorage.removeItem("chatHistory_v2");
  localStorage.removeItem("chatConversation_v2");
  addMessage("Chat cleared. How can I help you?", "bot");
});

// ── Export Chat ──────────────────────────────────────────────
exportBtn?.addEventListener("click", () => {
  const lines = [...chatBox.querySelectorAll(".message-wrapper")].map((w) => {
    const role = w.classList.contains("user-wrapper") ? "You" : "AI";
    const text = w.querySelector(".message")?.innerText?.replace(/\n+/g, " ").trim() || "";
    return `[${role}]: ${text}`;
  });

  const content = `Chat Export — ${new Date().toLocaleString()}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `chat-export-${Date.now()}.txt`;
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

  recognition.onstart = () => {
    voiceBtn.classList.add("active");
    voiceBtn.title = "Listening…";
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    updateCharCount();
    userInput.focus();
  };

  recognition.onerror = (e) => {
    console.warn("Voice error:", e.error);
    voiceBtn.classList.remove("active");
    voiceBtn.title = "Voice input";
  };

  recognition.onend = () => {
    voiceBtn.classList.remove("active");
    voiceBtn.title = "Voice input";
  };

  voiceBtn.addEventListener("click", () => {
    try { recognition.start(); } catch (e) { console.warn("Recognition already active"); }
  });
} else if (voiceBtn) {
  voiceBtn.disabled = true;
  voiceBtn.title = "Voice not supported in this browser";
  voiceBtn.style.opacity = "0.4";
}

// ── Helpers ──────────────────────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
