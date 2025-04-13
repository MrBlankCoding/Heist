// wireCuttingPuzzle.js - Security Bypass Puzzle for the Demolitions role
// Difficulty: 1/5 - Easy puzzle to start with

class WireCuttingPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Wire properties
    this.wires = [];
    this.numWires = 5; // Number of wires for easiest difficulty
    this.wireColors = ["red", "blue", "green", "yellow", "white", "black"];
    this.correctWireIndexes = []; // Indexes of wires that need to be cut

    // UI elements
    this.wireContainer = null;
    this.messageElement = null;
    this.instructionsElement = null;
    this.wireElements = [];

    // Cut tracking
    this.cutWires = [];
    this.requiredCuts = 2; // Need to cut 2 specific wires

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 1;

    // Hints and clue text
    this.hintText = "";
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Generate wires with random colors
    this._generateWires();

    // Generate security clue for which wires to cut
    this._generateSecurityClue();

    // Display instructions
    this._showMessage("Cut the correct wires to bypass the security system.");
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
      "wire-cutting-puzzle flex flex-col items-center p-4";

    // Create instructions
    this.instructionsElement = document.createElement("div");
    this.instructionsElement.className =
      "instructions bg-gray-800 p-3 mb-4 rounded-lg w-full text-center";
    puzzleContainer.appendChild(this.instructionsElement);

    // Create wire container
    this.wireContainer = document.createElement("div");
    this.wireContainer.className =
      "wire-container flex flex-col space-y-6 p-6 bg-gray-900 rounded-lg";
    puzzleContainer.appendChild(this.wireContainer);

    // Create message element
    this.messageElement = document.createElement("div");
    this.messageElement.className = "message mt-4 p-2 w-full text-center";
    puzzleContainer.appendChild(this.messageElement);

    // Add to main container
    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Generate wires with random colors
   */
  _generateWires() {
    this.wires = [];
    this.cutWires = [];
    this.wireElements = [];

    // Clear wire container
    this.wireContainer.innerHTML = "";

    // Generate wires
    for (let i = 0; i < this.numWires; i++) {
      // Random color from available colors
      const colorIndex = Math.floor(Math.random() * this.wireColors.length);
      const color = this.wireColors[colorIndex];

      const wire = {
        id: i,
        color: color,
        cut: false,
      };

      this.wires.push(wire);
      this.cutWires.push(false);

      // Create wire element
      const wireElement = document.createElement("div");
      wireElement.className = `wire flex items-center mb-2 relative`;
      wireElement.innerHTML = `
        <div class="wire-end bg-gray-600 rounded-full h-8 w-8 flex items-center justify-center text-xs">A${
          i + 1
        }</div>
        <div class="wire-line ${color}-wire h-3 flex-grow" data-wire-id="${i}"></div>
        <div class="wire-end bg-gray-600 rounded-full h-8 w-8 flex items-center justify-center text-xs">B${
          i + 1
        }</div>
      `;

      // Add CSS for each wire color
      const wireStyle = document.createElement("style");
      wireStyle.textContent = `
        .${color}-wire {
          background-color: ${this._getWireColor(color)};
        }
        .${color}-wire.cut {
          background: repeating-linear-gradient(
            90deg,
            ${this._getWireColor(color)},
            ${this._getWireColor(color)} 6px,
            transparent 6px,
            transparent 12px
          );
        }
      `;
      document.head.appendChild(wireStyle);

      // Add click event
      const wireLine = wireElement.querySelector(".wire-line");
      wireLine.addEventListener("click", () => this._handleWireClick(i));

      this.wireContainer.appendChild(wireElement);
      this.wireElements.push(wireLine);
    }

    // Determine which wires need to be cut
    this._determineCorrectWires();
  }

  /**
   * Determine which wires need to be cut based on a logical rule
   */
  _determineCorrectWires() {
    this.correctWireIndexes = [];

    // For difficulty 1, use a simple rule
    // Rule: Cut the first wire with a specific color AND another wire based on position

    // Find first occurrence of a specific color (let's say red)
    const targetColor = this.wireColors[Math.floor(Math.random() * 3)]; // One of the first 3 colors
    const colorWireIndex = this.wires.findIndex(
      (wire) => wire.color === targetColor
    );

    if (colorWireIndex !== -1) {
      this.correctWireIndexes.push(colorWireIndex);
    } else {
      // Fallback if target color isn't present
      this.correctWireIndexes.push(
        Math.floor(Math.random() * this.wires.length)
      );
    }

    // Add a second wire to cut (not the same as the first)
    let secondWireIndex;
    do {
      secondWireIndex = Math.floor(Math.random() * this.wires.length);
    } while (secondWireIndex === this.correctWireIndexes[0]);

    this.correctWireIndexes.push(secondWireIndex);

    console.log("Correct wires:", this.correctWireIndexes);
  }

  /**
   * Generate security clue for which wires to cut
   */
  _generateSecurityClue() {
    if (this.correctWireIndexes.length < 2) {
      return;
    }

    const wire1 = this.wires[this.correctWireIndexes[0]];
    const wire2 = this.wires[this.correctWireIndexes[1]];

    // Generate clue based on colors and positions
    this.hintText = `Security bypass protocol: Cut the ${wire1.color} wire `;

    // Add second wire hint based on position or color
    if (Math.random() > 0.5) {
      this.hintText += `and wire connected to terminal B${wire2.id + 1}.`;
    } else {
      this.hintText += `and the ${wire2.color} wire.`;
    }

    // Display the clue
    this.instructionsElement.textContent = this.hintText;
  }

  /**
   * Handle wire click
   * @param {number} wireIndex - Index of the clicked wire
   */
  _handleWireClick(wireIndex) {
    if (this.isComplete) return;

    // If wire is already cut, do nothing
    if (this.cutWires[wireIndex]) return;

    // Cut the wire
    this.cutWires[wireIndex] = true;

    // Update UI
    this.wireElements[wireIndex].classList.add("cut");

    // Play wire cutting sound
    this._playWireCutSound();

    // Check if correct or wrong wire
    if (this.correctWireIndexes.includes(wireIndex)) {
      this._showMessage(`Wire ${wireIndex + 1} cut successfully.`, "success");

      // Check if all required wires are cut
      const allCorrectWiresCut = this.correctWireIndexes.every(
        (index) => this.cutWires[index]
      );

      if (allCorrectWiresCut) {
        this._handleSuccess();
      }
    } else {
      // Wrong wire cut!
      this._showMessage("Wrong wire cut! Security system triggered.", "error");

      // Reduce time as penalty
      if (this.callbacks && this.callbacks.reduceTime) {
        this.callbacks.reduceTime(10);
      }
    }

    // Check for failure condition - too many wrong cuts
    const totalCuts = this.cutWires.filter((cut) => cut).length;
    const wrongCuts =
      totalCuts -
      this.correctWireIndexes.filter((index) => this.cutWires[index]).length;

    if (wrongCuts >= 2) {
      this._handleFailure();
    }
  }

  /**
   * Handle successful completion
   */
  _handleSuccess() {
    this.isComplete = true;
    this._showMessage("Security bypass successful!", "success");

    // Trigger success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Handle failure
   */
  _handleFailure() {
    this._showMessage(
      "Too many incorrect wires cut. Security system locked down!",
      "error"
    );

    // Disable all wires
    this.wireElements.forEach((wireElement) => {
      wireElement.style.pointerEvents = "none";
      wireElement.style.opacity = 0.5;
    });

    // Reduce time as severe penalty
    if (this.callbacks && this.callbacks.reduceTime) {
      this.callbacks.reduceTime(20);
    }
  }

  /**
   * Get wire color value
   * @param {string} colorName - Name of the color
   * @returns {string} - CSS color value
   */
  _getWireColor(colorName) {
    switch (colorName) {
      case "red":
        return "rgb(239, 68, 68)";
      case "blue":
        return "rgb(59, 130, 246)";
      case "green":
        return "rgb(34, 197, 94)";
      case "yellow":
        return "rgb(234, 179, 8)";
      case "white":
        return "rgb(229, 231, 235)";
      case "black":
        return "rgb(23, 23, 23)";
      default:
        return "rgb(107, 114, 128)";
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
    this.messageElement.className = "message mt-4 p-2 w-full text-center";

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
   * Play wire cutting sound
   */
  _playWireCutSound() {
    try {
      const cutSound = new Audio("../static/sounds/wire-cut.mp3");
      cutSound.volume = 0.3;
      cutSound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play wire cut sound:", e);
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
   * @returns {Array} - Array of cut wires
   */
  getSolution() {
    return this.cutWires;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Cut the correct wires to bypass the security system.";
  }

  /**
   * Show success animation
   */
  showSuccess() {
    // Flash all wires green to indicate success
    this.wireElements.forEach((wireElement) => {
      wireElement.style.transition = "background-color 0.5s";
      wireElement.style.backgroundColor = "rgb(34, 197, 94)";

      setTimeout(() => {
        wireElement.style.backgroundColor = "";
      }, 2000);
    });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Remove event listeners
    this.wireElements.forEach((wireElement) => {
      const clone = wireElement.cloneNode(true);
      wireElement.parentNode.replaceChild(clone, wireElement);
    });

    // Clear arrays
    this.wireElements = [];
    this.wires = [];
    this.cutWires = [];
    this.correctWireIndexes = [];
  }
}

export default WireCuttingPuzzle;
