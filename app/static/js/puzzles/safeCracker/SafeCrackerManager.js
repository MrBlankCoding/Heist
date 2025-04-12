// SafeCrackerManager.js - Manages all Safe Cracker puzzles
import LockCombinationPuzzle from "./LockCombinationPuzzle.js";
import AudioSequencePuzzle from "./AudioSequencePuzzle.js";
import PatternRecognitionPuzzle from "./PatternRecognitionPuzzle.js";
import MultiLockPuzzle from "./MultiLockPuzzle.js";
import TimedLockPuzzle from "./TimedLockPuzzle.js";

class SafeCrackerManager {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.puzzleController = null;
  }

  /**
   * Initialize the appropriate puzzle based on the puzzle type
   */
  initialize() {
    const { type } = this.puzzleData;

    // Create the appropriate puzzle controller based on type
    switch (type) {
      case "lock_combination":
        this.puzzleController = new LockCombinationPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;

      case "audio_sequence":
        this.puzzleController = new AudioSequencePuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;

      case "pattern_recognition":
        this.puzzleController = new PatternRecognitionPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;

      case "multi_lock":
        this.puzzleController = new MultiLockPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;

      case "timed_lock":
        this.puzzleController = new TimedLockPuzzle(
          this.containerElement,
          this.puzzleData,
          this.submitSolution
        );
        break;

      default:
        console.error("Unknown puzzle type:", type);
        this.containerElement.innerHTML =
          "<p class='text-red-500'>Error: Unknown puzzle type</p>";
        return;
    }

    // Initialize the controller if it was created successfully
    if (this.puzzleController) {
      this.puzzleController.initialize();
    }
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    if (this.puzzleController) {
      this.puzzleController.showSuccess();
    }
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    if (this.puzzleController) {
      this.puzzleController.handleRandomEvent(eventType, duration);
    }
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    if (this.puzzleController) {
      this.puzzleController.cleanup();
    }
    this.puzzleController = null;
  }
}

export default SafeCrackerManager;
