// websocketManager.js - Handles all WebSocket communication for the game

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.connectionDetails = {
      roomCode: null,
      playerId: null,
    };
    this.callbacks = {
      onOpen: [],
      onMessage: [],
      onClose: [],
      onError: [],
      onReconnect: [],
      onReconnectFailed: [],
    };
    this.messageHandlers = {};
  }

  /**
   * Connect to WebSocket server
   * @param {string} roomCode - The game room code
   * @param {string} playerId - The player's unique ID
   * @returns {Promise} - Resolves when connection is established
   */
  connect(roomCode, playerId) {
    return new Promise((resolve, reject) => {
      if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Clear any existing reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Store connection info for reconnection
      this.connectionDetails = { roomCode, playerId };

      // Create WebSocket with proper error handling
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}/${playerId}`;

        this.socket = new WebSocket(wsUrl);

        // Setup event handlers
        this.socket.onopen = (event) => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this._triggerCallbacks("onOpen", event);
          resolve();
        };

        this.socket.onmessage = (event) => {
          this._handleMessage(event);
        };

        this.socket.onclose = (event) => {
          const wasConnected = this.connected;
          this.connected = false;
          this._triggerCallbacks("onClose", event);

          // Only attempt reconnect if we were previously connected and it wasn't a normal closure
          if (wasConnected && event.code !== 1000) {
            this._attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this._triggerCallbacks("onError", error);

          // Only reject the promise if we're in the connection phase
          if (!this.connected) {
            reject(error);
          }
        };
      } catch (error) {
        console.error("Failed to initialize WebSocket:", error);
        reject(error);
      }
    });
  }

  /**
   * Send data through the WebSocket
   * @param {Object} data - Data to send
   * @returns {Promise<boolean>} - Resolves to success status
   */
  send(data) {
    return new Promise((resolve) => {
      if (
        !this.connected ||
        !this.socket ||
        this.socket.readyState !== WebSocket.OPEN
      ) {
        console.error("Cannot send message: WebSocket not connected");
        resolve(false);
        return;
      }

      try {
        console.log("WebSocketManager: Sending message:", data);
        this.socket.send(JSON.stringify(data));
        resolve(true);
      } catch (error) {
        console.error("Error sending message:", error);
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   * @param {string} [reason="User disconnected"] - Reason for disconnection
   */
  disconnect(reason = "User disconnected") {
    // Clear any pending reconnection attempts
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      try {
        this.socket.close(1000, reason);
      } catch (error) {
        console.error("Error closing WebSocket connection:", error);
      }
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Register a callback for a specific event type
   * @param {string} event - Event type ('onOpen', 'onMessage', 'onClose', 'onError', 'onReconnect', 'onReconnectFailed')
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove this specific callback
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      console.error(`Unknown event type: ${event}`);
      return () => {}; // Return no-op function
    }

    this.callbacks[event].push(callback);

    // Return function to remove this specific callback
    return () => {
      this.callbacks[event] = this.callbacks[event].filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Register a handler for a specific message type
   * @param {string} messageType - Type of message to handle
   * @param {Function} handler - Handler function
   */
  registerMessageHandler(messageType, handler) {
    if (!this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = [];
    }
    this.messageHandlers[messageType].push(handler);
  }

  /**
   * Remove a specific handler for a message type
   * @param {string} messageType - Type of message
   * @param {Function} [handler] - Handler to remove. If not provided, removes all handlers for this type.
   */
  removeMessageHandler(messageType, handler = null) {
    if (!this.messageHandlers[messageType]) {
      return;
    }

    if (handler === null) {
      delete this.messageHandlers[messageType];
    } else {
      this.messageHandlers[messageType] = this.messageHandlers[
        messageType
      ].filter((h) => h !== handler);
      if (this.messageHandlers[messageType].length === 0) {
        delete this.messageHandlers[messageType];
      }
    }
  }

  /**
   * Check if WebSocket connection is active
   * @returns {boolean} - True if connected and ready
   */
  isConnected() {
    return this.connected && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Private: Handle incoming messages
   * @param {MessageEvent} event - WebSocket message event
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocketManager: Received message:", data);
      this._triggerCallbacks("onMessage", data);

      // Route to specific handlers if registered
      if (data.type && this.messageHandlers[data.type]) {
        console.log(`WebSocketManager: Processing message type: ${data.type}`);
        for (const handler of this.messageHandlers[data.type]) {
          try {
            handler(data);
          } catch (handlerError) {
            console.error(
              `Error in handler for message type ${data.type}:`,
              handlerError
            );
          }
        }
      }
    } catch (error) {
      console.error("Error parsing message:", error, "Raw data:", event.data);
    }
  }

  /**
   * Private: Trigger callbacks for a specific event
   * @param {string} event - Event type
   * @param {any} data - Event data
   */
  _triggerCallbacks(event, data) {
    if (!this.callbacks[event]) {
      return;
    }

    // Create a copy of the callbacks array to prevent issues if callbacks are added/removed during iteration
    const callbacks = [...this.callbacks[event]];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    }
  }

  /**
   * Private: Attempt to reconnect to the WebSocket server
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnection attempts reached");
      this._triggerCallbacks("onReconnectFailed", {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      console.log("Reconnecting...");
      this._triggerCallbacks("onReconnect", this.reconnectAttempts);

      const { roomCode, playerId } = this.connectionDetails;
      this.connect(roomCode, playerId).catch(() => {
        // Connection failed, will retry automatically if attempts remain
      });
    }, delay);
  }
}

// Create a singleton instance
const websocketManager = new WebSocketManager();
export default websocketManager;
