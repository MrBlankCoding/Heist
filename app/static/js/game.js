// game.js - Main game script that ties everything together

import {
  websocketManager,
  playerStateManager,
  gameStartScreen,
  GameUIManager,
  GameEventHandler,
  NotificationSystem,
  ChatManager,
  puzzleLoader,
} from "./main.bundle.js";

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

    this._init();
    window.GameController = this;
  }

  _init() {
    gameStartScreen.initialize();

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

    this._setupEventListeners();
    this._registerPlayerStateEvents();
    this._initializeUI();
  }

  _setupEventListeners() {
    this.uiManager.elements.usePowerButton.addEventListener("click", () => {
      if (this.powerCooldown) {
        this.notificationSystem.showAlert("Power is on cooldown!", "error");
        return;
      }
      this.eventHandler.handleUsePower();
    });

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

    this._setupLeaveGameListeners();
  }

  _setupLeaveGameListeners() {
    const leaveGameButton = document.getElementById("leave-game");
    const leaveGameModal = document.getElementById("leave-game-modal");
    const confirmLeaveButton = document.getElementById("confirm-leave");
    const cancelLeaveButton = document.getElementById("cancel-leave");

    if (!leaveGameButton || !leaveGameModal) return;

    leaveGameButton.addEventListener("click", () => {
      leaveGameModal.classList.remove("hidden");
    });

    if (cancelLeaveButton) {
      cancelLeaveButton.addEventListener("click", () => {
        leaveGameModal.classList.add("hidden");
      });
    }

    if (confirmLeaveButton) {
      confirmLeaveButton.addEventListener("click", () =>
        this._handleLeaveGame()
      );
    }
  }

  _handleLeaveGame() {
    const playerId = document.getElementById("player-id")?.value;

    if (!playerId) {
      this.notificationSystem.showAlert("Player ID not found", "error");
      return;
    }

    websocketManager
      .send({
        type: "leave_game",
        player_id: playerId,
      })
      .catch((error) => {
        console.error("Error sending leave game message:", error);
      });

    setTimeout(() => {
      websocketManager.disconnect("User manually left the game");

      fetch(`/api/game/leave?player_id=${playerId}`, {
        method: "POST",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            this.notificationSystem.showAlert(`Error: ${data.error}`, "error");
          } else {
            playerStateManager.clearPersistedState();
            window.location.href = "/";
          }
        })
        .catch((error) => {
          console.error("Error leaving game:", error);
          this.notificationSystem.showAlert(
            "Failed to leave game properly. Redirecting to home...",
            "error"
          );
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        });
    }, 300);
  }

  _registerPlayerStateEvents() {
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

      // Puzzle events
      playerStateManager.on("puzzleReceived", (puzzle) =>
        this.eventHandler.handlePuzzleReceived(puzzle)
      );
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
        if (this.activePuzzleController?.handleUpdate) {
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

      // Game started event
      playerStateManager.on("gameStarted", () => {
        gameStartScreen.hideLobby();
        if (this.uiManager.elements.gameArea) {
          this.uiManager.elements.gameArea.classList.remove("hidden");
        }

        this._updateRoleInstructions();
      });
    } catch (error) {
      console.error("Error registering player state events:", error);
    }
  }

  _updateRoleInstructions() {
    const playerRole = playerStateManager.gameState.playerRole;
    if (playerRole && this.uiManager.elements.roleInstruction) {
      const roleInfo = playerStateManager.getRoleInfo(playerRole);
      if (roleInfo) {
        this.uiManager.elements.roleInstruction.textContent = `${playerRole} - ${roleInfo.description}`;
        this.uiManager.elements.roleInstruction.classList.remove(
          "text-gray-400",
          "italic"
        );
      }
    }
  }

  _initializeUI() {
    this.uiManager.updateTimer(playerStateManager.gameState.timer);
    this.uiManager.updateAlertLevel(playerStateManager.gameState.alertLevel);
    this.uiManager.updateStageInfo();
    this.uiManager.updateTeamStatus();

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

document.addEventListener("DOMContentLoaded", () => {
  const game = new GameController();

  const roomCodeElement = document.getElementById("room-code");
  const roomCode = roomCodeElement
    ? roomCodeElement.textContent.split(": ")[1]
    : null;

  const playerIdElement = document.getElementById("player-id");
  const playerId = playerIdElement ? playerIdElement.value : null;

  if (!playerId || !roomCode) {
    console.error("Missing player ID or room code");
    game.notificationSystem?.showAlert(
      "Error: Missing player information. Please return to the home page and try again.",
      "error",
      0
    );
    return;
  }

  playerStateManager
    .initialize(roomCode, playerId, "")
    .then(() => websocketManager.connect(roomCode, playerId))
    .then(() => {
      console.log("Connected to game server");
      gameStartScreen.showLobby();
    })
    .catch((error) => {
      console.error("Error connecting to game:", error);
      game.notificationSystem?.showAlert(
        "Failed to connect to game. Please refresh the page or try again later.",
        "error",
        0
      );
    });
});

export default GameController;
