// playerStateManager.js - Manages player states and game state

import websocketManager from "./websocketManager.js";

class PlayerStateManager {
  constructor() {
    // Create a new instance of the event system for state management
    this.events = {};
    this.handlers = {};
    this.nextHandlerId = 1;

    // All game state will be managed here
    this.gameState = {
      roomCode: "",
      playerId: "",
      playerName: "",
      playerRole: "",
      stage: 0,
      status: this.GAME_STATUS.WAITING,
      players: {},
      timer: 300,
      alertLevel: 0,
      lastTimerUpdate: 0,
      lastTimerValue: 0,
      puzzles: {},
    };

    // Handlers for temporary WebSocket subscriptions
    this.temporaryHandlers = new Map();

    // Set up WebSocket handlers
    this._setupWebSocketHandlers();
  }

  // Game status constants
  get GAME_STATUS() {
    return {
      WAITING: "waiting",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed",
      FAILED: "failed",
    };
  }

  // Private: Save essential game state for reconnection
  // This method is deprecated as we now use server-side state
  _persistState() {
    // This method no longer saves to localStorage
    // State is maintained on the server via Redis
    console.log("State persistence now handled by server");
  }

  // Private: Load persisted game state
  // This method is deprecated as we now use server-side state
  _loadPersistedState() {
    // This method no longer loads from localStorage
    // State will be retrieved from the server via WebSocket
    console.log("State now retrieved from server");
    return false; // Nothing to load locally
  }

  // Clear persisted state
  // This method is modified to be a no-op since state is stored on the server
  clearPersistedState() {
    // No need to clear local state as we don't store it locally anymore
    console.log("State management now handled by server");
  }

  // Initialize game state
  initialize(roomCode, playerId, playerName) {
    return new Promise((resolve) => {
      // Set essential properties
      this.gameState.roomCode = roomCode;
      this.gameState.playerId = playerId;
      this.gameState.playerName = playerName;
      this.gameState.status = this.GAME_STATUS.WAITING;

      // No need to persist state to localStorage as it's now on the server

      this.trigger("gameStateUpdated", this.gameState);
      resolve(true);
    });
  }

  // Handle reconnection to a game
  handleReconnection() {
    return new Promise((resolve, reject) => {
      // We will rely on server to provide all necessary state
      // Check if we have essential authentication info
      if (!this.gameState.playerId) {
        // No player ID to reconnect with
        reject(new Error("No player ID available for reconnection"));
        return;
      }

      if (!this.gameState.roomCode) {
        // No room code to reconnect to
        reject(new Error("No room code available for reconnection"));
        return;
      }

      // If we have playerId and roomCode, we can attempt reconnection
      // The actual state will be populated via WebSocket upon connection
      resolve(true);
    });
  }

  /**
   * Define valid roles
   */
  get VALID_ROLES() {
    return Object.freeze(["Hacker", "Safe Cracker", "Demolitions", "Lookout"]);
  }

  /**
   * Define role information
   */
  get roleDescriptions() {
    return Object.freeze({
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
  }

  /**
   * Define stage information
   */
  get stageInfo() {
    return Object.freeze([
      { number: 1, name: "Perimeter Breach", difficulty: "Easy" },
      { number: 2, name: "Security Systems", difficulty: "Medium" },
      { number: 3, name: "Laser Hallways", difficulty: "Medium" },
      { number: 4, name: "Vault Access", difficulty: "Hard" },
      { number: 5, name: "Escape Sequence", difficulty: "Very Hard" },
    ]);
  }

  /**
   * Get the current stage information
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
    // Make sure gameState.players exists, currentPlayerId exists, and the current player exists in players
    if (
      !this.gameState.players ||
      !currentPlayerId ||
      !this.gameState.players[currentPlayerId]
    ) {
      return false;
    }
    return !!this.gameState.players[currentPlayerId].is_host;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove this listener
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return function to remove this specific callback
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Trigger event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  trigger(event, data) {
    if (!this.events[event]) return;

    const handlers = [...this.events[event]];
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
    return this.nextHandlerId++;
  }

  /**
   * Private: Clean up temporary handlers
   * @param {number} handlerId - Handler ID to clean up
   */
  _cleanupTemporaryHandler(handlerId) {
    const handlers = this.handlers[handlerId];
    if (!handlers) return;

    // Remove all handlers
    Object.entries(handlers).forEach(([type, handler]) => {
      websocketManager.removeMessageHandler(type, handler);
    });

    // Remove from map
    this.handlers[handlerId] = null;
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
          id: playerId,
          name: playerData.name,
          role: playerData.role,
          connected: playerData.connected,
          is_host: playerData.is_host,
        };

        if (playerId === this.gameState.playerId && playerData.role) {
          this.gameState.playerRole = playerData.role;
        }
      });
      this.gameState.players = updatedPlayers;

      // Persist essential state
      this._persistState();

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

    // Game reset event
    websocketManager.registerMessageHandler("game_reset", (data) => {
      // Reset game state values
      this.gameState.playerRole = null;
      this.gameState.stage = 1;
      this.gameState.status = this.GAME_STATUS.WAITING;
      this.gameState.timer = 300;
      this.gameState.alertLevel = 0;
      this.gameState.players = {};
      this.gameState.timerExtendVotes = new Set();

      // Reset all player roles
      Object.values(this.gameState.players).forEach((player) => {
        if (player) {
          player.role = null;
        }
      });

      // Stop the local timer
      if (this.localTimerInterval) {
        this._stopLocalTimer();
      }

      // Clear persisted state
      this.clearPersistedState();

      // Trigger reset event for UI to update
      this.trigger("gameReset", data);

      // Re-trigger player connected events to refresh UI
      Object.entries(this.gameState.players).forEach(([playerId, player]) => {
        this.trigger("playerConnected", {
          id: playerId,
          name: player.name,
          role: null,
          connected: player.connected,
          is_host: player.is_host,
        });
      });
    });

    // Timer vote initiated
    websocketManager.registerMessageHandler("timer_vote_initiated", (data) => {
      // Initialize the timer vote tracking in game state
      this.gameState.timerVote = {
        initiatorId: data.initiator_id,
        initiatorName: data.initiator_name,
        timeLimit: data.vote_time_limit || 20,
        votes: data.votes || [],
        yesVotes: [],
        noVotes: [],
      };

      // Trigger event for UI to show the vote modal
      this.trigger("timerVoteInitiated", {
        initiatorId: data.initiator_id,
        initiatorName: data.initiator_name,
        voteTimeLimit: data.vote_time_limit || 20,
        votes: data.votes || [],
        players: data.players || this.gameState.players,
      });
    });

    // Timer vote update
    websocketManager.registerMessageHandler("timer_vote_update", (data) => {
      // Update the vote in our state
      if (this.gameState.timerVote) {
        // Update votes
        this.gameState.timerVote.votes = data.votes || [];

        // Update yes and no votes
        if (data.player_id) {
          if (data.vote) {
            if (!this.gameState.timerVote.yesVotes.includes(data.player_id)) {
              this.gameState.timerVote.yesVotes.push(data.player_id);
            }
          } else {
            if (!this.gameState.timerVote.noVotes.includes(data.player_id)) {
              this.gameState.timerVote.noVotes.push(data.player_id);
            }
          }
        }

        // Trigger event for UI to update the vote display
        this.trigger("timerVoteUpdated", {
          votes: this.gameState.timerVote.votes,
          yesVotes: this.gameState.timerVote.yesVotes,
          noVotes: this.gameState.timerVote.noVotes,
          playerId: data.player_id,
          vote: data.vote,
          players: data.players || this.gameState.players,
        });
      }
    });

    // Timer vote completed
    websocketManager.registerMessageHandler("timer_vote_completed", (data) => {
      // Clear the vote state
      this.gameState.timerVote = null;

      // Trigger event for UI to update
      this.trigger("timerVoteCompleted", {
        success: data.success,
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
      if (!data || !data.player_id) {
        console.warn("Received invalid player_disconnected event:", data);
        return;
      }

      console.log("Player disconnected:", data.player_id);

      // Safety check to ensure players object exists
      if (!this.gameState.players) {
        this.gameState.players = {};
      }

      // If the player exists in our state, mark as disconnected
      if (this.gameState.players[data.player_id]) {
        // Create a deep copy to prevent accidental mutations
        const player = {
          ...this.gameState.players[data.player_id],
          connected: false,
        };

        // Update the player in our state
        this.gameState.players[data.player_id].connected = false;

        // Notify subscribers with complete player info
        this.trigger("playerDisconnected", data.player_id);

        console.log("Updated player connection status:", player);
      } else {
        console.warn("Disconnected player not found in state:", data.player_id);

        // Create a placeholder for the disconnected player
        this.gameState.players[data.player_id] = {
          id: data.player_id,
          connected: false,
          name: `Disconnected Player (${data.player_id.slice(0, 4)})`,
          role: null,
          is_host: false,
        };

        // Still trigger the event for subscribers
        this.trigger("playerDisconnected", data.player_id);
      }
    });

    // Player left the game
    websocketManager.registerMessageHandler("player_left", (data) => {
      if (!data || !data.player_id) {
        console.warn("Received invalid player_left event:", data);
        return;
      }

      console.log("Player left the game:", data.player_id, data.player_name);

      // Safety check to ensure players object exists
      if (!this.gameState.players) {
        this.gameState.players = {};
      }

      // If the player exists in our state, remove them
      if (this.gameState.players[data.player_id]) {
        // Get player information before deleting
        const playerInfo = {
          id: data.player_id,
          name: data.player_name || this.gameState.players[data.player_id].name,
          role: this.gameState.players[data.player_id].role,
        };

        // Remove the player from our state
        delete this.gameState.players[data.player_id];

        // Notify subscribers that the player left
        this.trigger("playerLeft", playerInfo);

        // Show system message in chat that player left
        this.trigger("chatMessage", {
          playerId: "system",
          playerName: "System",
          message: `${playerInfo.name} has left the game.`,
        });

        console.log("Removed player from game state:", playerInfo);
      } else {
        console.warn("Player not found in state:", data.player_id);
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
      console.log("Game started event received");
      this.gameState.status = this.GAME_STATUS.IN_PROGRESS;
      this.gameState.stage = data.stage || 1;
      this.gameState.timer = data.timer || 300;

      // Start the local timer if not already running
      if (!this.localTimerInterval) {
        this._startLocalTimer();
      }

      // Trigger event for UI to update
      this.trigger("gameStateUpdated", this.gameState);
      this.trigger("gameStarted", this.gameState);

      // If we don't receive a puzzle within 2 seconds, request it
      setTimeout(() => {
        if (!this.gameState.puzzles[this.gameState.playerId]) {
          console.log(
            "No puzzle received after game start, requesting puzzle data"
          );

          // Send a request for puzzle data
          websocketManager
            .send({
              type: "request_puzzle",
              player_id: this.gameState.playerId,
            })
            .catch((error) => {
              console.error("Error requesting puzzle:", error);
            });
        }
      }, 2000);
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

  selectRole(role) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      // Request role selection from server
      const data = {
        type: "select_role",
        role: role,
      };

      const handleResponse = (data) => {
        if (data.error) {
          // Remove temporary handler
          websocketManager.removeMessageHandler("error", handleError);
          websocketManager.removeMessageHandler(
            "role_confirmed",
            handleResponse
          );
          reject(new Error(data.error));
          return;
        }

        // Check if the confirmed role is for this player
        if (data.player_id === this.gameState.playerId) {
          // Update local state
          this.gameState.playerRole = role;
          this.gameState.players = data.players;

          // Trigger state update event
          this.trigger("gameStateUpdated", this.gameState);

          // Clean up handlers
          websocketManager.removeMessageHandler("error", handleError);
          websocketManager.removeMessageHandler(
            "role_confirmed",
            handleResponse
          );

          resolve({
            player: data.player,
            players: data.players,
          });
        }
      };

      const handleError = (data) => {
        if (data.context === "role_selection") {
          websocketManager.removeMessageHandler("error", handleError);
          websocketManager.removeMessageHandler(
            "role_confirmed",
            handleResponse
          );
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("role_confirmed", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      // Send role selection request
      websocketManager.send(data).catch((error) => {
        // Clean up handlers on send error
        websocketManager.removeMessageHandler("error", handleError);
        websocketManager.removeMessageHandler("role_confirmed", handleResponse);
        reject(error);
      });
    });
  }

  startGame() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      // Only the host can start the game
      if (!this.isHost()) {
        reject(new Error("Only the host can start the game"));
        return;
      }

      // Request game start from server
      const data = {
        type: "start_game",
      };

      const handleResponse = (data) => {
        // Update local state for game start
        this.gameState.status = this.GAME_STATUS.IN_PROGRESS;
        this.gameState.stage = data.stage || 1;
        this.gameState.timer = data.timer || 300;

        // Trigger events
        this.trigger("gameStateUpdated", this.gameState);
        this.trigger("gameStarted", this.gameState);

        // Clean up handlers
        websocketManager.removeMessageHandler("game_started", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);

        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "game_start") {
          // Clean up handlers
          websocketManager.removeMessageHandler("game_started", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("game_started", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      // Send game start request
      websocketManager.send(data).catch((error) => {
        // Clean up handlers on send error
        websocketManager.removeMessageHandler("game_started", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  useRolePower() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      if (!this.gameState.playerRole) {
        reject(new Error("You must have a role to use a power"));
        return;
      }

      // Request power usage from server
      const data = {
        type: "use_power",
        role: this.gameState.playerRole,
      };

      const handleResponse = (data) => {
        // Check if the power usage is for this player
        if (data.player_id === this.gameState.playerId) {
          // Clean up handlers
          websocketManager.removeMessageHandler("power_used", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);

          resolve(true);
        }
      };

      const handleError = (data) => {
        if (data.context === "power_usage") {
          // Clean up handlers
          websocketManager.removeMessageHandler("power_used", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("power_used", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      // Send power usage request
      websocketManager.send(data).catch((error) => {
        // Clean up handlers on send error
        websocketManager.removeMessageHandler("power_used", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  /**
   * Initiate a vote to extend the game timer
   * @returns {Promise<boolean>} - Resolves to true if the vote is initiated
   */
  initiateTimerExtensionVote() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      // Check if a vote is already in progress
      if (this.gameState.timerVote) {
        reject(new Error("A timer vote is already in progress"));
        return;
      }

      // Request timer extension vote from server
      const data = {
        type: "initiate_timer_vote",
      };

      const handleResponse = (data) => {
        // Clean up handlers
        websocketManager.removeMessageHandler(
          "timer_vote_initiated",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);

        // Initialize vote state
        this.gameState.timerVote = {
          initiatorId: this.gameState.playerId,
          initiatorName: this.gameState.playerName,
          timeLimit: data.vote_time_limit || 20,
          votes: [],
          yesVotes: [],
          noVotes: [],
        };

        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "timer_vote") {
          // Clean up handlers
          websocketManager.removeMessageHandler(
            "timer_vote_initiated",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler(
        "timer_vote_initiated",
        handleResponse
      );
      websocketManager.registerMessageHandler("error", handleError);

      // Send timer vote request
      websocketManager.send(data).catch((error) => {
        // Clean up handlers on send error
        websocketManager.removeMessageHandler(
          "timer_vote_initiated",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  /**
   * Vote on timer extension
   * @param {boolean} vote - True for yes, false for no
   * @returns {Promise<boolean>} - Resolves to true if the vote is recorded
   */
  voteExtendTimer(vote) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      // Check if a vote is in progress
      if (!this.gameState.timerVote) {
        reject(new Error("No timer vote is in progress"));
        return;
      }

      // Request timer vote from server
      const data = {
        type: "extend_timer_vote",
        vote: vote,
      };

      const handleResponse = (data) => {
        // Clean up handlers
        websocketManager.removeMessageHandler(
          "timer_vote_update",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "timer_vote") {
          // Clean up handlers
          websocketManager.removeMessageHandler(
            "timer_vote_update",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler(
        "timer_vote_update",
        handleResponse
      );
      websocketManager.registerMessageHandler("error", handleError);

      // Send timer vote request
      websocketManager.send(data).catch((error) => {
        // Clean up handlers on send error
        websocketManager.removeMessageHandler(
          "timer_vote_update",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }
}

// Create a singleton instance
const playerStateManager = new PlayerStateManager();
export default playerStateManager;
