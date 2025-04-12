// Chat functionality
// We now have a permanent chat panel, so no toggle is needed

// Handle chat form submissions
function setupChatForm(formId, inputId, windowId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const chatWindow = document.getElementById(windowId);

  if (!form || !input || !chatWindow) return; // Skip if elements don't exist

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (message) {
      // Add message to chat window
      addMessage(chatWindow, message, "user");
      // Clear input
      input.value = "";
      // Scroll to bottom
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  });
}

// Add message to chat window
function addMessage(chatWindow, content, type, sender = "You") {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (type === "system") {
    messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
  } else {
    messageDiv.innerHTML = `
            <div class="message-meta">
                <span class="message-sender">${sender}</span>
            </div>
            <div class="message-content">${content}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
  }

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initialize chat form
document.addEventListener("DOMContentLoaded", () => {
  // Setup game chat only (removed lobby chat)
  setupChatForm("chat-form", "chat-input", "chat-window");

  // Add initial system message to main chat
  const chatWindow = document.getElementById("chat-window");
  if (chatWindow) {
    addMessage(
      chatWindow,
      "Welcome to the team communications channel. Use this to coordinate with your team.",
      "system"
    );
  }

  // Setup invite button
  const inviteButton = document.getElementById("invite-button");
  if (inviteButton) {
    inviteButton.addEventListener("click", () => {
      const roomCode = document.querySelector("#room-code span").textContent;
      const inviteLink = `${window.location.origin}/join/${roomCode}`;

      // Copy to clipboard
      navigator.clipboard
        .writeText(inviteLink)
        .then(() => {
          // Show notification
          const notification = document.createElement("div");
          notification.className =
            "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out";
          notification.textContent = "Invite link copied to clipboard!";
          document.body.appendChild(notification);

          // Remove notification after 3 seconds
          setTimeout(() => {
            notification.remove();
          }, 3000);
        })
        .catch((err) => {
          console.error("Failed to copy invite link:", err);
          // Fallback to showing the link in an alert
          alert(`Share this link with your friends:\n${inviteLink}`);
        });
    });
  }
});

// Export functions for use in other modules
export { addMessage };
