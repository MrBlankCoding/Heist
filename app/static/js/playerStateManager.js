// playerStateManager.js - Manages player states and game state

import websocketManager from "./websocketManager.js";

class PlayerStateManager {
  constructor() {
    // Use a frozen object for immutable constants
    this.GAME_STATUS = Object.freeze({
      WAITING: "waiting",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed",
      FAILED: "failed",
    });

    // Define valid roles
    this.VALID_ROLES = Object.freeze([
      "Hacker",
      "Safe Cracker",
      "Demolitions",
      "Lookout",
    ]);

    // Initialize game state
    this.gameState = {
      roomCode: null,
      playerId: null,
      playerName: null,
      playerRole: null,
      stage: 1,
      status: this.GAME_STATUS.WAITING,
      timer: 300,
      alertLevel: 0,
      players: {},
      puzzles: {},
      timerExtendVotes: new Set(),
      lastServerSync: null,
      lastSyncTimer: null,
    };

    // Define role information
    this.roleDescriptions = Object.freeze({
      Hacker: {
        description: "Circuit puzzles, code breaking, matching patterns",
        power: "Temporarily slow a timer",
        color: "blue",
      },
      "Safe Cracker": {
        description: "Audio cues, memory games, tactile lock puzzles",
        power: "Skip one lock with a rare tool",
        color: "yellow",
      },
      Demolitions: {
        description: "Timing puzzles, fuse wiring, spatial challenges",
        power: "Break weak walls for shortcuts",
        color: "red",
      },
      Lookout: {
        description: "Pattern recognition, surveillance puzzles",
        power: "Warn team of events or traps",
        color: "green",
      },
    });

    // Stage information
    this.stageInfo = Object.freeze([
      { number: 1, name: "Perimeter Breach", difficulty: "Easy" },
      { number: 2, name: "Security Systems", difficulty: "Medium" },
      { number: 3, name: "Laser Hallways", difficulty: "Medium" },
      { number: 4, name: "Vault Access", difficulty: "Hard" },
      { number: 5, name: "Escape Sequence", difficulty: "Very Hard" },
    ]);

    // Event handling
    this.eventListeners = {};
    this.temporaryHandlers = new Map();
    this.handlerIdCounter = 0;

    // Local timer interval for smooth real-time updates
    this.localTimerInterval = null;

    // Initialize WebSocket handlers
    this._setupWebSocketHandlers();
  }

  /**
   * Initialize player state with user information
   * @param {string} roomCode - Game room code
   * @param {string} playerId - Player ID
   * @param {string} playerName - Player name
   * @returns {Promise} - Resolves when connection is established
   */
  initialize(roomCode, playerId, playerName) {
    if (!roomCode || !playerId) {
      return Promise.reject(new Error("Room code and player ID are required"));
    }

    this.gameState.roomCode = roomCode;
    this.gameState.playerId = playerId;
    this.gameState.playerName = playerName;

    return websocketManager.connect(roomCode, playerId);
  }

  /**
   * Select a role for the player
   * @param {string} role - Role to select
   * @returns {Promise} - Resolves when role selection is confirmed
   */
  selectRole(role) {
    // Validate role
    if (!this.VALID_ROLES.includes(role)) {
      console.error("PlayerStateManager: Invalid role:", role);
      return Promise.reject(new Error(`Invalid role: ${role}`));
    }

    // Check websocket connection
    if (!websocketManager.isConnected()) {
      console.error("PlayerStateManager: WebSocket not connected");
      return Promise.reject(new Error("WebSocket not connected"));
    }

    return new Promise((resolve, reject) => {
      // Create a temporary message handler
      const handlerId = this._getNextHandlerId();

      // Set up handler for role confirmation
      const handleResponse = (data) => {
        if (data.type === "role_confirmed") {
          // Update local game state
          this.gameState.playerRole = role;

          // Trigger event for role selection
          this.trigger("playerRoleSelected", {
            playerId: this.gameState.playerId,
            role: role,
            player: data.player,
          });

          resolve(data);
          this._cleanupTemporaryHandler(handlerId);
        } else if (data.type === "error" && data.context === "role_selection") {
          reject(new Error(data.message || "Role selection failed"));
          this._cleanupTemporaryHandler(handlerId);
        }
      };

      // Register temporary handlers
      this.temporaryHandlers.set(handlerId, {
        role_confirmed: handleResponse,
        error: handleResponse,
      });

      websocketManager.registerMessageHandler("role_confirmed", handleResponse);
      websocketManager.registerMessageHandler("error", handleResponse);

      // Send role selection message
      websocketManager
        .send({
          type: "select_role",
          player_id: this.gameState.playerId,
          role: role,
        })
        .catch((error) => {
          console.error(
            "PlayerStateManager: Error sending role selection:",
            error
          );
          reject(error);
          this._cleanupTemporaryHandler(handlerId);
        });
    });
  }

  /**
   * Start the game (host only)
   * @returns {Promise} - Resolves when game starts
   */
  startGame() {
    return new Promise((resolve, reject) => {
      if (!this.isHost()) {
        reject(new Error("Only the host can start the game"));
        return;
      }

      if (!websocketManager.isConnected()) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      // Create a temporary message handler
      const handlerId = this._getNextHandlerId();

      // Set up handler for game start confirmation
      const handleResponse = (data) => {
        if (data.type === "game_started") {
          resolve();
          this._cleanupTemporaryHandler(handlerId);
        } else if (data.type === "error" && data.context === "game_start") {
          reject(new Error(data.message));
          this._cleanupTemporaryHandler(handlerId);
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("game_started", handleResponse);

      websocketManager.registerMessageHandler("error", handleResponse);

      // Send game start request
      websocketManager
        .send({
          type: "start_game",
          player_id: this.gameState.playerId, // Include player ID to verify host status
        })
        .catch((error) => {
          reject(error);
          this._cleanupTemporaryHandler(handlerId);
        });
    });
  }

  /**
   * Use the player's role power
   * @returns {Promise} - Resolves when power use is confirmed
   */
  useRolePower() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.playerRole) {
        reject(new Error("No role selected"));
        return;
      }

      if (!websocketManager.isConnected()) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      // Create a temporary message handler
      const handlerId = this._getNextHandlerId();

      // Set up handler for power use confirmation
      const handleResponse = (data) => {
        if (
          data.type === "power_used" &&
          data.player_id === this.gameState.playerId
        ) {
          resolve();
          this._cleanupTemporaryHandler(handlerId);
        } else if (data.type === "error" && data.context === "power_use") {
          reject(new Error(data.message));
          this._cleanupTemporaryHandler(handlerId);
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("power_used", handleResponse);

      websocketManager.registerMessageHandler("error", handleResponse);

      // Send power use request
      websocketManager
        .send({
          type: "use_power",
        })
        .catch((error) => {
          reject(error);
          this._cleanupTemporaryHandler(handlerId);
        });
    });
  }

  /**
   * Vote to extend the timer
   * @param {boolean} voteYes - Whether to vote yes
   * @returns {Promise} - Resolves when vote is registered
   */
  voteExtendTimer(voteYes = true) {
    return websocketManager.send({
      type: "extend_timer_vote",
      vote: voteYes,
    });
  }

  /**
   * Initiate a timer extension vote (usually from the UI button)
   * @returns {Promise} - Resolves when vote is initiated
   */
  initiateTimerExtensionVote() {
    return websocketManager.send({
      type: "initiate_timer_vote",
    });
  }

  /**
   * Submit a puzzle solution
   * @param {any} solution - Solution data
   * @returns {Promise} - Resolves when solution is processed
   */
  submitPuzzleSolution(solution) {
    return new Promise((resolve, reject) => {
      if (!websocketManager.isConnected()) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      // Generate a unique handler ID
      const handlerId = this._getNextHandlerId();

      // Define the message handlers
      const handleCompletion = (data) => {
        if (data.player_id === this.gameState.playerId) {
          resolve(true); // Success
          this._cleanupTemporaryHandler(handlerId);
        }
      };

      const handleFailure = (data) => {
        if (data.player_id === this.gameState.playerId) {
          resolve(false); // Incorrect solution
          this._cleanupTemporaryHandler(handlerId);
        }
      };

      const handleError = (data) => {
        if (data.context === "puzzle_solution") {
          reject(new Error(data.message));
          this._cleanupTemporaryHandler(handlerId);
        }
      };

      // Store the handler references
      this.temporaryHandlers.set(handlerId, {
        puzzleCompleted: handleCompletion,
        puzzleFailed: handleFailure,
        error: handleError,
      });

      // Register the temporary handlers
      websocketManager.registerMessageHandler(
        "puzzle_completed",
        this.temporaryHandlers.get(handlerId).puzzleCompleted
      );
      websocketManager.registerMessageHandler(
        "puzzle_failed",
        this.temporaryHandlers.get(handlerId).puzzleFailed
      );
      websocketManager.registerMessageHandler(
        "error",
        this.temporaryHandlers.get(handlerId).error
      );

      // Set a timeout to remove handlers in case of no response
      setTimeout(() => {
        if (this.temporaryHandlers.has(handlerId)) {
          reject(new Error("Timeout waiting for puzzle solution response"));
          this._cleanupTemporaryHandler(handlerId);
        }
      }, 10000); // 10 second timeout

      // Send solution
      websocketManager
        .send({
          type: "puzzle_solution",
          solution: solution,
        })
        .catch((error) => {
          reject(error);
          this._cleanupTemporaryHandler(handlerId);
        });
    });
  }

  /**
   * Send a chat message to the team
   * @param {string} message - Message text
   * @returns {Promise} - Resolves when message is sent
   */
  sendChatMessage(message) {
    if (!message || message.trim() === "") {
      return Promise.resolve(false);
    }

    return websocketManager.send({
      type: "chat_message",
      message: message.trim(),
    });
  }

  /**
   * Get the current stage information
   * @returns {Object} - Stage info
   */
  getCurrentStageInfo() {
    const stageIndex = Math.max(
      0,
      Math.min(this.gameState.stage - 1, this.stageInfo.length - 1)
    );
    return this.stageInfo[stageIndex];
  }

  /**
   * Get role information
   * @param {string} role - Role name
   * @returns {Object|null} - Role description
   */
  getRoleInfo(role) {
    return this.roleDescriptions[role] || null;
  }

  /**
   * Get a player by ID
   * @param {string} playerId - Player ID
   * @returns {Object|null} - Player object
   */
  getPlayer(playerId) {
    return this.gameState.players[playerId] || null;
  }

  /**
   * Get all players
   * @returns {Object} - Players object
   */
  getAllPlayers() {
    return this.gameState.players;
  }

  /**
   * Check if the current player is the host
   * @returns {boolean} - True if player is host
   */
  isHost() {
    const currentPlayerId = this.gameState.playerId;
    const currentPlayer = this.gameState.players[currentPlayerId];
    return !!(currentPlayer && currentPlayer.is_host);
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove this listener
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);

    // Return function to remove this specific callback
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  /**
   * Trigger event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  trigger(event, data) {
    if (!this.eventListeners[event]) return;

    const handlers = [...this.eventListeners[event]];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Private: Get the next handler ID
   * @returns {number} - Unique handler ID
   */
  _getNextHandlerId() {
    return ++this.handlerIdCounter;
  }

  /**
   * Private: Clean up temporary handlers
   * @param {number} handlerId - Handler ID to clean up
   */
  _cleanupTemporaryHandler(handlerId) {
    const handlers = this.temporaryHandlers.get(handlerId);
    if (!handlers) return;

    // Remove all handlers
    Object.entries(handlers).forEach(([type, handler]) => {
      websocketManager.removeMessageHandler(type, handler);
    });

    // Remove from map
    this.temporaryHandlers.delete(handlerId);
  }

  /**
   * Private: Set up WebSocket message handlers
   */
  _setupWebSocketHandlers() {
    // Game state update
    websocketManager.registerMessageHandler("game_state", (data) => {
      // Update the stored game state
      this.gameState.stage = data.stage;
      this.gameState.status = data.status;
      this.gameState.timer = data.timer;
      this.gameState.alertLevel = data.alert_level;

      // Update players with proper is_host property
      const updatedPlayers = {};
      Object.entries(data.players).forEach(([playerId, playerData]) => {
        updatedPlayers[playerId] = {
          id: playerId, // Ensure id is always set
          name: playerData.name,
          role: playerData.role,
          connected: playerData.connected,
          is_host: playerData.is_host,
        };

        // If this is the current player, also update playerRole
        if (playerId === this.gameState.playerId && playerData.role) {
          this.gameState.playerRole = playerData.role;
          console.log(
            "Updated current player role from game state:",
            playerData.role
          );
        }
      });
      this.gameState.players = updatedPlayers;

      // Start local timer if game is in progress
      if (data.status === "in_progress" && !this.localTimerInterval) {
        this._startLocalTimer();
      }

      // Trigger events
      this.trigger("gameStateUpdated", data);

      // Trigger player connected events for all players
      Object.entries(data.players).forEach(([playerId, player]) => {
        this.trigger("playerConnected", {
          id: playerId,
          name: player.name,
          role: player.role,
          connected: player.connected,
          is_host: player.is_host,
        });
      });
    });

    // Timer vote initiated
    websocketManager.registerMessageHandler("timer_vote_initiated", (data) => {
      // Store the vote data for future reference
      this.gameState.timerVote = {
        initiator: data.initiator_id,
        votes: data.votes || [],
        voteTimeLimit: data.vote_time_limit || 20,
      };

      // Trigger event for UI to show the vote modal
      this.trigger("timerVoteInitiated", {
        initiatorId: data.initiator_id,
        initiatorName: data.initiator_name,
        voteTimeLimit: data.vote_time_limit || 20,
        votes: data.votes || [],
        players: this.gameState.players,
      });
    });

    // Timer vote update
    websocketManager.registerMessageHandler("timer_vote_update", (data) => {
      // Update local vote data
      if (this.gameState.timerVote) {
        this.gameState.timerVote.votes = data.votes || [];
      }

      // Trigger event to update UI
      this.trigger("timerVoteUpdated", {
        votes: data.votes || [],
        playerId: data.player_id, // Player who just voted
        vote: data.vote, // Yes/no vote
        players: this.gameState.players,
      });
    });

    // Timer vote completed
    websocketManager.registerMessageHandler("timer_vote_completed", (data) => {
      // Clear the vote data
      this.gameState.timerVote = null;

      // Trigger event to hide the vote modal and show result
      this.trigger("timerVoteCompleted", {
        success: data.success,
        votes: data.votes || [],
        requiredVotes: data.required_votes,
        message: data.message,
      });
    });

    // Power used notification for all players
    websocketManager.registerMessageHandler("power_used", (data) => {
      // Only trigger event if it's not the current player (they get their own success message)
      if (data.player_id !== this.gameState.playerId) {
        const player = this.getPlayer(data.player_id);
        if (player) {
          const roleInfo = this.getRoleInfo(data.role);
          this.trigger("powerUsed", {
            playerId: data.player_id,
            playerName: player.name,
            role: data.role,
            powerDescription: roleInfo ? roleInfo.power : "Special ability",
          });
        }
      }
    });

    // Timer updates
    websocketManager.registerMessageHandler("timer_update", (data) => {
      // Sync our local timer with the server time
      this.gameState.timer = data.timer;
      this.gameState.lastServerSync = Date.now();
      this.gameState.lastSyncTimer = data.timer;

      // Only log syncs when explicitly requested
      if (data.sync) {
        console.log("Timer synced with server:", data.timer);
      }

      // Make sure local timer is running if not already
      if (!this.localTimerInterval && this.gameState.status === "in_progress") {
        this._startLocalTimer();
      }

      this.trigger("timerUpdated", data.timer);
    });

    // Timer extended
    websocketManager.registerMessageHandler("timer_extended", (data) => {
      this.gameState.timer = data.new_timer;
      this.gameState.alertLevel = data.alert_level;
      this.gameState.timerExtendVotes.clear();

      // Update synchronization timestamps
      this.gameState.lastServerSync = Date.now();
      this.gameState.lastSyncTimer = data.new_timer;

      this.trigger("timerExtended", {
        timer: data.new_timer,
        alertLevel: data.alert_level,
      });
    });

    // Alert level change
    websocketManager.registerMessageHandler("alert_level_changed", (data) => {
      this.gameState.alertLevel = data.level;
      this.trigger("alertLevelChanged", data.level);
    });

    // Puzzle data
    websocketManager.registerMessageHandler("puzzle_data", (data) => {
      console.log("Puzzle data received:", data.puzzle);
      if (!this.gameState.puzzles[this.gameState.playerId]) {
        this.gameState.puzzles[this.gameState.playerId] = {};
      }
      this.gameState.puzzles[this.gameState.playerId] = data.puzzle;
      this.trigger("puzzleReceived", data.puzzle);
    });

    // Puzzle completed
    websocketManager.registerMessageHandler("puzzle_completed", (data) => {
      console.log("Puzzle completed event:", data);
      this.trigger("puzzleCompleted", {
        playerId: data.player_id,
        role: data.role,
      });
    });

    // Stage completed
    websocketManager.registerMessageHandler("stage_completed", (data) => {
      this.gameState.stage = data.next_stage;
      this.trigger("stageCompleted", data.next_stage);
    });

    // Game completed or over events - stop the timer
    websocketManager.registerMessageHandler("game_completed", () => {
      this.gameState.status = this.GAME_STATUS.COMPLETED;
      this._stopLocalTimer();
      this.trigger("gameCompleted");
    });

    websocketManager.registerMessageHandler("game_over", (data) => {
      this.gameState.status = this.GAME_STATUS.FAILED;
      this._stopLocalTimer();
      this.trigger("gameOver", data.result);
    });

    // Random event
    websocketManager.registerMessageHandler("random_event", (data) => {
      this.trigger("randomEvent", {
        event: data.event,
        duration: data.duration,
      });
    });

    // Chat message
    websocketManager.registerMessageHandler("chat_message", (data) => {
      this.trigger("chatMessage", {
        playerId: data.player_id,
        playerName: data.player_name,
        message: data.message,
      });
    });

    // Player connected
    websocketManager.registerMessageHandler("player_connected", (data) => {
      if (data.player) {
        this.gameState.players[data.player.id] = {
          name: data.player.name,
          role: data.player.role,
          connected: data.player.connected,
          is_host: data.player.is_host,
        };
        this.trigger("playerConnected", data.player);
      }
    });

    // Player disconnected
    websocketManager.registerMessageHandler("player_disconnected", (data) => {
      if (this.gameState.players[data.player_id]) {
        const player = { ...this.gameState.players[data.player_id] };
        this.gameState.players[data.player_id].connected = false;
        this.trigger("playerDisconnected", data.player_id);
      }
    });

    // Role selection confirmation
    websocketManager.registerMessageHandler("role_confirmed", (data) => {
      console.log("WebSocket message: role_confirmed", data);

      // Update the player's role in the game state
      if (data.player_id === this.gameState.playerId) {
        this.gameState.playerRole = data.role;
        console.log("Updated current player role to:", data.role);
        this.trigger("roleChanged", data.role);
      }

      // Update the player's role in the players object
      if (this.gameState.players[data.player_id]) {
        const updatedPlayer = {
          ...this.gameState.players[data.player_id],
          id: data.player_id, // Ensure id is included
          role: data.role,
        };
        this.gameState.players[data.player_id] = updatedPlayer;
        console.log("Updated player in players object:", updatedPlayer);

        // Trigger the event with complete player data for UI updates
        this.trigger("playerRoleSelected", {
          playerId: data.player_id,
          role: data.role,
          player: updatedPlayer, // Include full player object
        });
      } else {
        console.warn("Player not found in players object:", data.player_id);
        // Create the player object if it doesn't exist
        this.gameState.players[data.player_id] = {
          id: data.player_id,
          role: data.role,
          name: "Player " + data.player_id.slice(0, 4),
          connected: true,
          is_host: false,
        };

        // Trigger the event with this new player data
        this.trigger("playerRoleSelected", {
          playerId: data.player_id,
          role: data.role,
          player: this.gameState.players[data.player_id],
        });
      }

      // Update all players if the message includes player data
      if (data.players) {
        console.log("Received updated players data:", data.players);
        Object.entries(data.players).forEach(([playerId, playerData]) => {
          if (this.gameState.players[playerId]) {
            this.gameState.players[playerId] = {
              ...this.gameState.players[playerId],
              id: playerId, // Ensure id is included
              name: playerData.name,
              role: playerData.role,
              connected: playerData.connected,
              is_host: playerData.is_host,
            };
            console.log(
              "Updated player from broadcast data:",
              playerId,
              this.gameState.players[playerId]
            );
          } else {
            // Create the player if not found
            this.gameState.players[playerId] = {
              id: playerId,
              name: playerData.name,
              role: playerData.role,
              connected: playerData.connected,
              is_host: playerData.is_host,
            };
            console.log(
              "Added new player from broadcast data:",
              playerId,
              this.gameState.players[playerId]
            );
          }
        });
      }
    });

    // Game started event
    websocketManager.registerMessageHandler("game_started", (data) => {
      this.gameState.status = this.GAME_STATUS.IN_PROGRESS;
      this.gameState.stage = data.stage;
      this.gameState.timer = data.timer;

      // Start the local timer for real-time updates
      this._startLocalTimer();

      this.trigger("gameStarted", data);
    });

    // Error handling
    websocketManager.registerMessageHandler("error", (data) => {
      console.error("Server error:", data);
      this.trigger("error", data);
    });
  }

  /**
   * Start the local timer for real-time updates
   * @private
   */
  _startLocalTimer() {
    // Clear any existing timer first
    this._stopLocalTimer();

    // Store the last sync time
    if (!this.gameState.lastServerSync) {
      this.gameState.lastServerSync = Date.now();
    }

    // Start a new timer that decrements each second
    this.localTimerInterval = setInterval(() => {
      // Only decrement if the game is in progress
      if (this.gameState.status === this.GAME_STATUS.IN_PROGRESS) {
        // Check if we've drifted too far from expected time
        const timeSinceSync = Date.now() - this.gameState.lastServerSync;
        const expectedSeconds = Math.floor(timeSinceSync / 1000);
        const drift = Math.abs(
          expectedSeconds -
            (this.gameState.lastSyncTimer - this.gameState.timer)
        );

        // If drift is more than 2 seconds, log a warning but continue (server will correct us)
        if (drift > 2) {
          console.warn(`Timer drift detected: ${drift}s`);
        }

        // Decrement the timer by 1 second
        if (this.gameState.timer > 0) {
          this.gameState.timer -= 1;

          // Trigger the timer updated event with the new time
          this.trigger("localTimerUpdated", this.gameState.timer);
        }

        // If timer reaches zero, handle game end
        if (this.gameState.timer <= 0) {
          this._stopLocalTimer();
        }
      }
    }, 1000); // Update every second
  }

  /**
   * Stop the local timer
   * @private
   */
  _stopLocalTimer() {
    if (this.localTimerInterval) {
      clearInterval(this.localTimerInterval);
      this.localTimerInterval = null;
    }
  }
}

// Create a singleton instance
const playerStateManager = new PlayerStateManager();
export default playerStateManager;
