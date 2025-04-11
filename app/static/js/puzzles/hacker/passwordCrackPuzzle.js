// passwordCrackPuzzle.js - Stage 2 Hacker puzzle - Password decryption challenge

class PasswordCrackPuzzle {
  constructor(containerElement, puzzleData) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.passwordLength = 6; // Default
    this.attempts = 0;
    this.maxAttempts = 6;
    this.correctCode = [];
    this.currentSelection = [];
    this.characterSets = []; // Available characters per position
    this.hints = [];

    // DOM elements
    this.terminalElement = null;
    this.codeInputElement = null;
    this.attemptsElement = null;
    this.feedbackElement = null;
    this.charactersContainer = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Get puzzle data
    const { code_length, max_attempts, character_sets, hints } =
      this.puzzleData.data;
    this.passwordLength = code_length || 6;
    this.maxAttempts = max_attempts || 6;
    this.characterSets = character_sets || this._generateDefaultCharacterSets();
    this.hints = hints || [];
    this.correctCode =
      this.puzzleData.data.solution || this._generateRandomSolution();

    // Create password terminal UI
    this._createTerminalUI();

    // Initialize the current selection
    this.currentSelection = Array(this.passwordLength).fill(null);

    // Add character selection
    this._createCharacterSelection();

    // Add hints
    this._displayHints();

    // Update attempts counter
    this._updateAttempts();
  }

  /**
   * Create the terminal UI for the password puzzle
   */
  _createTerminalUI() {
    // Create terminal container
    this.terminalElement = document.createElement("div");
    this.terminalElement.className =
      "bg-gray-900 border-2 border-blue-500 rounded-lg p-4 w-full max-w-2xl text-gray-100 font-mono";

    // Add terminal header
    const terminalHeader = document.createElement("div");
    terminalHeader.className =
      "flex justify-between items-center border-b border-blue-500 pb-2 mb-4";

    const terminalTitle = document.createElement("div");
    terminalTitle.className = "text-blue-400 text-sm";
    terminalTitle.textContent = "SECURITY SYSTEM - PASSWORD AUTHENTICATION";

    const terminalStatus = document.createElement("div");
    terminalStatus.className = "flex items-center";

    const statusDot = document.createElement("div");
    statusDot.className = "w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse";

    const statusText = document.createElement("span");
    statusText.className = "text-xs text-red-400";
    statusText.textContent = "LOCKED";

    terminalStatus.appendChild(statusDot);
    terminalStatus.appendChild(statusText);

    terminalHeader.appendChild(terminalTitle);
    terminalHeader.appendChild(terminalStatus);

    this.terminalElement.appendChild(terminalHeader);

    // Add terminal content
    const terminalContent = document.createElement("div");
    terminalContent.className = "space-y-4";

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className = "text-sm text-green-400";
    instructions.innerHTML = ">> DECRYPT ACCESS PASSWORD TO PROCEED";
    terminalContent.appendChild(instructions);

    // Add code input display
    this.codeInputElement = document.createElement("div");
    this.codeInputElement.className =
      "flex justify-center items-center space-x-2 my-4";

    for (let i = 0; i < this.passwordLength; i++) {
      const digitInput = document.createElement("div");
      digitInput.className =
        "w-12 h-12 border-2 border-blue-500 rounded flex items-center justify-center text-xl bg-gray-800 cursor-pointer hover:bg-gray-700";
      digitInput.dataset.index = i;
      digitInput.textContent = "_";

      // Add click event to handle selection
      digitInput.addEventListener("click", () => {
        this._selectPosition(i);
      });

      this.codeInputElement.appendChild(digitInput);
    }

    terminalContent.appendChild(this.codeInputElement);

    // Add attempts indicator
    this.attemptsElement = document.createElement("div");
    this.attemptsElement.className =
      "text-xs text-gray-400 flex justify-between items-center";

    terminalContent.appendChild(this.attemptsElement);

    // Add feedback area
    this.feedbackElement = document.createElement("div");
    this.feedbackElement.className = "p-2 rounded text-sm mt-4 hidden";

    terminalContent.appendChild(this.feedbackElement);

    this.terminalElement.appendChild(terminalContent);
    this.containerElement.appendChild(this.terminalElement);
  }

  /**
   * Create character selection UI
   */
  _createCharacterSelection() {
    // Create characters container
    this.charactersContainer = document.createElement("div");
    this.charactersContainer.className = "mt-4 p-4 bg-gray-800 rounded-lg";

    // Create label
    const label = document.createElement("div");
    label.className = "text-xs text-blue-400 mb-2";
    label.textContent = "SELECT CHARACTERS:";
    this.charactersContainer.appendChild(label);

    // For each character position
    for (let position = 0; position < this.passwordLength; position++) {
      // Create row for this position
      const row = document.createElement("div");
      row.className = "flex flex-wrap justify-center mb-2 position-row";
      row.dataset.position = position;

      // Hide all rows except the first one initially
      if (position !== 0) {
        row.classList.add("hidden");
      }

      // Add all characters for this position
      const chars =
        this.characterSets[position] || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (let i = 0; i < chars.length; i++) {
        const charButton = document.createElement("div");
        charButton.className =
          "w-8 h-8 m-1 flex items-center justify-center border border-blue-500 rounded bg-gray-700 hover:bg-blue-900 cursor-pointer text-sm";
        charButton.textContent = chars[i];
        charButton.dataset.char = chars[i];

        // Add click event
        charButton.addEventListener("click", () => {
          this._selectCharacter(position, chars[i]);
        });

        row.appendChild(charButton);
      }

      this.charactersContainer.appendChild(row);
    }

    this.terminalElement.appendChild(this.charactersContainer);

    // Set initial position
    this._selectPosition(0);
  }

  /**
   * Display hints in the UI
   */
  _displayHints() {
    if (this.hints.length === 0) return;

    // Create hints container
    const hintsContainer = document.createElement("div");
    hintsContainer.className = "mt-4 p-4 bg-gray-800 rounded-lg text-sm";

    // Create header
    const hintsHeader = document.createElement("div");
    hintsHeader.className = "text-yellow-400 font-bold mb-2";
    hintsHeader.textContent = "SYSTEM ANALYSIS:";
    hintsContainer.appendChild(hintsHeader);

    // Add each hint
    this.hints.forEach((hint, index) => {
      const hintElement = document.createElement("div");
      hintElement.className = "text-gray-300 mb-1";
      hintElement.innerHTML = `<span class="text-yellow-400">></span> ${hint}`;
      hintsContainer.appendChild(hintElement);
    });

    this.terminalElement.appendChild(hintsContainer);
  }

  /**
   * Select a position to input a character
   * @param {number} position - Position index
   */
  _selectPosition(position) {
    // Validate position
    if (position < 0 || position >= this.passwordLength) return;

    // Update UI to show selected position
    const inputElements =
      this.codeInputElement.querySelectorAll("div[data-index]");
    inputElements.forEach((el) => {
      el.classList.remove("border-yellow-400", "bg-gray-700");
    });

    inputElements[position].classList.add("border-yellow-400", "bg-gray-700");

    // Show character set for this position
    const positionRows =
      this.charactersContainer.querySelectorAll(".position-row");
    positionRows.forEach((row) => row.classList.add("hidden"));

    const selectedRow = this.charactersContainer.querySelector(
      `.position-row[data-position="${position}"]`
    );
    if (selectedRow) {
      selectedRow.classList.remove("hidden");
    }
  }

  /**
   * Select a character for the current position
   * @param {number} position - Position index
   * @param {string} char - Selected character
   */
  _selectCharacter(position, char) {
    // Update current selection
    this.currentSelection[position] = char;

    // Update display
    const inputElements =
      this.codeInputElement.querySelectorAll("div[data-index]");
    inputElements[position].textContent = char;

    // Auto-advance to next position if available
    if (position < this.passwordLength - 1) {
      this._selectPosition(position + 1);
    }

    // Check if all positions are filled
    const isComplete = this.currentSelection.every((char) => char !== null);
    if (isComplete) {
      // Add subtle visual feedback
      this.codeInputElement.classList.add("pulse-once");
      setTimeout(() => {
        this.codeInputElement.classList.remove("pulse-once");
      }, 500);
    }
  }

  /**
   * Submit the current password attempt
   */
  _submitAttempt() {
    // Check if all positions are filled
    const isComplete = this.currentSelection.every((char) => char !== null);
    if (!isComplete) {
      this._showFeedback("Complete the password before submitting", "warning");
      return;
    }

    // Increment attempts
    this.attempts++;

    // Check password
    const isCorrect = this._checkPassword();

    if (isCorrect) {
      this._showFeedback("Access Granted!", "success");

      // Show success state
      const statusDot = this.terminalElement.querySelector(".bg-red-500");
      const statusText = this.terminalElement.querySelector(".text-red-400");

      if (statusDot)
        statusDot.className = "w-2 h-2 rounded-full bg-green-500 mr-2";
      if (statusText) {
        statusText.className = "text-xs text-green-400";
        statusText.textContent = "UNLOCKED";
      }

      // Disable inputs
      this._disableInputs();
    } else {
      // Provide feedback
      const feedback = this._generateFeedback();
      this._showFeedback(feedback, "error");

      // Update attempts display
      this._updateAttempts();

      // Check for maximum attempts
      if (this.attempts >= this.maxAttempts) {
        this._showFeedback(
          "Maximum attempts exceeded. Security lockout initiated.",
          "error"
        );
        this._disableInputs();
      }
    }
  }

  /**
   * Check if current password is correct
   * @returns {boolean} - Whether password is correct
   */
  _checkPassword() {
    return this.currentSelection.every(
      (char, index) => char === this.correctCode[index]
    );
  }

  /**
   * Generate feedback for incorrect attempt
   * @returns {string} - Feedback message
   */
  _generateFeedback() {
    // Count correct positions
    let correctPositions = 0;
    let correctCharacters = 0;

    this.currentSelection.forEach((char, index) => {
      if (char === this.correctCode[index]) {
        correctPositions++;
      } else if (this.correctCode.includes(char)) {
        correctCharacters++;
      }
    });

    return `Analysis: ${correctPositions} correct position${
      correctPositions !== 1 ? "s" : ""
    }, ${correctCharacters} character${
      correctCharacters !== 1 ? "s" : ""
    } in wrong position.`;
  }

  /**
   * Show feedback message
   * @param {string} message - Message to show
   * @param {string} type - Type of message (success, error, warning)
   */
  _showFeedback(message, type) {
    this.feedbackElement.textContent = message;
    this.feedbackElement.className = "p-2 rounded text-sm mt-4";

    switch (type) {
      case "success":
        this.feedbackElement.classList.add("bg-green-900", "text-green-300");
        break;
      case "error":
        this.feedbackElement.classList.add("bg-red-900", "text-red-300");
        break;
      case "warning":
        this.feedbackElement.classList.add("bg-yellow-900", "text-yellow-300");
        break;
      default:
        this.feedbackElement.classList.add("bg-blue-900", "text-blue-300");
    }
  }

  /**
   * Update attempts counter display
   */
  _updateAttempts() {
    // Create attempt indicators
    this.attemptsElement.innerHTML = "";

    const attemptsText = document.createElement("span");
    attemptsText.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    this.attemptsElement.appendChild(attemptsText);

    const attemptDots = document.createElement("div");
    attemptDots.className = "flex space-x-1";

    for (let i = 0; i < this.maxAttempts; i++) {
      const dot = document.createElement("div");
      dot.className =
        i < this.attempts
          ? "w-2 h-2 rounded-full bg-red-500"
          : "w-2 h-2 rounded-full bg-gray-600";
      attemptDots.appendChild(dot);
    }

    this.attemptsElement.appendChild(attemptDots);
  }

  /**
   * Disable all inputs (for completion or max attempts)
   */
  _disableInputs() {
    const inputElements =
      this.codeInputElement.querySelectorAll("div[data-index]");
    inputElements.forEach((el) => {
      el.classList.remove("cursor-pointer", "hover:bg-gray-700");
      el.classList.add("cursor-not-allowed");
    });

    const charButtons =
      this.charactersContainer.querySelectorAll("div[data-char]");
    charButtons.forEach((button) => {
      button.classList.remove("cursor-pointer", "hover:bg-blue-900");
      button.classList.add("cursor-not-allowed", "opacity-50");
      button.removeEventListener("click", () => {});
    });
  }

  /**
   * Generate default character sets if not provided
   * @returns {Array} - Array of character sets for each position
   */
  _generateDefaultCharacterSets() {
    const sets = [];
    const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < this.passwordLength; i++) {
      sets.push(allChars);
    }

    return sets;
  }

  /**
   * Generate a random solution if none provided
   * @returns {Array} - Array of characters forming the solution
   */
  _generateRandomSolution() {
    const solution = [];

    for (let i = 0; i < this.passwordLength; i++) {
      const chars =
        this.characterSets[i] || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const randomIndex = Math.floor(Math.random() * chars.length);
      solution.push(chars[randomIndex]);
    }

    return solution;
  }

  /**
   * Get the current solution
   * @returns {Array} - The current password selection
   */
  getSolution() {
    return this.currentSelection;
  }

  /**
   * Validate the current solution
   * @returns {boolean} - Whether all positions have a character selected
   */
  validateSolution() {
    return this.currentSelection.every((char) => char !== null);
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    if (!this.validateSolution()) {
      return "Error: Please select a character for each position in the password.";
    }
    return "";
  }

  /**
   * Disable puzzle (used during random events or when completed)
   */
  disable() {
    if (this.terminalElement) {
      this.terminalElement.classList.add("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Enable puzzle after being disabled
   */
  enable() {
    if (this.terminalElement) {
      this.terminalElement.classList.remove(
        "opacity-50",
        "pointer-events-none"
      );
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Nothing to clean up for this puzzle
  }
}

export default PasswordCrackPuzzle;
