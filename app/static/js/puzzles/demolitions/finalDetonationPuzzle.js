// finalDetonationPuzzle.js - Final Detonation Puzzle for the Demolitions role
// Difficulty: 5/5 - Hardest difficulty

class FinalDetonationPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Detonation device properties
    this.stageCount = 3; // Number of stages to complete
    this.currentStage = 0;
    this.maxAttempts = 2;
    this.attempts = 0;

    // Timer properties
    this.timer = null;
    this.timeRemaining = 120; // 2 minutes to complete all stages
    this.stageTimers = [];

    // Puzzle stages
    this.wireStage = {
      completed: false,
      wires: [],
      correctSequence: [],
    };

    this.codeStage = {
      completed: false,
      code: "",
      userInput: "",
      hints: [],
    };

    this.pressureStage = {
      completed: false,
      targetPressure: 0,
      currentPressure: 0,
      valves: [],
    };

    // UI elements
    this.mainContainer = null;
    this.stageContainer = null;
    this.timerElement = null;
    this.messageElement = null;
    this.progressIndicator = null;

    // Audio elements
    this.tickSound = null;
    this.errorSound = null;
    this.successSound = null;

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 5;
    this._adjustDifficulty();
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create main UI structure
    this._createUI();

    // Generate all stages
    this._generateStages();

    // Load sounds
    this._setupSounds();

    // Start with first stage
    this._startStage(0);

    // Start timer
    this._startTimer();

    // Display initial instructions
    this._showMessage(
      "Final detonation sequence initiated. Disarm all stages to complete."
    );
  }

  /**
   * Create the main UI structure
   */
  _createUI() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create main container
    this.mainContainer = document.createElement("div");
    this.mainContainer.className =
      "detonation-puzzle flex flex-col items-center p-4";

    // Create timer display
    const timerContainer = document.createElement("div");
    timerContainer.className =
      "timer-container bg-black p-2 rounded-lg mb-4 w-full max-w-xs border-2 border-red-600";

    this.timerElement = document.createElement("div");
    this.timerElement.className =
      "timer-display text-red-600 text-3xl font-mono text-center";
    this.timerElement.textContent = this._formatTime(this.timeRemaining);

    timerContainer.appendChild(this.timerElement);
    this.mainContainer.appendChild(timerContainer);

    // Create progress indicator
    this.progressIndicator = document.createElement("div");
    this.progressIndicator.className =
      "progress-indicator flex justify-center space-x-4 mb-4";

    for (let i = 0; i < this.stageCount; i++) {
      const indicator = document.createElement("div");
      indicator.className = `stage-indicator w-4 h-4 rounded-full ${
        i === 0 ? "bg-yellow-500 animate-pulse" : "bg-gray-600"
      }`;
      indicator.dataset.stage = i;
      this.progressIndicator.appendChild(indicator);
    }

    this.mainContainer.appendChild(this.progressIndicator);

    // Create stage container
    this.stageContainer = document.createElement("div");
    this.stageContainer.className =
      "stage-container bg-gray-900 p-4 rounded-lg mb-4 w-full max-w-xl border border-gray-700";
    this.mainContainer.appendChild(this.stageContainer);

    // Create message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "message mt-4 p-2 w-full text-center rounded-lg";
    this.mainContainer.appendChild(this.messageElement);

    // Add to main container
    this.containerElement.appendChild(this.mainContainer);
  }

  /**
   * Generate all puzzle stages
   */
  _generateStages() {
    this._generateWireStage();
    this._generateCodeStage();
    this._generatePressureStage();
  }

  /**
   * Generate wire cutting stage
   */
  _generateWireStage() {
    // Generate wires
    const wireColors = ["red", "blue", "green", "yellow", "white", "black"];
    const wireCount = 5;

    this.wireStage.wires = [];
    this.wireStage.correctSequence = [];

    // Create wires with random colors
    for (let i = 0; i < wireCount; i++) {
      const colorIndex = Math.floor(Math.random() * wireColors.length);
      const wire = {
        id: i,
        color: wireColors[colorIndex],
        cut: false,
      };

      this.wireStage.wires.push(wire);
    }

    // Determine correct sequence for cutting
    const tempSequence = [...Array(wireCount).keys()]; // [0, 1, 2, 3, 4]
    tempSequence.sort(() => 0.5 - Math.random()); // Shuffle

    // Take the first 3 wires as the correct sequence
    this.wireStage.correctSequence = tempSequence.slice(0, 3);

    console.log("Correct wire sequence:", this.wireStage.correctSequence);
  }

  /**
   * Generate code input stage
   */
  _generateCodeStage() {
    // Generate 6-digit code
    this.codeStage.code = "";
    for (let i = 0; i < 6; i++) {
      this.codeStage.code += Math.floor(Math.random() * 10);
    }

    // Generate hints
    this.codeStage.hints = [];

    // Hint 1: Sum of all digits
    const digitSum = this.codeStage.code
      .split("")
      .reduce((sum, digit) => sum + parseInt(digit), 0);
    this.codeStage.hints.push(`Sum of all digits: ${digitSum}`);

    // Hint 2: First and last digit
    this.codeStage.hints.push(
      `First digit: ${this.codeStage.code[0]}, Last digit: ${this.codeStage.code[5]}`
    );

    // Hint 3: Product of positions 2 and 4
    const product =
      parseInt(this.codeStage.code[1]) * parseInt(this.codeStage.code[3]);
    this.codeStage.hints.push(`Product of digits 2 and 4: ${product}`);

    console.log("Code:", this.codeStage.code);
  }

  /**
   * Generate pressure valve stage
   */
  _generatePressureStage() {
    // Target pressure between 40-60
    this.pressureStage.targetPressure = 40 + Math.floor(Math.random() * 21);
    this.pressureStage.currentPressure = 0;

    // Generate valves
    this.pressureStage.valves = [];

    // 4 valves with different pressure effects
    this.pressureStage.valves.push({
      id: 0,
      effect: 5,
      name: "Valve A",
      active: false,
    }); // +5
    this.pressureStage.valves.push({
      id: 1,
      effect: 10,
      name: "Valve B",
      active: false,
    }); // +10
    this.pressureStage.valves.push({
      id: 2,
      effect: -3,
      name: "Valve C",
      active: false,
    }); // -3
    this.pressureStage.valves.push({
      id: 3,
      effect: -7,
      name: "Valve D",
      active: false,
    }); // -7

    console.log("Target pressure:", this.pressureStage.targetPressure);
  }

  /**
   * Start a specific stage
   * @param {number} stageIndex - Index of the stage to start
   */
  _startStage(stageIndex) {
    // Update current stage
    this.currentStage = stageIndex;

    // Update progress indicators
    const indicators =
      this.progressIndicator.querySelectorAll(".stage-indicator");

    indicators.forEach((indicator, index) => {
      // Reset all indicators
      indicator.className = "stage-indicator w-4 h-4 rounded-full";

      if (index < stageIndex) {
        // Completed stages
        indicator.classList.add("bg-green-500");
      } else if (index === stageIndex) {
        // Current stage
        indicator.classList.add("bg-yellow-500", "animate-pulse");
      } else {
        // Future stages
        indicator.classList.add("bg-gray-600");
      }
    });

    // Render appropriate stage
    switch (stageIndex) {
      case 0:
        this._renderWireStage();
        break;
      case 1:
        this._renderCodeStage();
        break;
      case 2:
        this._renderPressureStage();
        break;
      default:
        this._handleSuccess();
    }
  }

  /**
   * Set up sound effects
   */
  _setupSounds() {
    try {
      this.tickSound = new Audio("../static/sounds/tick.mp3");
      this.tickSound.volume = 0.2;

      this.errorSound = new Audio("../static/sounds/error.mp3");
      this.errorSound.volume = 0.3;

      this.successSound = new Audio("../static/sounds/success.mp3");
      this.successSound.volume = 0.3;
    } catch (e) {
      console.warn("Could not set up sounds:", e);
    }
  }

  /**
   * Start the main timer
   */
  _startTimer() {
    // Clear any existing timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.timeRemaining--;

      // Update timer display
      this._updateTimerDisplay();

      // Play tick sound when low on time
      if (this.timeRemaining <= 10 && this.tickSound) {
        try {
          const clone = this.tickSound.cloneNode();
          clone.volume = 0.2;
          clone.play().catch((e) => console.warn("Could not play sound:", e));
        } catch (e) {
          console.warn("Could not play tick sound:", e);
        }
      }

      // Check for time expiration
      if (this.timeRemaining <= 0) {
        this._handleFailure(
          "Time's up! The detonation sequence has completed."
        );
      }
    }, 1000);
  }

  /**
   * Update timer display
   */
  _updateTimerDisplay() {
    if (this.timerElement) {
      this.timerElement.textContent = this._formatTime(this.timeRemaining);

      // Change color based on time remaining
      if (this.timeRemaining <= 10) {
        this.timerElement.classList.add("text-red-600", "animate-pulse");
        this.timerElement.classList.remove("text-yellow-500");
      } else if (this.timeRemaining <= 30) {
        this.timerElement.classList.add("text-yellow-500");
        this.timerElement.classList.remove("text-red-600", "animate-pulse");
      } else {
        this.timerElement.classList.remove(
          "text-yellow-500",
          "text-red-600",
          "animate-pulse"
        );
      }
    }
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
    // Level 5 is already the hardest
    // Adjust if needed for different difficulty settings
    if (this.difficulty < 5) {
      this.timeRemaining = 150; // More time for lower difficulties
      this.maxAttempts = 3; // More attempts
    }
  }

  /**
   * Handle stage completion
   */
  _handleStageComplete() {
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

    // Show success message for this stage
    this._showMessage(
      `Stage ${this.currentStage + 1} completed successfully!`,
      "success"
    );

    // Move to next stage
    setTimeout(() => {
      this._startStage(this.currentStage + 1);
    }, 1500);
  }

  /**
   * Handle failure
   * @param {string} message - Failure message
   */
  _handleFailure(message) {
    // Stop timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Play error sound
    if (this.errorSound) {
      try {
        this.errorSound
          .play()
          .catch((e) => console.warn("Could not play sound:", e));
      } catch (e) {
        console.warn("Could not play error sound:", e);
      }
    }

    // Show failure message
    this._showMessage(message, "error");

    // Reduce time as penalty
    if (this.callbacks && this.callbacks.reduceTime) {
      this.callbacks.reduceTime(20);
    }
  }

  /**
   * Handle successful completion of all stages
   */
  _handleSuccess() {
    this.isComplete = true;

    // Stop timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
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
    this._showMessage(
      "Final detonation sequence successfully disarmed!",
      "success"
    );

    // Trigger success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Remaining implementations for each stage rendering
   * and event handling will be added...
   */

  /**
   * Check if the solution is valid
   * @returns {boolean} - True if solution is valid
   */
  validateSolution() {
    return this.isComplete;
  }

  /**
   * Get the current solution
   * @returns {Object} - Current solution data
   */
  getSolution() {
    return {
      completed: this.isComplete,
      currentStage: this.currentStage,
      wireStage: this.wireStage,
      codeStage: this.codeStage,
      pressureStage: this.pressureStage,
    };
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Complete all stages to disarm the final detonation sequence.";
  }

  /**
   * Show success animation
   */
  showSuccess() {
    // Create success overlay
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center z-10";
    successOverlay.innerHTML = `
      <div class="text-4xl font-bold text-white">DISARMED</div>
    `;

    // Make container position relative for absolute positioning
    this.mainContainer.style.position = "relative";

    // Add to container
    this.mainContainer.appendChild(successOverlay);

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

  // Add the missing implementations for rendering and handling each stage

  /**
   * Render wire cutting stage
   */
  _renderWireStage() {
    this.stageContainer.innerHTML = "";

    const stageTitle = document.createElement("h2");
    stageTitle.className = "text-xl font-bold mb-4 text-center text-white";
    stageTitle.textContent = "Stage 1: Wire Sequence";
    this.stageContainer.appendChild(stageTitle);

    const instructions = document.createElement("p");
    instructions.className = "mb-4 text-gray-300";
    instructions.textContent =
      "Cut exactly three wires in the correct sequence. Choose carefully.";
    this.stageContainer.appendChild(instructions);

    // Create wire container
    const wireContainer = document.createElement("div");
    wireContainer.className = "wire-container flex flex-col space-y-4 mb-4";

    // Create wires
    this.wireStage.wires.forEach((wire) => {
      const wireElement = document.createElement("div");
      wireElement.className = `wire flex items-center p-2 border border-gray-700 rounded cursor-pointer ${
        wire.cut ? "opacity-50" : ""
      }`;
      wireElement.dataset.id = wire.id;

      const wireColor = document.createElement("div");
      wireColor.className = `wire-color w-12 h-6 rounded mr-3 bg-${wire.color}-500`;
      if (wire.color === "black") {
        wireColor.className = "wire-color w-12 h-6 rounded mr-3 bg-gray-900";
      } else if (wire.color === "white") {
        wireColor.className = "wire-color w-12 h-6 rounded mr-3 bg-gray-100";
      }

      const wireLabel = document.createElement("span");
      wireLabel.className = "wire-label text-white";
      wireLabel.textContent = `Wire ${wire.id + 1}`;

      const wireCutStatus = document.createElement("span");
      wireCutStatus.className = "ml-auto text-gray-400";
      wireCutStatus.textContent = wire.cut ? "CUT" : "INTACT";

      wireElement.appendChild(wireColor);
      wireElement.appendChild(wireLabel);
      wireElement.appendChild(wireCutStatus);

      // Add click event
      wireElement.addEventListener("click", () =>
        this._handleWireClick(wire.id)
      );

      wireContainer.appendChild(wireElement);
    });

    this.stageContainer.appendChild(wireContainer);

    // Add attempt counter
    const attemptCounter = document.createElement("div");
    attemptCounter.className = "text-center text-gray-400 mt-4";
    attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    this.stageContainer.appendChild(attemptCounter);

    this._showMessage(
      "Cut three wires in the correct sequence to disarm the first stage."
    );
  }

  /**
   * Handle wire click
   * @param {number} wireId - ID of the wire clicked
   */
  _handleWireClick(wireId) {
    // Find wire in array
    const wireIndex = this.wireStage.wires.findIndex(
      (wire) => wire.id === wireId
    );
    if (wireIndex === -1) return;

    const wire = this.wireStage.wires[wireIndex];

    // Ignore if already cut
    if (wire.cut) return;

    // Cut the wire
    wire.cut = true;

    // Get number of cut wires
    const cutWires = this.wireStage.wires.filter((w) => w.cut);

    // Re-render stage
    this._renderWireStage();

    // Check if three wires are cut
    if (cutWires.length === 3) {
      // Verify if correct sequence
      const cutWireIds = cutWires.map((w) => w.id);
      const isCorrect = this._verifyWireSequence(cutWireIds);

      if (isCorrect) {
        this.wireStage.completed = true;
        this._handleStageComplete();
      } else {
        this.attempts++;

        if (this.attempts >= this.maxAttempts) {
          this._handleFailure(
            "Too many incorrect attempts. Detonation imminent."
          );
        } else {
          // Reset wires for another attempt
          this.wireStage.wires.forEach((w) => (w.cut = false));
          this._renderWireStage();
          this._showMessage(
            `Incorrect sequence! ${
              this.maxAttempts - this.attempts
            } attempts remaining.`,
            "error"
          );
        }
      }
    }
  }

  /**
   * Verify if wire sequence is correct
   * @param {Array} cutWireIds - IDs of cut wires
   * @returns {boolean} - True if sequence is correct
   */
  _verifyWireSequence(cutWireIds) {
    // Sort both arrays to compare
    const sortedCut = [...cutWireIds].sort((a, b) => a - b);
    const sortedCorrect = [...this.wireStage.correctSequence].sort(
      (a, b) => a - b
    );

    // Compare each element
    return sortedCut.every((id, index) => id === sortedCorrect[index]);
  }

  /**
   * Render code input stage
   */
  _renderCodeStage() {
    this.stageContainer.innerHTML = "";

    const stageTitle = document.createElement("h2");
    stageTitle.className = "text-xl font-bold mb-4 text-center text-white";
    stageTitle.textContent = "Stage 2: Detonation Code";
    this.stageContainer.appendChild(stageTitle);

    const instructions = document.createElement("p");
    instructions.className = "mb-4 text-gray-300";
    instructions.textContent =
      "Enter the correct 6-digit detonation code to proceed.";
    this.stageContainer.appendChild(instructions);

    // Create hints
    const hintsContainer = document.createElement("div");
    hintsContainer.className = "hints-container mb-4 p-3 bg-gray-800 rounded";

    const hintsTitle = document.createElement("h3");
    hintsTitle.className = "text-sm uppercase text-gray-400 mb-2";
    hintsTitle.textContent = "HINTS";
    hintsContainer.appendChild(hintsTitle);

    const hintsList = document.createElement("ul");
    hintsList.className = "text-sm text-gray-300";

    this.codeStage.hints.forEach((hint) => {
      const hintItem = document.createElement("li");
      hintItem.className = "mb-1";
      hintItem.textContent = hint;
      hintsList.appendChild(hintItem);
    });

    hintsContainer.appendChild(hintsList);
    this.stageContainer.appendChild(hintsContainer);

    // Create code input
    const codeInputContainer = document.createElement("div");
    codeInputContainer.className = "code-input-container mb-4";

    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.maxLength = 6;
    codeInput.pattern = "[0-9]*";
    codeInput.inputMode = "numeric";
    codeInput.className =
      "code-input w-full p-3 bg-black text-green-500 font-mono text-center text-2xl rounded border border-gray-700";
    codeInput.placeholder = "------";
    codeInput.value = this.codeStage.userInput;

    codeInput.addEventListener("input", (e) => {
      // Allow only digits
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
      this.codeStage.userInput = e.target.value;
    });

    codeInputContainer.appendChild(codeInput);
    this.stageContainer.appendChild(codeInputContainer);

    // Create submit button
    const submitButton = document.createElement("button");
    submitButton.className =
      "submit-button w-full p-2 bg-blue-700 hover:bg-blue-600 text-white rounded transition";
    submitButton.textContent = "Submit Code";
    submitButton.addEventListener("click", () => this._handleCodeSubmit());
    this.stageContainer.appendChild(submitButton);

    // Create attempts counter
    const attemptCounter = document.createElement("div");
    attemptCounter.className = "text-center text-gray-400 mt-4";
    attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    this.stageContainer.appendChild(attemptCounter);

    // Focus on input
    setTimeout(() => codeInput.focus(), 100);

    this._showMessage("Decode the hints to find the correct detonation code.");
  }

  /**
   * Handle code submission
   */
  _handleCodeSubmit() {
    // Check if code is complete
    if (this.codeStage.userInput.length !== 6) {
      this._showMessage("Code must be 6 digits.", "error");
      return;
    }

    // Check if code is correct
    if (this.codeStage.userInput === this.codeStage.code) {
      this.codeStage.completed = true;
      this._handleStageComplete();
    } else {
      this.attempts++;

      if (this.attempts >= this.maxAttempts) {
        this._handleFailure(
          "Too many incorrect attempts. Detonation imminent."
        );
      } else {
        this._showMessage(
          `Incorrect code! ${
            this.maxAttempts - this.attempts
          } attempts remaining.`,
          "error"
        );

        // Reset input
        this.codeStage.userInput = "";
        this._renderCodeStage();
      }
    }
  }

  /**
   * Render pressure valve stage
   */
  _renderPressureStage() {
    this.stageContainer.innerHTML = "";

    const stageTitle = document.createElement("h2");
    stageTitle.className = "text-xl font-bold mb-4 text-center text-white";
    stageTitle.textContent = "Stage 3: Pressure Stabilization";
    this.stageContainer.appendChild(stageTitle);

    const instructions = document.createElement("p");
    instructions.className = "mb-4 text-gray-300";
    instructions.textContent = `Stabilize pressure at exactly ${this.pressureStage.targetPressure} PSI to disarm the final stage.`;
    this.stageContainer.appendChild(instructions);

    // Pressure display
    const pressureContainer = document.createElement("div");
    pressureContainer.className = "pressure-container mb-6";

    const pressureGauge = document.createElement("div");
    pressureGauge.className =
      "pressure-gauge relative h-8 bg-gray-800 rounded-full overflow-hidden mb-2";

    const pressureFill = document.createElement("div");
    const fillPercentage = Math.min(
      100,
      (this.pressureStage.currentPressure / 100) * 100
    );
    pressureFill.className = `pressure-fill h-full transition-all duration-300 ${this._getPressureColorClass(
      this.pressureStage.currentPressure,
      this.pressureStage.targetPressure
    )}`;
    pressureFill.style.width = `${fillPercentage}%`;

    pressureGauge.appendChild(pressureFill);
    pressureContainer.appendChild(pressureGauge);

    const pressureReadout = document.createElement("div");
    pressureReadout.className =
      "pressure-readout text-center text-2xl font-mono text-white mb-2";
    pressureReadout.textContent = `${this.pressureStage.currentPressure} PSI`;

    const targetReadout = document.createElement("div");
    targetReadout.className =
      "target-readout text-center text-sm text-green-500";
    targetReadout.textContent = `Target: ${this.pressureStage.targetPressure} PSI`;

    pressureContainer.appendChild(pressureReadout);
    pressureContainer.appendChild(targetReadout);
    this.stageContainer.appendChild(pressureContainer);

    // Valve controls
    const valveControlsContainer = document.createElement("div");
    valveControlsContainer.className = "valve-controls grid grid-cols-2 gap-4";

    this.pressureStage.valves.forEach((valve) => {
      const valveButton = document.createElement("button");
      valveButton.className = `valve-button p-3 rounded ${
        valve.active
          ? valve.effect > 0
            ? "bg-red-700 text-white"
            : "bg-blue-700 text-white"
          : "bg-gray-700 text-white hover:bg-gray-600"
      }`;
      valveButton.dataset.id = valve.id;
      valveButton.textContent = `${valve.name} (${valve.effect > 0 ? "+" : ""}${
        valve.effect
      } PSI)`;

      valveButton.addEventListener("click", () =>
        this._handleValveToggle(valve.id)
      );

      valveControlsContainer.appendChild(valveButton);
    });

    this.stageContainer.appendChild(valveControlsContainer);

    // Check pressure button
    const checkButton = document.createElement("button");
    checkButton.className =
      "check-button w-full p-2 mt-6 bg-green-700 hover:bg-green-600 text-white rounded transition";
    checkButton.textContent = "Check Pressure";
    checkButton.addEventListener("click", () => this._handlePressureCheck());
    this.stageContainer.appendChild(checkButton);

    // Create attempts counter
    const attemptCounter = document.createElement("div");
    attemptCounter.className = "text-center text-gray-400 mt-4";
    attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    this.stageContainer.appendChild(attemptCounter);

    this._showMessage("Adjust the valves to reach the exact target pressure.");
  }

  /**
   * Get pressure color class based on how close to target
   * @param {number} current - Current pressure
   * @param {number} target - Target pressure
   * @returns {string} - CSS class for color
   */
  _getPressureColorClass(current, target) {
    const diff = Math.abs(current - target);

    if (diff === 0) return "bg-green-500";
    if (diff <= 5) return "bg-yellow-500";
    if (current > target) return "bg-red-500";
    return "bg-blue-500";
  }

  /**
   * Handle valve toggle
   * @param {number} valveId - ID of valve toggled
   */
  _handleValveToggle(valveId) {
    // Find valve
    const valveIndex = this.pressureStage.valves.findIndex(
      (v) => v.id === valveId
    );
    if (valveIndex === -1) return;

    const valve = this.pressureStage.valves[valveIndex];

    // Toggle valve and update pressure
    valve.active = !valve.active;

    // Recalculate current pressure based on active valves
    this._recalculatePressure();

    // Re-render stage
    this._renderPressureStage();
  }

  /**
   * Recalculate current pressure based on active valves
   */
  _recalculatePressure() {
    // Start at 0 pressure
    this.pressureStage.currentPressure = 0;

    // Add effects of active valves
    this.pressureStage.valves.forEach((valve) => {
      if (valve.active) {
        this.pressureStage.currentPressure += valve.effect;
      }
    });

    // Ensure pressure doesn't go below 0
    this.pressureStage.currentPressure = Math.max(
      0,
      this.pressureStage.currentPressure
    );
  }

  /**
   * Handle pressure check
   */
  _handlePressureCheck() {
    // Check if pressure matches target
    if (
      this.pressureStage.currentPressure === this.pressureStage.targetPressure
    ) {
      this.pressureStage.completed = true;
      this._handleStageComplete();
    } else {
      this.attempts++;

      if (this.attempts >= this.maxAttempts) {
        this._handleFailure(
          "Too many incorrect attempts. Detonation imminent."
        );
      } else {
        const diff =
          this.pressureStage.currentPressure -
          this.pressureStage.targetPressure;
        const message =
          diff > 0
            ? "Pressure too high! Reduce pressure."
            : "Pressure too low! Increase pressure.";

        this._showMessage(
          `${message} ${this.maxAttempts - this.attempts} attempts remaining.`,
          "error"
        );

        // Reset valves
        this.pressureStage.valves.forEach((v) => (v.active = false));
        this.pressureStage.currentPressure = 0;
        this._renderPressureStage();
      }
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Clean up any other timers
    if (this.stageTimers.length > 0) {
      this.stageTimers.forEach((timerId) => clearTimeout(timerId));
      this.stageTimers = [];
    }

    // Clean up audio resources
    this.tickSound = null;
    this.errorSound = null;
    this.successSound = null;
  }
}

export default FinalDetonationPuzzle;
