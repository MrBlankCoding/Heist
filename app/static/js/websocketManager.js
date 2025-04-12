// websocketManager.js - Handles all WebSocket communication for the game

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.pingIntervalTime = 30000; // 30 seconds
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
    this.debug = true; // Enable debug mode
    this.messageQueue = []; // Queue for messages that failed to send
    this.processingQueue = false; // Flag to prevent multiple queue processing
  }

  connect(roomCode, playerId) {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        console.log("Already connected, reusing connection");
        resolve();
        return;
      }

      if (this.connecting) {
        console.log("Connection attempt already in progress");
        reject(new Error("Connection attempt in progress"));
        return;
      }

      this._clearReconnectTimer();
      this._clearPingInterval();
      this.connectionDetails = { roomCode, playerId };
      this.connecting = true;

      try {
        console.log(
          `Connecting to WebSocket for room ${roomCode}, player ${playerId}`
        );
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}/${playerId}`;

        // Close existing socket if it's still open
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
          try {
            this.socket.close(1000, "Opening new connection");
          } catch (e) {
            console.warn("Error closing existing socket:", e);
          }
        }

        this.socket = new WebSocket(wsUrl);

        // Set a timeout for connection establishment
        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            console.error("WebSocket connection timed out");
            this.connecting = false;

            if (this.socket) {
              try {
                this.socket.close(1000, "Connection timeout");
              } catch (e) {
                console.warn("Error closing socket after timeout:", e);
              }
              this.socket = null;
            }

            reject(new Error("Connection timed out"));
          }
        }, 10000); // 10 seconds timeout

        this.socket.onopen = (event) => {
          console.log("WebSocket connection established");
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this._triggerCallbacks("onOpen", event);

          // Start ping interval to keep connection alive
          this._startPingInterval();

          // Process any queued messages
          this._processMessageQueue();

          resolve();
        };

        this.socket.onmessage = (event) => {
          this._handleMessage(event);
        };

        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          const wasConnected = this.connected;
          this.connected = false;
          this.connecting = false;
          this._clearPingInterval();
          this._triggerCallbacks("onClose", event);

          console.log(
            `WebSocket closed with code ${event.code}, reason: ${
              event.reason || "No reason provided"
            }, wasConnected=${wasConnected}`
          );

          if (wasConnected && event.code !== 1000) {
            this._attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this._triggerCallbacks("onError", error);

          if (!this.connected) {
            this.connecting = false;
            clearTimeout(connectionTimeout);
            reject(error);
          }
        };
      } catch (error) {
        this.connecting = false;
        console.error("Failed to initialize WebSocket:", error);
        reject(error);
      }
    });
  }

  send(data) {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        console.error("Cannot send message: WebSocket not connected");

        // Queue the message for later retry
        this.messageQueue.push({
          data: data,
          resolve: resolve,
          timestamp: Date.now(),
        });

        // Try to reconnect if not already connecting
        if (!this.connecting) {
          this._attemptReconnect();
        }

        resolve(false);
        return;
      }

      try {
        // Log outgoing messages in debug mode
        if (this.debug) {
          console.log("WebSocket sending:", data);
        }

        this.socket.send(JSON.stringify(data));
        resolve(true);
      } catch (error) {
        console.error("Error sending message:", error);

        // Queue the message for later retry
        this.messageQueue.push({
          data: data,
          resolve: resolve,
          timestamp: Date.now(),
        });

        resolve(false);
      }
    });
  }

  _startPingInterval() {
    this._clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this._sendPing().catch((error) => {
          console.warn("Error sending ping:", error);
        });
      } else {
        this._clearPingInterval();
      }
    }, this.pingIntervalTime);
  }

  _sendPing() {
    return this.send({
      type: "ping",
      timestamp: Date.now(),
    });
  }

  _clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _processMessageQueue() {
    if (
      this.processingQueue ||
      this.messageQueue.length === 0 ||
      !this.isConnected()
    ) {
      return;
    }

    this.processingQueue = true;
    console.log(`Processing ${this.messageQueue.length} queued messages`);

    // Create a copy of the queue and clear the original
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];

    // Process each message
    const processMessage = (index) => {
      if (index >= queueCopy.length) {
        this.processingQueue = false;
        return;
      }

      const item = queueCopy[index];

      // Skip messages older than 2 minutes
      if (Date.now() - item.timestamp > 120000) {
        console.log("Skipping old queued message:", item.data);
        // Process next message
        setTimeout(() => processMessage(index + 1), 50);
        return;
      }

      try {
        if (this.debug) {
          console.log("Sending queued message:", item.data);
        }

        this.socket.send(JSON.stringify(item.data));
        item.resolve(true);
      } catch (error) {
        console.error("Error sending queued message:", error);
        // Add back to queue for next attempt if we still have a connection
        if (this.isConnected()) {
          this.messageQueue.push(item);
        }
        item.resolve(false);
      }

      // Process next message with a small delay to prevent flooding
      setTimeout(() => processMessage(index + 1), 50);
    };

    // Start processing
    processMessage(0);
  }

  disconnect(reason = "User disconnected") {
    this._clearReconnectTimer();
    this._clearPingInterval();

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      try {
        this.socket.close(1000, reason);
      } catch (error) {
        console.error("Error closing WebSocket connection:", error);
      }
      this.socket = null;
      this.connected = false;
      this.connecting = false;
    }
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      console.error(`Unknown event type: ${event}`);
      return () => {};
    }

    this.callbacks[event].push(callback);
    return () => {
      this.callbacks[event] = this.callbacks[event].filter(
        (cb) => cb !== callback
      );
    };
  }

  registerMessageHandler(messageType, handler) {
    if (!this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = [];
    }
    this.messageHandlers[messageType].push(handler);
  }

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

  isConnected() {
    return this.connected && this.socket?.readyState === WebSocket.OPEN;
  }

  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Handle pong response
      if (data.type === "pong") {
        // Connection is alive, no need to log or process further
        return;
      }

      // Log received messages in debug mode
      if (this.debug) {
        console.log("WebSocket received:", data);
      }

      this._triggerCallbacks("onMessage", data);

      if (data.type && this.messageHandlers[data.type]) {
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

  _triggerCallbacks(event, data) {
    if (!this.callbacks[event]) {
      return;
    }

    const callbacks = [...this.callbacks[event]];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    }
  }

  _attemptReconnect() {
    if (this.reconnectTimer || this.connecting) {
      // Already attempting to reconnect
      return;
    }

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
      this._clearReconnectTimer();
      this._triggerCallbacks("onReconnect", this.reconnectAttempts);

      const { roomCode, playerId } = this.connectionDetails;
      if (!roomCode || !playerId) {
        console.error("Missing connection details for reconnect");
        return;
      }

      this.connect(roomCode, playerId)
        .then(() => {
          console.log("Reconnection successful");
          // Process any queued messages
          this._processMessageQueue();
        })
        .catch((error) => {
          console.error("Reconnection failed:", error);
          // Connection failed, will retry automatically if attempts remain
          this._attemptReconnect();
        });
    }, delay);
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Create a singleton instance
const websocketManager = new WebSocketManager();
export default websocketManager;
