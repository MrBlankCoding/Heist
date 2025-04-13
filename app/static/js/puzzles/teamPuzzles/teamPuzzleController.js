// teamPuzzleController.js - Controller for team-based puzzles

class TeamPuzzleController {
  constructor(
    containerElement,
    puzzleData,
    submitSolutionCallback,
    websocketManager
  ) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.websocketManager = websocketManager;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;
    this.playerRole = puzzleData.playerRole || "Unknown";
    this.roomCode = puzzleData.room_code;

    // Common properties
    this.timer = null;
    this.countdownValue = 120; // Default 120 seconds for team puzzles
    this.activePuzzle = null;

    // DOM elements will be created during initialization
    this.countdownElement = null;
    this.messageElement = null;
    this.submitButton = null;
    this.gameArea = null;

    // Puzzle type mapping
    this.puzzleTypeMap = {
      // Team puzzles
      team_puzzle_1: () =>
        import("./AlarmBypassPuzzle.js").then((module) => module.default),
      team_puzzle_2: () =>
        import("./SecurityGridPuzzle.js").then((module) => module.default),
      team_puzzle_3: () =>
        import("./VaultLockPuzzle.js").then((module) => module.default),
      team_puzzle_4: () =>
        import("./DataDecryptionPuzzle.js").then((module) => module.default),
      team_puzzle_5: () =>
        import("./EscapeSequencePuzzle.js").then((module) => module.default),
    };
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this._createUIElements();
    this._initializePuzzle();

    // Attach submit button event
    if (this.submitButton) {
      this.submitButton.addEventListener("click", () => this._handleSubmit());
    }
  }

  /**
   * Create the UI elements for the puzzle
   */
  _createUIElements() {
    // Clean any existing content
    this.containerElement.innerHTML = "";

    // Create container
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "w-full max-w-4xl mx-auto bg-gray-800 rounded-lg overflow-hidden shadow-lg";

    // Header with puzzle title and timer
    const header = document.createElement("div");
    header.className = "p-4 bg-gray-700 flex items-center justify-between";

    const title = document.createElement("h2");
    title.className = "text-xl font-bold text-white";
    title.textContent = this._getPuzzleTitle();
    header.appendChild(title);

    // Role indicator
    const roleIndicator = document.createElement("div");
    roleIndicator.className = "px-3 py-1 rounded-md font-semibold";

    // Set color based on role
    switch (this.playerRole) {
      case "Hacker":
        roleIndicator.classList.add("bg-cyan-700", "text-cyan-100");
        break;
      case "Safe Cracker":
        roleIndicator.classList.add("bg-yellow-700", "text-yellow-100");
        break;
      case "Demolitions":
        roleIndicator.classList.add("bg-red-700", "text-red-100");
        break;
      case "Lookout":
        roleIndicator.classList.add("bg-green-700", "text-green-100");
        break;
      default:
        roleIndicator.classList.add("bg-gray-600", "text-white");
    }

    roleIndicator.textContent = this.playerRole;
    header.appendChild(roleIndicator);

    // Timer display
    this.countdownElement = document.createElement("div");
    this.countdownElement.className =
      "bg-gray-900 text-white px-3 py-1 rounded-md font-mono";
    this.countdownElement.textContent = `${this.countdownValue}s`;
    header.appendChild(this.countdownElement);

    puzzleContainer.appendChild(header);

    // Game area
    this.gameArea = document.createElement("div");
    this.gameArea.className = "p-6 bg-gray-800 min-h-[400px]";
    puzzleContainer.appendChild(this.gameArea);

    // Message area
    this.messageElement = document.createElement("div");
    this.messageElement.className = "p-4 bg-gray-700 text-center text-white";
    this.messageElement.textContent =
      "This puzzle requires teamwork! Coordinate with your team.";
    puzzleContainer.appendChild(this.messageElement);

    // Submit button
    const actionArea = document.createElement("div");
    actionArea.className = "p-4 bg-gray-700 flex justify-center";

    this.submitButton = document.createElement("button");
    this.submitButton.className =
      "px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors";
    this.submitButton.textContent = "Submit Solution";
    actionArea.appendChild(this.submitButton);

    puzzleContainer.appendChild(actionArea);

    // Add to container
    this.containerElement.appendChild(puzzleContainer);

    // Start countdown
    this._startCountdown();
  }

  /**
   * Initialize the puzzle based on its type
   */
  async _initializePuzzle() {
    const puzzleType = this.puzzleData.type;

    // Configure countdown time based on difficulty
    this.countdownValue = this._getCountdownTime();
    this.updateCountdownDisplay();

    // Prepare callbacks for the puzzle modules
    const callbacks = {
      showMessage: (message, type) => this._showMessage(message, type),
      showSuccess: () => this.showSuccess(),
      disableSubmit: () => this._disableSubmit(),
      getCountdownElement: () => this.countdownElement,
      startCountdown: (timeUpCallback) => this._startCountdown(timeUpCallback),
      reduceTime: (seconds) => this._reduceTime(seconds),
      submitSolution: this.submitSolution,
      sendTeamUpdate: (data) => this._sendTeamUpdate(data),
    };

    // Get puzzle class loader function from map
    const getPuzzleClass = this.puzzleTypeMap[puzzleType];

    if (getPuzzleClass) {
      try {
        // Load the puzzle module dynamically
        const PuzzleClass = await getPuzzleClass();

        // Initialize the puzzle with proper parameters
        this.activePuzzle = new PuzzleClass(
          this.gameArea,
          this.puzzleData,
          callbacks,
          this.playerRole
        );

        // Initialize the puzzle
        this.activePuzzle.initialize();
      } catch (error) {
        console.error(
          `Error initializing team puzzle of type ${puzzleType}:`,
          error
        );
        this._showMessage(
          `Error initializing puzzle: ${error.message}`,
          "error"
        );
      }
    } else {
      console.error(`Unknown team puzzle type: ${puzzleType}`);
      this._showMessage(`Unknown team puzzle type: ${puzzleType}`, "error");
    }
  }

  /**
   * Handle puzzle submission
   */
  _handleSubmit() {
    if (!this.activePuzzle) return;

    try {
      // Get solution from active puzzle
      const solution = this.activePuzzle.getSolution();

      // Validate solution
      if (this.activePuzzle.validateSolution(solution)) {
        // Successful solution
        this.isCompleted = true;
        this._clearCountdown();
        this._disableSubmit();

        // Show success message
        this.showSuccess();

        // Send solution to game manager
        if (this.submitSolution) {
          this.submitSolution({
            success: true,
            solution: solution,
            time_remaining: this.countdownValue,
          });
        }
      } else {
        // Failed solution
        const errorMessage = this.activePuzzle.getErrorMessage();
        this._showMessage(errorMessage, "error");

        // Reduce time as penalty
        this._reduceTime(10);
      }
    } catch (error) {
      console.error("Error submitting solution:", error);
      this._showMessage(`Error: ${error.message}`, "error");
    }
  }

  /**
   * Send update to other team members
   * @param {Object} data - Update data to send
   */
  _sendTeamUpdate(data) {
    if (!this.websocketManager) return;

    const updateData = {
      puzzle_type: this.puzzleData.type,
      update_data: data,
    };

    // Send through websocket manager
    try {
      this.websocketManager.send({
        type: "team_puzzle_update",
        ...updateData,
      });
    } catch (error) {
      console.error("Error sending team update:", error);
    }
  }

  /**
   * Handle updates from other team members
   * @param {Object} updateData - Update data from other players
   * @param {string} playerId - Player ID who sent the update
   */
  handleUpdate(updateData, playerId) {
    if (!this.activePuzzle || !this.activePuzzle.handleTeamUpdate) return;

    try {
      this.activePuzzle.handleTeamUpdate(updateData, playerId);
    } catch (error) {
      console.error("Error handling team update:", error);
    }
  }

  /**
   * Start countdown timer
   * @param {Function} timeUpCallback - Callback to execute when time is up
   */
  _startCountdown(timeUpCallback) {
    this._clearCountdown();

    this.timer = setInterval(() => {
      this.countdownValue--;
      this.updateCountdownDisplay();

      if (this.countdownValue <= 0) {
        this._clearCountdown();

        if (timeUpCallback) {
          timeUpCallback();
        } else {
          this._showMessage("Time's up! Puzzle failed.", "error");
          this._disableSubmit();

          // Notify game manager of failure
          if (this.submitSolution) {
            this.submitSolution({
              success: false,
              reason: "time_expired",
            });
          }
        }
      }
    }, 1000);
  }

  /**
   * Clear the countdown timer
   */
  _clearCountdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Update the countdown display
   */
  updateCountdownDisplay() {
    if (this.countdownElement) {
      this.countdownElement.textContent = `${Math.max(
        0,
        this.countdownValue
      )}s`;

      // Add visual styling based on time remaining
      this.countdownElement.classList.remove(
        "bg-green-600",
        "bg-yellow-600",
        "bg-red-600",
        "bg-gray-900"
      );

      if (this.countdownValue > 60) {
        this.countdownElement.classList.add("bg-green-600");
      } else if (this.countdownValue > 20) {
        this.countdownElement.classList.add("bg-yellow-600");
      } else {
        this.countdownElement.classList.add("bg-red-600");
      }
    }
  }

  /**
   * Reduce countdown time
   * @param {number} seconds - Seconds to reduce
   */
  _reduceTime(seconds) {
    this.countdownValue = Math.max(1, this.countdownValue - seconds);
    this.updateCountdownDisplay();
  }

  /**
   * Get countdown time based on puzzle difficulty
   * @returns {number} - Countdown time in seconds
   */
  _getCountdownTime() {
    const difficulty = this.currentStage || 1;

    // Base time for team puzzles - longer than individual puzzles
    const baseTime = Math.max(60, 180 - (difficulty - 1) * 15);

    return baseTime;
  }

  /**
   * Show message in the message area
   * @param {string} message - Message to display
   * @param {string} type - Message type (info, success, error, warning)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    // Reset classes
    this.messageElement.className = "p-4 text-center";

    // Apply type-specific styling
    switch (type) {
      case "success":
        this.messageElement.classList.add("bg-green-700", "text-white");
        break;
      case "error":
        this.messageElement.classList.add("bg-red-700", "text-white");
        break;
      case "warning":
        this.messageElement.classList.add("bg-yellow-700", "text-white");
        break;
      default:
        this.messageElement.classList.add("bg-gray-700", "text-white");
    }

    this.messageElement.textContent = message;

    // For errors, make the message stand out with animation
    if (type === "error") {
      this.messageElement.classList.add("animate-pulse");
      setTimeout(() => {
        this.messageElement.classList.remove("animate-pulse");
      }, 2000);
    }
  }

  /**
   * Disable the submit button
   */
  _disableSubmit() {
    if (this.submitButton) {
      this.submitButton.disabled = true;
      this.submitButton.classList.add("opacity-50", "cursor-not-allowed");
      this.submitButton.classList.remove("hover:bg-blue-700");
    }
  }

  /**
   * Enable the submit button
   */
  _enableSubmit() {
    if (this.submitButton) {
      this.submitButton.disabled = false;
      this.submitButton.classList.remove("opacity-50", "cursor-not-allowed");
      this.submitButton.classList.add("hover:bg-blue-700");
    }
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this._clearCountdown();
    this._disableSubmit();
    this._showMessage(
      "Puzzle completed successfully! Great teamwork!",
      "success"
    );

    // Call active puzzle's success method if it exists
    if (
      this.activePuzzle &&
      typeof this.activePuzzle.showSuccess === "function"
    ) {
      this.activePuzzle.showSuccess();
    } else {
      // Default success animation
      this._showDefaultSuccessAnimation();
    }
  }

  /**
   * Show default success animation
   */
  _showDefaultSuccessAnimation() {
    // Create success overlay
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center z-10";

    const successIcon = document.createElement("div");
    successIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;

    successOverlay.appendChild(successIcon);

    // Add to game area if it exists
    if (this.gameArea) {
      // Make game area position relative for absolute positioning
      if (getComputedStyle(this.gameArea).position === "static") {
        this.gameArea.style.position = "relative";
      }

      this.gameArea.appendChild(successOverlay);

      // Play success sound
      this._playSuccessSound();

      // Remove overlay after animation
      setTimeout(() => {
        successOverlay.remove();
      }, 3000);
    }
  }

  /**
   * Play success sound
   */
  _playSuccessSound() {
    try {
      const successSound = new Audio("../static/sounds/puzzle-complete.mp3");
      successSound.volume = 0.3;
      successSound
        .play()
        .catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play success sound:", e);
    }
  }

  /**
   * Get puzzle title based on type
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    // Title mapping
    const puzzleTitles = {
      team_puzzle_1: "Alarm System Bypass",
      team_puzzle_2: "Security Grid Hack",
      team_puzzle_3: "Vault Lock Mechanism",
      team_puzzle_4: "Data Decryption Challenge",
      team_puzzle_5: "Final Escape Sequence",
    };

    return puzzleTitles[puzzleType] || `Team Challenge ${this.currentStage}`;
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    // Stop the timer
    this._clearCountdown();

    // Clean up active puzzle
    if (this.activePuzzle && typeof this.activePuzzle.cleanup === "function") {
      this.activePuzzle.cleanup();
    }

    // Clear references
    this.activePuzzle = null;
    this.countdownElement = null;
    this.messageElement = null;
    this.gameArea = null;

    // Clear event listeners by replacing with clone
    if (this.submitButton) {
      const newButton = this.submitButton.cloneNode(true);
      this.submitButton.parentNode.replaceChild(newButton, this.submitButton);
      this.submitButton = newButton;
    }
  }
}

export default TeamPuzzleController;
