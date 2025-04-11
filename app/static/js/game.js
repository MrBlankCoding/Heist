// game.js - Main game script that ties everything together

import websocketManager from "./websocketManager.js";
import playerStateManager from "./playerStateManager.js";
import gameStartScreen from "./gameStartScreen.js";
import GameUIManager from "./gameUIManager.js";
import GameEventHandler from "./gameEventHandler.js";
import NotificationSystem from "./notificationSystem.js";
import ChatManager from "./chatManager.js";

// Game puzzle controllers
import HackerPuzzleController from "./puzzles/hackerPuzzleController.js";
import SafeCrackerPuzzleController from "./puzzles/safeCrackerPuzzleController.js";
import DemolitionsPuzzleController from "./puzzles/demolitionsPuzzleController.js";
import LookoutPuzzleController from "./puzzles/lookoutPuzzleController.js";
import TeamPuzzleController from "./puzzles/teamPuzzleController.js";

// Main Game Controller
class GameController {
  constructor() {
    // Game components
    this.uiManager = new GameUIManager();
    this.notificationSystem = new NotificationSystem();
    this.chatManager = new ChatManager();
    this.eventHandler = null;

    // Game state
    this.activePuzzleController = null;
    this.powerCooldown = false;
    this.timerExtendVoted = false;
    this.activeRandomEvents = [];

    // Initialize
    this._init();
  }

  /**
   * Initialize the game controller
   */
  _init() {
    // Initialize start screen
    gameStartScreen.initialize();

    // Initialize event handler
    this.eventHandler = new GameEventHandler(
      this.uiManager,
      this.notificationSystem,
      this.chatManager,
      (puzzleController) => (this.activePuzzleController = puzzleController),
      () => this.activePuzzleController,
      () => (this.powerCooldown = true),
      () => (this.powerCooldown = false),
      () => (this.timerExtendVoted = true)
    );

    // Set up event listeners
    this._setupEventListeners();

    // Register for player state events
    this._registerPlayerStateEvents();

    // Initialize UI
    this._initializeUI();
  }

  /**
   * Set up DOM event listeners
   */
  _setupEventListeners() {
    // Use power button
    this.uiManager.elements.usePowerButton.addEventListener("click", () => {
      if (this.powerCooldown) {
        this.notificationSystem.showAlert("Power is on cooldown!", "error");
        return;
      }
      this.eventHandler.handleUsePower();
    });

    // Extend timer button
    this.uiManager.elements.extendTimerButton.addEventListener("click", () => {
      if (this.timerExtendVoted) {
        this.notificationSystem.showAlert(
          "You've already voted to extend the timer",
          "info"
        );
        return;
      }
      this.eventHandler.handleExtendTimer();
    });
  }

  /**
   * Register for player state events
   */
  _registerPlayerStateEvents() {
    playerStateManager.on("gameStateUpdated", (data) =>
      this.eventHandler.handleGameStateUpdated(data)
    );
    playerStateManager.on("timerUpdated", (timer) =>
      this.eventHandler.handleTimerUpdated(timer)
    );
    playerStateManager.on("localTimerUpdated", (timer) =>
      this.eventHandler.handleTimerUpdated(timer)
    );
    playerStateManager.on("alertLevelChanged", (level) =>
      this.eventHandler.handleAlertLevelChanged(level)
    );
    playerStateManager.on("puzzleReceived", (puzzle) =>
      this.eventHandler.handlePuzzleReceived(puzzle)
    );
    playerStateManager.on("puzzleCompleted", (data) =>
      this.eventHandler.handlePuzzleCompleted(data)
    );
    playerStateManager.on("stageCompleted", (nextStage) =>
      this.eventHandler.handleStageCompleted(nextStage)
    );
    playerStateManager.on("gameCompleted", () =>
      this.eventHandler.handleGameCompleted()
    );
    playerStateManager.on("gameOver", (result) =>
      this.eventHandler.handleGameOver(result)
    );
    playerStateManager.on("gameReset", (data) =>
      this.eventHandler.handleGameReset(data)
    );
    playerStateManager.on("randomEvent", (data) =>
      this.eventHandler.handleRandomEvent(data)
    );
    playerStateManager.on("chatMessage", (data) =>
      this.chatManager.addChatMessage(data)
    );
    playerStateManager.on("timerVoteInitiated", (data) =>
      this.eventHandler.handleTimerVoteInitiated(data)
    );
    playerStateManager.on("timerVoteUpdated", (data) =>
      this.eventHandler.handleTimerVoteUpdated(data)
    );
    playerStateManager.on("timerVoteCompleted", (data) =>
      this.eventHandler.handleTimerVoteCompleted(data)
    );
    playerStateManager.on("timerExtended", (data) =>
      this.eventHandler.handleTimerExtended(data)
    );
    playerStateManager.on("powerUsed", (data) =>
      this.eventHandler.handlePowerUsedByOthers(data)
    );
    playerStateManager.on("gameStarted", () => {
      gameStartScreen.hideLobby();
      this.uiManager.elements.gameArea.classList.remove("hidden");

      // Update role instruction text
      const playerRole = playerStateManager.gameState.playerRole;
      if (playerRole) {
        const roleInfo = playerStateManager.getRoleInfo(playerRole);
        if (roleInfo) {
          this.uiManager.elements.roleInstruction.textContent = `${playerRole} - ${roleInfo.description}`;
          this.uiManager.elements.roleInstruction.classList.remove(
            "text-gray-400",
            "italic"
          );
        }
      }
    });
  }

  /**
   * Initialize UI with current state
   */
  _initializeUI() {
    this.uiManager.updateTimer(playerStateManager.gameState.timer);
    this.uiManager.updateAlertLevel(playerStateManager.gameState.alertLevel);
    this.uiManager.updateStageInfo();
    this.uiManager.updateTeamStatus();
  }
}

// Create and initialize the game controller
document.addEventListener("DOMContentLoaded", () => {
  const game = new GameController();

  // Initialize WebSocket connection
  const roomCodeElement = document.getElementById("room-code");
  const roomCode = roomCodeElement
    ? roomCodeElement.textContent.split(": ")[1]
    : null; // Extract room code

  // Try to reconnect first if we have saved state
  playerStateManager
    .handleReconnection()
    .then(() => {
      console.log("Successfully reconnected to game");

      // Validate the reconnection state
      // If we have player info but no players object or it's empty, something is wrong
      if (
        playerStateManager.gameState.playerRole &&
        (!playerStateManager.gameState.players ||
          typeof playerStateManager.gameState.players !== "object" ||
          Object.keys(playerStateManager.gameState.players).length === 0)
      ) {
        console.log(
          "Invalid game state detected - players missing but role exists"
        );
        // Reset potentially invalid state
        playerStateManager.gameState.playerRole = null;
        playerStateManager.gameState.status =
          playerStateManager.GAME_STATUS.WAITING;

        // Always show the lobby for possibly invalid states
        return gameStartScreen.showLobby();
      }

      return websocketManager.connect(
        playerStateManager.gameState.roomCode,
        playerStateManager.gameState.playerId
      );
    })
    .then(() => {
      // If we got here through the invalid state path, websocketManager.connect wasn't called
      // We detect this by checking if the websocket is connected
      if (!websocketManager.isConnected()) {
        return; // Skip the rest of this handling
      }

      // If game status is in progress AND we have valid player data,
      // show the game area immediately - this handles reconnection to active games
      if (
        playerStateManager.gameState.status ===
          playerStateManager.GAME_STATUS.IN_PROGRESS &&
        playerStateManager.gameState.players &&
        typeof playerStateManager.gameState.players === "object" &&
        Object.keys(playerStateManager.gameState.players).length > 0
      ) {
        console.log("Reconnected to game in progress, showing game area");
        if (gameStartScreen) {
          gameStartScreen.hideLobby();
        }

        const gameArea = document.getElementById("game-area");
        if (gameArea) {
          gameArea.classList.remove("hidden");
        }

        // Update role instruction
        const roleInstruction = document.getElementById("role-instruction");
        if (roleInstruction) {
          const playerRole = playerStateManager.gameState.playerRole;
          if (playerRole) {
            const roleInfo = playerStateManager.getRoleInfo(playerRole);
            if (roleInfo) {
              roleInstruction.textContent = `${playerRole} - ${roleInfo.description}`;
              roleInstruction.classList.remove("text-gray-400", "italic");
            }
          }
        }
      } else {
        // For all other cases, show the lobby
        console.log(
          "Showing lobby - game is not in progress or has invalid state"
        );
        gameStartScreen.showLobby();
      }
    })
    .catch(() => {
      // If reconnection fails, try normal initialization
      console.log("No saved game state, attempting normal initialization");

      // Clear any potentially corrupted state
      playerStateManager.clearPersistedState();

      // Retrieve player data from local storage
      const heistPlayer = localStorage.getItem("heistPlayer");
      if (!heistPlayer) {
        console.error("Player ID not found in local storage.");
        return;
      }

      const playerData = JSON.parse(heistPlayer);
      const playerId = playerData.player_id;
      const playerName = playerData.player_name;

      if (roomCode && playerId) {
        // Initialize player state before connecting
        return playerStateManager
          .initialize(roomCode, playerId, playerName)
          .then(() => {
            return websocketManager.connect(roomCode, playerId);
          });
      } else {
        throw new Error("Room code or Player ID not found.");
      }
    })
    .then(() => {
      // Show the lobby regardless of whether we reconnected or initialized new
      gameStartScreen.showLobby();
    })
    .catch((error) => {
      console.error("Error initializing game:", error);
    });

  // Handle page unload to clean up if the game is complete
  window.addEventListener("beforeunload", () => {
    // Only clear persisted state if the game is complete or failed
    if (
      playerStateManager.gameState.status ===
        playerStateManager.GAME_STATUS.COMPLETED ||
      playerStateManager.gameState.status ===
        playerStateManager.GAME_STATUS.FAILED
    ) {
      playerStateManager.clearPersistedState();
    }
  });
});

export default GameController;
