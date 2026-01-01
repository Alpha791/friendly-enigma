// app.js
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
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("App loaded");

  const authDiv = document.getElementById("auth");
  const chatDiv = document.getElementById("chat");
  const messagesDiv = document.getElementById("messages");
  const messageInput = document.getElementById("message");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  // Event listeners for buttons
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("registerBtn").addEventListener("click", register);
  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Enable sending message with Enter key
  messageInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Monitor authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User logged in:", user.email);
      authDiv.hidden = true;
      chatDiv.hidden = false;
      messageInput.focus();
      loadMessages();
    } else {
      console.log("User logged out");
      authDiv.hidden = false;
      chatDiv.hidden = true;
      emailInput.value = "";
      passwordInput.value = "";
      emailInput.focus();
    }
  });

  async function login() {
    console.log("Login clicked");
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed: " + err.message);
    }
  }

  async function register() {
    console.log("Register clicked");
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    
    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("Registration successful");
      alert("Registration successful! You are now logged in.");
    } catch (err) {
      console.error("Registration error:", err);
      alert("Registration failed: " + err.message);
    }
  }

  function logout() {
    console.log("Logout clicked");
    signOut(auth).catch((err) => {
      console.error("Logout error:", err);
      alert("Logout failed: " + err.message);
    });
  }

  async function sendMessage() {
    console.log("Send clicked");
    const text = messageInput.value.trim();
    const user = auth.currentUser;
    
    if (!user) {
      alert("Please log in to send messages");
      return;
    }
    
    if (!text) {
      alert("Please enter a message");
      messageInput.focus();
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        user: user.email,
        text: text,
        timestamp: serverTimestamp(),
        userId: user.uid
      });
      
      messageInput.value = "";
      messageInput.focus();
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message: " + err.message);
    }
  }

  function loadMessages() {
    console.log("Loading messages...");
    
    try {
      const q = query(
        collection(db, "messages"),
        orderBy("timestamp", "asc")
      );
      
      onSnapshot(q, (snapshot) => {
        console.log("Messages updated, count:", snapshot.docs.length);
        messagesDiv.innerHTML = "";
        
        if (snapshot.empty) {
          const emptyMsg = document.createElement("div");
          emptyMsg.textContent = "No messages yet. Start the conversation!";
          emptyMsg.className = "empty-message";
          messagesDiv.appendChild(emptyMsg);
        }
        
        snapshot.forEach((doc) => {
          const msg = doc.data();
          const div = document.createElement("div");
          div.className = "message";
          
          // Format timestamp if available
          const timeStr = msg.timestamp ? 
            new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
            'Just now';
          
          div.innerHTML = `
            <div class="message-header">
              <span class="message-user">${msg.user}</span>
              <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-text">${msg.text}</div>
          `;
          if (msg.user === auth.currentUser?.email) {
            div.classList.add("my-message");
          }
          
          messagesDiv.appendChild(div);
        });
        
        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, (error) => {
        console.error("Error loading messages:", error);
        messagesDiv.innerHTML = "<div class='error'>Error loading messages. Please refresh.</div>";
      });
      
    } catch (err) {
      console.error("Error setting up messages listener:", err);
      messagesDiv.innerHTML = "<div class='error'>Failed to load messages.</div>";
    }
  }
});
