// BasePuzzle.js - Base class for all Safe Cracker puzzles

class BasePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Initialize the basic structure of the puzzle
   * This method should be overridden by child classes
   */
  initialize() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create header
    const header = document.createElement("h3");
    header.className = "text-xl font-bold text-yellow-400 mb-4";
    header.textContent = `Safe Cracker Mission: ${this._getPuzzleTitle()}`;
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
    const gameArea = document.createElement("div");
    gameArea.className = "flex justify-center mb-6";
    this.containerElement.appendChild(gameArea);

    // This is where the specific puzzle UI would be added

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Submit Solution";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent = "Puzzle solved successfully!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Puzzle Completed";
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

    // Add effects based on event type
    if (eventType === "security_patrol") {
      // For security patrol, briefly disable the lock
      this.disableInteraction(true);

      // Re-enable after duration
      setTimeout(() => {
        this.disableInteraction(false);
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, duration * 1000);
    } else {
      // For other events, just show a warning
      setTimeout(() => {
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, duration * 1000);
    }
  }

  /**
   * Disable or enable puzzle interaction
   * Should be implemented by child classes
   * @param {boolean} disabled - Whether to disable interaction
   */
  disableInteraction(disabled) {
    // Base implementation just disables submit button
    if (this.submitButton) {
      this.submitButton.disabled = disabled;
    }
  }

  /**
   * Cleanup event listeners and references
   * This method should be extended by child classes
   */
  cleanup() {
    if (this.submitButton) {
      this.submitButton.removeEventListener("click", null);
    }

    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Handle submit button click
   * This method should be overridden by child classes
   */
  _handleSubmit() {
    console.warn("_handleSubmit not implemented in child class");
  }

  /**
   * Get puzzle title
   * @returns {string} Puzzle title
   */
  _getPuzzleTitle() {
    return "Puzzle";
  }

  /**
   * Get puzzle instructions
   * @returns {string} Puzzle instructions
   */
  _getInstructions() {
    return "Complete this puzzle to proceed.";
  }

  /**
   * Get random event message
   * @param {string} eventType - Type of random event
   * @returns {string} - Event message
   */
  _getRandomEventMessage(eventType) {
    switch (eventType) {
      case "security_patrol":
        return "Warning: Security patrol approaching. Hold position!";
      case "camera_sweep":
        return "Alert: Camera sweep in progress. Stay out of sight.";
      case "system_check":
        return "Caution: Security system scanning. Minimize movement.";
      default:
        return "Security alert detected!";
    }
  }
}

export default BasePuzzle;
