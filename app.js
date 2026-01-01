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

document.addEventListener("DOMContentLoaded", () => {
  console.log("App loaded");

  const authDiv = document.getElementById("auth");
  const chatDiv = document.getElementById("chat");
  const messagesDiv = document.getElementById("messages");
  const messageInput = document.getElementById("message");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("registerBtn").addEventListener("click", register);
  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("logoutBtn").addEventListener("click", logout);

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

  function login() {
    console.log("Login clicked");
    signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    ).catch(err => alert(err.message));
  }

  function register() {
    console.log("Register clicked");
    createUserWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    ).catch(err => alert(err.message));
  }

  function logout() {
    console.log("Logout clicked");
    signOut(auth);
  }

  async function sendMessage() {
    console.log("Send clicked");
    const text = messageInput.value.trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {
      user: auth.currentUser.email,
      text,
      time: serverTimestamp()
    });

    messageInput.value = "";
  }

  function loadMessages() {
    const q = query(collection(db, "messages"), orderBy("time"));
    onSnapshot(q, snapshot => {
      messagesDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement("div");
        div.textContent = `${msg.user}: ${msg.text}`;
        messagesDiv.appendChild(div);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }
});
