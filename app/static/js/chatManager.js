// chatManager.js - Handles chat functionality

import playerStateManager from "./playerStateManager.js";

class ChatManager {
  constructor() {
    // DOM Elements
    this.elements = {
      chatWindow: document.getElementById("chat-window"),
      chatForm: document.getElementById("chat-form"),
      chatInput: document.getElementById("chat-input"),
    };

    // Validate elements exist
    this._validateElements();

    // State management
    this.messageCounter = 0;
    this.messageBuffer = [];
    this.maxMessages = 100;
    this.isScrolledToBottom = true;
    this.lastMessageTime = 0;
    this.messageThrottleMs = 300; // Prevent sending messages too quickly (300ms)
    this.messageAnimationDelay = 10; // ms delay before starting animation

    // Role colors
    this.roleColors = Object.freeze({
      Hacker: "blue",
      "Safe Cracker": "yellow",
      Demolitions: "red",
      Lookout: "green",
      System: "purple",
    });

    // Initialize
    this._init();
  }

  /**
   * Validate that required DOM elements exist
   * @private
   */
  _validateElements() {
    if (!this.elements.chatWindow) {
      console.error("Chat window element not found!");
    }

    if (!this.elements.chatForm) {
      console.error("Chat form element not found!");
    }

    if (!this.elements.chatInput) {
      console.error("Chat input element not found!");
    }
  }

  /**
   * Initialize chat manager
   * @private
   */
  _init() {
    // Set up scroll event to detect if user has scrolled away from bottom
    if (this.elements.chatWindow) {
      this.elements.chatWindow.addEventListener("scroll", () => {
        const { scrollTop, scrollHeight, clientHeight } =
          this.elements.chatWindow;
        // Consider "scrolled to bottom" if within 10px of the bottom
        this.isScrolledToBottom =
          Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      });
    }

    // Set up chat form submission
    if (this.elements.chatForm && this.elements.chatInput) {
      this.elements.chatForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this._sendMessage();
      });

      // Set up input keydown for throttling visual feedback
      this.elements.chatInput.addEventListener("keydown", (event) => {
        // If Enter key and not shift key (allow shift+enter for new line)
        if (event.key === "Enter" && !event.shiftKey) {
          // If throttled, prevent default and show visual feedback
          if (this._isThrottled()) {
            event.preventDefault();
            this._showThrottleFeedback();
          }
        }
      });
    }

    // Add welcome message
    this.addSystemMessage("Comms active");
  }

  /**
   * Add a chat message to the chat window
   * @param {Object} data - Chat message data
   * @param {boolean} [skipAnimation=false] - Whether to skip animation (for loading saved messages)
   */
  addChatMessage(data, skipAnimation = false) {
    if (!this.elements.chatWindow) return;

    // Get player info
    const player = playerStateManager.getPlayer(data.playerId);
    const role = player ? player.role : "";
    const roleColor = this.roleColors[role] || "gray";

    // Determine if this is the current player
    const isCurrentPlayer =
      data.playerId === playerStateManager.gameState.playerId;

    // Create message container
    const messageEl = document.createElement("div");
    const messageId = `msg-${++this.messageCounter}`;
    messageEl.id = messageId;

    // Base classes without animation (will be added after append unless skipped)
    const baseClass = "flex items-start mb-3 transform";
    messageEl.className = isCurrentPlayer
      ? `${baseClass} justify-end`
      : baseClass;

    if (!skipAnimation) {
      messageEl.classList.add(
        "opacity-0",
        "translate-y-2",
        "transition-transform",
        "duration-300",
        "ease-out"
      );
    }

    // Create message HTML with proper escaping
    messageEl.innerHTML = this._createMessageHTML(
      data,
      isCurrentPlayer,
      roleColor,
      role
    );

    // Add to chat window
    this.elements.chatWindow.appendChild(messageEl);

    // Add to message buffer for managing max messages
    this._addToMessageBuffer(messageId);

    // Animate in unless skipped
    if (!skipAnimation) {
      setTimeout(() => {
        messageEl.classList.remove("opacity-0", "translate-y-2");
      }, this.messageAnimationDelay);
    }

    // Scroll to bottom if already at bottom
    if (this.isScrolledToBottom) {
      this._scrollToBottom();
    } else {
      // Show "new message" indicator if not at bottom
      this._showNewMessageIndicator();
    }
  }

  /**
   * Add a system message to the chat
   * @param {string} message - System message
   * @param {boolean} [skipAnimation=false] - Whether to skip animation
   * @param {Object} [options] - Additional options
   * @param {string} [options.type] - Message type (e.g., 'power' for power notifications)
   * @param {string} [options.role] - Role related to the message (for power notifications)
   */
  addSystemMessage(message, skipAnimation = false, options = {}) {
    if (!this.elements.chatWindow) return;

    const messageEl = document.createElement("div");
    const messageId = `msg-${++this.messageCounter}`;
    messageEl.id = messageId;

    // Base classes without animation
    messageEl.className = "mb-2 transform";

    if (!skipAnimation) {
      messageEl.classList.add(
        "opacity-0",
        "translate-y-2",
        "transition-transform",
        "duration-300",
        "ease-out"
      );
    }

    // Determine if this is a power notification
    const isPowerMessage = options.type === "power";

    // Create a role class for power messages
    let roleClass = "";
    if (isPowerMessage && options.role) {
      // Convert role name to CSS class (e.g., "Safe Cracker" -> "safe-cracker")
      roleClass = options.role.toLowerCase().replace(/\s+/g, "-");
    }

    messageEl.innerHTML = `
      <div class="chat-system-message px-2 py-1 md:px-3 md:py-1.5 bg-gray-800 bg-opacity-80 rounded-lg text-center mx-auto w-[80%] md:w-[85%] ${
        isPowerMessage ? "power-message " + roleClass : ""
      }">
        <span class="text-xs md:text-sm ${
          isPowerMessage
            ? "text-blue-400 font-medium"
            : "text-purple-400 italic"
        } flex items-center justify-center">
          ${
            isPowerMessage
              ? `<svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-3 w-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
              </svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>`
          }
          ${this._escapeHtml(message)}
        </span>
        <div class="text-[10px] text-gray-500 mt-0.5">${this._getTimestamp()}</div>
      </div>
    `;

    this.elements.chatWindow.appendChild(messageEl);

    // Add to buffer for max message management
    this._addToMessageBuffer(messageId);

    // Animate in unless skipped
    if (!skipAnimation) {
      setTimeout(() => {
        messageEl.classList.remove("opacity-0", "translate-y-2");
      }, this.messageAnimationDelay);
    }

    // Scroll to bottom
    if (this.isScrolledToBottom) {
      this._scrollToBottom();
    }
  }

  /**
   * Add a message ID to the buffer and trim if needed
   * @param {string} messageId - Message element ID
   * @private
   */
  _addToMessageBuffer(messageId) {
    this.messageBuffer.push(messageId);

    // Trim buffer if too large
    if (this.messageBuffer.length > this.maxMessages) {
      const removedId = this.messageBuffer.shift();
      // Remove from DOM too
      if (removedId && this.elements.chatWindow) {
        const elem = document.getElementById(removedId);
        if (elem) {
          elem.remove();
        }
      }
    }
  }

  /**
   * Send a chat message
   * @private
   */
  _sendMessage() {
    if (!this.elements.chatInput) return;

    const message = this.elements.chatInput.value.trim();
    if (!message) return;

    // Check if throttled
    if (this._isThrottled()) {
      this._showThrottleFeedback();
      return;
    }

    // Update last message time
    this.lastMessageTime = Date.now();

    // Send message
    playerStateManager
      .sendChatMessage(message)
      .then((success) => {
        if (success) {
          // Clear input only if message was sent successfully
          this.elements.chatInput.value = "";
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  }

  /**
   * Check if message sending is throttled
   * @returns {boolean} - Whether throttled
   * @private
   */
  _isThrottled() {
    return Date.now() - this.lastMessageTime < this.messageThrottleMs;
  }

  /**
   * Show visual feedback when message is throttled
   * @private
   */
  _showThrottleFeedback() {
    if (!this.elements.chatInput) return;

    // Add shake animation class
    this.elements.chatInput.classList.add("animate-shake");

    // Remove after animation completes
    setTimeout(() => {
      this.elements.chatInput.classList.remove("animate-shake");
    }, 500);
  }

  /**
   * Show indicator for new messages when scrolled up
   * @private
   */
  _showNewMessageIndicator() {
    // Implementation would depend on UI design
    // Could create a floating "New messages" button that scrolls to bottom when clicked
  }

  /**
   * Create HTML for a chat message
   * @param {Object} data - Message data
   * @param {boolean} isCurrentPlayer - Whether the message is from the current player
   * @param {string} roleColor - Color for the player's role
   * @param {string} role - Player's role
   * @returns {string} - HTML for the message
   * @private
   */
  _createMessageHTML(data, isCurrentPlayer, roleColor, role) {
    return `
      <div class="chat-message ${
        isCurrentPlayer ? "ml-auto" : "mr-auto"
      } mb-2 max-w-[85%] md:max-w-[90%]">
        ${
          isCurrentPlayer
            ? ""
            : `
          <div class="font-bold text-${roleColor}-400 mb-1 flex items-center text-xs md:text-sm">
            <span class="mr-1">${this._escapeHtml(data.playerName)}</span>
            <span class="text-xs text-${roleColor}-300 bg-${roleColor}-900 bg-opacity-40 px-1.5 py-0.5 rounded">${this._escapeHtml(
                role
              )}</span>
          </div>
        `
        }
        <div class="chat-message-bubble ${
          isCurrentPlayer
            ? "own bg-" + roleColor + "-700 bg-opacity-50"
            : "other bg-gray-700"
        } text-white text-xs md:text-sm">
          ${this._formatMessage(data.message)}
        </div>
        <div class="text-xs text-gray-500 mt-0.5 ${
          isCurrentPlayer ? "text-right" : ""
        }">
          ${this._getTimestamp()}
        </div>
      </div>
    `;
  }

  /**
   * Generate a timestamp for chat messages
   * @returns {string} Formatted timestamp (HH:MM)
   * @private
   */
  _getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Format chat message with enhancements
   * @param {string} message - Raw message text
   * @returns {string} - HTML-formatted message
   * @private
   */
  _formatMessage(message) {
    let formatted = this._escapeHtml(message);

    // Convert URLs to clickable links (with proper target and rel attributes)
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-300 hover:underline">$1</a>'
    );

    // Highlight code-like text
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-800 px-1 rounded text-green-300 font-mono">$1</code>'
    );

    return formatted;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} unsafe - Unsafe string
   * @returns {string} - Escaped string
   * @private
   */
  _escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Scroll chat window to the bottom
   * @private
   */
  _scrollToBottom() {
    if (!this.elements.chatWindow) return;

    this.elements.chatWindow.scrollTop = this.elements.chatWindow.scrollHeight;
    this.isScrolledToBottom = true;
  }

  /**
   * Clear all chat messages
   */
  clearChat() {
    if (!this.elements.chatWindow) return;

    this.elements.chatWindow.innerHTML = "";
    this.messageBuffer = [];
    this.messageCounter = 0;
  }
}

export default ChatManager;
