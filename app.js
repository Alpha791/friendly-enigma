import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authDiv = document.getElementById("auth");
const chatDiv = document.getElementById("chat");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message");

document.getElementById("loginBtn").onclick = login;
document.getElementById("registerBtn").onclick = register;
document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("logoutBtn").onclick = logout;

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (user) {
    authDiv.hidden = true;
    chatDiv.hidden = false;
    loadMessages();
  } else {
    authDiv.hidden = false;
    chatDiv.hidden = true;
  }
});

// LOGIN
function login() {
  signInWithEmailAndPassword(
    auth,
    email.value,
    password.value
  ).catch(err => alert(err.message));
}

// REGISTER
function register() {
  createUserWithEmailAndPassword(
    auth,
    email.value,
    password.value
  ).catch(err => alert(err.message));
}

// LOGOUT
function logout() {
  signOut(auth);
}

// SEND MESSAGE
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "messages"), {
    user: auth.currentUser.email,
    text,
    time: serverTimestamp()
  });

  messageInput.value = "";
}

// LOAD + LISTEN FOR REPLIES
function loadMessages() {
  const q = query(collection(db, "messages"), orderBy("time"));

  onSnapshot(q, snapshot => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = "message";
      div.textContent = `${msg.user}: ${msg.text}`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
