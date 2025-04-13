// explosiveSequencePuzzle.js - Explosive Sequence Puzzle for the Demolitions role
// Difficulty: 4/5 - Hard difficulty

class ExplosiveSequencePuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Explosive device properties
    this.sequenceLength = 6; // Length of sequence to disarm
    this.currentStep = 0;
    this.maxAttempts = 3;
    this.attempts = 0;

    // Sequence settings
    this.correctSequence = [];
    this.playerSequence = [];
    this.nodeTypes = [
      "power",
      "trigger",
      "timer",
      "signal",
      "detonator",
      "buffer",
    ];
    this.nodeColors = ["red", "blue", "green", "yellow", "purple", "orange"];
    this.nodeStates = {};

    // UI elements
    this.deviceContainer = null;
    this.sequenceDisplay = null;
    this.nodeContainer = null;
    this.messageElement = null;
    this.timerElement = null;

    // Timer properties
    this.timer = null;
    this.timeRemaining = 90; // 90 seconds to complete
    this.pulseTimer = null;
    this.pulseSpeed = 1000; // Start with 1 second per pulse

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 4;
    this._adjustDifficulty();
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI
    this._createUI();

    // Generate sequence
    this._generateSequence();

    // Start timer
    this._startTimer();

    // Display instructions
    this._showMessage(
      "Disarm the explosive by deactivating nodes in the correct sequence."
    );
  }

  /**
   * Create the puzzle UI
   */
  _createUI() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create puzzle container
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "explosive-sequence-puzzle flex flex-col items-center p-4";

    // Create timer display
    const timerContainer = document.createElement("div");
    timerContainer.className =
      "timer-container bg-black p-2 rounded-lg mb-4 w-full max-w-xs border-2 border-red-600";

    this.timerElement = document.createElement("div");
    this.timerElement.className =
      "timer-display text-red-600 text-3xl font-mono text-center";
    this.timerElement.textContent = this._formatTime(this.timeRemaining);

    timerContainer.appendChild(this.timerElement);
    puzzleContainer.appendChild(timerContainer);

    // Create explosive device
    this.deviceContainer = document.createElement("div");
    this.deviceContainer.className =
      "device-container bg-gray-900 p-4 rounded-lg mb-4 border border-gray-700 w-full max-w-xl";

    // Create pulse indicator
    const pulseIndicator = document.createElement("div");
    pulseIndicator.className =
      "pulse-indicator flex items-center justify-center mb-3";

    const pulseLight = document.createElement("div");
    pulseLight.className = "pulse-light w-4 h-4 bg-red-600 rounded-full mr-2";
    pulseIndicator.appendChild(pulseLight);

    const pulseLabel = document.createElement("div");
    pulseLabel.className = "text-white text-sm";
    pulseLabel.textContent = "System pulse active - Sequence required";
    pulseIndicator.appendChild(pulseLabel);

    this.deviceContainer.appendChild(pulseIndicator);

    // Create sequence display
    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className =
      "sequence-display flex justify-center space-x-2 mb-4";

    // Create sequence slots
    for (let i = 0; i < this.sequenceLength; i++) {
      const sequenceSlot = document.createElement("div");
      sequenceSlot.className =
        "sequence-slot w-8 h-8 bg-gray-800 border border-gray-600 rounded-md flex items-center justify-center";
      this.sequenceDisplay.appendChild(sequenceSlot);
    }

    this.deviceContainer.appendChild(this.sequenceDisplay);
    puzzleContainer.appendChild(this.deviceContainer);

    // Create node selection area
    const nodesTitle = document.createElement("div");
    nodesTitle.className = "text-white text-center mb-2";
    nodesTitle.textContent = "Control Nodes:";
    puzzleContainer.appendChild(nodesTitle);

    this.nodeContainer = document.createElement("div");
    this.nodeContainer.className = "node-container grid grid-cols-3 gap-3 mb-4";
    puzzleContainer.appendChild(this.nodeContainer);

    // Create nodes
    this._createNodes();

    // Create attempt counter
    const attemptCounter = document.createElement("div");
    attemptCounter.className = "attempt-counter text-sm text-gray-400 mb-2";
    attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    puzzleContainer.appendChild(attemptCounter);

    // Create message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "message mt-2 p-2 w-full text-center rounded-lg";
    puzzleContainer.appendChild(this.messageElement);

    // Add to main container
    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Create interactive nodes
   */
  _createNodes() {
    // Clear node container
    this.nodeContainer.innerHTML = "";

    // Create a node for each type
    this.nodeTypes.forEach((nodeType, index) => {
      const nodeElement = document.createElement("div");
      nodeElement.className = `node ${nodeType} bg-gray-800 p-3 rounded-lg flex flex-col items-center relative ${
        this.nodeStates[nodeType] ? "node-active" : ""
      }`;
      nodeElement.dataset.type = nodeType;

      // Add color indicator
      const nodeColor = this.nodeColors[index % this.nodeColors.length];
      const colorIndicator = document.createElement("div");
      colorIndicator.className = `node-color w-6 h-6 rounded-full mb-2`;
      colorIndicator.style.backgroundColor = this._getColorValue(nodeColor);
      nodeElement.appendChild(colorIndicator);

      // Add node label
      const nodeLabel = document.createElement("div");
      nodeLabel.className = "node-label text-white text-xs capitalize";
      nodeLabel.textContent = nodeType;
      nodeElement.appendChild(nodeLabel);

      // Add status indicator
      const statusIndicator = document.createElement("div");
      statusIndicator.className = `status-indicator absolute top-1 right-1 w-2 h-2 rounded-full ${
        this.nodeStates[nodeType] ? "bg-green-500" : "bg-red-500"
      }`;
      nodeElement.appendChild(statusIndicator);

      // Add click event
      nodeElement.addEventListener("click", () =>
        this._handleNodeClick(nodeType, nodeElement)
      );

      this.nodeContainer.appendChild(nodeElement);
    });
  }

  /**
   * Generate the correct disarm sequence
   */
  _generateSequence() {
    this.correctSequence = [];
    this.nodeStates = {};

    // Initialize all nodes as inactive
    this.nodeTypes.forEach((type) => {
      this.nodeStates[type] = false;
    });

    // Generate random sequence
    const availableNodes = [...this.nodeTypes];

    for (let i = 0; i < this.sequenceLength; i++) {
      // If we've used all nodes, reset the available nodes
      if (availableNodes.length === 0) {
        availableNodes.push(...this.nodeTypes);
      }

      // Pick a random node
      const index = Math.floor(Math.random() * availableNodes.length);
      const selectedNode = availableNodes[index];

      // Remove from available
      availableNodes.splice(index, 1);

      // Add to sequence
      this.correctSequence.push(selectedNode);
    }

    console.log("Correct sequence:", this.correctSequence);
  }

  /**
   * Start main timer and pulse animation
   */
  _startTimer() {
    // Clear any existing timers
    this._clearTimers();

    // Start main countdown
    this.timer = setInterval(() => {
      this.timeRemaining--;

      // Update timer display
      this._updateTimerDisplay();

      // Check for time expiration
      if (this.timeRemaining <= 0) {
        this._handleFailure("Time's up! The explosive has detonated.");
      }
    }, 1000);

    // Start pulse animation
    this._startPulseAnimation();
  }

  /**
   * Start pulse animation
   */
  _startPulseAnimation() {
    let pulseOn = true;
    const pulseLight = this.containerElement.querySelector(".pulse-light");

    this.pulseTimer = setInterval(() => {
      if (pulseLight) {
        if (pulseOn) {
          pulseLight.classList.remove("bg-red-600");
          pulseLight.classList.add("bg-gray-800");
        } else {
          pulseLight.classList.remove("bg-gray-800");
          pulseLight.classList.add("bg-red-600");
        }
      }

      pulseOn = !pulseOn;

      // As time decreases, pulse faster
      if (this.timeRemaining < 30 && this.pulseSpeed > 300) {
        clearInterval(this.pulseTimer);
        this.pulseSpeed = Math.max(300, this.pulseSpeed - 200);
        this._startPulseAnimation();
      }
    }, this.pulseSpeed / 2);
  }

  /**
   * Clear all timers
   */
  _clearTimers() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
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
   * Handle node click
   * @param {string} nodeType - Type of node that was clicked
   * @param {HTMLElement} nodeElement - The DOM element of the node
   */
  _handleNodeClick(nodeType, nodeElement) {
    if (this.isComplete) return;

    // Toggle node state
    this.nodeStates[nodeType] = !this.nodeStates[nodeType];

    // Update node appearance
    const statusIndicator = nodeElement.querySelector(".status-indicator");
    if (statusIndicator) {
      if (this.nodeStates[nodeType]) {
        statusIndicator.classList.remove("bg-red-500");
        statusIndicator.classList.add("bg-green-500");
        nodeElement.classList.add("node-active");
      } else {
        statusIndicator.classList.remove("bg-green-500");
        statusIndicator.classList.add("bg-red-500");
        nodeElement.classList.remove("node-active");
      }
    }

    // Play activation sound
    this._playActivationSound();

    // Add to player sequence if activated
    if (this.nodeStates[nodeType]) {
      this.playerSequence.push(nodeType);
      this._updateSequenceDisplay();

      // Check if sequence is complete
      if (this.playerSequence.length === this.sequenceLength) {
        this._checkSequence();
      }
    } else {
      // Remove from player sequence if deactivated
      const index = this.playerSequence.lastIndexOf(nodeType);
      if (index !== -1) {
        this.playerSequence.splice(index, 1);
        this._updateSequenceDisplay();
      }
    }
  }

  /**
   * Update sequence display
   */
  _updateSequenceDisplay() {
    const slots = this.sequenceDisplay.querySelectorAll(".sequence-slot");

    // Reset all slots
    slots.forEach((slot, index) => {
      slot.innerHTML = "";
      slot.className =
        "sequence-slot w-8 h-8 bg-gray-800 border border-gray-600 rounded-md flex items-center justify-center";
    });

    // Fill slots with active nodes
    this.playerSequence.forEach((nodeType, index) => {
      if (index < slots.length) {
        const nodeColor =
          this.nodeColors[
            this.nodeTypes.indexOf(nodeType) % this.nodeColors.length
          ];

        slots[index].innerHTML = `
          <div class="w-6 h-6 rounded-full" style="background-color: ${this._getColorValue(
            nodeColor
          )}"></div>
        `;
      }
    });
  }

  /**
   * Check if the sequence is correct
   */
  _checkSequence() {
    this.attempts++;

    // Update attempt counter
    const attemptCounter =
      this.containerElement.querySelector(".attempt-counter");
    if (attemptCounter) {
      attemptCounter.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    }

    // Check if sequence matches
    let correct = true;
    for (let i = 0; i < this.sequenceLength; i++) {
      if (this.playerSequence[i] !== this.correctSequence[i]) {
        correct = false;
        break;
      }
    }

    if (correct) {
      this._handleSuccess();
    } else {
      // Wrong sequence
      this._handleWrongSequence();
    }
  }

  /**
   * Handle wrong sequence
   */
  _handleWrongSequence() {
    // Play error sound
    this._playErrorSound();

    // Show error message
    this._showMessage("Incorrect sequence! System reset required.", "error");

    // Reduce time as penalty
    this.timeRemaining = Math.max(10, this.timeRemaining - 15);

    // Reset sequence and nodes
    this.playerSequence = [];

    // Reset node states
    this.nodeTypes.forEach((type) => {
      this.nodeStates[type] = false;
    });

    // Update UI
    this._updateSequenceDisplay();
    this._createNodes();

    // Check for too many attempts
    if (this.attempts >= this.maxAttempts) {
      this._handleFailure(
        "Too many failed attempts! System lockout initiated."
      );
      return;
    }

    // Give a hint after first failure
    if (this.attempts === 1) {
      this._provideHint();
    }
  }

  /**
   * Provide a hint for the correct sequence
   */
  _provideHint() {
    // Reveal the first two nodes
    const hint = `Hint: The sequence starts with ${this.correctSequence[0]} followed by ${this.correctSequence[1]}.`;

    setTimeout(() => {
      this._showMessage(hint, "info");
    }, 2000);
  }

  /**
   * Handle successful completion
   */
  _handleSuccess() {
    this.isComplete = true;

    // Stop timers
    this._clearTimers();

    // Play success sound
    this._playSuccessSound();

    // Show success message
    this._showMessage("Explosive sequence successfully disarmed!", "success");

    // Update sequence display to show correct sequence
    this._showCorrectSequence();

    // Trigger success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Handle failure
   * @param {string} message - Failure message
   */
  _handleFailure(message) {
    // Stop timers
    this._clearTimers();

    // Play explosion sound
    this._playExplosionSound();

    // Show failure message
    this._showMessage(message, "error");

    // Show correct sequence
    this._showCorrectSequence();

    // Disable all nodes
    const nodes = this.nodeContainer.querySelectorAll(".node");
    nodes.forEach((node) => {
      node.style.pointerEvents = "none";
      node.classList.add("opacity-50");
    });

    // Reduce time as penalty
    if (this.callbacks && this.callbacks.reduceTime) {
      this.callbacks.reduceTime(20);
    }
  }

  /**
   * Show the correct sequence
   */
  _showCorrectSequence() {
    const slots = this.sequenceDisplay.querySelectorAll(".sequence-slot");

    // Fill slots with correct sequence
    this.correctSequence.forEach((nodeType, index) => {
      if (index < slots.length) {
        const nodeColor =
          this.nodeColors[
            this.nodeTypes.indexOf(nodeType) % this.nodeColors.length
          ];

        slots[index].innerHTML = `
          <div class="w-6 h-6 rounded-full" style="background-color: ${this._getColorValue(
            nodeColor
          )}"></div>
        `;

        // Highlight if it was correct
        if (this.playerSequence[index] === nodeType) {
          slots[index].classList.add("border-green-500");
        } else {
          slots[index].classList.add("border-red-500");
        }
      }
    });
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
   * Play activation sound
   */
  _playActivationSound() {
    try {
      const sound = new Audio("../static/sounds/click.mp3");
      sound.volume = 0.2;
      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play activation sound:", e);
    }
  }

  /**
   * Play error sound
   */
  _playErrorSound() {
    try {
      const sound = new Audio("../static/sounds/error.mp3");
      sound.volume = 0.3;
      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play error sound:", e);
    }
  }

  /**
   * Play success sound
   */
  _playSuccessSound() {
    try {
      const sound = new Audio("../static/sounds/success.mp3");
      sound.volume = 0.3;
      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play success sound:", e);
    }
  }

  /**
   * Play explosion sound
   */
  _playExplosionSound() {
    try {
      const sound = new Audio("../static/sounds/explosion.mp3");
      sound.volume = 0.4;
      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play explosion sound:", e);
    }
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
      "message mt-2 p-2 w-full text-center rounded-lg";

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
    if (this.difficulty === 4) {
      // Level 4 (Hard) is the default
      this.sequenceLength = 6;
      this.maxAttempts = 3;
      this.timeRemaining = 90;
    } else if (this.difficulty > 4) {
      // Level 5 (Very Hard)
      this.sequenceLength = 8;
      this.maxAttempts = 2;
      this.timeRemaining = 75;
    }
  }

  /**
   * Check if the solution is valid
   * @returns {boolean} - True if solution is valid
   */
  validateSolution() {
    return this.isComplete;
  }

  /**
   * Get the current solution
   * @returns {Object} - Current sequence
   */
  getSolution() {
    return {
      playerSequence: this.playerSequence,
      correctSequence: this.correctSequence,
      completed: this.isComplete,
    };
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Activate the nodes in the correct sequence to disarm the explosive.";
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
    this.deviceContainer.style.position = "relative";

    // Add to container
    this.deviceContainer.appendChild(successOverlay);

    // Animate in and out
    successOverlay.style.opacity = "0";
    successOverlay.style.transition = "opacity 0.5s";

    setTimeout(() => {
      successOverlay.style.opacity = "1";

      setTimeout(() => {
        successOverlay.style.opacity = "0";
        setTimeout(() => {
          successOverlay.remove();
        }, 500);
      }, 2000);
    }, 100);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop timers
    this._clearTimers();

    // Remove node event listeners
    const nodes = this.nodeContainer
      ? this.nodeContainer.querySelectorAll(".node")
      : [];
    nodes.forEach((node) => {
      const clone = node.cloneNode(true);
      node.parentNode.replaceChild(clone, node);
    });

    // Reset state
    this.playerSequence = [];
    this.correctSequence = [];
    this.nodeStates = {};
  }
}

export default ExplosiveSequencePuzzle;
