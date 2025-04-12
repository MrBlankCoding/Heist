// lookoutPuzzleController.js - Controls puzzles for the Lookout role

import SurveillancePuzzle from "./SurveillancePuzzle.js";
import PatrolPatternPuzzle from "./PatrolPatternPuzzle.js";
import SecuritySystemPuzzle from "./SecuritySystemPuzzle.js";
import AlarmPuzzle from "./AlarmPuzzle.js";
import EscapeRoutePuzzle from "./EscapeRoutePuzzle.js";

class LookoutPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;

    // Map of puzzle type names to help with various formats
    this.puzzleTypeMap = {
      // Old format
      lookout_puzzle_1: "surveillance",
      lookout_puzzle_2: "patrol_pattern",
      lookout_puzzle_3: "security_system",
      lookout_puzzle_4: "alarm",
      lookout_puzzle_5: "escape_route",
      // New format already mapped directly
    };

    // DOM elements
    this.messageElement = null;
    this.loadingElement = null;

    // The active puzzle instance
    this.activePuzzle = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    try {
      // Clear container
      this.containerElement.innerHTML = "";

      // Create wrapper with error boundary
      const wrapper = document.createElement("div");
      wrapper.className = "lookout-puzzle-wrapper p-2";
      this.containerElement.appendChild(wrapper);

      // Create header with pulse animation while loading
      const header = document.createElement("h3");
      header.className = "text-xl font-bold text-green-400 mb-4 animate-pulse";
      header.textContent = "Loading Lookout Mission...";
      wrapper.appendChild(header);

      // Create message area
      this.messageElement = document.createElement("div");
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
      wrapper.appendChild(this.messageElement);

      // Create loading indicator
      this.loadingElement = document.createElement("div");
      this.loadingElement.className = "text-center py-8";
      this.loadingElement.innerHTML = `
        <div class="inline-block relative w-16 h-16 mb-4">
          <div class="absolute top-0 left-0 w-full h-full border-4 border-green-200 border-opacity-20 rounded-full"></div>
          <div class="absolute top-0 left-0 w-full h-full border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="text-green-300">Establishing secure connection...</p>
      `;
      wrapper.appendChild(this.loadingElement);

      // Initialize the appropriate puzzle after a short delay
      // This gives the loading animation time to show and improves perceived performance
      setTimeout(() => {
        try {
          this._initializePuzzle(wrapper, header);
        } catch (error) {
          console.error("Error initializing puzzle:", error);
          this._showErrorMessage(
            "Failed to initialize puzzle. Please try refreshing the page."
          );
        }
      }, 800);
    } catch (error) {
      console.error("Error in LookoutPuzzleController initialization:", error);
      this.containerElement.innerHTML = `
        <div class="bg-red-900 bg-opacity-20 p-4 rounded text-red-400 text-center">
          <p class="font-bold mb-2">Error initializing puzzle</p>
          <p class="text-sm">Please try refreshing the page</p>
        </div>
      `;
    }
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Forward to active puzzle
    if (
      this.activePuzzle &&
      typeof this.activePuzzle.showSuccess === "function"
    ) {
      try {
        this.activePuzzle.showSuccess();
      } catch (error) {
        console.error("Error showing success in puzzle:", error);
        this._showSuccessFallback();
      }
    } else {
      this._showSuccessFallback();
    }
  }

  /**
   * Fallback success display if the puzzle-specific one fails
   * @private
   */
  _showSuccessFallback() {
    if (this.messageElement) {
      this.messageElement.textContent =
        "Mission accomplished! Security systems analyzed.";
      this.messageElement.className =
        "mb-4 text-green-400 text-center p-3 bg-green-900 bg-opacity-20 rounded-lg animate-pulse";
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
    if (
      this.activePuzzle &&
      typeof this.activePuzzle.handleRandomEvent === "function"
    ) {
      try {
        this.activePuzzle.handleRandomEvent(eventType, duration);
      } catch (error) {
        console.error("Error handling random event in puzzle:", error);
        this._showRandomEventFallback(eventType, duration);
      }
    } else {
      this._showRandomEventFallback(eventType, duration);
    }
  }

  /**
   * Fallback for displaying random events if the puzzle-specific handler fails
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   * @private
   */
  _showRandomEventFallback(eventType, duration) {
    if (!this.messageElement) return;

    let message;
    switch (eventType) {
      case "security_patrol":
        message = "Security patrol detected! Monitoring...";
        break;
      case "camera_sweep":
        message = "Camera systems scanning. Stay vigilant!";
        break;
      case "system_check":
        message = "Security system diagnostic in progress.";
        break;
      default:
        message = "Security alert detected!";
    }

    this.messageElement.textContent = message;
    this.messageElement.className =
      "mb-4 text-red-400 text-center animate-pulse";

    setTimeout(() => {
      if (this.isCompleted || !this.messageElement) return;
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }, duration * 500);
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    // Clean up active puzzle
    if (this.activePuzzle && typeof this.activePuzzle.cleanup === "function") {
      try {
        this.activePuzzle.cleanup();
      } catch (error) {
        console.error("Error cleaning up puzzle:", error);
      }
    }

    // Clean up DOM references
    this.activePuzzle = null;
    this.messageElement = null;
    this.loadingElement = null;
  }

  /**
   * Initialize the puzzle based on type
   * @param {HTMLElement} wrapper - Container element
   * @param {HTMLElement} header - Header element to update
   * @private
   */
  _initializePuzzle(wrapper, header) {
    // Get puzzle type, normalizing between old and new formats
    let puzzleType = this.puzzleData.type;

    // Map old format to new if needed
    if (this.puzzleTypeMap[puzzleType]) {
      puzzleType = this.puzzleTypeMap[puzzleType];
    }

    try {
      // Remove loading indicator
      if (this.loadingElement) {
        this.loadingElement.remove();
        this.loadingElement = null;
      }

      // Update header
      if (header) {
        header.textContent = `Lookout Mission: ${this._getPuzzleTitle()}`;
        header.classList.remove("animate-pulse");
      }

      // Create instruction
      const instruction = document.createElement("p");
      instruction.className = "mb-4 text-gray-300";
      instruction.textContent = this._getInstructions();
      wrapper.appendChild(instruction);

      // Create puzzle instance based on type
      switch (puzzleType) {
        case "surveillance":
          this.activePuzzle = new SurveillancePuzzle(
            wrapper,
            this.puzzleData,
            this.submitSolution
          );
          break;
        case "patrol_pattern":
          this.activePuzzle = new PatrolPatternPuzzle(
            wrapper,
            this.puzzleData,
            this.submitSolution
          );
          break;
        case "security_system":
          this.activePuzzle = new SecuritySystemPuzzle(
            wrapper,
            this.puzzleData,
            this.submitSolution
          );
          break;
        case "alarm":
          this.activePuzzle = new AlarmPuzzle(
            wrapper,
            this.puzzleData,
            this.submitSolution
          );
          break;
        case "escape_route":
          this.activePuzzle = new EscapeRoutePuzzle(
            wrapper,
            this.puzzleData,
            this.submitSolution
          );
          break;
        default:
          // Default to surveillance puzzle for unknown types
          console.warn(
            `Unknown puzzle type: ${puzzleType}, defaulting to surveillance`
          );
          this.activePuzzle = new SurveillancePuzzle(
            wrapper,
            this.puzzleData,
            this.submitSolution
          );
      }

      // Initialize the puzzle
      if (
        this.activePuzzle &&
        typeof this.activePuzzle.initialize === "function"
      ) {
        try {
          this.activePuzzle.initialize();
        } catch (error) {
          console.error(`Error initializing puzzle ${puzzleType}:`, error);
          this._showErrorMessage(
            "Error initializing puzzle. Please try again."
          );
        }
      }
    } catch (error) {
      console.error(`Error creating puzzle ${puzzleType}:`, error);
      this._showErrorMessage("Error loading puzzle. Please try again.");
    }
  }

  /**
   * Show an error message
   * @param {string} message - Error message to display
   * @private
   */
  _showErrorMessage(message) {
    console.error(message);

    if (this.messageElement) {
      this.messageElement.textContent = message;
      this.messageElement.className =
        "mb-4 text-red-400 text-center p-3 bg-red-900 bg-opacity-20 rounded-lg";
    }

    // Remove loading indicator if it's still present
    if (this.loadingElement) {
      this.loadingElement.remove();
      this.loadingElement = null;
    }
  }

  /**
   * Get puzzle title based on current puzzle type
   * @returns {string} - Puzzle title
   * @private
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    // Check for normalized type first
    if (this.puzzleTypeMap[puzzleType]) {
      const normalizedType = this.puzzleTypeMap[puzzleType];

      switch (normalizedType) {
        case "surveillance":
          return "Security Surveillance";
        case "patrol_pattern":
          return "Patrol Pattern Analysis";
        case "security_system":
          return "Security System Mapping";
        case "alarm":
          return "Alarm System Interface";
        case "escape_route":
          return "Escape Route Planning";
      }
    }

    // Check original types as fallback
    switch (puzzleType) {
      case "surveillance":
        return "Security Surveillance";
      case "patrol_pattern":
        return "Patrol Pattern Analysis";
      case "security_system":
        return "Security System Mapping";
      case "alarm":
        return "Alarm System Interface";
      case "escape_route":
        return "Escape Route Planning";
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
        return "Security Mission";
    }
  }

  /**
   * Get puzzle instructions based on current puzzle type
   * @returns {string} - Puzzle instructions
   * @private
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    // Handle normalized types
    if (this.puzzleTypeMap[puzzleType]) {
      const normalizedType = this.puzzleTypeMap[puzzleType];

      switch (normalizedType) {
        case "surveillance":
          return "Monitor the security cameras and identify the correct patrol pattern of the guards. Select the matching pattern from the options below.";
        case "patrol_pattern":
          return "Analyze the patrol routes and predict the timing of guard rotations. Your team needs accurate timing information to plan their movements.";
        case "security_system":
          return "Map the complete security system by identifying blind spots and camera coverage. This will help your team navigate safely.";
        case "alarm":
          return "Identify and mark potential alarm triggers throughout the facility. Your team needs to know which areas to avoid.";
        case "escape_route":
          return "Plan the optimal escape route by avoiding security measures and patrols. This is critical for the team's extraction.";
      }
    }

    // Check original types as fallback
    switch (puzzleType) {
      case "surveillance":
        return "Monitor the security cameras and identify the correct patrol pattern of the guards. Select the matching pattern from the options below.";
      case "patrol_pattern":
        return "Analyze the patrol routes and predict the timing of guard rotations. Your team needs accurate timing information to plan their movements.";
      case "security_system":
        return "Map the complete security system by identifying blind spots and camera coverage. This will help your team navigate safely.";
      case "alarm":
        return "Identify and mark potential alarm triggers throughout the facility. Your team needs to know which areas to avoid.";
      case "escape_route":
        return "Plan the optimal escape route by avoiding security measures and patrols. This is critical for the team's extraction.";
      case "lookout_puzzle_1":
        return "Monitor the security cameras and identify the correct patrol pattern of the guards. Select the matching pattern from the options below.";
      case "lookout_puzzle_2":
        return "Analyze the patrol routes and predict the timing of guard rotations. Your team needs accurate timing information to plan their movements.";
      case "lookout_puzzle_3":
        return "Map the complete security system by identifying blind spots and camera coverage. This will help your team navigate safely.";
      case "lookout_puzzle_4":
        return "Identify and mark potential alarm triggers throughout the facility. Your team needs to know which areas to avoid.";
      case "lookout_puzzle_5":
        return "Plan the optimal escape route by avoiding security measures and patrols. This is critical for the team's extraction.";
      default:
        return "Monitor and analyze security to ensure team safety. Your role is crucial for avoiding detection.";
    }
  }
}

export default LookoutPuzzleController;
