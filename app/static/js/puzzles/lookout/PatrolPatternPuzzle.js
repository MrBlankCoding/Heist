// PatrolPatternPuzzle.js - Patrol Pattern Analysis Puzzle for the Lookout role
// Difficulty: 2/5 - Medium difficulty puzzle

class PatrolPatternPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Grid properties
    this.gridSize = 7; // 7x7 grid
    this.grid = [];

    // Guard patrol properties
    this.guards = [];
    this.numGuards = 3; // 3 guards for medium difficulty
    this.patrolSpeed = 900; // ms per move
    this.patrolTimer = null;

    // Player properties
    this.playerPosition = { x: 0, y: 3 };
    this.treasurePosition = { x: 6, y: 3 }; // The objective
    this.selectedPosition = null; // For placing prediction markers

    // Prediction markers
    this.markers = [];
    this.maxMarkers = 5; // Player can place 5 prediction markers

    // Round properties
    this.currentRound = 1;
    this.totalRounds = 3; // Player needs to predict 3 rounds correctly
    this.roundsWon = 0;

    // UI elements
    this.gridElement = null;
    this.messageElement = null;
    this.roundInfoElement = null;
    this.markerCountElement = null;

    // Mode tracking
    this.isObservationMode = true; // Start with observation mode
    this.isPredictionMode = false;
    this.isVerificationMode = false;

    // Movement history for each guard
    this.guardMovementHistory = [];
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Initialize grid
    this._initializeGrid();

    // Place guards
    this._placeGuards();

    // Initialize guard movement history
    this._initializeGuardHistory();

    // Render initial state
    this._renderGrid();

    // Display instructions
    this._showMessage("Watch the guard patrol patterns carefully!");

    // Start guard patrol animations
    this._startPatrol();
  }

  /**
   * Create the UI elements for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "patrol-pattern-puzzle flex flex-col items-center justify-center h-full";

    // Header with round info and marker count
    const header = document.createElement("div");
    header.className = "mb-4 w-full flex justify-between items-center";

    this.roundInfoElement = document.createElement("div");
    this.roundInfoElement.className = "text-white font-medium";
    this.roundInfoElement.textContent = `Round: ${this.currentRound}/${this.totalRounds} | Correct: ${this.roundsWon}`;
    header.appendChild(this.roundInfoElement);

    this.markerCountElement = document.createElement("div");
    this.markerCountElement.className = "text-white text-sm";
    this.markerCountElement.textContent = `Prediction Markers: ${
      this.maxMarkers - this.markers.length
    }/${this.maxMarkers}`;
    header.appendChild(this.markerCountElement);

    puzzleContainer.appendChild(header);

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-center text-gray-300";
    instructions.innerHTML = `
      <p class="mb-2">Study the patrol patterns, then predict where the guards will move.</p>
      <p class="text-sm">
        <span class="bg-blue-500 text-white px-2 py-1 rounded">You</span>
        <span class="ml-2 bg-red-500 text-white px-2 py-1 rounded">Guard</span>
        <span class="ml-2 bg-yellow-500 text-white px-2 py-1 rounded">Marker</span>
        <span class="ml-2 bg-green-500 text-white px-2 py-1 rounded">Treasure</span>
      </p>
    `;
    puzzleContainer.appendChild(instructions);

    // Mode indicator
    this.modeElement = document.createElement("div");
    this.modeElement.className =
      "mb-2 text-center py-1 px-3 rounded bg-gray-700 text-white";
    this.modeElement.textContent = "Observation Mode: Watch Guards";
    puzzleContainer.appendChild(this.modeElement);

    // Grid container
    this.gridElement = document.createElement("div");
    this.gridElement.className = `grid grid-cols-${this.gridSize} gap-1 w-96 h-96`;
    puzzleContainer.appendChild(this.gridElement);

    // Message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mt-4 text-center h-8 text-white font-medium";
    puzzleContainer.appendChild(this.messageElement);

    // Action buttons
    const actionContainer = document.createElement("div");
    actionContainer.className = "mt-4 flex space-x-4";

    this.observeButton = document.createElement("button");
    this.observeButton.className =
      "px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50";
    this.observeButton.textContent = "Continue Observing";
    this.observeButton.disabled = true; // Disabled at start
    this.observeButton.addEventListener("click", () =>
      this._continueObserving()
    );
    actionContainer.appendChild(this.observeButton);

    this.predictButton = document.createElement("button");
    this.predictButton.className =
      "px-4 py-2 bg-yellow-600 text-white rounded disabled:opacity-50";
    this.predictButton.textContent = "Enter Prediction Mode";
    this.predictButton.addEventListener("click", () =>
      this._enterPredictionMode()
    );
    actionContainer.appendChild(this.predictButton);

    this.verifyButton = document.createElement("button");
    this.verifyButton.className =
      "px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50";
    this.verifyButton.textContent = "Verify Predictions";
    this.verifyButton.disabled = true; // Disabled until predictions are made
    this.verifyButton.addEventListener("click", () =>
      this._verifyPredictions()
    );
    actionContainer.appendChild(this.verifyButton);

    puzzleContainer.appendChild(actionContainer);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Initialize the grid with empty cells
   */
  _initializeGrid() {
    this.grid = [];

    for (let y = 0; y < this.gridSize; y++) {
      const row = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({
          x,
          y,
          type: "empty",
        });
      }
      this.grid.push(row);
    }

    // Set player and treasure positions
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "player";
    this.grid[this.treasurePosition.y][this.treasurePosition.x].type =
      "treasure";
  }

  /**
   * Place guards on the grid
   */
  _placeGuards() {
    this.guards = [];

    // Clear existing guards
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].type === "guard") {
          this.grid[y][x].type = "empty";
        }
      }
    }

    // Place new guards
    for (let i = 0; i < this.numGuards; i++) {
      let x, y;

      // Make sure guards don't overlap with player, treasure, or other guards
      do {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
      } while (
        (x === this.playerPosition.x && y === this.playerPosition.y) ||
        (x === this.treasurePosition.x && y === this.treasurePosition.y) ||
        this.grid[y][x].type === "guard"
      );

      // Create a new guard with initial position and patrol pattern
      const guard = {
        id: i,
        x,
        y,
        // Each guard gets a specific patrol pattern
        patternType: this._getGuardPattern(i),
        patternStep: 0,
        patternLength: 0, // Will be set based on pattern type
        color: this._getGuardColor(i), // Give each guard a different color
      };

      // Generate pattern sequence based on pattern type
      guard.pattern = this._generatePatternSequence(guard.patternType);
      guard.patternLength = guard.pattern.length;

      this.grid[y][x].type = "guard";
      this.grid[y][x].guardId = i;
      this.guards.push(guard);
    }
  }

  /**
   * Generate a specific patrol pattern sequence based on pattern type
   * @param {string} patternType - Type of pattern to generate
   * @returns {Array} - Array of movement instructions
   */
  _generatePatternSequence(patternType) {
    switch (patternType) {
      case "square":
        // Patrol in a square pattern
        return [
          { dx: 1, dy: 0 }, // right
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: 1 }, // down
          { dx: 0, dy: 1 }, // down
          { dx: -1, dy: 0 }, // left
          { dx: -1, dy: 0 }, // left
          { dx: 0, dy: -1 }, // up
          { dx: 0, dy: -1 }, // up
        ];

      case "zigzag":
        // Patrol in a zigzag pattern
        return [
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: 1 }, // down
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: -1 }, // up
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: 1 }, // down
          { dx: -3, dy: 0 }, // left (back to start)
        ];

      case "diagonal":
        // Patrol in a diagonal pattern
        return [
          { dx: 1, dy: 1 }, // down-right
          { dx: 1, dy: 1 }, // down-right
          { dx: -1, dy: 1 }, // down-left
          { dx: -1, dy: 1 }, // down-left
          { dx: -1, dy: -1 }, // up-left
          { dx: -1, dy: -1 }, // up-left
          { dx: 1, dy: -1 }, // up-right
          { dx: 1, dy: -1 }, // up-right
        ];

      case "random":
      default:
        // A more random pattern but still predictable
        const pattern = [];
        const patternLength = 6 + Math.floor(Math.random() * 4); // 6-9 steps

        for (let i = 0; i < patternLength; i++) {
          // Choose random direction
          const directions = [
            { dx: 1, dy: 0 }, // right
            { dx: 0, dy: 1 }, // down
            { dx: -1, dy: 0 }, // left
            { dx: 0, dy: -1 }, // up
          ];

          pattern.push(
            directions[Math.floor(Math.random() * directions.length)]
          );
        }

        return pattern;
    }
  }

  /**
   * Get a pattern type for a guard based on guard ID
   * @param {number} guardId - Guard identifier
   * @returns {string} - Pattern type
   */
  _getGuardPattern(guardId) {
    const patterns = ["square", "zigzag", "diagonal", "random"];
    return patterns[guardId % patterns.length];
  }

  /**
   * Get a color for a guard based on guard ID
   * @param {number} guardId - Guard identifier
   * @returns {string} - CSS color class
   */
  _getGuardColor(guardId) {
    const colors = ["red", "orange", "purple"];
    return colors[guardId % colors.length];
  }

  /**
   * Initialize guard movement history tracking
   */
  _initializeGuardHistory() {
    this.guardMovementHistory = this.guards.map((guard) => []);
  }

  /**
   * Start the guard patrol animation
   */
  _startPatrol() {
    this._stopPatrol(); // Clear any existing timers

    this.patrolTimer = setInterval(() => {
      this._moveGuards();
      this._renderGrid();
    }, this.patrolSpeed);
  }

  /**
   * Stop the guard patrol animation
   */
  _stopPatrol() {
    if (this.patrolTimer) {
      clearInterval(this.patrolTimer);
      this.patrolTimer = null;
    }
  }

  /**
   * Move all guards based on their patrol patterns
   */
  _moveGuards() {
    this.guards.forEach((guard, index) => {
      // Get the next movement from the pattern
      const move = guard.pattern[guard.patternStep];

      // Clear guard from current position
      this.grid[guard.y][guard.x].type = "empty";
      this.grid[guard.y][guard.x].guardId = undefined;

      // Calculate new position
      let newX = guard.x + move.dx;
      let newY = guard.y + move.dy;

      // Ensure guard stays within grid boundaries
      if (newX < 0) newX = 0;
      if (newX >= this.gridSize) newX = this.gridSize - 1;
      if (newY < 0) newY = 0;
      if (newY >= this.gridSize) newY = this.gridSize - 1;

      // Check for collisions with other guards, player, or treasure
      if (
        this.grid[newY][newX].type === "guard" ||
        this.grid[newY][newX].type === "player" ||
        this.grid[newY][newX].type === "treasure"
      ) {
        // Don't move if there's a collision
        newX = guard.x;
        newY = guard.y;
      }

      // Update guard position
      guard.x = newX;
      guard.y = newY;

      // Mark cell as containing a guard
      this.grid[guard.y][guard.x].type = "guard";
      this.grid[guard.y][guard.x].guardId = guard.id;

      // Add position to history for this guard
      if (this.isObservationMode) {
        this.guardMovementHistory[index].push({ x: guard.x, y: guard.y });
      }

      // Increment pattern step
      guard.patternStep = (guard.patternStep + 1) % guard.patternLength;
    });
  }

  /**
   * Enter prediction mode
   */
  _enterPredictionMode() {
    this.isObservationMode = false;
    this.isPredictionMode = true;
    this.isVerificationMode = false;

    // Stop guard patrol
    this._stopPatrol();

    // Update UI
    this.modeElement.textContent = "Prediction Mode: Place Markers";
    this.modeElement.classList.remove("bg-gray-700");
    this.modeElement.classList.add("bg-yellow-700");

    // Update buttons
    this.observeButton.disabled = false;
    this.predictButton.disabled = true;
    this.verifyButton.disabled = this.markers.length === 0;

    // Clear existing markers
    this.markers = [];

    // Update grid to show where player can place markers
    this._renderGrid();

    this._showMessage(
      "Click on the grid to place prediction markers where guards will move."
    );
  }

  /**
   * Continue observing mode
   */
  _continueObserving() {
    this.isObservationMode = true;
    this.isPredictionMode = false;
    this.isVerificationMode = false;

    // Start guard patrol
    this._startPatrol();

    // Update UI
    this.modeElement.textContent = "Observation Mode: Watch Guards";
    this.modeElement.classList.remove("bg-yellow-700", "bg-green-700");
    this.modeElement.classList.add("bg-gray-700");

    // Update buttons
    this.observeButton.disabled = true;
    this.predictButton.disabled = false;
    this.verifyButton.disabled = true;

    // Clear markers
    this.markers = [];

    this._showMessage("Watch the guard patrol patterns carefully!");
  }

  /**
   * Verify predictions
   */
  _verifyPredictions() {
    this.isObservationMode = false;
    this.isPredictionMode = false;
    this.isVerificationMode = true;

    // Update UI
    this.modeElement.textContent = "Verification Mode: Checking Predictions";
    this.modeElement.classList.remove("bg-yellow-700");
    this.modeElement.classList.add("bg-green-700");

    // Update buttons
    this.observeButton.disabled = true;
    this.predictButton.disabled = true;
    this.verifyButton.disabled = true;

    // Save current guard positions for reverting after verification
    const guardPositions = this.guards.map((guard) => ({
      x: guard.x,
      y: guard.y,
    }));

    // Run one cycle of guard movements to see if predictions are correct
    this._moveGuards();
    this._renderGrid();

    // Check if predictions match guard positions
    let correctPredictions = 0;
    let totalGuards = this.guards.length;

    this.guards.forEach((guard) => {
      // Check if there's a marker at this guard's position
      const markerAtPosition = this.markers.some(
        (marker) => marker.x === guard.x && marker.y === guard.y
      );

      if (markerAtPosition) {
        correctPredictions++;
      }
    });

    // Calculate success percentage
    const successPercentage = Math.floor(
      (correctPredictions / totalGuards) * 100
    );

    // Determine if round is successful (at least 2/3 of guards predicted correctly)
    const isRoundSuccessful =
      correctPredictions >= Math.ceil(totalGuards * 0.66);

    if (isRoundSuccessful) {
      this.roundsWon++;
      this._showMessage(
        `Good prediction! ${correctPredictions}/${totalGuards} guards predicted correctly.`,
        "success"
      );
    } else {
      this._showMessage(
        `Prediction failed. Only ${correctPredictions}/${totalGuards} guards predicted correctly.`,
        "error"
      );
    }

    // Update round info
    this._updateRoundInfo();

    // Check if puzzle is complete
    if (this.roundsWon >= this.totalRounds) {
      this._handleSuccess();
      return;
    }

    // Otherwise, set up for the next round after a delay
    setTimeout(() => {
      // Restore guard positions
      this.guards.forEach((guard, index) => {
        // Clear old position
        this.grid[guard.y][guard.x].type = "empty";
        this.grid[guard.y][guard.x].guardId = undefined;

        // Restore position
        guard.x = guardPositions[index].x;
        guard.y = guardPositions[index].y;

        // Update grid
        this.grid[guard.y][guard.x].type = "guard";
        this.grid[guard.y][guard.x].guardId = guard.id;
      });

      // Clear markers
      this.markers = [];

      // Update UI
      this._renderGrid();

      // If next round, increase difficulty
      if (isRoundSuccessful) {
        this.currentRound++;

        // Increase difficulty for later rounds
        if (this.currentRound > 1) {
          // Add one more guard for round 2+
          if (this.numGuards < 5) {
            this.numGuards++;
            this._placeGuards();
            this._initializeGuardHistory();
          }

          // Speed up patrols
          this.patrolSpeed = Math.max(500, this.patrolSpeed - 100);
        }
      }

      // Back to observation mode
      this._continueObserving();
    }, 3000);
  }

  /**
   * Update round information display
   */
  _updateRoundInfo() {
    if (this.roundInfoElement) {
      this.roundInfoElement.textContent = `Round: ${this.currentRound}/${this.totalRounds} | Correct: ${this.roundsWon}`;
    }
  }

  /**
   * Render the grid on the UI
   */
  _renderGrid() {
    if (!this.gridElement) return;

    this.gridElement.innerHTML = "";

    // Update marker count
    if (this.markerCountElement) {
      this.markerCountElement.textContent = `Prediction Markers: ${
        this.maxMarkers - this.markers.length
      }/${this.maxMarkers}`;
    }

    // Create cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const cellElement = document.createElement("div");

        // Basic cell styling
        cellElement.className =
          "flex items-center justify-center w-full h-full rounded cursor-pointer";

        // Check if there's a marker at this position
        const markerAtPosition = this.markers.some(
          (marker) => marker.x === x && marker.y === y
        );

        // Set cell color based on type
        if (cell.type === "player") {
          cellElement.classList.add("bg-blue-500");
          cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">👤</span>`;
        } else if (cell.type === "guard") {
          const guard = this.guards.find((g) => g.id === cell.guardId);
          const colorClass = guard ? `bg-${guard.color}-500` : "bg-red-500";
          cellElement.classList.add(colorClass);
          cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center text-white font-bold">${
            guard ? guard.id + 1 : "G"
          }</span>`;
        } else if (cell.type === "treasure") {
          cellElement.classList.add("bg-green-500");
          cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">💰</span>`;
        } else {
          cellElement.classList.add("bg-gray-700");

          // In prediction mode, highlight empty cells that can have markers
          if (this.isPredictionMode && !markerAtPosition) {
            cellElement.classList.add("hover:bg-gray-600");
          }
        }

        // Show any prediction markers
        if (markerAtPosition) {
          cellElement.classList.add("bg-yellow-500");
          cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">📍</span>`;
        }

        // Add data attributes for position and click handling
        cellElement.dataset.x = x;
        cellElement.dataset.y = y;

        // Add click handler for prediction mode
        if (this.isPredictionMode) {
          cellElement.addEventListener("click", () =>
            this._handleCellClick(x, y)
          );
        }

        this.gridElement.appendChild(cellElement);
      }
    }
  }

  /**
   * Handle cell clicks for marker placement
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _handleCellClick(x, y) {
    // Only respond to clicks in prediction mode
    if (!this.isPredictionMode) return;

    // Check if this cell already has a marker
    const markerIndex = this.markers.findIndex((m) => m.x === x && m.y === y);

    if (markerIndex >= 0) {
      // Remove marker if it exists
      this.markers.splice(markerIndex, 1);
    } else {
      // Check if we've reached the max number of markers
      if (this.markers.length >= this.maxMarkers) {
        this._showMessage(
          `You can only place ${this.maxMarkers} prediction markers.`,
          "error"
        );
        return;
      }

      // Don't allow placing markers on player, treasure, or guards
      if (this.grid[y][x].type !== "empty") {
        this._showMessage(
          "You can only place markers on empty cells.",
          "error"
        );
        return;
      }

      // Add new marker
      this.markers.push({ x, y });
    }

    // Enable verify button if we have at least one marker
    this.verifyButton.disabled = this.markers.length === 0;

    // Update the grid
    this._renderGrid();
  }

  /**
   * Handle successful puzzle completion
   */
  _handleSuccess() {
    this.isComplete = true;
    this._stopPatrol();

    this._showMessage(
      "Puzzle completed! You've mastered pattern recognition.",
      "success"
    );

    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Show a message to the player
   * @param {string} message - Message to display
   * @param {string} type - Message type (info, success, error, warning)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    // Reset classes
    this.messageElement.className = "mt-4 text-center h-8 font-medium";

    // Apply type-specific styling
    switch (type) {
      case "success":
        this.messageElement.classList.add("text-green-400");
        break;
      case "error":
        this.messageElement.classList.add("text-red-400");
        break;
      case "warning":
        this.messageElement.classList.add("text-yellow-400");
        break;
      default:
        this.messageElement.classList.add("text-white");
    }

    this.messageElement.textContent = message;
  }

  /**
   * Clean up event listeners and timers
   */
  cleanup() {
    this._stopPatrol();
  }

  /**
   * Get the current solution
   * @returns {Object} - The solution data
   */
  getSolution() {
    return {
      roundsWon: this.roundsWon,
      totalRounds: this.totalRounds,
      isComplete: this.isComplete,
    };
  }

  /**
   * Validate the current solution
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution() {
    return this.isComplete;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return `Need to win ${this.totalRounds} rounds to complete the puzzle!`;
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    switch (eventType) {
      case "security_patrol":
        this._showMessage(
          "Security alert! Prediction difficulty increased.",
          "warning"
        );

        // Temporarily increase difficulty
        if (this.isPredictionMode) {
          // Reduce available markers
          this.maxMarkers = Math.max(3, this.maxMarkers - 1);
          this.markers = this.markers.slice(0, this.maxMarkers);
          this._renderGrid();

          // Reset after duration
          setTimeout(() => {
            this.maxMarkers = 5;
            this._renderGrid();
            this._showMessage(
              "Security alert over. Normal difficulty restored."
            );
          }, duration * 1000);
        }
        break;

      case "system_check":
        this._showMessage(
          "System check in progress! Patterns may change.",
          "warning"
        );

        if (this.isObservationMode) {
          // Shuffle guard patterns
          this.guards.forEach((guard) => {
            guard.patternStep = Math.floor(Math.random() * guard.patternLength);
          });
        }
        break;
    }
  }
}

export default PatrolPatternPuzzle;
