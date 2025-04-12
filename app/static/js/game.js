// game.js - Main game script that ties everything together

// Import all modules from the bundle instead of individual files
import {
  websocketManager,
  playerStateManager,
  gameStartScreen,
  GameUIManager,
  GameEventHandler,
  NotificationSystem,
  ChatManager,
  HackerPuzzleController,
  SafeCrackerPuzzleController,
  DemolitionsPuzzleController,
  LookoutPuzzleController,
  TeamPuzzleController,
} from "./main.bundle.js";

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

    // Make GameController globally accessible for debugging
    window.GameController = this;
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

    // Leave game button
    const leaveGameButton = document.getElementById("leave-game");
    const leaveGameModal = document.getElementById("leave-game-modal");
    const confirmLeaveButton = document.getElementById("confirm-leave");
    const cancelLeaveButton = document.getElementById("cancel-leave");

    if (leaveGameButton && leaveGameModal) {
      // Show modal when leave button is clicked
      leaveGameButton.addEventListener("click", () => {
        leaveGameModal.classList.remove("hidden");
      });

      // Hide modal when cancel is clicked
      if (cancelLeaveButton) {
        cancelLeaveButton.addEventListener("click", () => {
          leaveGameModal.classList.add("hidden");
        });
      }

      // Handle leave game confirmation
      if (confirmLeaveButton) {
        confirmLeaveButton.addEventListener("click", () =>
          this._handleLeaveGame()
        );
      }
    }
  }

  /**
   * Handle leave game confirmation
   * @private
   */
  _handleLeaveGame() {
    const playerId = document.getElementById("player-id")?.value;

    if (!playerId) {
      this.notificationSystem.showAlert("Player ID not found", "error");
      return;
    }

    // Send leave game message through WebSocket
    websocketManager
      .send({
        type: "leave_game",
        player_id: playerId,
      })
      .catch((error) => {
        console.error("Error sending leave game message:", error);
      });

    // Wait a short time to allow the leave message to be sent
    setTimeout(() => {
      // Disconnect WebSocket
      websocketManager.disconnect("User manually left the game");

      // Call the leave API
      fetch(`/api/game/leave?player_id=${playerId}`, {
        method: "POST",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            this.notificationSystem.showAlert(`Error: ${data.error}`, "error");
          } else {
            // Clear any local state
            playerStateManager.clearPersistedState();

            // Redirect to home page
            window.location.href = "/";
          }
        })
        .catch((error) => {
          console.error("Error leaving game:", error);
          this.notificationSystem.showAlert(
            "Failed to leave game properly. Redirecting to home...",
            "error"
          );
          // Redirect anyway after a delay
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        });
    }, 300); // Small delay to ensure message is sent
  }

  /**
   * Register for player state events
   */
  _registerPlayerStateEvents() {
    // Add try-catch to prevent errors in event registration
    try {
      // Game state events
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

      // Puzzle events - these are critical for puzzle display
      playerStateManager.on("puzzleReceived", (puzzle) => {
        console.log("Puzzle received event triggered", puzzle);
        this.eventHandler.handlePuzzleReceived(puzzle);
      });
      playerStateManager.on("puzzleCompleted", (data) =>
        this.eventHandler.handlePuzzleCompleted(data)
      );

      // Game progression events
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

      // Random events and communication
      playerStateManager.on("randomEvent", (data) =>
        this.eventHandler.handleRandomEvent(data)
      );
      playerStateManager.on("chatMessage", (data) =>
        this.chatManager.addChatMessage(data)
      );

      // Team puzzle real-time updates
      playerStateManager.on("teamPuzzleUpdate", (data) => {
        // If we have an active puzzle controller, pass the update to it
        if (
          this.activePuzzleController &&
          typeof this.activePuzzleController.handleUpdate === "function"
        ) {
          this.activePuzzleController.handleUpdate(
            data.updateData,
            data.playerId
          );
        }
      });

      // Timer and power events
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

      // Game started event - handles transition from lobby to game
      playerStateManager.on("gameStarted", () => {
        console.log("Game started event triggered");
        gameStartScreen.hideLobby();
        if (this.uiManager.elements.gameArea) {
          this.uiManager.elements.gameArea.classList.remove("hidden");
          console.log("Game area made visible");
        }

        // Update role instruction text
        const playerRole = playerStateManager.gameState.playerRole;
        if (playerRole) {
          const roleInfo = playerStateManager.getRoleInfo(playerRole);
          if (roleInfo && this.uiManager.elements.roleInstruction) {
            this.uiManager.elements.roleInstruction.textContent = `${playerRole} - ${roleInfo.description}`;
            this.uiManager.elements.roleInstruction.classList.remove(
              "text-gray-400",
              "italic"
            );
          }
        }
      });
    } catch (error) {
      console.error("Error registering player state events:", error);
    }
  }

  /**
   * Initialize UI with current state
   */
  _initializeUI() {
    this.uiManager.updateTimer(playerStateManager.gameState.timer);
    this.uiManager.updateAlertLevel(playerStateManager.gameState.alertLevel);
    this.uiManager.updateStageInfo();
    this.uiManager.updateTeamStatus();

    // Ensure puzzle area is visible when game starts
    if (
      playerStateManager.gameState.status ===
      playerStateManager.GAME_STATUS.IN_PROGRESS
    ) {
      const gameArea = document.getElementById("game-area");
      if (gameArea) {
        gameArea.classList.remove("hidden");
      }
    }
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

  // Get player ID from hidden input field
  const playerIdElement = document.getElementById("player-id");
  const playerId = playerIdElement ? playerIdElement.value : null;

  if (!playerId || !roomCode) {
    console.error("Missing player ID or room code");
    // Show error message to user
    if (game.notificationSystem) {
      game.notificationSystem.showAlert(
        "Error: Missing player information. Please return to the home page and try again.",
        "error",
        0 // Duration 0 means it stays until dismissed
      );
    }
    return;
  }

  // Initialize connection with server-provided state
  playerStateManager
    .initialize(roomCode, playerId, "") // playerName will be provided by server
    .then(() => {
      return websocketManager.connect(roomCode, playerId);
    })
    .then(() => {
      // Connection established
      // The WebSocket handler will provide all necessary game state
      console.log("Connected to game server");

      // Always show the lobby initially - if game is in progress,
      // the websocket handler will update the UI appropriately
      gameStartScreen.showLobby();
    })
    .catch((error) => {
      console.error("Error connecting to game:", error);

      // Show error to user
      if (game.notificationSystem) {
        game.notificationSystem.showAlert(
          "Failed to connect to game. Please refresh the page or try again later.",
          "error",
          0 // Duration 0 means it stays until dismissed
        );
      }
    });
});

export default GameController;
