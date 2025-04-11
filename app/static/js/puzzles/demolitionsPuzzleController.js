// demolitionsPuzzleController.js - Controls puzzles for the Demolitions role

class DemolitionsPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;

    // Wire puzzle specific properties
    this.wires = [];
    this.cutWires = [];
    this.timer = null;
    this.countdownValue = 30; // Default 30 seconds

    // DOM elements will be created during initialization
    this.wireContainer = null;
    this.countdownElement = null;
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
    header.className = "text-xl font-bold text-red-400 mb-4";
    header.textContent = `Demolitions Mission: ${this._getPuzzleTitle()}`;
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
    gameArea.className = "flex flex-col items-center mb-6 w-full";
    this.containerElement.appendChild(gameArea);

    // Create countdown timer
    this.countdownElement = document.createElement("div");
    this.countdownElement.className = "text-2xl font-bold text-red-500 mb-4";
    this.countdownElement.textContent = `00:${this.countdownValue
      .toString()
      .padStart(2, "0")}`;
    gameArea.appendChild(this.countdownElement);

    // Determine which puzzle to render based on stage/type
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "demo_puzzle_1") {
      this._setupWireCuttingPuzzle(gameArea);
    } else if (puzzleType === "demo_puzzle_2") {
      this._setupTimeBombPuzzle(gameArea);
    } else if (puzzleType === "demo_puzzle_3") {
      this._setupCircuitBoardPuzzle(gameArea);
    } else if (puzzleType === "demo_puzzle_4") {
      this._setupExplosiveSequencePuzzle(gameArea);
    } else if (puzzleType === "demo_puzzle_5") {
      this._setupFinalDetonationPuzzle(gameArea);
    } else {
      // Fallback to wire cutting puzzle
      this._setupWireCuttingPuzzle(gameArea);
    }

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Disarm System";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Stop timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Update UI to show success
    this.messageElement.textContent = "System successfully disarmed!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable wire container
    if (this.wireContainer) {
      this.wireContainer.classList.add("opacity-50", "pointer-events-none");
    }

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "System Disarmed";
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
    if (eventType === "camera_sweep") {
      // For camera sweep, temporarily disable the puzzle
      if (this.wireContainer) {
        this.wireContainer.classList.add("opacity-50", "pointer-events-none");
      }
      this.submitButton.disabled = true;

      // Re-enable after duration
      setTimeout(() => {
        if (this.wireContainer) {
          this.wireContainer.classList.remove(
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
    // Clear timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Clear references
    this.wireContainer = null;
    this.countdownElement = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Private: Setup wire cutting puzzle (Stage 1)
   * @param {HTMLElement} container - Container element
   */
  _setupWireCuttingPuzzle(container) {
    // Use puzzle data if available, otherwise generate random
    if (this.puzzleData.data && this.puzzleData.data.wires) {
      this.wires = this.puzzleData.data.wires;
    } else {
      // Generate random wire configuration
      const colors = ["red", "blue", "green", "yellow", "white"];
      const correctIndex = Math.floor(Math.random() * 5);

      this.wires = colors.map((color, index) => ({
        color,
        id: `wire-${index}`,
        correct: index === correctIndex,
      }));
    }

    // Set countdown based on difficulty
    this.countdownValue = 30 + this.currentStage * 5;
    this.countdownElement.textContent = `00:${this.countdownValue
      .toString()
      .padStart(2, "0")}`;

    // Create wire container
    this.wireContainer = document.createElement("div");
    this.wireContainer.className = "bg-gray-900 rounded-lg p-6 w-full max-w-md";

    // Display the puzzle instructions based on wires
    const clueContainer = document.createElement("div");
    clueContainer.className =
      "mb-4 p-3 bg-gray-800 rounded border border-red-600";

    // Generate wire cutting rules based on colors
    const clue = this._generateWireCuttingClue();
    clueContainer.innerHTML = `
      <div class="text-sm text-gray-300 mb-2">Security System Manual - Section 4.2:</div>
      <div class="text-yellow-400">${clue}</div>
    `;
    this.wireContainer.appendChild(clueContainer);

    // Create wires
    const wiresDisplay = document.createElement("div");
    wiresDisplay.className = "flex flex-col space-y-4";

    this.wires.forEach((wire) => {
      const wireElement = document.createElement("div");
      wireElement.id = wire.id;
      wireElement.className = `wire wire-${wire.color} h-8 rounded-full w-full flex items-center pl-4 pr-4 cursor-pointer transition-all`;
      wireElement.style.backgroundColor = this._getWireColor(wire.color);
      wireElement.innerHTML = `<span class="text-black font-bold text-xs">${wire.color.toUpperCase()} WIRE</span>`;

      // Add click event for cutting
      wireElement.addEventListener("click", () => {
        this._cutWire(wire.id);

        // Apply cut wire style
        wireElement.className = `wire wire-${wire.color} h-8 rounded-full w-full flex items-center pl-4 pr-4 opacity-50`;
        wireElement.style.textDecoration = "line-through";

        // Add cut animation
        const cutMark = document.createElement("div");
        cutMark.className =
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6";
        cutMark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>`;

        wireElement.style.position = "relative";
        wireElement.appendChild(cutMark);
      });

      wiresDisplay.appendChild(wireElement);
    });

    this.wireContainer.appendChild(wiresDisplay);
    container.appendChild(this.wireContainer);

    // Start countdown timer
    this._startCountdown();
  }

  /**
   * Cut a wire
   * @param {string} wireId - Wire ID
   */
  _cutWire(wireId) {
    // Check if already cut
    if (this.cutWires.includes(wireId)) {
      return;
    }

    // Add to cut wires
    this.cutWires.push(wireId);

    // Find the wire data
    const wire = this.wires.find((w) => w.id === wireId);

    // Check if correct wire was cut
    if (wire.correct) {
      this.showSuccess();
    } else {
      // Wrong wire - show failure message
      this.messageElement.textContent = "Wrong wire! System armed.";
      this.messageElement.className = "mb-4 text-red-400 text-center";

      // Disable further interaction
      this.wireContainer.classList.add("opacity-75", "pointer-events-none");
      this.submitButton.disabled = true;

      // Stop countdown
      if (this.timer) {
        clearInterval(this.timer);
      }
    }
  }

  /**
   * Start countdown timer
   */
  _startCountdown() {
    this.timer = setInterval(() => {
      this.countdownValue--;

      // Update display
      this.countdownElement.textContent = `00:${this.countdownValue
        .toString()
        .padStart(2, "0")}`;

      // Add urgency when time is low
      if (this.countdownValue <= 10) {
        this.countdownElement.classList.add("animate-pulse");
      }

      // Check if time is up
      if (this.countdownValue <= 0) {
        clearInterval(this.timer);

        // Show failure message
        this.messageElement.textContent = "Time's up! System armed.";
        this.messageElement.className = "mb-4 text-red-400 text-center";

        // Disable further interaction
        this.wireContainer.classList.add("opacity-75", "pointer-events-none");
        this.submitButton.disabled = true;
      }
    }, 1000);
  }

  /**
   * Generate wire cutting clue based on available wires
   * @returns {string} - Wire cutting instructions
   */
  _generateWireCuttingClue() {
    // Find the correct wire
    const correctWire = this.wires.find((wire) => wire.correct);

    // Generate a clue that points to this wire, but makes the player think
    const clues = [
      `If there is a ${this._getOtherColor(correctWire.color)} wire, cut the ${
        correctWire.color
      } wire.`,
      `The ${correctWire.color} wire must be cut if there are exactly ${this.wires.length} wires.`,
      `If the ${this._getOtherColor(correctWire.color)} wire is above the ${
        correctWire.color
      } wire, cut the ${correctWire.color} wire.`,
      `Cut the ${correctWire.color} wire if no other wires have been cut.`,
      `If there are more than ${this.wires.length - 2} wires, the ${
        correctWire.color
      } wire should be cut.`,
    ];

    // Choose a random clue
    return clues[Math.floor(Math.random() * clues.length)];
  }

  /**
   * Get a different wire color than the one provided
   * @param {string} color - Color to avoid
   * @returns {string} - Different color
   */
  _getOtherColor(color) {
    const otherWires = this.wires.filter((wire) => wire.color !== color);
    if (otherWires.length === 0) return color;
    return otherWires[Math.floor(Math.random() * otherWires.length)].color;
  }

  /**
   * Get CSS color for a wire
   * @param {string} color - Wire color name
   * @returns {string} - CSS color
   */
  _getWireColor(color) {
    const colorMap = {
      red: "#f87171",
      blue: "#60a5fa",
      green: "#4ade80",
      yellow: "#fbbf24",
      white: "#e5e7eb",
    };

    return colorMap[color] || "#6b7280";
  }

  /**
   * Private: Handle submit button click
   */
  _handleSubmit() {
    // Check if any wires have been cut
    if (this.cutWires.length === 0) {
      this.messageElement.textContent =
        "You must cut a wire to disarm the system!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Disarming...";

    this.submitSolution(this.cutWires)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent = "Disarm failed. Wrong wire cut!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Disarm System";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent = "Error disarming system. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Disarm System";
      });
  }

  /**
   * Private: Get puzzle title based on type/stage
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "demo_puzzle_1":
        return "Security Bypass";
      case "demo_puzzle_2":
        return "Time Bomb Disarm";
      case "demo_puzzle_3":
        return "Circuit Board Repair";
      case "demo_puzzle_4":
        return "Explosive Sequence";
      case "demo_puzzle_5":
        return "Final Detonation";
      default:
        return "Unknown System";
    }
  }

  /**
   * Private: Get puzzle instructions based on type/stage
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "demo_puzzle_1":
        return "Bypass the security system by cutting the correct wire. Use the manual to identify which wire to cut.";
      case "demo_puzzle_2":
        return "Disarm the time bomb by following the correct sequence of steps before time runs out.";
      case "demo_puzzle_3":
        return "Repair the damaged circuit board by connecting the correct components in the right order.";
      case "demo_puzzle_4":
        return "Create an explosive breach by setting the correct detonation sequence.";
      case "demo_puzzle_5":
        return "Configure the final explosive charges to create an escape route during the heist finale.";
      default:
        return "Disarm this system to proceed.";
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
        return "Warning: Security patrol detected. Hold your position!";
      case "camera_sweep":
        return "Alert: Camera sweep in progress. Hands off the wires!";
      case "system_check":
        return "Caution: System performing diagnostic check.";
      default:
        return "Security alert detected!";
    }
  }

  /**
   * Private: Setup Time Bomb puzzle (Stage 2)
   * Would be implemented for stage 2
   */
  _setupTimeBombPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-red-400";
    message.textContent =
      "Time bomb disarm puzzle will be available in Stage 2";
    container.appendChild(message);
  }

  /**
   * Private: Setup Circuit Board puzzle (Stage 3)
   * Would be implemented for stage 3
   */
  _setupCircuitBoardPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-red-400";
    message.textContent =
      "Circuit board repair puzzle will be available in Stage 3";
    container.appendChild(message);
  }

  /**
   * Private: Setup Explosive Sequence puzzle (Stage 4)
   * Would be implemented for stage 4
   */
  _setupExplosiveSequencePuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-red-400";
    message.textContent =
      "Explosive sequence puzzle will be available in Stage 4";
    container.appendChild(message);
  }

  /**
   * Private: Setup Final Detonation puzzle (Stage 5)
   * Would be implemented for stage 5
   */
  _setupFinalDetonationPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-red-400";
    message.textContent =
      "Final detonation puzzle will be available in Stage 5";
    container.appendChild(message);
  }
}

export default DemolitionsPuzzleController;
