// SafeCrackerPuzzleController.js - Controls puzzles for the Safe Cracker role
import SafeCrackerManager from "./SafeCrackerManager.js";

class SafeCrackerPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    // Create a SafeCrackerManager instance to handle all puzzles
    this.manager = new SafeCrackerManager(
      containerElement,
      puzzleData,
      submitSolutionCallback
    );
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this.manager.initialize();
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.manager.showSuccess();
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    this.manager.handleRandomEvent(eventType, duration);
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    this.manager.cleanup();
  }
}

export default SafeCrackerPuzzleController;
