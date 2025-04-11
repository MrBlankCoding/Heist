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
    playerStateManager.on("randomEvent", (data) =>
      this.eventHandler.handleRandomEvent(data)
    );
    playerStateManager.on("chatMessage", (data) =>
      this.chatManager.addChatMessage(data)
    );
    playerStateManager.on("timerExtended", (data) =>
      this.eventHandler.handleTimerExtended(data)
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

  // Retrieve player data from local storage
  const heistPlayer = localStorage.getItem("heistPlayer");
  let playerId = null;
  let playerName = null;
  if (heistPlayer) {
    const playerData = JSON.parse(heistPlayer);
    playerId = playerData.player_id;
    playerName = playerData.player_name;
  } else {
    console.error("Player ID not found in local storage.");
    return; // Or handle this error appropriately
  }

  if (roomCode && playerId) {
    // Initialize player state before connecting
    playerStateManager
      .initialize(roomCode, playerId, playerName)
      .then(() => {
        return websocketManager.connect(roomCode, playerId);
      })
      .then(() => {
        // Show the lobby
        gameStartScreen.showLobby();
      })
      .catch((error) => {
        console.error("Error initializing game:", error);
      });
  } else {
    console.error("Room code or Player ID not found.");
  }
});

export default GameController;
