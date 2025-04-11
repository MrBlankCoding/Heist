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
      // Timer vote modal elements
      timerVoteModal: document.getElementById("timer-vote-modal"),
      voteCount: document.getElementById("vote-count"),
      voteProgress: document.getElementById("vote-progress"),
      votePlayerList: document.getElementById("vote-player-list"),
      voteYesButton: document.getElementById("vote-yes"),
      voteNoButton: document.getElementById("vote-no"),
      voteTimer: document.getElementById("vote-timer"),
    };

    // Validation
    this._validateElements();

    // State tracking
    this.currentTimer = 300;
    this.currentAlertLevel = 0;
    this.currentStage = 1;
    this.voteTimerInterval = null;
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

    // Store the previous value for animation
    const previousTimer = this.currentTimer;
    this.currentTimer = seconds;

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedTime = `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;

    // Apply the new time
    this.elements.timer.textContent = formattedTime;

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

    // Add a brief highlight effect when timer changes
    if (previousTimer !== undefined && seconds !== previousTimer) {
      // Apply highlight effect
      this.elements.timer.classList.add("timer-update");

      // Remove the effect after animation completes
      setTimeout(() => {
        this.elements.timer.classList.remove("timer-update");
      }, 500);
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

  /**
   * Show the timer extension vote modal
   * @param {number} voteTimeLimit - Time limit for voting in seconds
   * @param {Function} onVoteYes - Callback for yes vote
   * @param {Function} onVoteNo - Callback for no vote
   */
  showTimerVoteModal(voteTimeLimit = 20, onVoteYes, onVoteNo) {
    if (!this.elements.timerVoteModal) return;

    // Reset vote display
    if (this.elements.voteCount) {
      this.elements.voteCount.textContent = "0/0";
    }

    if (this.elements.voteProgress) {
      this.elements.voteProgress.style.width = "0%";
    }

    if (this.elements.votePlayerList) {
      this.elements.votePlayerList.innerHTML = "";
    }

    // Set up event listeners for buttons
    if (this.elements.voteYesButton) {
      // Remove old event listeners if any
      const newYesButton = this.elements.voteYesButton.cloneNode(true);
      this.elements.voteYesButton.parentNode.replaceChild(
        newYesButton,
        this.elements.voteYesButton
      );
      this.elements.voteYesButton = newYesButton;

      this.elements.voteYesButton.addEventListener("click", () => {
        this.elements.voteYesButton.disabled = true;
        this.elements.voteYesButton.classList.add("opacity-50");
        this.elements.voteNoButton.disabled = true;
        this.elements.voteNoButton.classList.add("opacity-50");
        if (onVoteYes) onVoteYes();
      });
    }

    if (this.elements.voteNoButton) {
      // Remove old event listeners if any
      const newNoButton = this.elements.voteNoButton.cloneNode(true);
      this.elements.voteNoButton.parentNode.replaceChild(
        newNoButton,
        this.elements.voteNoButton
      );
      this.elements.voteNoButton = newNoButton;

      this.elements.voteNoButton.addEventListener("click", () => {
        this.elements.voteYesButton.disabled = true;
        this.elements.voteYesButton.classList.add("opacity-50");
        this.elements.voteNoButton.disabled = true;
        this.elements.voteNoButton.classList.add("opacity-50");
        if (onVoteNo) onVoteNo();
      });
    }

    // Start vote timer
    this._startVoteTimer(voteTimeLimit);

    // Show the modal
    this.elements.timerVoteModal.classList.remove("hidden");
    this.elements.timerVoteModal.classList.add("animate-fadeIn");

    // Play sound effect
    this.playSound("alert");
  }

  /**
   * Update the timer extension vote display
   * @param {Object} voteData - Vote data
   * @param {Array} voteData.votes - Array of player IDs who have voted
   * @param {Object} voteData.players - Players object
   * @param {number} voteData.required - Number of votes required to pass
   */
  updateTimerVote(voteData) {
    if (!this.elements.timerVoteModal) return;

    const totalPlayers = Object.keys(voteData.players).length;
    const votesCount = voteData.votes.length;
    const requiredVotes = voteData.required || Math.ceil(totalPlayers / 2);

    // Update vote count
    if (this.elements.voteCount) {
      this.elements.voteCount.textContent = `${votesCount}/${requiredVotes}`;
    }

    // Update progress bar (percentage of required votes)
    if (this.elements.voteProgress) {
      const percentage = Math.min(100, (votesCount / requiredVotes) * 100);
      this.elements.voteProgress.style.width = `${percentage}%`;
    }

    // Update player list
    if (this.elements.votePlayerList) {
      this.elements.votePlayerList.innerHTML = "";

      // Create player vote status elements
      Object.entries(voteData.players).forEach(([playerId, player]) => {
        const hasVoted = voteData.votes.includes(playerId);
        const isCurrentPlayer =
          playerId === playerStateManager.gameState.playerId;

        const playerEl = document.createElement("div");
        playerEl.className = "flex items-center justify-between";

        const roleInfo = playerStateManager.getRoleInfo(player.role);
        const roleColor = roleInfo ? roleInfo.color : "gray";

        playerEl.innerHTML = `
          <div class="flex items-center">
            <span class="text-${roleColor}-400 mr-1.5">●</span>
            <span class="${
              isCurrentPlayer ? "font-bold" : ""
            }">${this._escapeHtml(player.name)}</span>
          </div>
          <div>
            ${
              hasVoted
                ? '<span class="text-green-400">✓</span>'
                : '<span class="text-gray-500">•••</span>'
            }
          </div>
        `;

        this.elements.votePlayerList.appendChild(playerEl);
      });
    }
  }

  /**
   * Hide the timer extension vote modal
   */
  hideTimerVoteModal() {
    if (!this.elements.timerVoteModal) return;

    // Stop the vote timer
    if (this.voteTimerInterval) {
      clearInterval(this.voteTimerInterval);
      this.voteTimerInterval = null;
    }

    // Hide the modal with animation
    this.elements.timerVoteModal.classList.add("animate-fadeOut");

    // Remove the modal after animation completes
    setTimeout(() => {
      this.elements.timerVoteModal.classList.add("hidden");
      this.elements.timerVoteModal.classList.remove(
        "animate-fadeIn",
        "animate-fadeOut"
      );

      // Reset button states
      if (this.elements.voteYesButton) {
        this.elements.voteYesButton.disabled = false;
        this.elements.voteYesButton.classList.remove("opacity-50");
      }

      if (this.elements.voteNoButton) {
        this.elements.voteNoButton.disabled = false;
        this.elements.voteNoButton.classList.remove("opacity-50");
      }
    }, 300);
  }

  /**
   * Start the vote timer countdown
   * @param {number} duration - Duration in seconds
   * @private
   */
  _startVoteTimer(duration) {
    if (!this.elements.voteTimer) return;

    // Clear any existing interval
    if (this.voteTimerInterval) {
      clearInterval(this.voteTimerInterval);
    }

    // Set initial value
    let timeLeft = duration;
    this.elements.voteTimer.textContent = `Vote ends in ${timeLeft}s`;

    // Start interval
    this.voteTimerInterval = setInterval(() => {
      timeLeft--;

      if (timeLeft <= 0) {
        clearInterval(this.voteTimerInterval);
        this.voteTimerInterval = null;
        // Don't auto-hide the modal - the server should tell us when to hide it
      } else {
        this.elements.voteTimer.textContent = `Vote ends in ${timeLeft}s`;
      }
    }, 1000);
  }
}

export default GameUIManager;
