// demolitionsPuzzleController.js - Controls puzzles for the Demolitions role

import WireCuttingPuzzle from "./wireCuttingPuzzle.js";
import TimeBombPuzzle from "./timeBombPuzzle.js";
import CircuitBoardPuzzle from "./circuitBoardPuzzle.js";
import ExplosiveSequencePuzzle from "./explosiveSequencePuzzle.js";
import FinalDetonationPuzzle from "./finalDetonationPuzzle.js";

class DemolitionsPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;

    // Common properties
    this.timer = null;
    this.countdownValue = 60; // Default 60 seconds
    this.activePuzzle = null;

    // DOM elements will be created during initialization
    this.countdownElement = null;
    this.messageElement = null;
    this.submitButton = null;
    this.gameArea = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create header
    const header = document.createElement("h3");
    header.className = "text-xl font-bold text-red-400 mb-4";
    header.textContent = `Demolitions Mission: ${this._getPuzzleTitle()}`;
    this.containerElement.appendChild(header);

    // Create instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300";
    instruction.textContent = this._getInstructions();
    this.containerElement.appendChild(instruction);

    // Create message area
    this.messageElement = document.createElement("div");
    this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    this.containerElement.appendChild(this.messageElement);

    // Create game area
    this.gameArea = document.createElement("div");
    this.gameArea.className = "flex flex-col items-center mb-6 w-full";
    this.containerElement.appendChild(this.gameArea);

    // Create countdown timer
    this.countdownElement = document.createElement("div");
    this.countdownElement.className = "text-2xl font-bold text-red-500 mb-4";
    this.updateCountdownDisplay();
    this.gameArea.appendChild(this.countdownElement);

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Complete Mission";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);

    // Initialize the appropriate puzzle based on type
    this._initializePuzzle();
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Stop timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Update UI to show success
    this.messageElement.textContent = "Mission successfully completed!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Mission Complete";
    this.submitButton.className = "heist-button mx-auto block opacity-50";
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Show message about the random event
    this.messageElement.textContent = this._getRandomEventMessage(eventType);
    this.messageElement.className = "mb-4 text-red-400 text-center";

    // Pass the event to the active puzzle
    if (
      this.activePuzzle &&
      typeof this.activePuzzle.handleRandomEvent === "function"
    ) {
      this.activePuzzle.handleRandomEvent(eventType, duration);
    }

    // Hide message after duration
    setTimeout(() => {
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }, duration * 1000);
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    // Clear timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Clean up active puzzle
    if (this.activePuzzle && typeof this.activePuzzle.cleanup === "function") {
      this.activePuzzle.cleanup();
    }

    // Clear references
    this.activePuzzle = null;
    this.gameArea = null;
    this.countdownElement = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Private: Initialize the appropriate puzzle based on type
   */
  _initializePuzzle() {
    const puzzleType = this.puzzleData.type;

    // Configure countdown time based on puzzle difficulty
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
    };

    // Initialize the appropriate puzzle
    switch (puzzleType) {
      case "demo_puzzle_1":
        this.activePuzzle = new WireCuttingPuzzle(
          this.gameArea,
          this.puzzleData,
          callbacks
        );
        break;
      case "demo_puzzle_2":
        this.activePuzzle = new TimeBombPuzzle(
          this.gameArea,
          this.puzzleData,
          callbacks
        );
        break;
      case "demo_puzzle_3":
        this.activePuzzle = new CircuitBoardPuzzle(
          this.gameArea,
          this.puzzleData,
          callbacks
        );
        break;
      case "demo_puzzle_4":
        this.activePuzzle = new ExplosiveSequencePuzzle(
          this.gameArea,
          this.puzzleData,
          callbacks
        );
        break;
      case "demo_puzzle_5":
        this.activePuzzle = new FinalDetonationPuzzle(
          this.gameArea,
          this.puzzleData,
          callbacks
        );
        break;
      default:
        // Fallback to wire cutting puzzle
        this.activePuzzle = new WireCuttingPuzzle(
          this.gameArea,
          this.puzzleData,
          callbacks
        );
    }

    // Initialize the puzzle
    this.activePuzzle.initialize();
  }

  /**
   * Private: Get base countdown time based on puzzle type and difficulty
   * @returns {number} - Time in seconds
   */
  _getCountdownTime() {
    const puzzleType = this.puzzleData.type;
    const difficulty = this.puzzleData.difficulty || 1;

    // Base time is 60 seconds
    let baseTime = 60;

    // Adjust based on puzzle type
    switch (puzzleType) {
      case "demo_puzzle_1":
        baseTime = 45;
        break;
      case "demo_puzzle_2":
        baseTime = 60;
        break;
      case "demo_puzzle_3":
        baseTime = 90;
        break;
      case "demo_puzzle_4":
        baseTime = 120;
        break;
      case "demo_puzzle_5":
        baseTime = 180;
        break;
    }

    // Adjust for difficulty
    // Harder puzzles get less time
    return baseTime - (difficulty - 1) * 10;
  }

  /**
   * Private: Update the countdown display
   */
  updateCountdownDisplay() {
    const minutes = Math.floor(this.countdownValue / 60);
    const seconds = this.countdownValue % 60;
    this.countdownElement.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * Private: Start the countdown timer
   * @param {function} timeUpCallback - Callback to execute when time is up
   */
  _startCountdown(timeUpCallback) {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.countdownValue--;
      this.updateCountdownDisplay();

      // Add urgency when time is low
      if (this.countdownValue <= 10) {
        this.countdownElement.classList.add("animate-pulse");
      }

      // Check if time is up
      if (this.countdownValue <= 0) {
        clearInterval(this.timer);

        // Execute callback if provided
        if (typeof timeUpCallback === "function") {
          timeUpCallback();
        }
      }
    }, 1000);
  }

  /**
   * Private: Reduce the countdown time (penalty)
   * @param {number} seconds - Seconds to reduce
   */
  _reduceTime(seconds) {
    this.countdownValue = Math.max(1, this.countdownValue - seconds);
    this.updateCountdownDisplay();

    // Flash the timer to indicate penalty
    this.countdownElement.classList.add("text-red-600", "scale-110");
    setTimeout(() => {
      this.countdownElement.classList.remove("text-red-600", "scale-110");
    }, 500);
  }

  /**
   * Private: Show a message
   * @param {string} message - Message to display
   * @param {string} type - Message type (success, error, warning, info)
   */
  _showMessage(message, type = "info") {
    this.messageElement.textContent = message;

    // Set appropriate styling based on message type
    this.messageElement.className = "mb-4 text-center ";

    switch (type) {
      case "success":
        this.messageElement.className += "text-green-400";
        break;
      case "error":
        this.messageElement.className += "text-red-400";
        break;
      case "warning":
        this.messageElement.className += "text-yellow-400";
        break;
      case "info":
      default:
        this.messageElement.className += "text-blue-400";
    }
  }

  /**
   * Private: Disable the submit button
   */
  _disableSubmit() {
    this.submitButton.disabled = true;
    this.submitButton.className = "heist-button mx-auto block opacity-50";
  }

  /**
   * Private: Handle submit button click
   */
  _handleSubmit() {
    // Check if puzzle has been completed
    if (!this.activePuzzle) {
      this._showMessage("No active puzzle to submit!", "error");
      return;
    }

    // Get submission data from the active puzzle
    const submissionData = this.activePuzzle.getSubmissionData();
    if (!submissionData) {
      this._showMessage("No data to submit!", "error");
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Submitting...";

    this.submitSolution(submissionData)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this._showMessage("Mission failed. Wrong solution!", "error");
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Complete Mission";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this._showMessage("Error submitting solution. Try again!", "error");
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Complete Mission";
      });
  }

  /**
   * Private: Get puzzle title based on type/stage
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "demo_puzzle_1":
        return "Security Bypass";
      case "demo_puzzle_2":
        return "Time Bomb Disarm";
      case "demo_puzzle_3":
        return "Circuit Board Repair";
      case "demo_puzzle_4":
        return "Explosive Sequence";
      case "demo_puzzle_5":
        return "Final Detonation";
      default:
        return "Unknown System";
    }
  }

  /**
   * Private: Get puzzle instructions based on type/stage
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "demo_puzzle_1":
        return "Bypass the security system by cutting the correct wire. Use the manual to identify which wire to cut.";
      case "demo_puzzle_2":
        return "Disarm the time bomb by following the correct sequence of steps before time runs out.";
      case "demo_puzzle_3":
        return "Repair the damaged circuit board by connecting the correct components in the right order.";
      case "demo_puzzle_4":
        return "Create an explosive breach by setting the correct detonation sequence.";
      case "demo_puzzle_5":
        return "Configure the final explosive charges to create an escape route during the heist finale.";
      default:
        return "Complete this demolitions challenge to proceed.";
    }
  }

  /**
   * Private: Get random event message
   * @param {string} eventType - Type of random event
   * @returns {string} - Event message
   */
  _getRandomEventMessage(eventType) {
    switch (eventType) {
      case "security_patrol":
        return "Warning: Security patrol detected. Hold your position!";
      case "camera_sweep":
        return "Alert: Camera sweep in progress. Hands off the system!";
      case "system_check":
        return "Caution: System performing diagnostic check.";
      default:
        return "Security alert detected!";
    }
  }
}

export default DemolitionsPuzzleController;
