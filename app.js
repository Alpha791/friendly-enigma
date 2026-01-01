const authDiv = document.getElementById("auth");
const chatDiv = document.getElementById("chat");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const messageInput = document.getElementById("message");
const phoneInput = document.getElementById("phone");
const messagesDiv = document.getElementById("messages");

document.getElementById("loginBtn").onclick = login;
document.getElementById("registerBtn").onclick = register;
document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("logoutBtn").onclick = logout;

// Fake in-memory auth (replace with Firebase later)
let currentUser = null;

function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  currentUser = email;
  showChat();
}

function register() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  currentUser = email;
  showChat();
}

function logout() {
  currentUser = null;
  authDiv.hidden = false;
  chatDiv.hidden = true;
  messagesDiv.innerHTML = "";
}

function showChat() {
  authDiv.hidden = true;
  chatDiv.hidden = false;
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const phone = phoneInput.value.trim();

  const div = document.createElement("div");
  div.className = "message";
  div.textContent = `${currentUser}${phone ? " (" + phone + ")" : ""}: ${text}`;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  messageInput.value = "";
}
