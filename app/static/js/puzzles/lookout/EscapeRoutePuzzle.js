// EscapeRoutePuzzle.js - Lookout puzzle for escape route planning (type 5)

class EscapeRoutePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;

    // Escape route puzzle specific properties
    this.gridSize = 10; // 10x10 grid
    this.startPoint = null;
    this.exitPoint = null;
    this.obstacles = []; // Obstacles like guards, cameras
    this.playerPath = []; // Player's selected path
    this.optimalPathLength = 0; // Target path length

    // DOM elements
    this.gridContainer = null;
    this.messageElement = null;
    this.submitButton = null;
    this.clearButton = null;
    this.timerElement = null;
    this.timerInterval = null;
    this.timeRemaining = 180; // 3 minutes
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create game area
    const gameArea = document.createElement("div");
    gameArea.className = "flex flex-col items-center mb-6";
    this.containerElement.appendChild(gameArea);

    // Create header with title and timer
    const headerContainer = document.createElement("div");
    headerContainer.className = "flex justify-between items-center w-full mb-4";

    const title = document.createElement("h4");
    title.className = "text-lg text-green-400 font-bold";
    title.textContent = "Escape Route Planning";

    this.timerElement = document.createElement("div");
    this.timerElement.className = "text-yellow-400 font-mono";
    this.timerElement.textContent = this._formatTime(this.timeRemaining);

    headerContainer.appendChild(title);
    headerContainer.appendChild(this.timerElement);
    gameArea.appendChild(headerContainer);

    // Create instructions
    const instructions = document.createElement("p");
    instructions.className = "text-gray-300 mb-4 text-sm";
    instructions.innerHTML =
      "Plan the optimal escape route by <strong class='text-green-400'>clicking cells to create a path</strong> from the start point to the exit. Avoid security systems and find the shortest safe path.";
    gameArea.appendChild(instructions);

    // Create grid container
    this._createGrid(gameArea);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex space-x-4 mt-4";

    // Clear button
    this.clearButton = document.createElement("button");
    this.clearButton.className =
      "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded";
    this.clearButton.textContent = "Clear Path";
    this.clearButton.addEventListener("click", () => this._clearPath());
    buttonContainer.appendChild(this.clearButton);

    // Submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button";
    this.submitButton.textContent = "Submit Route";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    buttonContainer.appendChild(this.submitButton);

    gameArea.appendChild(buttonContainer);

    // Message element for feedback
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center hidden mt-4";
    gameArea.appendChild(this.messageElement);

    // Generate maze and obstacles
    this._generateEscapeScenario();

    // Start timer
    this._startTimer();
  }

  /**
   * Get puzzle title
   * @returns {string} - Puzzle title
   */
  getTitle() {
    return "Escape Route Planning";
  }

  /**
   * Get puzzle instructions
   * @returns {string} - Puzzle instructions
   */
  getInstructions() {
    return "Plan the optimal escape route by avoiding security measures and patrols.";
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;
    this._stopTimer();

    // Update UI to show success
    this.messageElement.textContent =
      "Escape route successfully planned! The team can now exit safely.";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Mission Complete";
    this.submitButton.className = "heist-button mx-auto block opacity-50";

    // Disable clear button
    this.clearButton.disabled = true;
    this.clearButton.className =
      "px-4 py-2 bg-gray-700 text-white rounded opacity-50";
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

    // For the Lookout role, make random events less disruptive
    setTimeout(() => {
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }, duration * 500); // Half the time of other roles
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    this._stopTimer();

    // Clear references
    this.gridContainer = null;
    this.messageElement = null;
    this.submitButton = null;
    this.clearButton = null;
    this.timerElement = null;
  }

  /**
   * Create grid for escape route planning
   * @param {HTMLElement} container - Container element
   */
  _createGrid(container) {
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "bg-gray-800 rounded-lg p-4 border border-gray-700";

    this.gridContainer = document.createElement("div");
    this.gridContainer.className = "grid";
    this.gridContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, minmax(0, 1fr))`;
    this.gridContainer.style.gap = "2px";
    this.gridContainer.style.width = "min(100%, 500px)";

    // Create grid cells
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = document.createElement("div");
        cell.className =
          "aspect-square bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors";
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Add click event
        cell.addEventListener("click", () =>
          this._handleCellClick(cell, row, col)
        );

        this.gridContainer.appendChild(cell);
      }
    }

    gridWrapper.appendChild(this.gridContainer);
    container.appendChild(gridWrapper);
  }

  /**
   * Generate escape scenario with start, exit and obstacles
   */
  _generateEscapeScenario() {
    // Clear existing data
    this.startPoint = null;
    this.exitPoint = null;
    this.obstacles = [];
    this.playerPath = [];

    // Difficulty affects number of obstacles
    const difficulty = this.puzzleData.difficulty || 1;

    // Set start point (bottom left area)
    const startRow = this.gridSize - 1 - Math.floor(Math.random() * 3);
    const startCol = Math.floor(Math.random() * 3);
    this.startPoint = { row: startRow, col: startCol };

    // Set exit point (top right area)
    const exitRow = Math.floor(Math.random() * 3);
    const exitCol = this.gridSize - 1 - Math.floor(Math.random() * 3);
    this.exitPoint = { row: exitRow, col: exitCol };

    // Calculate Manhattan distance between start and exit
    const manhattanDistance =
      Math.abs(exitRow - startRow) + Math.abs(exitCol - startCol);

    // Store this as minimum possible path length
    this.optimalPathLength = manhattanDistance;

    // Generate obstacles based on difficulty
    const obstacleCount = 10 + difficulty * 5; // 15-25 obstacles

    // Obstacle types
    const obstacleTypes = [
      { type: "guard", className: "bg-red-600", blockFactor: 1.0 }, // Guards - completely blocks path
      { type: "camera", className: "bg-blue-600", blockFactor: 0.7 }, // Cameras - risky but possible
      { type: "laser", className: "bg-yellow-600", blockFactor: 0.9 }, // Lasers - very risky
      { type: "motion", className: "bg-purple-600", blockFactor: 0.8 }, // Motion detector - quite risky
    ];

    // Generate obstacles at random positions
    const occupied = new Set();
    occupied.add(`${startRow},${startCol}`); // Mark start as occupied
    occupied.add(`${exitRow},${exitCol}`); // Mark exit as occupied

    for (let i = 0; i < obstacleCount; i++) {
      let row, col;

      // Keep trying until we find an unoccupied position
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (occupied.has(`${row},${col}`));

      // Mark as occupied
      occupied.add(`${row},${col}`);

      // Random obstacle type
      const obstacleType =
        obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

      this.obstacles.push({
        position: { row, col },
        type: obstacleType.type,
        className: obstacleType.className,
        blockFactor: obstacleType.blockFactor,
      });
    }

    // Update grid to show start, exit and obstacles
    this._updateGrid();
  }

  /**
   * Update grid to visualize current state
   */
  _updateGrid() {
    if (!this.gridContainer) return;

    // Update all cells
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.gridContainer.querySelector(
          `[data-row="${row}"][data-col="${col}"]`
        );
        if (!cell) continue;

        // Check if this is start or exit
        if (
          this.startPoint &&
          row === this.startPoint.row &&
          col === this.startPoint.col
        ) {
          cell.className =
            "aspect-square bg-green-700 flex items-center justify-center text-white font-bold cursor-default";
          cell.textContent = "S";
          continue;
        }

        if (
          this.exitPoint &&
          row === this.exitPoint.row &&
          col === this.exitPoint.col
        ) {
          cell.className =
            "aspect-square bg-green-500 flex items-center justify-center text-white font-bold cursor-default";
          cell.textContent = "E";
          continue;
        }

        // Check if this is an obstacle
        const obstacle = this.obstacles.find(
          (o) => o.position.row === row && o.position.col === col
        );
        if (obstacle) {
          cell.className = `aspect-square ${obstacle.className} cursor-default`;
          cell.textContent = "";
          continue;
        }

        // Check if this is part of player's path
        const isOnPath = this.playerPath.some(
          (p) => p.row === row && p.col === col
        );
        if (isOnPath) {
          // Get index in path for numbering
          const pathIndex = this.playerPath.findIndex(
            (p) => p.row === row && p.col === col
          );
          cell.className =
            "aspect-square bg-green-600 flex items-center justify-center text-white text-xs cursor-pointer";
          cell.textContent = (pathIndex + 1).toString();
          continue;
        }

        // Regular cell
        cell.className =
          "aspect-square bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors";
        cell.textContent = "";
      }
    }
  }

  /**
   * Handle cell click to build escape route
   * @param {HTMLElement} cell - The clicked cell
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   */
  _handleCellClick(cell, row, col) {
    if (this.isCompleted) return;

    // Can't click on start, exit or obstacles
    if (
      (this.startPoint &&
        row === this.startPoint.row &&
        col === this.startPoint.col) ||
      (this.exitPoint &&
        row === this.exitPoint.row &&
        col === this.exitPoint.col) ||
      this.obstacles.some(
        (o) => o.position.row === row && o.position.col === col
      )
    ) {
      return;
    }

    // Check if this cell is already in the path
    const existingIndex = this.playerPath.findIndex(
      (p) => p.row === row && p.col === col
    );

    if (existingIndex >= 0) {
      // Remove this point and all subsequent points
      this.playerPath = this.playerPath.slice(0, existingIndex);
    } else {
      // Check if this is a valid next cell
      if (this.playerPath.length === 0) {
        // First cell must be adjacent to start
        const isAdjacentToStart =
          Math.abs(row - this.startPoint.row) +
            Math.abs(col - this.startPoint.col) ===
          1;

        if (!isAdjacentToStart) {
          this.messageElement.textContent =
            "Your path must start adjacent to the starting point (S).";
          this.messageElement.className = "mb-4 text-yellow-400 text-center";
          return;
        }
      } else {
        // Must be adjacent to last point in path
        const lastPoint = this.playerPath[this.playerPath.length - 1];
        const isAdjacent =
          Math.abs(row - lastPoint.row) + Math.abs(col - lastPoint.col) === 1;

        if (!isAdjacent) {
          this.messageElement.textContent =
            "You can only select adjacent cells to build your path.";
          this.messageElement.className = "mb-4 text-yellow-400 text-center";
          return;
        }
      }

      // Add cell to path
      this.playerPath.push({ row, col });

      // Hide any messages
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }

    // Update grid to reflect changes
    this._updateGrid();
  }

  /**
   * Clear the current path
   */
  _clearPath() {
    this.playerPath = [];
    this._updateGrid();

    // Hide any messages
    this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
  }

  /**
   * Calculate the risk level of player's path
   * @returns {Object} - Risk assessment
   */
  _calculatePathRisk() {
    // If path is empty, risk is 100%
    if (this.playerPath.length === 0) {
      return { risk: 1.0, completion: 0, pathLength: 0 };
    }

    let totalRisk = 0;
    let adjacentObstacleCount = 0;

    // Check each cell in the path
    this.playerPath.forEach((point) => {
      // Check for adjacent obstacles (diagonals count too)
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
          if (rowOffset === 0 && colOffset === 0) continue; // Skip the cell itself

          const adjacentRow = point.row + rowOffset;
          const adjacentCol = point.col + colOffset;

          // Check if there's an obstacle at this position
          const obstacle = this.obstacles.find(
            (o) =>
              o.position.row === adjacentRow && o.position.col === adjacentCol
          );

          if (obstacle) {
            totalRisk +=
              obstacle.blockFactor *
              (rowOffset === 0 || colOffset === 0 ? 1.0 : 0.7);
            adjacentObstacleCount++;
          }
        }
      }
    });

    // Normalize risk based on path length
    const normalizedRisk =
      adjacentObstacleCount > 0
        ? totalRisk / (adjacentObstacleCount * this.playerPath.length)
        : 0;

    // Check if path reaches exit
    const lastPoint = this.playerPath[this.playerPath.length - 1];
    const isAdjacentToExit =
      Math.abs(lastPoint.row - this.exitPoint.row) +
        Math.abs(lastPoint.col - this.exitPoint.col) ===
      1;

    // Calculate completion factor
    let completion = 0;
    if (isAdjacentToExit) {
      completion = 1.0; // Complete path
    } else {
      // Calculate distance from end of path to exit
      const distanceToExit =
        Math.abs(lastPoint.row - this.exitPoint.row) +
        Math.abs(lastPoint.col - this.exitPoint.col);

      // Max possible distance is the sum of grid dimensions
      const maxDistance = this.gridSize * 2;

      // Completion is inverse of normalized distance
      completion = 1 - distanceToExit / maxDistance;
    }

    return {
      risk: normalizedRisk,
      completion,
      pathLength: this.playerPath.length,
      reachesExit: isAdjacentToExit,
    };
  }

  /**
   * Start the countdown timer
   */
  _startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      // Update timer display
      if (this.timerElement) {
        this.timerElement.textContent = this._formatTime(this.timeRemaining);

        // Change color when low on time
        if (this.timeRemaining <= 30) {
          this.timerElement.className = "text-red-400 font-mono";
        }
      }

      // Time's up
      if (this.timeRemaining <= 0) {
        this._stopTimer();
        this._handleTimeUp();
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Format time as MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Handle time running out
   */
  _handleTimeUp() {
    this.messageElement.textContent = "Time's up! Submit your escape route.";
    this.messageElement.className = "mb-4 text-red-400 text-center";
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    this._stopTimer();

    // Calculate path risk and completion
    const pathAssessment = this._calculatePathRisk();

    // Check if path is valid (must reach exit)
    if (!pathAssessment.reachesExit) {
      this.messageElement.textContent =
        "Your path must reach the exit point (E). Make sure your last selection is adjacent to it.";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      this._startTimer(); // Restart timer
      return;
    }

    // Path efficiency is based on how close it is to optimal length
    const efficiency = this.optimalPathLength / pathAssessment.pathLength;

    // Overall score combines low risk and high efficiency
    const riskWeight = 0.6;
    const efficiencyWeight = 0.4;
    const overallScore =
      (1 - pathAssessment.risk) * riskWeight + efficiency * efficiencyWeight;

    // Create solution data to submit
    const solutionData = {
      path: this.playerPath,
      risk: pathAssessment.risk,
      efficiency,
      score: overallScore,
    };

    // Submit to game
    this.submitSolution(solutionData)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          let message = "";
          if (overallScore >= 0.7) {
            message =
              "Almost there! Your path is too risky. Find a route with fewer obstacles nearby.";
          } else if (overallScore >= 0.5) {
            message =
              "Your path is inefficient and risky. Find a shorter route with fewer security measures.";
          } else {
            message =
              "Your escape plan needs significant improvement. Find a shorter, safer path.";
          }

          this.messageElement.textContent = message;
          this.messageElement.className = "mb-4 text-red-400 text-center";

          // Re-enable buttons
          this.submitButton.disabled = false;
          this._startTimer();
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent = "Error submitting route. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this._startTimer();
      });
  }

  /**
   * Get random event message
   * @param {string} eventType - Type of random event
   * @returns {string} - Event message
   */
  _getRandomEventMessage(eventType) {
    switch (eventType) {
      case "security_patrol":
        return "Alert: Unexpected security patrol detected! Continuing surveillance...";
      case "camera_sweep":
        return "Notice: Camera systems performing diagnostic sweep. Maintaining monitor status...";
      case "system_check":
        return "Update: Security system check in progress. Adapting observation...";
      default:
        return "Security alert detected! Maintaining surveillance...";
    }
  }
}

export default EscapeRoutePuzzle;
