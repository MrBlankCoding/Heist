// playerStateManager.js - Manages player states and game state

import websocketManager from "./websocketManager.js";

class PlayerStateManager {
  constructor() {
    this.events = {};
    this.handlers = {};
    this.nextHandlerId = 1;
    this.temporaryHandlers = new Map();
    this.loadingPuzzles = false;
    this.lastPuzzleRequest = 0;

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
      lastServerSync: 0,
      lastSyncTimer: 0,
      puzzles: {},
      stagePuzzleCompletion: {},
    };

    this._setupWebSocketHandlers();

    /**
     * Fetch puzzles for the player's current role
     * This is called when the game starts
     */
    this.fetchPuzzlesForRole = function () {
      console.log("Fetching puzzles for role:", this.gameState.playerRole);

      // We don't need to fetch puzzle data separately anymore
      // since puzzle generation is now handled by the GameEventHandler
      // This just informs the event system that puzzles may need to be generated
      this.trigger("puzzlesNeeded", {
        role: this.gameState.playerRole,
        stage: this.gameState.stage,
      });
    };
  }

  get GAME_STATUS() {
    return {
      WAITING: "waiting",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed",
      FAILED: "failed",
    };
  }

  get VALID_ROLES() {
    return Object.freeze(["Hacker", "Safe Cracker", "Demolitions", "Lookout"]);
  }

  get roleDescriptions() {
    return Object.freeze({
      Hacker: {
        description:
          "Circuits, passwords, firewalls, encryption, and system overrides",
        power: "Slow security systems and reduce alert level",
        color: "blue",
      },
      "Safe Cracker": {
        description:
          "Lock combinations, patterns, multi-locks, audio sequences, and timed challenges",
        power: "Reveal solution hints and bypass locks",
        color: "yellow",
      },
      Demolitions: {
        description:
          "Wire cutting, time bombs, circuits, explosive sequences, and detonation",
        power: "Create shortcuts and reduce event probability",
        color: "red",
      },
      Lookout: {
        description:
          "Surveillance, patrol patterns, security systems, alarms, and escape routes",
        power: "Predict upcoming events and detect weaknesses",
        color: "green",
      },
    });
  }

  get stageInfo() {
    return Object.freeze([
      { number: 1, name: "Perimeter Breach", difficulty: "Easy" },
      { number: 2, name: "Security Systems", difficulty: "Medium" },
      { number: 3, name: "Laser Hallways", difficulty: "Medium" },
      { number: 4, name: "Vault Access", difficulty: "Hard" },
      { number: 5, name: "Escape Sequence", difficulty: "Very Hard" },
    ]);
  }

  initialize(roomCode, playerId, playerName) {
    this.gameState.roomCode = roomCode;
    this.gameState.playerId = playerId;
    this.gameState.playerName = playerName;
    this.gameState.status = this.GAME_STATUS.WAITING;

    this.trigger("gameStateUpdated", this.gameState);
    return Promise.resolve(true);
  }

  handleReconnection() {
    if (!this.gameState.playerId) {
      return Promise.reject(
        new Error("No player ID available for reconnection")
      );
    }

    if (!this.gameState.roomCode) {
      return Promise.reject(
        new Error("No room code available for reconnection")
      );
    }

    return Promise.resolve(true);
  }

  getCurrentStageInfo() {
    const stageIndex = Math.max(
      0,
      Math.min(this.gameState.stage - 1, this.stageInfo.length - 1)
    );
    return this.stageInfo[stageIndex];
  }

  getRoleInfo(role) {
    return this.roleDescriptions[role] || null;
  }

  getPlayer(playerId) {
    return this.gameState.players[playerId] || null;
  }

  getAllPlayers() {
    return this.gameState.players;
  }

  isHost() {
    const currentPlayerId = this.gameState.playerId;
    if (
      !this.gameState.players ||
      !currentPlayerId ||
      !this.gameState.players[currentPlayerId]
    ) {
      return false;
    }
    return !!this.gameState.players[currentPlayerId].is_host;
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

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

  _getNextHandlerId() {
    return this.nextHandlerId++;
  }

  _cleanupTemporaryHandler(handlerId) {
    const handlers = this.handlers[handlerId];
    if (!handlers) return;

    Object.entries(handlers).forEach(([type, handler]) => {
      websocketManager.removeMessageHandler(type, handler);
    });

    this.handlers[handlerId] = null;
  }

  _setupWebSocketHandlers() {
    websocketManager.registerMessageHandler("game_state", (data) => {
      this.gameState.stage = data.stage;
      this.gameState.status = data.status;
      this.gameState.timer = data.timer;
      this.gameState.alertLevel = data.alert_level;

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

      if (data.status === "in_progress" && !this.localTimerInterval) {
        this._startLocalTimer();
      }

      this.trigger("gameStateUpdated", data);

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

    websocketManager.registerMessageHandler("game_reset", (data) => {
      this.gameState.playerRole = null;
      this.gameState.stage = 1;
      this.gameState.status = this.GAME_STATUS.WAITING;
      this.gameState.timer = 300;
      this.gameState.alertLevel = 0;

      Object.values(this.gameState.players).forEach((player) => {
        if (player) {
          player.role = null;
        }
      });

      if (this.localTimerInterval) {
        this._stopLocalTimer();
      }

      this.trigger("gameReset", data);

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

    websocketManager.registerMessageHandler("timer_vote_initiated", (data) => {
      this.gameState.timerVote = {
        initiatorId: data.initiator_id,
        initiatorName: data.initiator_name,
        timeLimit: data.vote_time_limit || 20,
        votes: data.votes || [],
        yesVotes: [],
        noVotes: [],
      };

      this.trigger("timerVoteInitiated", {
        initiatorId: data.initiator_id,
        initiatorName: data.initiator_name,
        voteTimeLimit: data.vote_time_limit || 20,
        votes: data.votes || [],
        players: data.players || this.gameState.players,
      });
    });

    websocketManager.registerMessageHandler("timer_vote_update", (data) => {
      if (this.gameState.timerVote) {
        this.gameState.timerVote.votes = data.votes || [];

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

    websocketManager.registerMessageHandler("timer_vote_completed", (data) => {
      this.gameState.timerVote = null;
      this.trigger("timerVoteCompleted", {
        success: data.success,
        message: data.message,
      });
    });

    websocketManager.registerMessageHandler("power_used", (data) => {
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

    websocketManager.registerMessageHandler("timer_update", (data) => {
      this.gameState.timer = data.timer;
      this.gameState.lastServerSync = Date.now();
      this.gameState.lastSyncTimer = data.timer;

      if (!this.localTimerInterval && this.gameState.status === "in_progress") {
        this._startLocalTimer();
      }

      this.trigger("timerUpdated", data.timer);
    });

    websocketManager.registerMessageHandler("timer_extended", (data) => {
      this.gameState.timer = data.new_timer;
      this.gameState.alertLevel = data.alert_level;
      if (this.gameState.timerExtendVotes) {
        this.gameState.timerExtendVotes.clear();
      }

      this.gameState.lastServerSync = Date.now();
      this.gameState.lastSyncTimer = data.new_timer;

      this.trigger("timerExtended", {
        timer: data.new_timer,
        alertLevel: data.alert_level,
      });
    });

    websocketManager.registerMessageHandler("alert_level_changed", (data) => {
      this.gameState.alertLevel = data.level;
      this.trigger("alertLevelChanged", data.level);
    });

    websocketManager.registerMessageHandler("puzzle_data", (data) => {
      try {
        if (!this.gameState.puzzles[this.gameState.playerId]) {
          this.gameState.puzzles[this.gameState.playerId] = {};
        }

        if (data.is_role_puzzles) {
          this.gameState.puzzles[this.gameState.playerId] = data.puzzle;
        } else {
          if (!data.puzzle.type) {
            data.puzzle.type = "surveillance";
          }
          this.gameState.puzzles[this.gameState.playerId] = data.puzzle;
        }

        this.trigger("puzzleReceived", data.puzzle);
      } catch (error) {
        console.error("Error processing puzzle data:", error, error.stack);
      }
    });

    websocketManager.registerMessageHandler("puzzle_completed", (data) => {
      if (this.gameEventHandler) {
        this.gameEventHandler.handlePuzzleCompleted(data);
      }
    });

    websocketManager.registerMessageHandler("player_waiting", (data) => {
      if (this.gameEventHandler) {
        this.gameEventHandler.handlePlayerWaiting(data);
      }
    });

    websocketManager.registerMessageHandler("stage_completed", (data) => {
      this.gameState.stage = data.next_stage;
      this.trigger("stageCompleted", data.next_stage);
    });

    websocketManager.registerMessageHandler("game_completed", () => {
      this.gameState.status = this.GAME_STATUS.COMPLETED;
      this._stopLocalTimer();
      this.trigger("gameCompleted");
    });

    websocketManager.registerMessageHandler("game_over", (data) => {
      this.gameState.status = this.GAME_STATUS.FAILED;
      this._stopLocalTimer();
      this.trigger("gameOver", data.result, data.message, data);
    });

    websocketManager.registerMessageHandler("random_event", (data) => {
      this.trigger("randomEvent", {
        event: data.event,
        duration: data.duration,
      });
    });

    websocketManager.registerMessageHandler("chat_message", (data) => {
      this.trigger("chatMessage", {
        playerId: data.player_id,
        playerName: data.player_name,
        message: data.message,
      });
    });

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

    websocketManager.registerMessageHandler("player_disconnected", (data) => {
      if (!data || !data.player_id) {
        console.warn("Received invalid player_disconnected event:", data);
        return;
      }

      if (!this.gameState.players) {
        this.gameState.players = {};
      }

      if (this.gameState.players[data.player_id]) {
        this.gameState.players[data.player_id].connected = false;
        this.trigger("playerDisconnected", data.player_id);
      } else {
        this.gameState.players[data.player_id] = {
          id: data.player_id,
          connected: false,
          name: `Disconnected Player (${data.player_id.slice(0, 4)})`,
          role: null,
          is_host: false,
        };
        this.trigger("playerDisconnected", data.player_id);
      }
    });

    websocketManager.registerMessageHandler("player_left", (data) => {
      if (!data || !data.player_id) {
        console.warn("Received invalid player_left event:", data);
        return;
      }

      if (!this.gameState.players) {
        this.gameState.players = {};
      }

      if (this.gameState.players[data.player_id]) {
        const playerInfo = {
          id: data.player_id,
          name: data.player_name || this.gameState.players[data.player_id].name,
          role: this.gameState.players[data.player_id].role,
        };

        delete this.gameState.players[data.player_id];
        this.trigger("playerLeft", playerInfo);

        this.trigger("chatMessage", {
          playerId: "system",
          playerName: "System",
          message: `${playerInfo.name} has left the game.`,
        });
      }
    });

    websocketManager.registerMessageHandler("role_confirmed", (data) => {
      if (data.player_id === this.gameState.playerId) {
        this.gameState.playerRole = data.role;
        this.trigger("roleChanged", data.role);
      }

      if (this.gameState.players[data.player_id]) {
        this.gameState.players[data.player_id] = {
          ...this.gameState.players[data.player_id],
          id: data.player_id,
          role: data.role,
        };

        this.trigger("playerRoleSelected", {
          playerId: data.player_id,
          role: data.role,
          player: this.gameState.players[data.player_id],
        });
      } else {
        this.gameState.players[data.player_id] = {
          id: data.player_id,
          role: data.role,
          name: "Player " + data.player_id.slice(0, 4),
          connected: true,
          is_host: false,
        };

        this.trigger("playerRoleSelected", {
          playerId: data.player_id,
          role: data.role,
          player: this.gameState.players[data.player_id],
        });
      }

      if (data.players) {
        Object.entries(data.players).forEach(([playerId, playerData]) => {
          this.gameState.players[playerId] = {
            ...(this.gameState.players[playerId] || {}),
            id: playerId,
            name: playerData.name,
            role: playerData.role,
            connected: playerData.connected,
            is_host: playerData.is_host,
          };
        });
      }
    });

    websocketManager.registerMessageHandler("game_started", (data) => {
      this.gameState.status = this.GAME_STATUS.IN_PROGRESS;
      this.gameState.stage = data.stage || 1;
      this.gameState.timer = data.timer || 300;

      if (!this.localTimerInterval) {
        this._startLocalTimer();
      }

      this.trigger("gameStateUpdated", this.gameState);
      this.trigger("gameStarted", this.gameState);
      this.fetchPuzzlesForRole();
    });

    websocketManager.registerMessageHandler("error", (data) => {
      console.error("Server error:", data);
      this.trigger("error", data);
    });

    websocketManager.registerMessageHandler("team_puzzle_update", (data) => {
      this.trigger("teamPuzzleUpdate", {
        playerId: data.player_id,
        puzzleType: data.puzzle_type,
        updateData: data.update_data,
      });
    });
  }

  _startLocalTimer() {
    this._stopLocalTimer();

    if (!this.gameState.lastServerSync) {
      this.gameState.lastServerSync = Date.now();
    }

    this.localTimerInterval = setInterval(() => {
      if (this.gameState.status === this.GAME_STATUS.IN_PROGRESS) {
        const timeSinceSync = Date.now() - this.gameState.lastServerSync;
        const expectedSeconds = Math.floor(timeSinceSync / 1000);
        const drift = Math.abs(
          expectedSeconds -
            (this.gameState.lastSyncTimer - this.gameState.timer)
        );

        if (drift > 2) {
          console.warn(`Timer drift detected: ${drift}s`);
        }

        if (this.gameState.timer > 0) {
          this.gameState.timer -= 1;
          this.trigger("localTimerUpdated", this.gameState.timer);
        }

        if (this.gameState.timer <= 0) {
          this._stopLocalTimer();
        }
      }
    }, 1000);
  }

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

      const data = { type: "select_role", role: role };

      const handleResponse = (data) => {
        if (data.error) {
          websocketManager.removeMessageHandler("error", handleError);
          websocketManager.removeMessageHandler(
            "role_confirmed",
            handleResponse
          );
          reject(new Error(data.error));
          return;
        }

        if (data.player_id === this.gameState.playerId) {
          this.gameState.playerRole = role;

          websocketManager.removeMessageHandler("error", handleError);
          websocketManager.removeMessageHandler(
            "role_confirmed",
            handleResponse
          );

          resolve({ player: data.player, players: data.players });
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

      websocketManager.registerMessageHandler("role_confirmed", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      websocketManager.send(data).catch((error) => {
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

      if (!this.isHost()) {
        reject(new Error("Only the host can start the game"));
        return;
      }

      const data = { type: "start_game" };

      const handleResponse = (data) => {
        this.gameState.status = this.GAME_STATUS.IN_PROGRESS;
        this.gameState.stage = data.stage || 1;
        this.gameState.timer = data.timer || 300;

        this.trigger("gameStateUpdated", this.gameState);
        this.trigger("gameStarted", this.gameState);

        websocketManager.removeMessageHandler("game_started", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);

        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "game_start") {
          websocketManager.removeMessageHandler("game_started", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      websocketManager.registerMessageHandler("game_started", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      websocketManager.send(data).catch((error) => {
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

      const data = {
        type: "use_power",
        role: this.gameState.playerRole,
      };

      const handleResponse = (data) => {
        if (data.player_id === this.gameState.playerId) {
          websocketManager.removeMessageHandler("power_used", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          resolve(true);
        }
      };

      const handleError = (data) => {
        if (data.context === "power_usage") {
          websocketManager.removeMessageHandler("power_used", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      websocketManager.registerMessageHandler("power_used", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      websocketManager.send(data).catch((error) => {
        websocketManager.removeMessageHandler("power_used", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  initiateTimerExtensionVote() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      if (this.gameState.timerVote) {
        reject(new Error("A timer vote is already in progress"));
        return;
      }

      const data = { type: "initiate_timer_vote" };

      const handleResponse = (data) => {
        websocketManager.removeMessageHandler(
          "timer_vote_initiated",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);

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
          websocketManager.removeMessageHandler(
            "timer_vote_initiated",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      websocketManager.registerMessageHandler(
        "timer_vote_initiated",
        handleResponse
      );
      websocketManager.registerMessageHandler("error", handleError);

      websocketManager.send(data).catch((error) => {
        websocketManager.removeMessageHandler(
          "timer_vote_initiated",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  voteExtendTimer(vote) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      if (!this.gameState.timerVote) {
        reject(new Error("No timer vote is in progress"));
        return;
      }

      const data = {
        type: "extend_timer_vote",
        vote: vote,
      };

      const handleResponse = () => {
        websocketManager.removeMessageHandler(
          "timer_vote_update",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "timer_vote") {
          websocketManager.removeMessageHandler(
            "timer_vote_update",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      websocketManager.registerMessageHandler(
        "timer_vote_update",
        handleResponse
      );
      websocketManager.registerMessageHandler("error", handleError);

      websocketManager.send(data).catch((error) => {
        websocketManager.removeMessageHandler(
          "timer_vote_update",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  submitPuzzleSolution(solution) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "puzzle_solution",
        solution: solution,
      };

      const handleResponse = (data) => {
        if (data.player_id === this.gameState.playerId) {
          websocketManager.removeMessageHandler(
            "puzzle_completed",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          resolve(true);
        }
      };

      const handleError = (data) => {
        if (data.context === "puzzle_solution") {
          websocketManager.removeMessageHandler(
            "puzzle_completed",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      websocketManager.registerMessageHandler(
        "puzzle_completed",
        handleResponse
      );
      websocketManager.registerMessageHandler("error", handleError);

      const timeout = setTimeout(() => {
        websocketManager.removeMessageHandler(
          "puzzle_completed",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        reject(new Error("Timeout waiting for solution response"));
      }, 10000);

      websocketManager.send(data).catch((error) => {
        clearTimeout(timeout);
        websocketManager.removeMessageHandler(
          "puzzle_completed",
          handleResponse
        );
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  updatePlayerPuzzleCompletion(playerId, stage) {
    if (!this.gameState.stagePuzzleCompletion[stage]) {
      this.gameState.stagePuzzleCompletion[stage] = {};
    }

    this.gameState.stagePuzzleCompletion[stage][playerId] = true;

    const connectedPlayers = Object.entries(this.gameState.players)
      .filter(([_, player]) => player.connected)
      .map(([id]) => id);

    const allCompleted = connectedPlayers.every(
      (id) => this.gameState.stagePuzzleCompletion[stage][id]
    );

    this.trigger("puzzleCompletionUpdated", {
      playerId,
      stage,
      completion: this.gameState.stagePuzzleCompletion[stage],
      allCompleted,
    });

    return allCompleted;
  }

  getCurrentStagePuzzleCompletion() {
    const currentStage = this.gameState.stage;
    return this.gameState.stagePuzzleCompletion[currentStage] || {};
  }

  haveAllPlayersCompletedStage() {
    const currentStage = this.gameState.stage;
    const stageCompletion =
      this.gameState.stagePuzzleCompletion[currentStage] || {};

    const connectedPlayers = Object.entries(this.gameState.players)
      .filter(([_, player]) => player.connected)
      .map(([id]) => id);

    return (
      connectedPlayers.length > 0 &&
      connectedPlayers.every((id) => stageCompletion[id])
    );
  }

  sendChatMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "chat_message",
        message: message,
      };

      websocketManager
        .send(data)
        .then(() => resolve(true))
        .catch((error) => reject(error));
    });
  }

  leaveGame() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "leave_game",
      };

      websocketManager
        .send(data)
        .then(() => {
          this.resetGameState();
          resolve(true);
        })
        .catch((error) => reject(error));
    });
  }

  resetGameState() {
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
      lastServerSync: 0,
      lastSyncTimer: 0,
      puzzles: {},
      stagePuzzleCompletion: {},
    };

    if (this.localTimerInterval) {
      this._stopLocalTimer();
    }

    this.trigger("gameStateReset");
  }

  updateTeamPuzzle(puzzleType, updateData) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "team_puzzle_update",
        puzzle_type: puzzleType,
        update_data: updateData,
      };

      websocketManager
        .send(data)
        .then(() => resolve(true))
        .catch((error) => reject(error));
    });
  }

  requestSyncGameState() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "sync_request",
      };

      const handleResponse = (data) => {
        // Update game state with synced data
        this.gameState.stage = data.stage;
        this.gameState.status = data.status;
        this.gameState.timer = data.timer;
        this.gameState.alertLevel = data.alert_level;

        // Update player data
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

        // Update sync timestamps
        this.gameState.lastServerSync = Date.now();
        this.gameState.lastSyncTimer = data.timer;

        // Clean up handlers
        websocketManager.removeMessageHandler("game_state", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);

        // Trigger events
        this.trigger("gameStateUpdated", this.gameState);
        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "sync_request") {
          // Clean up handlers
          websocketManager.removeMessageHandler("game_state", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("game_state", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      // Set up a timeout to reject the promise if no response received
      const timeout = setTimeout(() => {
        // Clean up handlers
        websocketManager.removeMessageHandler("game_state", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(new Error("Timeout waiting for game state sync"));
      }, 5000); // 5 second timeout

      // Send sync request
      websocketManager.send(data).catch((error) => {
        // Clean up handlers and timeout
        clearTimeout(timeout);
        websocketManager.removeMessageHandler("game_state", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  registerGameEventHandler(handler) {
    this.gameEventHandler = handler;
  }

  unregisterGameEventHandler() {
    this.gameEventHandler = null;
  }

  getGameStateSummary() {
    return {
      roomCode: this.gameState.roomCode,
      playerId: this.gameState.playerId,
      playerName: this.gameState.playerName,
      playerRole: this.gameState.playerRole,
      stage: this.gameState.stage,
      status: this.gameState.status,
      timer: this.gameState.timer,
      alertLevel: this.gameState.alertLevel,
      playerCount: Object.keys(this.gameState.players).length,
      connectedPlayerCount: Object.values(this.gameState.players).filter(
        (p) => p.connected
      ).length,
      stageInfo: this.getCurrentStageInfo(),
      isHost: this.isHost(),
    };
  }

  getPuzzleCompletionPercentage() {
    const currentStage = this.gameState.stage;
    const stageCompletion =
      this.gameState.stagePuzzleCompletion[currentStage] || {};

    const connectedPlayers = Object.entries(this.gameState.players)
      .filter(([_, player]) => player.connected)
      .map(([id]) => id);

    if (connectedPlayers.length === 0) return 0;

    const completedCount = connectedPlayers.filter(
      (id) => stageCompletion[id]
    ).length;
    return (completedCount / connectedPlayers.length) * 100;
  }

  resetGame() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      if (!this.isHost()) {
        reject(new Error("Only the host can reset the game"));
        return;
      }

      const data = {
        type: "reset_game",
      };

      const handleResponse = () => {
        // Game reset is handled by the game_reset event handler
        websocketManager.removeMessageHandler("game_reset", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        resolve(true);
      };

      const handleError = (data) => {
        if (data.context === "game_reset") {
          websocketManager.removeMessageHandler("game_reset", handleResponse);
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      // Register temporary handlers
      websocketManager.registerMessageHandler("game_reset", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      // Send reset request
      websocketManager.send(data).catch((error) => {
        websocketManager.removeMessageHandler("game_reset", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  sendTeamPuzzleAction(action, puzzleId, actionData) {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "team_puzzle_action",
        action: action,
        puzzle_id: puzzleId,
        action_data: actionData,
      };

      websocketManager
        .send(data)
        .then(() => resolve(true))
        .catch((error) => reject(error));
    });
  }

  requestHint() {
    return new Promise((resolve, reject) => {
      if (!this.gameState.roomCode || !this.gameState.playerId) {
        reject(new Error("Game not initialized correctly"));
        return;
      }

      const data = {
        type: "request_hint",
      };

      const handleResponse = (data) => {
        websocketManager.removeMessageHandler("hint_response", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        resolve(data.hint);
      };

      const handleError = (data) => {
        if (data.context === "hint_request") {
          websocketManager.removeMessageHandler(
            "hint_response",
            handleResponse
          );
          websocketManager.removeMessageHandler("error", handleError);
          reject(new Error(data.message));
        }
      };

      websocketManager.registerMessageHandler("hint_response", handleResponse);
      websocketManager.registerMessageHandler("error", handleError);

      const timeout = setTimeout(() => {
        websocketManager.removeMessageHandler("hint_response", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(new Error("Timeout waiting for hint"));
      }, 5000);

      websocketManager.send(data).catch((error) => {
        clearTimeout(timeout);
        websocketManager.removeMessageHandler("hint_response", handleResponse);
        websocketManager.removeMessageHandler("error", handleError);
        reject(error);
      });
    });
  }

  setGameEventCallback(event, callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    const handlerId = this._getNextHandlerId();

    if (!this.handlers[handlerId]) {
      this.handlers[handlerId] = {};
    }

    // Store the original callback and event for cleanup
    this.handlers[handlerId][event] = callback;

    // Register the event listener
    this.on(event, callback);

    // Return a function to remove this specific handler
    return () => {
      this.off(event, callback);
      delete this.handlers[handlerId][event];

      // If this was the last handler for this ID, clean up
      if (Object.keys(this.handlers[handlerId]).length === 0) {
        delete this.handlers[handlerId];
      }
    };
  }
}

// Create a singleton instance
const playerStateManager = new PlayerStateManager();
export default playerStateManager;
