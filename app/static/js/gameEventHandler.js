// gameEventHandler.js - Handles all game events and interactions

import playerStateManager from "./playerStateManager.js";
import gameStartScreen from "./gameStartScreen.js";
import websocketManager from "./websocketManager.js";
// Fix imports by importing from main.bundle.js
import {
  HackerPuzzleController,
  SafeCrackerPuzzleController,
  DemolitionsPuzzleController,
  LookoutPuzzleController,
  TeamPuzzleController,
} from "./main.bundle.js";

class GameEventHandler {
  constructor(
    uiManager,
    notificationSystem,
    chatManager,
    setActivePuzzleController,
    getActivePuzzleController,
    setPowerCooldown,
    resetPowerCooldown,
    setTimerExtendVoted
  ) {
    this.uiManager = uiManager;
    this.notificationSystem = notificationSystem;
    this.chatManager = chatManager;
    this.setActivePuzzleController = setActivePuzzleController;
    this.getActivePuzzleController = getActivePuzzleController;
    this.setPowerCooldown = setPowerCooldown;
    this.resetPowerCooldown = resetPowerCooldown;
    this.setTimerExtendVoted = setTimerExtendVoted;
    this.activeRandomEvents = [];
  }

  /**
   * Handle game state updates
   * @param {Object} data - Game state data
   */
  handleGameStateUpdated(data) {
    // Make sure UI Manager has been initialized
    if (!this.uiManager) {
      console.error("UI Manager not initialized");
      return;
    }

    try {
      // Only update UI if methods exist
      if (typeof this.uiManager.updateTimer === "function") {
        this.uiManager.updateTimer(data.timer);
      }

      if (typeof this.uiManager.updateAlertLevel === "function") {
        this.uiManager.updateAlertLevel(data.alertLevel);
      }

      if (typeof this.uiManager.updateStageInfo === "function") {
        this.uiManager.updateStageInfo();
      }

      if (typeof this.uiManager.updateTeamStatus === "function") {
        this.uiManager.updateTeamStatus();
      }

      // If game is in progress, make sure the game area is visible and lobby is hidden
      if (data.status === "in_progress") {
        // Handle reconnection scenario - make sure we show the game area
        this._ensureGameAreaVisible();
      }
    } catch (error) {
      console.error("Error updating UI:", error);
    }
  }

  /**
   * Ensure game area is visible and lobby is hidden
   * @private
   */
  _ensureGameAreaVisible() {
    const gameArea = document.getElementById("game-area");
    const lobby = document.getElementById("lobby");

    // Log for debugging
    console.log("Ensuring game area is visible");

    if (gameArea) {
      gameArea.classList.remove("hidden");
      console.log("Game area visibility updated");
    } else {
      console.error("Game area element not found");
    }

    // Hide lobby
    if (lobby) {
      lobby.classList.add("hidden");
      console.log("Lobby hidden");
    }

    // Also use gameStartScreen to hide lobby properly
    try {
      if (typeof gameStartScreen !== "undefined" && gameStartScreen.hideLobby) {
        gameStartScreen.hideLobby();
        console.log("gameStartScreen.hideLobby() called");
      }
    } catch (error) {
      console.error("Error calling gameStartScreen.hideLobby():", error);
    }

    // Update role instruction if needed
    this._updateRoleInstruction();

    // Check if the game is in progress but no puzzle is visible
    if (
      playerStateManager.gameState.status ===
      playerStateManager.GAME_STATUS.IN_PROGRESS
    ) {
      // If the puzzle content is empty or just shows the default message, request a puzzle
      const puzzleContent = this.uiManager.elements.puzzleContent;
      if (
        puzzleContent &&
        (!puzzleContent.children.length ||
          puzzleContent.textContent.includes("Waiting for puzzle assignment"))
      ) {
        console.log(
          "Game in progress but no puzzle visible, requesting puzzle data"
        );

        // Request puzzle data
        websocketManager
          .send({
            type: "request_puzzle",
            player_id: playerStateManager.gameState.playerId,
          })
          .catch((error) => {
            console.error("Error requesting puzzle:", error);
          });
      }
    }
  }

  /**
   * Update role instruction element
   * Private helper for reconnection and game state updates
   */
  _updateRoleInstruction() {
    if (
      !this.uiManager ||
      !this.uiManager.elements ||
      !this.uiManager.elements.roleInstruction
    ) {
      return;
    }

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
  }

  /**
   * Handle timer updates
   * @param {number} timer - New timer value in seconds
   */
  handleTimerUpdated(timer) {
    this.uiManager.updateTimer(timer);
  }

  /**
   * Handle alert level changes
   * @param {number} level - New alert level
   */
  handleAlertLevelChanged(level) {
    this.uiManager.updateAlertLevel(level);
  }

  /**
   * Handle puzzle data received
   * @param {Object} puzzle - Puzzle data
   */
  handlePuzzleReceived(puzzle) {
    // Log puzzle data for debugging
    console.log("Puzzle received:", puzzle);

    // Clean up previous puzzle controller if exists
    const currentController = this.getActivePuzzleController();
    if (currentController) {
      try {
        currentController.cleanup();
      } catch (error) {
        console.error("Error cleaning up previous puzzle:", error);
      }
    }

    // Ensure we have required elements
    if (!this.uiManager.elements.puzzleContent) {
      console.error("Puzzle content element not found");
      return;
    }

    // Set up new puzzle based on player's role and puzzle type
    let puzzleController = null;
    const playerRole = playerStateManager.gameState.playerRole;

    if (!playerRole) {
      console.error("Player role not defined");
      this.uiManager.elements.puzzleContent.innerHTML = `
        <div class="text-center p-4">
          <p class="text-red-400 mb-2">Error: Player role not defined</p>
          <p class="text-sm text-gray-400">Please try refreshing the page</p>
        </div>
      `;
      return;
    }

    // Make sure puzzle area is visible
    this._ensureGameAreaVisible();

    try {
      // Check if this is a team puzzle
      if (puzzle.type && puzzle.type.includes("team_puzzle")) {
        console.log("Creating team puzzle controller");
        puzzle.playerRole = playerRole; // Add player's role to puzzle data
        puzzle.room_code = playerStateManager.gameState.roomCode; // Add room code for WebSocket messages
        puzzleController = new TeamPuzzleController(
          this.uiManager.elements.puzzleContent,
          puzzle,
          (solution) => playerStateManager.submitPuzzleSolution(solution),
          websocketManager
        );
      } else {
        // Create role-specific puzzle controller
        console.log(
          "Creating role-specific puzzle controller for:",
          playerRole
        );
        switch (playerRole) {
          case "Hacker":
            puzzleController = new HackerPuzzleController(
              this.uiManager.elements.puzzleContent,
              puzzle,
              (solution) => playerStateManager.submitPuzzleSolution(solution)
            );
            break;
          case "Safe Cracker":
            puzzleController = new SafeCrackerPuzzleController(
              this.uiManager.elements.puzzleContent,
              puzzle,
              (solution) => playerStateManager.submitPuzzleSolution(solution)
            );
            break;
          case "Demolitions":
            puzzleController = new DemolitionsPuzzleController(
              this.uiManager.elements.puzzleContent,
              puzzle,
              (solution) => playerStateManager.submitPuzzleSolution(solution)
            );
            break;
          case "Lookout":
            puzzleController = new LookoutPuzzleController(
              this.uiManager.elements.puzzleContent,
              puzzle,
              (solution) => playerStateManager.submitPuzzleSolution(solution)
            );
            break;
          default:
            console.error("Unknown role:", playerRole);
            this.uiManager.elements.puzzleContent.innerHTML = `
              <div class="text-center p-4">
                <p class="text-red-400 mb-2">Error: Unknown role "${playerRole}"</p>
                <p class="text-sm text-gray-400">Please try refreshing the page</p>
              </div>
            `;
            return;
        }
      }

      // Initialize the puzzle and set as active
      if (puzzleController) {
        try {
          console.log("Initializing puzzle controller");
          puzzleController.initialize();
          this.setActivePuzzleController(puzzleController);
          console.log("Puzzle controller initialized successfully");
        } catch (initError) {
          console.error("Error initializing puzzle controller:", initError);
          this.uiManager.elements.puzzleContent.innerHTML = `
            <div class="text-center p-4">
              <p class="text-red-400 mb-2">Error initializing puzzle</p>
              <p class="text-sm text-gray-400">${initError.message}</p>
              <p class="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
            </div>
          `;
        }
      } else {
        console.error("Failed to create puzzle controller");
        this.uiManager.elements.puzzleContent.innerHTML = `
          <div class="text-center p-4">
            <p class="text-red-400 mb-2">Error creating puzzle</p>
            <p class="text-sm text-gray-400">Please try refreshing the page</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error creating puzzle controller:", error);
      this.uiManager.elements.puzzleContent.innerHTML = `
        <div class="text-center p-4">
          <p class="text-red-400 mb-2">Error loading puzzle</p>
          <p class="text-sm text-gray-400">${error.message}</p>
          <p class="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
        </div>
      `;
    }
  }

  /**
   * Handle puzzle completion
   * @param {Object} data - Puzzle completion data
   */
  handlePuzzleCompleted(data) {
    const player = playerStateManager.getPlayer(data.playerId);

    // Add a message to the chat
    this.chatManager.addSystemMessage(
      `${player.name} (${data.role}) completed their task!`
    );

    // If it's the current player, show success state
    if (
      data.playerId === playerStateManager.gameState.playerId &&
      this.getActivePuzzleController()
    ) {
      this.getActivePuzzleController().showSuccess();
    }
  }

  /**
   * Handle stage completion
   * @param {number} nextStage - Next stage number
   */
  handleStageCompleted(nextStage) {
    // Show stage completion notification
    this.notificationSystem.showAlert(
      `Stage ${nextStage - 1} Complete! Moving to Stage ${nextStage}...`,
      "success"
    );

    // Update stage info
    this.uiManager.updateStageInfo();

    // Add system message
    this.chatManager.addSystemMessage(
      `Stage ${nextStage - 1} completed! Starting Stage ${nextStage}: ${
        playerStateManager.getCurrentStageInfo().name
      }`
    );
  }

  /**
   * Handle game completion (success)
   */
  handleGameCompleted() {
    // Show success modal
    this.uiManager.showGameOverModal("success");

    // Play success sound
    this.uiManager.playSound("success");

    // Mark game as complete in state
    playerStateManager.gameState.status =
      playerStateManager.GAME_STATUS.COMPLETED;
  }

  /**
   * Handle game over (failure)
   * @param {string} result - Reason for failure
   */
  handleGameOver(result) {
    let resultMessage = "Your heist has failed.";

    if (result === "time_expired") {
      resultMessage = "You ran out of time. The authorities have arrived.";
    } else if (result === "alarm_triggered") {
      resultMessage =
        "Security alarm triggered! Guards have flooded the building.";
    } else if (result === "team_caught") {
      resultMessage = "Your team has been caught by security.";
    }

    // Show failure modal
    this.uiManager.showGameOverModal(result, resultMessage);

    // Play failure sound
    this.uiManager.playSound("failure");

    // Mark game as failed in state
    playerStateManager.gameState.status = playerStateManager.GAME_STATUS.FAILED;
  }

  /**
   * Handle use of player's role power
   */
  handleUsePower() {
    playerStateManager
      .useRolePower()
      .then(() => {
        const roleInfo = playerStateManager.getRoleInfo(
          playerStateManager.gameState.playerRole
        );
        this.notificationSystem.showAlert(
          `${roleInfo.power} activated!`,
          "success"
        );

        // Set cooldown
        this.setPowerCooldown();
        this.uiManager.setPowerButtonCooldown();

        setTimeout(() => {
          this.resetPowerCooldown();
          this.uiManager.resetPowerButtonCooldown();
        }, 60000); // 1 minute cooldown
      })
      .catch((error) => {
        this.notificationSystem.showAlert(error.message, "error");
      });
  }

  /**
   * Handle when other players use their power
   * @param {Object} data - Power used data
   */
  handlePowerUsedByOthers(data) {
    // Play power used sound effect
    this.uiManager.playSound("powerUsed");

    // Show notification with player name and power used
    this.notificationSystem.showAlert(
      `${data.playerName} (${data.role}) used: ${data.powerDescription}`,
      "info",
      7000 // Show for 7 seconds
    );

    // Add a styled system message to the chat
    this.chatManager.addSystemMessage(
      `${data.playerName} activated: ${data.powerDescription}`,
      false, // Don't skip animation
      {
        type: "power",
        role: data.role,
      }
    );
  }

  /**
   * Handle extend timer button click
   */
  handleExtendTimer() {
    playerStateManager
      .initiateTimerExtensionVote()
      .then(() => {
        this.notificationSystem.showAlert(
          "Timer extension vote initiated",
          "info"
        );
      })
      .catch((error) => {
        this.notificationSystem.showAlert(
          error.message || "Failed to initiate timer extension vote",
          "error"
        );
      });
  }

  /**
   * Handle timer vote initiated event
   * @param {Object} data - Vote data
   */
  handleTimerVoteInitiated(data) {
    // Show the vote modal with appropriate callbacks
    this.uiManager.showTimerVoteModal(
      data.voteTimeLimit,
      // Yes callback
      () => {
        playerStateManager
          .voteExtendTimer(true)
          .then(() => {
            // Success message handled by the vote update
          })
          .catch((error) => {
            this.notificationSystem.showAlert(
              error.message || "Failed to register vote",
              "error"
            );
          });
      },
      // No callback
      () => {
        playerStateManager
          .voteExtendTimer(false)
          .then(() => {
            // Success message handled by the vote update
          })
          .catch((error) => {
            this.notificationSystem.showAlert(
              error.message || "Failed to register vote",
              "error"
            );
          });
      }
    );

    // Update the vote display
    this.uiManager.updateTimerVote({
      votes: data.votes || [],
      yesVotes: [], // No votes yet when initiated
      noVotes: [],
      players: data.players,
      required: Math.ceil(Object.keys(data.players).length / 2), // Default to majority
      totalPlayers: Object.keys(data.players).length, // Add total players
    });

    // Add system message to chat
    const initiatorName = data.initiatorName || "A player";
    this.chatManager.addSystemMessage(
      `${initiatorName} initiated a vote to extend the timer`,
      false,
      { type: "vote" }
    );
  }

  /**
   * Handle timer vote update event
   * @param {Object} data - Vote update data
   */
  handleTimerVoteUpdated(data) {
    // Update the vote display with the yes/no votes directly from playerStateManager event
    this.uiManager.updateTimerVote({
      votes: data.votes,
      yesVotes: data.yesVotes || [],
      noVotes: data.noVotes || [],
      players: data.players,
      required: Math.ceil(Object.keys(data.players).length / 2), // Default to majority
      totalPlayers: Object.keys(data.players).length, // Add total players
    });

    // Play a sound for new votes
    this.uiManager.playSound("info");

    // Find the player who voted
    if (data.playerId) {
      const player = playerStateManager.getPlayer(data.playerId);
      if (player) {
        // Add system message to chat if not the current player
        if (data.playerId !== playerStateManager.gameState.playerId) {
          const voteText = data.vote ? "voted YES" : "voted NO";
          this.chatManager.addSystemMessage(
            `${player.name} ${voteText} on timer extension`,
            false,
            { type: "vote" }
          );
        }
      }
    }
  }

  /**
   * Handle timer vote completed event
   * @param {Object} data - Vote completion data
   */
  handleTimerVoteCompleted(data) {
    // Hide the vote modal
    this.uiManager.hideTimerVoteModal();

    // Show result notification
    if (data.success) {
      this.notificationSystem.showAlert(
        "Timer extended successfully! Alert level increased.",
        "success"
      );
      this.uiManager.playSound("timerExtended");
    } else {
      this.notificationSystem.showAlert(
        data.message || "Vote failed. Timer not extended.",
        "warning"
      );
    }

    // Add system message to chat
    this.chatManager.addSystemMessage(
      data.success
        ? "Vote passed! Timer extended by 60 seconds. Alert level increased!"
        : data.message || "Vote failed. Timer not extended.",
      false,
      { type: "vote" }
    );
  }

  /**
   * Handle random event
   * @param {Object} data - Random event data
   */
  handleRandomEvent(data) {
    const eventNames = {
      security_patrol: "Security Patrol",
      camera_sweep: "Camera Sweep",
      system_check: "System Check",
    };

    const eventDisplayName = eventNames[data.event] || data.event;

    // Show notification
    this.notificationSystem.showAlert(
      `${eventDisplayName} in progress! (${data.duration}s)`,
      "warning"
    );

    // Add to active events
    this.activeRandomEvents.push(data.event);

    // Add system message
    this.chatManager.addSystemMessage(
      `${eventDisplayName} detected! Proceed with caution.`
    );

    // Affect the active puzzle if applicable
    const puzzleController = this.getActivePuzzleController();
    if (puzzleController) {
      puzzleController.handleRandomEvent(data.event, data.duration);
    }

    // Remove from active events after duration
    setTimeout(() => {
      this.activeRandomEvents = this.activeRandomEvents.filter(
        (e) => e !== data.event
      );
      this.chatManager.addSystemMessage(`${eventDisplayName} has ended.`);
    }, data.duration * 1000);
  }

  /**
   * Handle timer extension
   * @param {Object} data - Timer extension data
   */
  handleTimerExtended(data) {
    this.notificationSystem.showAlert(
      `Timer extended! Alert level increased to ${data.alertLevel}`,
      "success"
    );

    // Reset the extend timer button (in case it was disabled)
    this.uiManager.resetExtendTimerButton();
    this.setTimerExtendVoted(false); // Reset the voted flag
  }

  /**
   * Handle game reset request (from server)
   * @param {Object} data - Reset data
   */
  handleGameReset(data) {
    // Make sure we're in the lobby
    if (
      gameStartScreen &&
      !gameStartScreen.lobbyElement.classList.contains("hidden")
    ) {
      return; // Already in lobby, nothing to do
    }

    // Hide game UI
    if (this.uiManager.elements.gameArea) {
      this.uiManager.elements.gameArea.classList.add("hidden");
    }

    // Reset any active puzzles
    const currentController = this.getActivePuzzleController();
    if (currentController) {
      currentController.cleanup();
      this.setActivePuzzleController(null);
    }

    // Show lobby
    if (gameStartScreen) {
      gameStartScreen.showLobby();
    }

    // Show notification
    this.notificationSystem.showAlert(
      "Game reset. Choose your roles to start a new heist!",
      "info"
    );

    // Add chat message
    this.chatManager.addSystemMessage(
      "Game has been reset. Choose your roles to start a new heist!",
      false,
      { type: "game", highlight: true }
    );
  }
}

export default GameEventHandler;
