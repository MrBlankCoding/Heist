// gameUIManager.js - Handles all UI updates and DOM interactions

import playerStateManager from "./playerStateManager.js";

class GameUIManager {
  constructor() {
    // Cache DOM Elements
    this.elements = {
      gameArea: document.getElementById("game-area"),
      timer: document.getElementById("timer"),
      alertLevel: document.getElementById("alert-level"),
      stageNumber: document.getElementById("stage-number"),
      stageName: document.getElementById("stage-name"),
      stageProgress: document.getElementById("stage-progress"),
      teamStatus: document.getElementById("team-status"),
      puzzleContent: document.getElementById("puzzle-content"),
      roleInstruction: document.getElementById("role-instruction"),
      usePowerButton: document.getElementById("use-power"),
      extendTimerButton: document.getElementById("extend-timer"),
      gameOverModal: document.getElementById("game-over-modal"),
      gameResult: document.getElementById("game-result"),
      gameResultMessage: document.getElementById("game-result-message"),
      playAgainButton: document.getElementById("play-again"),
      returnHomeButton: document.getElementById("return-home"),
    };

    // Validation
    this._validateElements();

    // State tracking
    this.currentTimer = 300;
    this.currentAlertLevel = 0;
    this.currentStage = 1;
  }

  /**
   * Validate that all required DOM elements exist
   * @private
   */
  _validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.error(
        `Missing required DOM elements: ${missingElements.join(", ")}`
      );
    }
  }

  /**
   * Update the timer display
   * @param {number} seconds - Time remaining in seconds
   */
  updateTimer(seconds) {
    if (!this.elements.timer) return;

    // Only update if the timer has changed
    if (this.currentTimer === seconds) return;
    this.currentTimer = seconds;

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.elements.timer.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    // Change timer color based on urgency
    this.elements.timer.classList.remove(
      "text-red-500",
      "text-yellow-500",
      "animate-pulse"
    );

    if (seconds <= 30) {
      this.elements.timer.classList.add("text-red-500", "animate-pulse");
    } else if (seconds <= 60) {
      this.elements.timer.classList.add("text-yellow-500");
    }
  }

  /**
   * Update the alert level display
   * @param {number} level - Current alert level
   */
  updateAlertLevel(level) {
    if (!this.elements.alertLevel) return;

    // Only update if the level has changed
    if (this.currentAlertLevel === level) return;
    this.currentAlertLevel = level;

    let alertText = "LOW";
    let alertClass = "bg-green-900 text-green-200";

    if (level >= 3 && level < 5) {
      alertText = "MEDIUM";
      alertClass = "bg-yellow-900 text-yellow-200";
    } else if (level >= 5) {
      alertText = "HIGH";
      alertClass = "bg-red-900 text-red-200";
    }

    this.elements.alertLevel.textContent = `Alert: ${alertText}`;

    // Update class - Remove all possible classes first
    this.elements.alertLevel.className = `ml-4 px-3 py-1 rounded-md ${alertClass}`;
  }

  /**
   * Update stage information display
   */
  updateStageInfo() {
    if (
      !this.elements.stageNumber ||
      !this.elements.stageName ||
      !this.elements.stageProgress
    )
      return;

    const stageInfo = playerStateManager.getCurrentStageInfo();
    if (!stageInfo) return;

    // Only update if the stage has changed
    if (this.currentStage === stageInfo.number) return;
    this.currentStage = stageInfo.number;

    this.elements.stageNumber.textContent = `Stage ${stageInfo.number}/5`;
    this.elements.stageName.textContent = stageInfo.name;

    // Update progress bar
    const progressPercent = ((stageInfo.number - 1) / 5) * 100;
    this.elements.stageProgress.style.width = `${progressPercent}%`;
  }

  /**
   * Update team status display
   */
  updateTeamStatus() {
    if (!this.elements.teamStatus) return;

    const players = playerStateManager.getAllPlayers();
    if (!players) return;

    const currentPlayerId = playerStateManager.gameState.playerId;
    const fragment = document.createDocumentFragment();

    Object.values(players).forEach((player) => {
      const roleInfo = playerStateManager.getRoleInfo(player.role);
      const roleColor = roleInfo ? roleInfo.color : "gray";
      const isCurrentPlayer = player.id === currentPlayerId;
      const statusClass = player.connected ? "text-green-400" : "text-red-400";

      const playerEl = document.createElement("div");
      playerEl.className = "mb-2 flex justify-between items-center";
      playerEl.innerHTML = `
        <div class="flex items-center">
          <span class="text-${roleColor}-400 mr-2">●</span>
          <div class="flex flex-col">
            <span class="font-semibold ${
              isCurrentPlayer ? "text-blue-300" : ""
            }">${this._escapeHtml(player.name)}${
        isCurrentPlayer ? " (You)" : ""
      }</span>
            <span class="text-xs text-${roleColor}-300">${this._escapeHtml(
        player.role || ""
      )}</span>
          </div>
        </div>
        <div class="${statusClass}">
          ${player.connected ? "✓" : "✗"}
        </div>
      `;

      fragment.appendChild(playerEl);
    });

    // Clear and update in one operation to minimize reflows
    this.elements.teamStatus.innerHTML = "";
    this.elements.teamStatus.appendChild(fragment);
  }

  /**
   * Set up puzzle UI based on player's role and puzzle data
   * @param {Object} puzzle - Puzzle data
   * @param {Function} getActivePuzzleController - Function to get the active puzzle controller
   * @returns {Object|null} - The created puzzle controller or null if role is unknown
   */
  setupPuzzleUI(puzzle, getActivePuzzleController) {
    if (!this.elements.puzzleContent || !this.elements.roleInstruction)
      return null;

    const role = playerStateManager.gameState.playerRole;
    if (!role) return null;

    // Clear puzzle area
    this.elements.puzzleContent.innerHTML = "";

    // Set role instruction
    const roleInfo = playerStateManager.getRoleInfo(role);
    if (roleInfo) {
      this.elements.roleInstruction.textContent = `${role} - ${roleInfo.description}`;
      this.elements.roleInstruction.classList.remove("text-gray-400", "italic");
    }

    let puzzleController = null;
    let PuzzleControllerClass = null;

    // Dynamic import for the appropriate puzzle controller
    try {
      // Create appropriate puzzle controller based on role
      switch (role) {
        case "Hacker":
          PuzzleControllerClass = HackerPuzzleController;
          break;
        case "Safe Cracker":
          PuzzleControllerClass = SafeCrackerPuzzleController;
          break;
        case "Demolitions":
          PuzzleControllerClass = DemolitionsPuzzleController;
          break;
        case "Lookout":
          PuzzleControllerClass = LookoutPuzzleController;
          break;
        default:
          console.error("Unknown role:", role);
          return null;
      }

      // Create and initialize the puzzle controller
      if (PuzzleControllerClass) {
        puzzleController = new PuzzleControllerClass(
          this.elements.puzzleContent,
          puzzle,
          (solution) => playerStateManager.submitPuzzleSolution(solution)
        );

        puzzleController.initialize();
      }
    } catch (error) {
      console.error(
        `Error creating puzzle controller for role ${role}:`,
        error
      );
    }

    return puzzleController;
  }

  /**
   * Update power button when timer extension vote is cast
   */
  updateExtendTimerButtonAfterVote() {
    if (!this.elements.extendTimerButton) return;

    this.elements.extendTimerButton.classList.add("opacity-50");
    this.elements.extendTimerButton.textContent = "Vote Cast: Extend Timer";
    this.elements.extendTimerButton.disabled = true;
  }

  /**
   * Reset the timer extension button after timer is extended
   */
  resetExtendTimerButton() {
    if (!this.elements.extendTimerButton) return;

    this.elements.extendTimerButton.classList.remove("opacity-50");
    this.elements.extendTimerButton.textContent = "Vote: Extend Timer";
    this.elements.extendTimerButton.disabled = false;
  }

  /**
   * Set power button to cooldown state
   * @param {number} [cooldownDuration=60] - Cooldown duration in seconds
   */
  setPowerButtonCooldown(cooldownDuration = 60) {
    if (!this.elements.usePowerButton) return;

    this.elements.usePowerButton.disabled = true;
    this.elements.usePowerButton.classList.add("opacity-50");

    // Add visual countdown if needed
    const originalText = this.elements.usePowerButton.textContent;
    this.elements.usePowerButton.dataset.originalText = originalText;

    // Optional: implement countdown display
    this._startCooldownTimer(cooldownDuration);
  }

  /**
   * Reset power button from cooldown state
   */
  resetPowerButtonCooldown() {
    if (!this.elements.usePowerButton) return;

    this.elements.usePowerButton.disabled = false;
    this.elements.usePowerButton.classList.remove("opacity-50");

    // Restore original text if it was changed
    if (this.elements.usePowerButton.dataset.originalText) {
      this.elements.usePowerButton.textContent =
        this.elements.usePowerButton.dataset.originalText;
      delete this.elements.usePowerButton.dataset.originalText;
    }

    // Clear any ongoing countdown
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  /**
   * Start cooldown timer for power button
   * @param {number} duration - Duration in seconds
   * @private
   */
  _startCooldownTimer(duration) {
    if (!this.elements.usePowerButton) return;

    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    let timeLeft = duration;
    this.elements.usePowerButton.textContent = `Power Cooling Down (${timeLeft}s)`;

    this.cooldownInterval = setInterval(() => {
      timeLeft--;
      this.elements.usePowerButton.textContent = `Power Cooling Down (${timeLeft}s)`;

      if (timeLeft <= 0) {
        this.resetPowerButtonCooldown();
      }
    }, 1000);
  }

  /**
   * Show game over modal with results
   * @param {string} result - "success" or the failure reason
   * @param {string} message - Message to display
   */
  showGameOverModal(result, message) {
    if (
      !this.elements.gameOverModal ||
      !this.elements.gameResult ||
      !this.elements.gameResultMessage
    )
      return;

    if (result === "success") {
      this.elements.gameResult.textContent = "HEIST SUCCESSFUL";
      this.elements.gameResultMessage.textContent =
        message ||
        "You've successfully completed the heist and escaped with the loot!";
    } else {
      this.elements.gameResult.textContent = "HEIST FAILED";
      this.elements.gameResultMessage.textContent =
        message || "The heist has failed.";
    }

    this.elements.gameOverModal.classList.remove("hidden");

    // Add animation class if defined in CSS
    this.elements.gameOverModal.classList.add("animate-fadeIn");
  }

  /**
   * Hide game over modal
   */
  hideGameOverModal() {
    if (!this.elements.gameOverModal) return;

    this.elements.gameOverModal.classList.add("animate-fadeOut");

    // Remove the modal after animation completes
    setTimeout(() => {
      this.elements.gameOverModal.classList.add("hidden");
      this.elements.gameOverModal.classList.remove(
        "animate-fadeIn",
        "animate-fadeOut"
      );
    }, 300); // Match with CSS animation duration
  }

  /**
   * Play a sound effect
   * @param {string} type - Sound type
   */
  playSound(type) {
    const soundMap = {
      success: "success.mp3",
      failure: "failure.mp3",
      alert: "alert.mp3",
      powerUsed: "power.mp3",
      timerExtended: "timer_extended.mp3",
    };

    const soundFile = soundMap[type];
    if (!soundFile) {
      console.warn(`Unknown sound type: ${type}`);
      return;
    }

    try {
      const audio = new Audio(`/static/sounds/${soundFile}`);
      audio.play().catch((error) => {
        console.warn(`Failed to play sound ${type}:`, error);
      });
    } catch (error) {
      console.warn(`Error playing sound ${type}:`, error);
    }
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} unsafe - Unsafe string
   * @returns {string} - Escaped string
   * @private
   */
  _escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export default GameUIManager;
