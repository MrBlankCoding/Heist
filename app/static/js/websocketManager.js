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

  connect(roomCode, playerId) {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve();
        return;
      }

      this._clearReconnectTimer();
      this.connectionDetails = { roomCode, playerId };

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}/${playerId}`;
        this.socket = new WebSocket(wsUrl);

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

          if (wasConnected && event.code !== 1000) {
            this._attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this._triggerCallbacks("onError", error);

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

  send(data) {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        console.error("Cannot send message: WebSocket not connected");
        resolve(false);
        return;
      }

      try {
        this.socket.send(JSON.stringify(data));
        resolve(true);
      } catch (error) {
        console.error("Error sending message:", error);
        resolve(false);
      }
    });
  }

  disconnect(reason = "User disconnected") {
    this._clearReconnectTimer();

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
      this._triggerCallbacks("onReconnect", this.reconnectAttempts);

      const { roomCode, playerId } = this.connectionDetails;
      this.connect(roomCode, playerId).catch(() => {
        // Connection failed, will retry automatically if attempts remain
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
