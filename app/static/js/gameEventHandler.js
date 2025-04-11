// gameEventHandler.js - Handles all game events and interactions

import playerStateManager from "./playerStateManager.js";
import gameStartScreen from "./gameStartScreen.js";
import HackerPuzzleController from "./puzzles/hackerPuzzleController.js";
import SafeCrackerPuzzleController from "./puzzles/safeCrackerPuzzleController.js";
import DemolitionsPuzzleController from "./puzzles/demolitionsPuzzleController.js";
import LookoutPuzzleController from "./puzzles/lookoutPuzzleController.js";
import TeamPuzzleController from "./puzzles/teamPuzzleController.js";

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
    // Update UI based on game state
    this.uiManager.updateTimer(data.timer);
    this.uiManager.updateAlertLevel(data.alertLevel);
    this.uiManager.updateStageInfo();
    this.uiManager.updateTeamStatus();

    // Check if game was already in progress when joining
    if (
      data.status === "in_progress" &&
      gameStartScreen.lobbyElement.classList.contains("hidden") === false
    ) {
      gameStartScreen.hideLobby();
      this.uiManager.gameAreaElement.classList.remove("hidden");

      // Update role instruction to replace "waiting for game to start" message
      const playerRole = playerStateManager.gameState.playerRole;
      if (playerRole) {
        const roleInfo = playerStateManager.getRoleInfo(playerRole);
        if (roleInfo) {
          this.uiManager.roleInstructionElement.textContent = `${playerRole} - ${roleInfo.description}`;
          this.uiManager.roleInstructionElement.classList.remove(
            "text-gray-400",
            "italic"
          );
        }
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
    // Clean up previous puzzle controller if exists
    const currentController = this.getActivePuzzleController();
    if (currentController) {
      currentController.cleanup();
    }

    // Set up new puzzle based on player's role and puzzle type
    let puzzleController = null;
    const playerRole = playerStateManager.gameState.playerRole;

    // Check if this is a team puzzle
    if (puzzle.type && puzzle.type.includes("team_puzzle")) {
      puzzle.playerRole = playerRole; // Add player's role to puzzle data
      puzzleController = new TeamPuzzleController(
        this.uiManager.puzzleContentElement,
        puzzle,
        (solution) => playerStateManager.submitPuzzleSolution(solution)
      );
    } else {
      // Create role-specific puzzle controller
      switch (playerRole) {
        case "Hacker":
          puzzleController = new HackerPuzzleController(
            this.uiManager.puzzleContentElement,
            puzzle,
            (solution) => playerStateManager.submitPuzzleSolution(solution)
          );
          break;
        case "Safe Cracker":
          puzzleController = new SafeCrackerPuzzleController(
            this.uiManager.puzzleContentElement,
            puzzle,
            (solution) => playerStateManager.submitPuzzleSolution(solution)
          );
          break;
        case "Demolitions":
          puzzleController = new DemolitionsPuzzleController(
            this.uiManager.puzzleContentElement,
            puzzle,
            (solution) => playerStateManager.submitPuzzleSolution(solution)
          );
          break;
        case "Lookout":
          puzzleController = new LookoutPuzzleController(
            this.uiManager.puzzleContentElement,
            puzzle,
            (solution) => playerStateManager.submitPuzzleSolution(solution)
          );
          break;
        default:
          console.error("Unknown role:", playerRole);
          return;
      }
    }

    // Initialize the puzzle and set as active
    if (puzzleController) {
      puzzleController.initialize();
      this.setActivePuzzleController(puzzleController);
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
   * Handle timer extension vote
   */
  handleExtendTimer() {
    playerStateManager.voteExtendTimer();
    this.setTimerExtendVoted();

    // Update button state
    this.uiManager.updateExtendTimerButtonAfterVote();

    this.notificationSystem.showAlert("Vote cast to extend the timer", "info");
  }

  /**
   * Handle timer extension
   * @param {Object} data - Timer extension data
   */
  handleTimerExtended(data) {
    this.notificationSystem.showAlert(
      `Timer extended! Alert level increased to ${data.alertLevel}`,
      "warning"
    );

    // Reset timer vote button
    this.uiManager.resetExtendTimerButton();

    // Add system message
    this.chatManager.addSystemMessage(
      "Timer extended by team vote. Alert level increased!"
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
}

export default GameEventHandler;
