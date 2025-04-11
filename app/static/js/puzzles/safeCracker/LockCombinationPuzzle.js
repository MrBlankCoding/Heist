// LockCombinationPuzzle.js - Stage 1 Lock Combination puzzle for Safe Cracker role

import BasePuzzle from "./BasePuzzle.js";

class LockCombinationPuzzle extends BasePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    super(containerElement, puzzleData, submitSolutionCallback);

    // Lock puzzle specific properties
    this.lockSequence = [];
    this.playerSequence = [];
    this.currentPosition = 0;
    this.isRotating = false;
    this.dialAngle = 0;

    // DOM elements
    this.lockElement = null;
    this.dialElement = null;
    this.sequenceDisplay = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    super.initialize();

    // Get game area div
    const gameArea = this.containerElement.querySelector(
      "div.flex.justify-center"
    );
    this._setupLockDialPuzzle(gameArea);
  }

  /**
   * Handle mouse move event for dial rotation
   * @param {MouseEvent} e - Mouse event
   */
  _handleMouseMove(e) {
    if (this.isRotating) {
      this._updateRotationFromMouse(e);
    }
  }

  /**
   * Handle mouse up event for dial rotation
   */
  _handleMouseUp() {
    this.isRotating = false;

    // Remove document-level event listeners
    document.removeEventListener("mousemove", this._boundMouseMove);
    document.removeEventListener("mouseup", this._boundMouseUp);
  }

  /**
   * Update dial rotation based on mouse position
   * @param {MouseEvent} e - Mouse event
   */
  _updateRotationFromMouse(e) {
    const rect = this.dialElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle from center to mouse position
    const angle =
      Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    this.dialAngle = angle + 90; // Adjust to make 0 at the top

    // Ensure angle is positive
    if (this.dialAngle < 0) {
      this.dialAngle += 360;
    }

    // Update dial rotation
    this.dialElement.style.transform = `rotate(${this.dialAngle}deg)`;
  }

  /**
   * Set up the lock dial puzzle interface
   * @param {HTMLElement} container - Container element
   */
  _setupLockDialPuzzle(container) {
    // Generate sequence if not provided
    if (!this.puzzleData.data || !this.puzzleData.data.sequence) {
      this.lockSequence = [
        Math.floor(Math.random() * 40),
        Math.floor(Math.random() * 40),
        Math.floor(Math.random() * 40),
      ];
    } else {
      this.lockSequence = this.puzzleData.data.sequence;
    }

    // Create lock container
    this.lockElement = document.createElement("div");
    this.lockElement.className =
      "relative w-64 h-64 bg-gray-800 rounded-full border-4 border-yellow-600 flex items-center justify-center";

    // Create lock dial
    this.dialElement = document.createElement("div");
    this.dialElement.className =
      "absolute w-56 h-56 bg-gray-700 rounded-full cursor-pointer flex items-center justify-center";
    this.dialElement.style.transform = "rotate(0deg)";

    // Add dial markings
    for (let i = 0; i < 40; i++) {
      const mark = document.createElement("div");
      const angle = (i / 40) * 360;
      mark.className =
        "absolute w-1 h-4 bg-white rounded-full top-0 left-1/2 transform -translate-x-1/2 origin-bottom";
      mark.style.transform = `rotate(${angle}deg)`;

      // Add number every 5 marks
      if (i % 5 === 0) {
        mark.className =
          "absolute w-1 h-6 bg-yellow-400 rounded-full top-0 left-1/2 transform -translate-x-1/2 origin-bottom";

        const number = document.createElement("div");
        number.className = "absolute text-yellow-400 text-xs font-bold";
        number.textContent = i.toString();
        number.style.transform = `rotate(${-angle}deg) translateY(-24px)`;

        mark.appendChild(number);
      }

      this.dialElement.appendChild(mark);
    }

    // Add arrow indicator
    const indicator = document.createElement("div");
    indicator.className =
      "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2";
    indicator.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4L4 12H20L12 4Z" fill="#EF4444" /></svg>';

    // Add sequence display
    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className = "mt-8 flex space-x-4 justify-center";

    for (let i = 0; i < 3; i++) {
      const slot = document.createElement("div");
      slot.className =
        "w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center text-lg font-bold text-yellow-400 border border-yellow-600";
      slot.dataset.position = i;
      slot.textContent = "?";
      this.sequenceDisplay.appendChild(slot);
    }

    // Bind event handlers to this instance
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundMouseUp = this._handleMouseUp.bind(this);

    // Add event listeners for dial rotation
    this.dialElement.addEventListener("mousedown", (e) => {
      this.isRotating = true;
      this._updateRotationFromMouse(e);

      // Add document-level event listeners
      document.addEventListener("mousemove", this._boundMouseMove);
      document.addEventListener("mouseup", this._boundMouseUp);
    });

    // Add lock click handler to set position
    this.lockElement.addEventListener("click", () => {
      if (this.isRotating) return;

      // Get current number based on dial angle
      const currentNumber = Math.floor(((this.dialAngle % 360) / 360) * 40);

      // Update sequence display
      const slots = this.sequenceDisplay.querySelectorAll("div");
      slots[this.currentPosition].textContent = currentNumber;

      // Update player sequence
      this.playerSequence[this.currentPosition] = currentNumber;

      // Move to next position
      this.currentPosition = (this.currentPosition + 1) % 3;

      // Highlight current position
      slots.forEach((slot, i) => {
        if (i === this.currentPosition) {
          slot.classList.add("border-2", "border-white");
        } else {
          slot.classList.remove("border-2", "border-white");
        }
      });

      // Add a satisfying click sound
      this._playClickSound();
    });

    // Assemble the lock
    this.lockElement.appendChild(this.dialElement);
    this.lockElement.appendChild(indicator);

    // Add to container
    container.innerHTML = "";
    container.className = "flex flex-col items-center";
    container.appendChild(this.lockElement);
    container.appendChild(this.sequenceDisplay);

    // Highlight first position
    const slots = this.sequenceDisplay.querySelectorAll("div");
    slots[0].classList.add("border-2", "border-white");
  }

  /**
   * Play a click sound when setting a number
   */
  _playClickSound() {
    const audio = new Audio("/static/sounds/lock_click.mp3");
    audio.volume = 0.3;
    audio.play().catch((e) => console.log("Audio play error:", e));
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    // Check if all positions have been set
    if (this.playerSequence.length < 3) {
      this.messageElement.textContent =
        "Please set all three numbers in the combination!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Testing combination...";

    this.submitSolution(this.playerSequence)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent = "Wrong combination. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Submit Combination";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting combination. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Submit Combination";
      });
  }

  /**
   * Disable or enable puzzle interaction
   * @param {boolean} disabled - Whether to disable interaction
   */
  disableInteraction(disabled) {
    super.disableInteraction(disabled);

    if (this.lockElement) {
      if (disabled) {
        this.lockElement.classList.add("opacity-50", "pointer-events-none");
      } else {
        this.lockElement.classList.remove("opacity-50", "pointer-events-none");
      }
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    super.cleanup();

    // Remove dial event listeners
    if (this.dialElement) {
      this.dialElement.removeEventListener("mousedown", null);
    }
    document.removeEventListener("mousemove", this._boundMouseMove);
    document.removeEventListener("mouseup", this._boundMouseUp);

    this.lockElement = null;
    this.dialElement = null;
    this.sequenceDisplay = null;
  }

  /**
   * Get puzzle title
   * @returns {string} Puzzle title
   */
  _getPuzzleTitle() {
    return "Lock Combination";
  }

  /**
   * Get puzzle instructions
   * @returns {string} Puzzle instructions
   */
  _getInstructions() {
    return "Crack the lock by finding the correct 3-number combination. Rotate the dial to select numbers, then click to set each position.";
  }
}

export default LockCombinationPuzzle;
