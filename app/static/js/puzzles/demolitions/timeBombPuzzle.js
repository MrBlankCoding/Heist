// timeBombPuzzle.js - Time Bomb Disarm Puzzle for the Demolitions role
// Difficulty: 2/5 - Medium difficulty

class TimeBombPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Bomb properties
    this.bombTimer = null;
    this.bombTimeRemaining = 45; // 45 seconds to disarm
    this.internalCountdown = null;

    // Keypad properties
    this.disarmCode = []; // 4-digit code to disarm
    this.playerCode = []; // Code entered by player
    this.codeLength = 4;
    this.attempts = 0;
    this.maxAttempts = 3;

    // UI elements
    this.bombTimerElement = null;
    this.keypadContainer = null;
    this.codeDisplayElement = null;
    this.hintElement = null;
    this.messageElement = null;

    // Audio elements
    this.tickSound = null;
    this.wrongSound = null;
    this.successSound = null;

    // Color sequence hint
    this.colorSequence = [];
    this.colorHintContainer = null;

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 2;
    this._adjustDifficulty();
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI
    this._createUI();

    // Generate disarm code
    this._generateDisarmCode();

    // Generate color hint sequence
    this._generateColorHint();

    // Start the bomb timer
    this._startBombTimer();

    // Set up sound effects
    this._setupSoundEffects();

    // Display initial message
    this._showMessage("Enter the disarm code before time runs out!");
  }

  /**
   * Create the puzzle UI
   */
  _createUI() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create bomb container
    const bombContainer = document.createElement("div");
    bombContainer.className = "bomb-container flex flex-col items-center p-4";

    // Create bomb timer display
    const timerContainer = document.createElement("div");
    timerContainer.className =
      "timer-container bg-black p-3 rounded-lg mb-4 w-full max-w-xs border-2 border-red-600";

    this.bombTimerElement = document.createElement("div");
    this.bombTimerElement.className =
      "bomb-timer text-red-600 text-4xl font-mono text-center";
    this.bombTimerElement.textContent = this._formatTime(
      this.bombTimeRemaining
    );

    timerContainer.appendChild(this.bombTimerElement);
    bombContainer.appendChild(timerContainer);

    // Create hint section
    this.hintElement = document.createElement("div");
    this.hintElement.className =
      "hint-section mb-4 p-3 bg-gray-800 rounded-lg w-full max-w-xs text-center text-sm";
    this.hintElement.textContent = "Disarm Code Hint:";
    bombContainer.appendChild(this.hintElement);

    // Color hint container
    this.colorHintContainer = document.createElement("div");
    this.colorHintContainer.className =
      "color-hint-container flex justify-center space-x-2 mb-4";
    bombContainer.appendChild(this.colorHintContainer);

    // Create code display
    this.codeDisplayElement = document.createElement("div");
    this.codeDisplayElement.className = "code-display flex space-x-2 mb-4";

    // Create code slots
    for (let i = 0; i < this.codeLength; i++) {
      const codeSlot = document.createElement("div");
      codeSlot.className =
        "code-slot w-12 h-12 flex items-center justify-center bg-gray-900 border border-gray-600 text-white text-2xl font-mono";
      codeSlot.textContent = "_";
      this.codeDisplayElement.appendChild(codeSlot);
    }

    bombContainer.appendChild(this.codeDisplayElement);

    // Create keypad
    this.keypadContainer = document.createElement("div");
    this.keypadContainer.className =
      "keypad-container grid grid-cols-3 gap-2 mb-4";

    // Add digits 1-9
    for (let i = 1; i <= 9; i++) {
      this._createKeypadButton(i.toString());
    }

    // Add 0 and control buttons
    this._createKeypadButton("0");
    this._createKeypadButton("←", "clear", "bg-yellow-700");
    this._createKeypadButton("✓", "submit", "bg-green-700");

    bombContainer.appendChild(this.keypadContainer);

    // Create message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "message mt-4 p-2 w-full text-center rounded-lg";
    bombContainer.appendChild(this.messageElement);

    // Add attempt counter
    const attemptCounter = document.createElement("div");
    attemptCounter.className = "attempts text-sm text-gray-400 mt-2";
    attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    bombContainer.appendChild(attemptCounter);

    // Add to main container
    this.containerElement.appendChild(bombContainer);
  }

  /**
   * Create a keypad button
   * @param {string} text - Button text
   * @param {string} action - Button action (number, clear, submit)
   * @param {string} bgClass - Background CSS class
   */
  _createKeypadButton(text, action = "number", bgClass = "bg-gray-700") {
    const button = document.createElement("button");
    button.className = `keypad-button ${bgClass} text-white w-16 h-16 rounded-lg text-xl font-mono focus:outline-none hover:opacity-80`;
    button.textContent = text;

    // Add click event
    button.addEventListener("click", () => {
      // Play button press sound
      this._playButtonSound();

      if (action === "number") {
        this._handleDigitInput(text);
      } else if (action === "clear") {
        this._handleClear();
      } else if (action === "submit") {
        this._handleSubmit();
      }
    });

    this.keypadContainer.appendChild(button);
    return button;
  }

  /**
   * Handle digit input from keypad
   * @param {string} digit - Digit pressed
   */
  _handleDigitInput(digit) {
    if (this.isComplete) return;
    if (this.playerCode.length >= this.codeLength) return;

    // Add digit to code
    this.playerCode.push(digit);

    // Update display
    this._updateCodeDisplay();

    // If code is complete length, auto-submit
    if (this.playerCode.length === this.codeLength) {
      setTimeout(() => this._handleSubmit(), 300);
    }
  }

  /**
   * Handle clear button
   */
  _handleClear() {
    if (this.isComplete) return;

    // Remove last digit
    if (this.playerCode.length > 0) {
      this.playerCode.pop();
    }

    // Update display
    this._updateCodeDisplay();
  }

  /**
   * Handle submit button
   */
  _handleSubmit() {
    if (this.isComplete) return;
    if (this.playerCode.length !== this.codeLength) {
      this._showMessage("Enter the complete code first!", "error");
      return;
    }

    // Increment attempt counter
    this.attempts++;

    // Update attempts display
    const attemptCounter = this.containerElement.querySelector(".attempts");
    if (attemptCounter) {
      attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    }

    // Check if code is correct
    const isCorrect = this._checkDisarmCode();

    if (isCorrect) {
      this._handleSuccess();
    } else {
      // Wrong code!
      this._playWrongSound();
      this._showMessage("Incorrect code! Try again.", "error");

      // Make the bomb timer faster as penalty
      this.bombTimeRemaining = Math.max(5, this.bombTimeRemaining - 10);

      // Clear the code
      this.playerCode = [];
      this._updateCodeDisplay();

      // Check for too many failed attempts
      if (this.attempts >= this.maxAttempts) {
        this._handleFailure(
          "Too many failed attempts! Bomb detonation accelerated."
        );
        return;
      }

      // Provide additional hint after first failed attempt
      if (this.attempts === 1) {
        this._provideAdditionalHint();
      }
    }
  }

  /**
   * Update the code display
   */
  _updateCodeDisplay() {
    const codeSlots = this.codeDisplayElement.querySelectorAll(".code-slot");

    // Update each slot
    for (let i = 0; i < codeSlots.length; i++) {
      if (i < this.playerCode.length) {
        codeSlots[i].textContent = this.playerCode[i];
      } else {
        codeSlots[i].textContent = "_";
      }
    }
  }

  /**
   * Generate a random disarm code
   */
  _generateDisarmCode() {
    this.disarmCode = [];

    // Generate random code
    for (let i = 0; i < this.codeLength; i++) {
      const digit = Math.floor(Math.random() * 10).toString();
      this.disarmCode.push(digit);
    }

    console.log("Disarm code:", this.disarmCode.join(""));
  }

  /**
   * Generate color sequence hint
   */
  _generateColorHint() {
    const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
    this.colorSequence = [];

    // Generate colors for each digit in the code
    for (let i = 0; i < this.disarmCode.length; i++) {
      const digit = parseInt(this.disarmCode[i]);

      // Map digit to color and position
      const colorIndex = digit % colors.length;
      this.colorSequence.push(colors[colorIndex]);
    }

    // Render color hints
    this._renderColorHints();

    // Generate hint text based on colors and their meaning
    this._generateHintText();
  }

  /**
   * Render color hint circles
   */
  _renderColorHints() {
    this.colorHintContainer.innerHTML = "";

    for (let color of this.colorSequence) {
      const colorCircle = document.createElement("div");
      colorCircle.className = `color-circle w-8 h-8 rounded-full`;
      colorCircle.style.backgroundColor = this._getColorValue(color);
      this.colorHintContainer.appendChild(colorCircle);
    }
  }

  /**
   * Generate hint text to help player translate colors to numbers
   */
  _generateHintText() {
    // Create a simple formula hint
    const hintText =
      "Color code: Red=1/6, Blue=2/7, Green=3/8, Yellow=4/9, Purple=5/0, Orange=Sequence position";
    this.hintElement.textContent = hintText;
  }

  /**
   * Get color CSS value
   * @param {string} colorName - Name of the color
   * @returns {string} - CSS color value
   */
  _getColorValue(colorName) {
    switch (colorName) {
      case "red":
        return "rgb(239, 68, 68)";
      case "blue":
        return "rgb(59, 130, 246)";
      case "green":
        return "rgb(34, 197, 94)";
      case "yellow":
        return "rgb(234, 179, 8)";
      case "purple":
        return "rgb(139, 92, 246)";
      case "orange":
        return "rgb(249, 115, 22)";
      default:
        return "rgb(107, 114, 128)";
    }
  }

  /**
   * Provide additional hint after first failed attempt
   */
  _provideAdditionalHint() {
    // Give a more direct hint with one of the positions
    const hintPosition = Math.floor(Math.random() * this.codeLength);
    const hintText = `Hint: Position ${hintPosition + 1} is ${
      this.disarmCode[hintPosition]
    }`;

    this._showMessage(hintText, "info");
  }

  /**
   * Check if the entered code matches the disarm code
   * @returns {boolean} - True if codes match
   */
  _checkDisarmCode() {
    if (this.playerCode.length !== this.disarmCode.length) {
      return false;
    }

    for (let i = 0; i < this.codeLength; i++) {
      if (this.playerCode[i] !== this.disarmCode[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Start the bomb timer
   */
  _startBombTimer() {
    if (this.bombTimer) {
      clearInterval(this.bombTimer);
    }

    this.bombTimer = setInterval(() => {
      this.bombTimeRemaining--;

      // Update timer display
      if (this.bombTimerElement) {
        this.bombTimerElement.textContent = this._formatTime(
          this.bombTimeRemaining
        );

        // Make timer flash when time is low
        if (this.bombTimeRemaining <= 10) {
          this.bombTimerElement.classList.add("animate-pulse");
        }
      }

      // Play tick sound
      if (this.bombTimeRemaining <= 10) {
        this._playTickSound();
      }

      // Check for time expiration
      if (this.bombTimeRemaining <= 0) {
        this._handleFailure("Time's up! The bomb has detonated.");
      }
    }, 1000);
  }

  /**
   * Format time for display
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string (00:00)
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Set up sound effects
   */
  _setupSoundEffects() {
    try {
      this.tickSound = new Audio("../static/sounds/tick.mp3");
      this.tickSound.volume = 0.2;

      this.wrongSound = new Audio("../static/sounds/wrong.mp3");
      this.wrongSound.volume = 0.3;

      this.successSound = new Audio("../static/sounds/success.mp3");
      this.successSound.volume = 0.3;
    } catch (e) {
      console.warn("Could not set up sound effects:", e);
    }
  }

  /**
   * Play tick sound
   */
  _playTickSound() {
    if (this.tickSound) {
      try {
        // Clone the sound to allow overlapping playback
        const tickSoundClone = this.tickSound.cloneNode();
        tickSoundClone
          .play()
          .catch((e) => console.warn("Could not play sound:", e));
      } catch (e) {
        console.warn("Could not play tick sound:", e);
      }
    }
  }

  /**
   * Play button press sound
   */
  _playButtonSound() {
    try {
      const buttonSound = new Audio("../static/sounds/button-press.mp3");
      buttonSound.volume = 0.1;
      buttonSound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play button sound:", e);
    }
  }

  /**
   * Play wrong answer sound
   */
  _playWrongSound() {
    if (this.wrongSound) {
      try {
        this.wrongSound
          .play()
          .catch((e) => console.warn("Could not play sound:", e));
      } catch (e) {
        console.warn("Could not play wrong sound:", e);
      }
    }
  }

  /**
   * Handle successful bomb disarm
   */
  _handleSuccess() {
    this.isComplete = true;

    // Stop the timer
    if (this.bombTimer) {
      clearInterval(this.bombTimer);
      this.bombTimer = null;
    }

    // Play success sound
    if (this.successSound) {
      try {
        this.successSound
          .play()
          .catch((e) => console.warn("Could not play sound:", e));
      } catch (e) {
        console.warn("Could not play success sound:", e);
      }
    }

    // Show success message
    this._showMessage("Bomb successfully disarmed!", "success");

    // Trigger success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Handle bomb detonation / failure
   * @param {string} message - Failure message
   */
  _handleFailure(message) {
    // Stop the timer
    if (this.bombTimer) {
      clearInterval(this.bombTimer);
      this.bombTimer = null;
    }

    // Show failure message
    this._showMessage(message, "error");

    // Play explosion sound
    try {
      const explosionSound = new Audio("../static/sounds/explosion.mp3");
      explosionSound.volume = 0.4;
      explosionSound
        .play()
        .catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play explosion sound:", e);
    }

    // Visual explosion effect
    this._createExplosionEffect();

    // Disable keypad
    const keypadButtons = this.keypadContainer.querySelectorAll("button");
    keypadButtons.forEach((button) => {
      button.disabled = true;
      button.classList.add("opacity-50");
    });

    // Reduce time as penalty
    if (this.callbacks && this.callbacks.reduceTime) {
      this.callbacks.reduceTime(15);
    }
  }

  /**
   * Create explosion visual effect
   */
  _createExplosionEffect() {
    // Add explosion overlay
    const explosionOverlay = document.createElement("div");
    explosionOverlay.className =
      "absolute inset-0 bg-red-500 bg-opacity-50 z-10 flex items-center justify-center";
    explosionOverlay.style.animation = "explosion 0.5s ease-out";

    // Add keyframes for explosion animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes explosion {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // Make container position relative for absolute positioning
    this.containerElement.style.position = "relative";

    // Add to container
    this.containerElement.appendChild(explosionOverlay);

    // Remove after animation
    setTimeout(() => {
      explosionOverlay.remove();
    }, 1000);
  }

  /**
   * Show message
   * @param {string} message - Message to display
   * @param {string} type - Type of message (info, success, error)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    // Remove previous classes
    this.messageElement.className =
      "message mt-4 p-2 w-full text-center rounded-lg";

    // Add type-specific class
    switch (type) {
      case "success":
        this.messageElement.classList.add("bg-green-700", "text-white");
        break;
      case "error":
        this.messageElement.classList.add("bg-red-700", "text-white");
        break;
      default:
        this.messageElement.classList.add("bg-blue-700", "text-white");
    }

    this.messageElement.textContent = message;
  }

  /**
   * Adjust difficulty based on level
   */
  _adjustDifficulty() {
    // Level 2 already has default settings
    // For higher difficulties, adjust accordingly
    if (this.difficulty > 2) {
      this.bombTimeRemaining -= 5 * (this.difficulty - 2);
      this.maxAttempts = Math.max(1, 3 - (this.difficulty - 2));
    }
  }

  /**
   * Check if the solution is valid
   * @returns {boolean} - True if solution is valid
   */
  validateSolution() {
    if (!this.isComplete) return false;
    return true;
  }

  /**
   * Get the current solution
   * @returns {Array} - Disarm code
   */
  getSolution() {
    return this.playerCode;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Enter the correct disarm code to complete the puzzle.";
  }

  /**
   * Show success animation
   */
  showSuccess() {
    // Flash success message
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center z-10";
    successOverlay.innerHTML = `
      <div class="text-4xl font-bold text-white">DISARMED</div>
    `;

    // Make container position relative for absolute positioning
    this.containerElement.style.position = "relative";

    // Add to container
    this.containerElement.appendChild(successOverlay);

    // Animate in
    successOverlay.style.opacity = "0";
    successOverlay.style.transition = "opacity 0.5s";

    setTimeout(() => {
      successOverlay.style.opacity = "1";
    }, 100);

    // Remove after animation
    setTimeout(() => {
      successOverlay.style.opacity = "0";
      setTimeout(() => {
        successOverlay.remove();
      }, 500);
    }, 2000);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop timers
    if (this.bombTimer) {
      clearInterval(this.bombTimer);
      this.bombTimer = null;
    }

    // Remove event listeners from keypad buttons
    const keypadButtons = this.keypadContainer
      ? this.keypadContainer.querySelectorAll("button")
      : [];
    keypadButtons.forEach((button) => {
      const clone = button.cloneNode(true);
      button.parentNode.replaceChild(clone, button);
    });

    // Clean up audio resources
    this.tickSound = null;
    this.wrongSound = null;
    this.successSound = null;
  }
}

export default TimeBombPuzzle;
