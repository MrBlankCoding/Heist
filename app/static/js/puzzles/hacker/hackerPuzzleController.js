// hackerPuzzleController.js - Controls puzzles for the Hacker role

import CircuitPuzzle from "./circuitPuzzle.js";
import PasswordCrackPuzzle from "./passwordCrackPuzzle.js";
import FirewallBypassPuzzle from "./firewallBypassPuzzle.js";
import EncryptionKeyPuzzle from "./encryptionKeyPuzzle.js";
import SystemOverridePuzzle from "./systemOverridePuzzle.js";

class HackerPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;
    this.activePuzzle = null;

    // DOM elements will be created during initialization
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create header
    const header = document.createElement("h3");
    header.className = "text-xl font-bold text-blue-400 mb-4";
    header.textContent = `Hacker Mission: ${this._getPuzzleTitle()}`;
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

    // Determine which puzzle to render based on type
    this._initializePuzzle(gameArea);

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Submit Solution";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Initialize the specific puzzle based on type
   * @param {HTMLElement} container - Game area container
   */
  _initializePuzzle(container) {
    const puzzleType = this.puzzleData.type;

    // Create the appropriate puzzle
    switch (puzzleType) {
      case "circuit":
        this.activePuzzle = new CircuitPuzzle(container, this.puzzleData);
        break;
      case "password_crack":
        this.activePuzzle = new PasswordCrackPuzzle(container, this.puzzleData);
        break;
      case "firewall_bypass":
        this.activePuzzle = new FirewallBypassPuzzle(
          container,
          this.puzzleData
        );
        break;
      case "encryption_key":
        this.activePuzzle = new EncryptionKeyPuzzle(container, this.puzzleData);
        break;
      case "system_override":
        this.activePuzzle = new SystemOverridePuzzle(
          container,
          this.puzzleData
        );
        break;
      default:
        // Default to circuit puzzle
        this.activePuzzle = new CircuitPuzzle(container, this.puzzleData);
        break;
    }

    // Initialize the puzzle
    this.activePuzzle.initialize();
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent = this._getSuccessMessage();
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable the active puzzle
    if (this.activePuzzle) {
      this.activePuzzle.disable();
    }

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

    // Add effects based on event type
    if (eventType === "system_check") {
      // For system check, temporarily disable the puzzle
      if (this.activePuzzle) {
        this.activePuzzle.disable();
      }
      this.submitButton.disabled = true;

      // Re-enable after duration
      setTimeout(() => {
        if (this.activePuzzle) {
          this.activePuzzle.enable();
        }
        this.submitButton.disabled = false;
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
   * Cleanup event listeners and references
   */
  cleanup() {
    // Clean up the active puzzle
    if (this.activePuzzle && typeof this.activePuzzle.cleanup === "function") {
      this.activePuzzle.cleanup();
    }

    // Clear references
    this.activePuzzle = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    if (!this.activePuzzle) return;

    // Get solution from the active puzzle
    const solution = this.activePuzzle.getSolution();

    // Validate solution
    if (!this.activePuzzle.validateSolution(solution)) {
      this.messageElement.textContent = this.activePuzzle.getErrorMessage();
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Uploading solution...";

    this.submitSolution(solution)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent = "Invalid solution. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Submit Solution";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting solution. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Submit Solution";
      });
  }

  /**
   * Get puzzle title based on type
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "circuit":
        return "Circuit Bypass";
      case "password_crack":
        return "Password Decryption";
      case "firewall_bypass":
        return "Firewall Bypass";
      case "encryption_key":
        return "Encryption Key Recovery";
      case "system_override":
        return "System Override";
      default:
        return "Unknown Mission";
    }
  }

  /**
   * Get puzzle instructions based on type
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "circuit":
        return "Create a circuit path from Input to Output that passes through all yellow Switch points. Drag to create the path.";
      case "password_crack":
        return "Decrypt the password by identifying the correct sequence of characters. Match the patterns to reveal the code.";
      case "firewall_bypass":
        return "Bypass the firewall by finding vulnerabilities in the security matrix. Identify and exploit the weak points.";
      case "encryption_key":
        return "Recover encryption keys by solving the binary sequence puzzle. Decode the pattern to extract the key.";
      case "system_override":
        return "Override the main security system by hacking all terminals simultaneously. Coordinate your attacks on multiple points.";
      default:
        return "Complete your mission to proceed.";
    }
  }

  /**
   * Get success message based on puzzle type
   * @returns {string} - Success message
   */
  _getSuccessMessage() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "circuit":
        return "Circuit completed successfully! Access granted to the next area.";
      case "password_crack":
        return "Password cracked successfully! Security system bypassed.";
      case "firewall_bypass":
        return "Firewall successfully bypassed! Network access granted.";
      case "encryption_key":
        return "Encryption key recovered! Secure data decrypted.";
      case "system_override":
        return "System override complete! All security measures disabled.";
      default:
        return "Mission completed successfully!";
    }
  }

  /**
   * Get random event message
   * @param {string} eventType - Type of random event
   * @returns {string} - Event message
   */
  _getRandomEventMessage(eventType) {
    switch (eventType) {
      case "security_patrol":
        return "Warning: Security patrol detected. Proceed with caution.";
      case "camera_sweep":
        return "Alert: Camera sweep in progress. Minimize activity.";
      case "system_check":
        return "Critical: System performing integrity check. Connection paused.";
      default:
        return "Security alert detected!";
    }
  }
}

export default HackerPuzzleController;
