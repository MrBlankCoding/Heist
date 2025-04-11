// SafeCrackerManager.js - Manages all Safe Cracker puzzles

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

    // Import and initialize the appropriate puzzle controller
    switch (type) {
      case "safe_puzzle_1":
        import("./LockCombinationPuzzle.js").then((module) => {
          const LockCombinationPuzzle = module.default;
          this.puzzleController = new LockCombinationPuzzle(
            this.containerElement,
            this.puzzleData,
            this.submitSolution
          );
          this.puzzleController.initialize();
        });
        break;

      case "safe_puzzle_2":
        import("./AudioSequencePuzzle.js").then((module) => {
          const AudioSequencePuzzle = module.default;
          this.puzzleController = new AudioSequencePuzzle(
            this.containerElement,
            this.puzzleData,
            this.submitSolution
          );
          this.puzzleController.initialize();
        });
        break;

      case "safe_puzzle_3":
        import("./PatternRecognitionPuzzle.js").then((module) => {
          const PatternRecognitionPuzzle = module.default;
          this.puzzleController = new PatternRecognitionPuzzle(
            this.containerElement,
            this.puzzleData,
            this.submitSolution
          );
          this.puzzleController.initialize();
        });
        break;

      case "safe_puzzle_4":
        import("./MultiLockPuzzle.js").then((module) => {
          const MultiLockPuzzle = module.default;
          this.puzzleController = new MultiLockPuzzle(
            this.containerElement,
            this.puzzleData,
            this.submitSolution
          );
          this.puzzleController.initialize();
        });
        break;

      case "safe_puzzle_5":
        import("./TimedLockPuzzle.js").then((module) => {
          const TimedLockPuzzle = module.default;
          this.puzzleController = new TimedLockPuzzle(
            this.containerElement,
            this.puzzleData,
            this.submitSolution
          );
          this.puzzleController.initialize();
        });
        break;

      default:
        console.error("Unknown puzzle type:", type);
        this.containerElement.innerHTML =
          "<p class='text-red-500'>Error: Unknown puzzle type</p>";
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
