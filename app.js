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
    where,
    limit,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM Elements
const DOM = {
    // Auth Modal
    authModal: document.getElementById('authModal'),
    authForm: document.getElementById('authForm'),
    authTabs: document.querySelectorAll('.tab-btn'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    passwordStrength: document.getElementById('passwordStrength'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    authStatus: document.getElementById('authStatus'),
    closeModal: document.querySelector('.close-modal'),
    startChatBtn: document.getElementById('startChatBtn'),
    
    // Main Chat
    mainChat: document.getElementById('mainChat'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    userAvatar: document.getElementById('userAvatar'),
    
    // Sidebar
    sidebar: document.querySelector('.sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    menuItems: document.querySelectorAll('.menu-item'),
    logoutBtn: document.getElementById('logoutBtn'),
    onlineCount: document.getElementById('onlineCount'),
    onlineUsersList: document.getElementById('onlineUsersList'),
    
    // Chat Area
    currentRoom: document.getElementById('currentRoom'),
    roomDescription: document.getElementById('roomDescription'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    charCount: document.getElementById('charCount'),
    sendBtn: document.getElementById('sendBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    emojiBtn: document.getElementById('emojiBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    
    // Emoji Modal
    emojiModal: document.getElementById('emojiModal'),
    emojiGrid: document.getElementById('emojiGrid'),
    
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    
    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText')
};

// State
let state = {
    currentUser: null,
    currentRoom: 'general',
    isRegistering: false,
    onlineUsers: new Set(),
    rooms: {
        general: { name: 'General Chat', description: 'Main public chat room' },
        random: { name: 'Random', description: 'Talk about anything!' },
        support: { name: 'Support', description: 'Get help and support' },
        developers: { name: 'Developers', description: 'Discuss development topics' }
    }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    console.log('Initializing ChatHub...');
    
    // Load saved theme
    loadTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup emoji picker
    setupEmojiPicker();
    
    // Monitor auth state
    onAuthStateChanged(auth, handleAuthStateChange);
    
    // Show loading overlay
    showLoading();
    
    // Hide loading after 1 second
    setTimeout(() => {
        hideLoading();
        showNotification('Welcome to ChatHub! 👋', 'info');
    }, 1000);
}

function setupEventListeners() {
    // Auth Modal
    DOM.startChatBtn?.addEventListener('click', () => {
        DOM.authModal.classList.add('active');
        DOM.emailInput.focus();
    });
    
    DOM.closeModal?.addEventListener('click', () => {
        DOM.authModal.classList.remove('active');
    });
    
    // Close modal when clicking outside
    DOM.authModal?.addEventListener('click', (e) => {
        if (e.target === DOM.authModal) {
            DOM.authModal.classList.remove('active');
        }
    });
    
    // Auth tabs
    DOM.authTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            DOM.authTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update form based on tab
            state.isRegistering = tab.dataset.tab === 'register';
            DOM.authSubmitBtn.innerHTML = state.isRegistering ? 
                '<i class="fas fa-user-plus"></i> Create Account' : 
                '<i class="fas fa-sign-in-alt"></i> Sign In';
        });
    });
    
    // Auth form submission
    DOM.authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuth();
    });
    
    // Password strength indicator
    DOM.passwordInput?.addEventListener('input', updatePasswordStrength);
    
    // Sidebar toggle
    DOM.sidebarToggle?.addEventListener('click', toggleSidebar);
    
    // Room switching
    DOM.menuItems?.forEach(item => {
        item.addEventListener('click', () => switchRoom(item.dataset.room));
    });
    
    // Logout
    DOM.logoutBtn?.addEventListener('click', handleLogout);
    
    // Message input
    DOM.messageInput?.addEventListener('input', updateCharCount);
    DOM.messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button
    DOM.sendBtn?.addEventListener('click', sendMessage);
    
    // Clear chat
    DOM.clearChatBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all messages in this room?')) {
            DOM.messagesContainer.innerHTML = '';
            showNotification('Chat cleared', 'info');
        }
    });
    
    // Emoji button
    DOM.emojiBtn?.addEventListener('click', toggleEmojiPicker);
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!DOM.emojiModal.contains(e.target) && e.target !== DOM.emojiBtn) {
            DOM.emojiModal.classList.remove('active');
        }
    });
    
    // Theme toggle
    DOM.themeToggle?.addEventListener('click', toggleTheme);
    
    // Settings button
    DOM.settingsBtn?.addEventListener('click', () => {
        showNotification('Settings will be available soon! ⚙️', 'info');
    });
}

function updatePasswordStrength() {
    const password = DOM.passwordInput.value;
    const strengthBar = DOM.passwordStrength;
    
    if (!password) {
        strengthBar.style.width = '0%';
        strengthBar.style.backgroundColor = 'transparent';
        return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    const width = (strength / 4) * 100;
    strengthBar.style.width = width + '%';
    
    let color;
    if (strength <= 1) color = '#ff4757';
    else if (strength <= 2) color = '#ffa502';
    else if (strength <= 3) color = '#2ed573';
    else color = '#2ed573';
    
    strengthBar.style.backgroundColor = color;
}

async function handleAuth() {
    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value.trim();
    
    if (!email || !password) {
        showAuthStatus('Please enter both email and password', 'error');
        return;
    }
    
    if (state.isRegistering && password.length < 6) {
        showAuthStatus('Password must be at least 6 characters', 'error');
        return;
    }
    
    showAuthStatus('Processing...', 'info');
    DOM.authSubmitBtn.disabled = true;
    
    try {
        if (state.isRegistering) {
            // Register
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Registration successful:', userCredential.user.email);
            
            // Create user profile in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email,
                displayName: email.split('@')[0],
                createdAt: serverTimestamp(),
                status: 'online',
                avatarColor: getRandomColor()
            });
            
            showAuthStatus('Account created successfully! Welcome! 🎉', 'success');
        } else {
            // Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful:', userCredential.user.email);
            showAuthStatus('Login successful! Redirecting...', 'success');
        }
        
        // Close modal after successful auth
        setTimeout(() => {
            DOM.authModal.classList.remove('active');
            DOM.authForm.reset();
            showAuthStatus('', '');
        }, 1500);
        
    } catch (error) {
        console.error('Auth error:', error);
        showAuthStatus(`Error: ${error.message}`, 'error');
    } finally {
        DOM.authSubmitBtn.disabled = false;
    }
}

function showAuthStatus(message, type) {
    DOM.authStatus.textContent = message;
    DOM.authStatus.className = 'auth-status';
    if (type) {
        DOM.authStatus.classList.add(type);
    }
}

function handleAuthStateChange(user) {
    if (user) {
        // User is signed in
        state.currentUser = user;
        updateUserInfo(user);
        DOM.mainChat.classList.remove('hidden');
        setupChat();
        updateUserStatus('online');
        showNotification(`Welcome back, ${user.email}!`, 'success');
    } else {
        // User is signed out
        state.currentUser = null;
        DOM.mainChat.classList.add('hidden');
        updateUserStatus('offline');
        showNotification('You have been logged out', 'info');
    }
}

async function updateUserInfo(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            DOM.userName.textContent = userData.displayName || user.email.split('@')[0];
            DOM.userEmail.textContent = user.email;
            
            // Set avatar color
            DOM.userAvatar.style.background = userData.avatarColor || 
                `linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})`;
        } else {
            DOM.userName.textContent = user.email.split('@')[0];
            DOM.userEmail.textContent = user.email;
            DOM.userAvatar.style.background = `linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})`;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        DOM.userName.textContent = user.email.split('@')[0];
        DOM.userEmail.textContent = user.email;
    }
}

function setupChat() {
    // Load messages for current room
    loadMessages();
    
    // Setup online users monitoring
    monitorOnlineUsers();
    
    // Focus on message input
    DOM.messageInput?.focus();
}

function loadMessages() {
    const room = state.currentRoom;
    const roomName = state.rooms[room].name;
    
    // Update UI
    DOM.currentRoom.textContent = roomName;
    DOM.roomDescription.textContent = state.rooms[room].description;
    
    // Clear current messages
    DOM.messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-content">
                <i class="fas fa-comments welcome-icon"></i>
                <h3>Welcome to ${roomName}!</h3>
                <p>${state.rooms[room].description}</p>
                <div class="welcome-tips">
                    <p><i class="fas fa-lightbulb"></i> <strong>Tips:</strong></p>
                    <ul>
                        <li>Press Enter to send messages</li>
                        <li>Click on emoji button to add emojis</li>
                        <li>Be respectful to other users</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Subscribe to messages
    const q = query(
        collection(db, 'messages'),
        where('room', '==', room),
        orderBy('timestamp', 'asc'),
        limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                displayMessage(change.doc.data());
            }
        });
        
        // Scroll to bottom
        setTimeout(() => {
            DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
        }, 100);
    }, (error) => {
        console.error('Error loading messages:', error);
        showNotification('Error loading messages', 'error');
    });
    
    // Store unsubscribe function
    state.unsubscribeMessages = unsubscribe;
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.userId === state.currentUser?.uid ? 'sent' : 'received'}`;
    
    const time = message.timestamp?.toDate ?
        message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
        'Just now';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">${message.userName || message.userEmail?.split('@')[0] || 'Anonymous'}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${message.text}</div>
    `;
    
    DOM.messagesContainer.appendChild(messageDiv);
}

async function sendMessage() {
    if (!state.currentUser) {
        showNotification('Please login to send messages', 'error');
        return;
    }
    
    const text = DOM.messageInput.value.trim();
    if (!text) {
        DOM.messageInput.focus();
        return;
    }
    
    if (text.length > 500) {
        showNotification('Message too long (max 500 characters)', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'messages'), {
            text: text,
            userId: state.currentUser.uid,
            userEmail: state.currentUser.email,
            userName: DOM.userName.textContent,
            room: state.currentRoom,
            timestamp: serverTimestamp()
        });
        
        // Clear input
        DOM.messageInput.value = '';
        updateCharCount();
        DOM.messageInput.focus();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
}

function switchRoom(room) {
    if (room === state.currentRoom) return;
    
    // Update active menu item
    DOM.menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.room === room) {
            item.classList.add('active');
        }
    });
    
    // Unsubscribe from previous room messages
    if (state.unsubscribeMessages) {
        state.unsubscribeMessages();
    }
    
    // Switch room
    state.currentRoom = room;
    loadMessages();
    
    showNotification(`Switched to ${state.rooms[room].name}`, 'info');
}

async function updateUserStatus(status) {
    if (!state.currentUser) return;
    
    try {
        const userRef = doc(db, 'users', state.currentUser.uid);
        await updateDoc(userRef, {
            status: status,
            lastSeen: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

function monitorOnlineUsers() {
    const q = query(
        collection(db, 'users'),
        where('status', '==', 'online')
    );
    
    onSnapshot(q, (snapshot) => {
        state.onlineUsers.clear();
        DOM.onlineUsersList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            if (doc.id !== state.currentUser?.uid) {
                state.onlineUsers.add(user.email);
                
                // Add to online users list
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <div class="user-status-indicator"></div>
                    <span>${user.displayName || user.email.split('@')[0]}</span>
                `;
                DOM.onlineUsersList.appendChild(userItem);
            }
        });
        
        DOM.onlineCount.textContent = state.onlineUsers.size;
    });
}

async function handleLogout() {
    try {
        // Update status to offline before signing out
        await updateUserStatus('offline');
        await signOut(auth);
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

function toggleSidebar() {
    DOM.sidebar.classList.toggle('collapsed');
    const icon = DOM.sidebarToggle.querySelector('i');
    if (DOM.sidebar.classList.contains('collapsed')) {
        icon.className = 'fas fa-chevron-right';
    } else {
        icon.className = 'fas fa-chevron-left';
    }
}

function updateCharCount() {
    const length = DOM.messageInput.value.length;
    DOM.charCount.textContent = length;
    
    if (length > 450) {
        DOM.charCount.style.color = '#ff4757';
    } else if (length > 400) {
        DOM.charCount.style.color = '#ffa502';
    } else {
        DOM.charCount.style.color = '';
    }
}

function setupEmojiPicker() {
    const emojis = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠'],
        people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🦔'],
        food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🫘', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯']
    };
    
    // Populate emoji grid
    DOM.emojiGrid.innerHTML = '';
    Object.entries(emojis).forEach(([category, emojiList]) => {
        if (category === 'smileys') { // Default category
            emojiList.forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'emoji-btn';
                btn.textContent = emoji;
                btn.addEventListener('click', () => insertEmoji(emoji));
                DOM.emojiGrid.appendChild(btn);
            });
        }
    });
    
    // Category switching
    document.querySelectorAll('.emoji-category').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            document.querySelectorAll('.emoji-category').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update emoji grid
            DOM.emojiGrid.innerHTML = '';
            emojis[category].forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'emoji-btn';
                btn.textContent = emoji;
                btn.addEventListener('click', () => insertEmoji(emoji));
                DOM.emojiGrid.appendChild(btn);
            });
        });
    });
}

function insertEmoji(emoji) {
    const input = DOM.messageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.focus();
    input.setSelectionRange(start + emoji.length, start + emoji.length);
    
    updateCharCount();
    DOM.emojiModal.classList.remove('active');
}

function toggleEmojiPicker() {
    DOM.emojiModal.classList.toggle('active');
}

// Theme functions
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        DOM.themeToggle.querySelector('i').className = 'fas fa-sun';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const icon = DOM.themeToggle.querySelector('i');
    
    if (isDark) {
        localStorage.setItem('theme', 'dark');
        icon.className = 'fas fa-sun';
    } else {
        localStorage.setItem('theme', 'light');
        icon.className = 'fas fa-moon';
    }
}

// Loading functions
function showLoading() {
    DOM.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    DOM.loadingOverlay.style.display = 'none';
}

// Notification function
function showNotification(message, type = 'info') {
    DOM.notificationText.textContent = message;
    DOM.notification.className = `notification ${type}`;
    DOM.notification.classList.add('active');
    
    setTimeout(() => {
        DOM.notification.classList.remove('active');
    }, 3000);
}

// Utility functions
function getRandomColor() {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#fa709a', '#fee140', '#a8edea', '#fed6e3'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (state.currentUser) {
        if (document.hidden) {
            updateUserStatus('away');
        } else {
            updateUserStatus('online');
        }
    }
});

// Handle before unload
window.addEventListener('beforeunload', () => {
    if (state.currentUser) {
        // Use sendBeacon to update status as offline
        navigator.sendBeacon('/api/status', JSON.stringify({
            userId: state.currentUser.uid,
            status: 'offline'
        }));
    }
});

console.log('ChatHub initialized successfully! 🚀');
