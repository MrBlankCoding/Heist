// lookoutPuzzleController.js - Controls puzzles for the Lookout role

import SurveillancePuzzle from "./lookout/SurveillancePuzzle.js";
import PatrolPatternPuzzle from "./lookout/PatrolPatternPuzzle.js";
import SecuritySystemPuzzle from "./lookout/SecuritySystemPuzzle.js";
import AlarmPuzzle from "./lookout/AlarmPuzzle.js";
import EscapeRoutePuzzle from "./lookout/EscapeRoutePuzzle.js";

class LookoutPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;

    // DOM elements
    this.messageElement = null;

    // The active puzzle instance
    this.activePuzzle = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create header
    const header = document.createElement("h3");
    header.className = "text-xl font-bold text-green-400 mb-4";
    header.textContent = `Lookout Mission: ${this._getPuzzleTitle()}`;
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

    // Initialize the appropriate puzzle based on type
    this._initializePuzzle();
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Forward to active puzzle
    if (this.activePuzzle) {
      this.activePuzzle.showSuccess();
    }
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Forward to active puzzle
    if (this.activePuzzle) {
      this.activePuzzle.handleRandomEvent(eventType, duration);
    }
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    // Clean up active puzzle
    if (this.activePuzzle) {
      this.activePuzzle.cleanup();
      this.activePuzzle = null;
    }

    // Clear references
    this.messageElement = null;
  }

  /**
   * Initialize the puzzle based on type
   * @private
   */
  _initializePuzzle() {
    const puzzleType = this.puzzleData.type;

    // Create puzzle instance based on type
    switch (puzzleType) {
      case "lookout_puzzle_1":
        this.activePuzzle = new SurveillancePuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;
      case "lookout_puzzle_2":
        this.activePuzzle = new PatrolPatternPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;
      case "lookout_puzzle_3":
        this.activePuzzle = new SecuritySystemPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;
      case "lookout_puzzle_4":
        this.activePuzzle = new AlarmPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;
      case "lookout_puzzle_5":
        this.activePuzzle = new EscapeRoutePuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;
      default:
        // Default to first puzzle type
        this.activePuzzle = new SurveillancePuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
    }

    // Initialize the puzzle
    if (this.activePuzzle) {
      this.activePuzzle.initialize();
    }
  }

  /**
   * Get puzzle title based on current puzzle type
   * @returns {string} - Puzzle title
   * @private
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "lookout_puzzle_1":
        return "Security Surveillance";
      case "lookout_puzzle_2":
        return "Patrol Pattern Analysis";
      case "lookout_puzzle_3":
        return "Security System Mapping";
      case "lookout_puzzle_4":
        return "Alarm System Interface";
      case "lookout_puzzle_5":
        return "Escape Route Planning";
      default:
        return "Unknown Mission";
    }
  }

  /**
   * Get puzzle instructions based on current puzzle type
   * @returns {string} - Puzzle instructions
   * @private
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "lookout_puzzle_1":
        return "Monitor the security cameras and identify the correct patrol pattern of the guards. Select the matching pattern from the options below.";
      case "lookout_puzzle_2":
        return "Analyze the patrol routes and predict the timing of guard rotations.";
      case "lookout_puzzle_3":
        return "Map the complete security system by identifying blind spots and camera coverage.";
      case "lookout_puzzle_4":
        return "Identify and mark potential alarm triggers throughout the facility.";
      case "lookout_puzzle_5":
        return "Plan the optimal escape route by avoiding security measures and patrols.";
      default:
        return "Monitor and analyze security to ensure team safety.";
    }
  }
}

export default LookoutPuzzleController;
