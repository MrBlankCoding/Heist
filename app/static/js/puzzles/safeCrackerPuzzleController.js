// safeCrackerPuzzleController.js - Controls puzzles for the Safe Cracker role

class SafeCrackerPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;

    // Lock puzzle specific properties
    this.lockSequence = [];
    this.playerSequence = [];
    this.currentPosition = 0;
    this.isRotating = false;
    this.dialAngle = 0;

    // DOM elements will be created during initialization
    this.lockElement = null;
    this.dialElement = null;
    this.sequenceDisplay = null;
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

    // Determine which puzzle to render based on stage/type
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "safe_puzzle_1") {
      this._setupLockDialPuzzle(gameArea);
    } else if (puzzleType === "safe_puzzle_2") {
      this._setupSoundLockPuzzle(gameArea);
    } else if (puzzleType === "safe_puzzle_3") {
      this._setupSequenceLockPuzzle(gameArea);
    } else if (puzzleType === "safe_puzzle_4") {
      this._setupMultiLockPuzzle(gameArea);
    } else if (puzzleType === "safe_puzzle_5") {
      this._setupTimedLockPuzzle(gameArea);
    } else {
      // Fallback to basic lock puzzle
      this._setupLockDialPuzzle(gameArea);
    }

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Submit Combination";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent = "Lock opened successfully!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable lock dial
    if (this.lockElement) {
      this.lockElement.classList.add("opacity-50", "pointer-events-none");
    }

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Lock Cracked";
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
      if (this.lockElement) {
        this.lockElement.classList.add("opacity-50", "pointer-events-none");
      }
      this.submitButton.disabled = true;

      // Re-enable after duration
      setTimeout(() => {
        if (this.lockElement) {
          this.lockElement.classList.remove(
            "opacity-50",
            "pointer-events-none"
          );
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
    // Clear event listeners if needed
    if (this.dialElement) {
      this.dialElement.removeEventListener("mousedown", null);
      document.removeEventListener("mousemove", null);
      document.removeEventListener("mouseup", null);
    }

    // Clear references
    this.lockElement = null;
    this.dialElement = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Private: Setup lock dial puzzle (Stage 1)
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

    // Add event listeners for dial rotation
    this.dialElement.addEventListener("mousedown", (e) => {
      this.isRotating = true;
      this._updateRotationFromMouse(e);

      // Add document-level event listeners
      document.addEventListener("mousemove", this._handleMouseMove.bind(this));
      document.addEventListener("mouseup", this._handleMouseUp.bind(this));
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
    document.removeEventListener("mousemove", this._handleMouseMove.bind(this));
    document.removeEventListener("mouseup", this._handleMouseUp.bind(this));
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
   * Private: Handle submit button click
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
   * Private: Get puzzle title based on type/stage
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "safe_puzzle_1":
        return "Lock Combination";
      case "safe_puzzle_2":
        return "Audio Sequence Lock";
      case "safe_puzzle_3":
        return "Pattern Recognition";
      case "safe_puzzle_4":
        return "Multi-Lock System";
      case "safe_puzzle_5":
        return "Vault Access";
      default:
        return "Unknown Lock";
    }
  }

  /**
   * Private: Get puzzle instructions based on type/stage
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "safe_puzzle_1":
        return "Crack the lock by finding the correct 3-number combination. Rotate the dial to select numbers, then click to set each position.";
      case "safe_puzzle_2":
        return "Listen to the audio cues and replicate the correct sequence to unlock.";
      case "safe_puzzle_3":
        return "Identify the pattern in the lock mechanism and complete the sequence.";
      case "safe_puzzle_4":
        return "Crack multiple locks in the correct order to access the inner vault.";
      case "safe_puzzle_5":
        return "Bypass the final security measures to access the vault. Timing is critical!";
      default:
        return "Crack this lock to proceed.";
    }
  }

  /**
   * Private: Get random event message
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

  /**
   * Private: Setup Sound Lock puzzle (Stage 2)
   * Would be implemented for stage 2
   */
  _setupSoundLockPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent = "Audio sequence puzzle will be available in Stage 2";
    container.appendChild(message);
  }

  /**
   * Private: Setup Sequence Lock puzzle (Stage 3)
   * Would be implemented for stage 3
   */
  _setupSequenceLockPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent =
      "Pattern recognition puzzle will be available in Stage 3";
    container.appendChild(message);
  }

  /**
   * Private: Setup Multi-Lock puzzle (Stage 4)
   * Would be implemented for stage 4
   */
  _setupMultiLockPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent = "Multi-lock puzzle will be available in Stage 4";
    container.appendChild(message);
  }

  /**
   * Private: Setup Timed Lock puzzle (Stage 5)
   * Would be implemented for stage 5
   */
  _setupTimedLockPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent = "Timed lock puzzle will be available in Stage 5";
    container.appendChild(message);
  }
}

export default SafeCrackerPuzzleController;
