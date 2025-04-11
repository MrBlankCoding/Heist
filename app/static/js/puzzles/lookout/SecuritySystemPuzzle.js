// SecuritySystemPuzzle.js - Lookout puzzle for security system mapping (type 3)

class SecuritySystemPuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;

    // Security system mapping specific properties
    this.gridSize = 8; // 8x8 grid
    this.securityCameras = [];
    this.playerMarkedCells = []; // Cells marked by player
    this.correctCoverageCells = []; // Cells that should be marked
    this.minimumAccuracy = 0.8; // Require 80% accuracy to pass

    // DOM elements
    this.mapGrid = null;
    this.messageElement = null;
    this.submitButton = null;
    this.resetButton = null;
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
    title.textContent = "Security System Mapping";

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
      "Map blind spots and camera coverage in the facility. <strong class='text-green-400'>Click cells</strong> to mark areas covered by security cameras. <strong class='text-yellow-400'>The goal is to accurately identify all cells monitored by cameras.</strong>";
    gameArea.appendChild(instructions);

    // Create map container with grid
    this._createSecurityMap(gameArea);

    // Create camera list
    this._createCameraList(gameArea);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex space-x-4 mt-4";

    // Reset button
    this.resetButton = document.createElement("button");
    this.resetButton.className =
      "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded";
    this.resetButton.textContent = "Reset Map";
    this.resetButton.addEventListener("click", () => this._resetMap());
    buttonContainer.appendChild(this.resetButton);

    // Submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button";
    this.submitButton.textContent = "Submit Mapping";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    buttonContainer.appendChild(this.submitButton);

    gameArea.appendChild(buttonContainer);

    // Message element for feedback
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center hidden mt-4";
    gameArea.appendChild(this.messageElement);

    // Generate security cameras and coverage
    this._generateSecuritySystem();

    // Start timer
    this._startTimer();
  }

  /**
   * Get puzzle title
   * @returns {string} - Puzzle title
   */
  getTitle() {
    return "Security System Mapping";
  }

  /**
   * Get puzzle instructions
   * @returns {string} - Puzzle instructions
   */
  getInstructions() {
    return "Map the complete security system by identifying blind spots and camera coverage.";
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;
    this._stopTimer();

    // Update UI to show success
    this.messageElement.textContent =
      "Security system successfully mapped! The team now knows all safe paths.";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Show correct coverage
    this._revealCorrectCoverage();

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Mission Complete";
    this.submitButton.className = "heist-button mx-auto block opacity-50";

    // Disable reset button
    this.resetButton.disabled = true;
    this.resetButton.className =
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
    this.mapGrid = null;
    this.messageElement = null;
    this.submitButton = null;
    this.resetButton = null;
    this.timerElement = null;
  }

  /**
   * Create security map grid
   * @param {HTMLElement} container - Container element
   */
  _createSecurityMap(container) {
    const mapContainer = document.createElement("div");
    mapContainer.className =
      "bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4";

    // Create grid
    this.mapGrid = document.createElement("div");
    this.mapGrid.className = "grid grid-cols-8 gap-1";
    this.mapGrid.style.width = "min(100%, 400px)";

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
          this._toggleCellMarking(cell, row, col)
        );

        this.mapGrid.appendChild(cell);
      }
    }

    mapContainer.appendChild(this.mapGrid);
    container.appendChild(mapContainer);
  }

  /**
   * Create camera list sidebar
   * @param {HTMLElement} container - Container element
   */
  _createCameraList(container) {
    const cameraListContainer = document.createElement("div");
    cameraListContainer.className =
      "bg-gray-800 rounded-lg p-4 border border-gray-700 w-full mb-4";

    const cameraListTitle = document.createElement("h5");
    cameraListTitle.className = "text-green-400 font-semibold mb-2";
    cameraListTitle.textContent = "Active Security Cameras";

    const cameraList = document.createElement("div");
    cameraList.className = "grid grid-cols-2 sm:grid-cols-3 gap-2";
    cameraList.id = "camera-list";

    cameraListContainer.appendChild(cameraListTitle);
    cameraListContainer.appendChild(cameraList);
    container.appendChild(cameraListContainer);
  }

  /**
   * Generate security system data
   */
  _generateSecuritySystem() {
    // Clear existing data
    this.securityCameras = [];
    this.correctCoverageCells = [];

    // Camera types with different ranges
    const cameraTypes = [
      { type: "Standard", range: 2, color: "blue" },
      { type: "Wide-Angle", range: 3, color: "purple" },
      { type: "PTZ", range: 4, color: "red" },
    ];

    // Place 5-8 cameras depending on difficulty
    const difficulty = this.puzzleData.difficulty || 1;
    const numCameras = 5 + Math.min(difficulty, 3);

    // Generate cameras with random positions
    const placedPositions = new Set();

    for (let i = 0; i < numCameras; i++) {
      // Find a position that's not already used
      let row, col;
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (placedPositions.has(`${row},${col}`));

      placedPositions.add(`${row},${col}`);

      // Random camera type
      const cameraType =
        cameraTypes[Math.floor(Math.random() * cameraTypes.length)];

      // Random direction (0: up, 1: right, 2: down, 3: left)
      const direction = Math.floor(Math.random() * 4);

      const camera = {
        id: `cam-${i + 1}`,
        name: `${cameraType.type} Camera ${i + 1}`,
        position: { row, col },
        range: cameraType.range,
        direction,
        color: cameraType.color,
        type: cameraType.type,
      };

      this.securityCameras.push(camera);

      // Calculate coverage for this camera
      this._calculateCameraCoverage(camera);
    }

    // Update camera list UI
    this._updateCameraList();

    // Mark camera positions on the grid
    this._markCameraPositions();
  }

  /**
   * Calculate and store camera coverage
   * @param {Object} camera - Camera data
   */
  _calculateCameraCoverage(camera) {
    const { row, col } = camera.position;
    const range = camera.range;
    const direction = camera.direction;

    // Mark the camera position itself
    this.correctCoverageCells.push(`${row},${col}`);

    // Calculate coverage based on direction and range
    switch (direction) {
      case 0: // Up
        for (let r = row - 1; r >= Math.max(0, row - range); r--) {
          this.correctCoverageCells.push(`${r},${col}`);
        }
        break;
      case 1: // Right
        for (
          let c = col + 1;
          c <= Math.min(this.gridSize - 1, col + range);
          c++
        ) {
          this.correctCoverageCells.push(`${row},${c}`);
        }
        break;
      case 2: // Down
        for (
          let r = row + 1;
          r <= Math.min(this.gridSize - 1, row + range);
          r++
        ) {
          this.correctCoverageCells.push(`${r},${col}`);
        }
        break;
      case 3: // Left
        for (let c = col - 1; c >= Math.max(0, col - range); c--) {
          this.correctCoverageCells.push(`${row},${c}`);
        }
        break;
    }

    // Remove duplicates
    this.correctCoverageCells = [...new Set(this.correctCoverageCells)];
  }

  /**
   * Update camera list in the UI
   */
  _updateCameraList() {
    const cameraList = document.getElementById("camera-list");
    if (!cameraList) return;

    cameraList.innerHTML = "";

    this.securityCameras.forEach((camera) => {
      const cameraItem = document.createElement("div");
      cameraItem.className = "text-sm flex items-center space-x-2";

      // Direction indicators
      const directions = ["↑", "→", "↓", "←"];

      cameraItem.innerHTML = `
        <div class="w-3 h-3 rounded-full bg-${camera.color}-500"></div>
        <div class="text-gray-300">${camera.name} ${
        directions[camera.direction]
      }</div>
      `;

      cameraList.appendChild(cameraItem);
    });
  }

  /**
   * Mark camera positions on the grid
   */
  _markCameraPositions() {
    this.securityCameras.forEach((camera) => {
      const { row, col } = camera.position;
      const cell = this.mapGrid.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );

      if (cell) {
        // Add camera icon and color
        cell.className = `aspect-square flex items-center justify-center bg-${camera.color}-900 text-${camera.color}-500 font-bold border border-${camera.color}-500`;

        // Direction indicators
        const directions = ["↑", "→", "↓", "←"];
        cell.textContent = directions[camera.direction];
      }
    });
  }

  /**
   * Toggle cell marking when clicked
   * @param {HTMLElement} cell - The clicked cell
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   */
  _toggleCellMarking(cell, row, col) {
    if (this.isCompleted) return;

    // Skip if this is a camera position
    const isCameraPosition = this.securityCameras.some(
      (camera) => camera.position.row === row && camera.position.col === col
    );

    if (isCameraPosition) return;

    const cellKey = `${row},${col}`;
    const isMarked = this.playerMarkedCells.includes(cellKey);

    if (isMarked) {
      // Unmark cell
      this.playerMarkedCells = this.playerMarkedCells.filter(
        (c) => c !== cellKey
      );
      cell.className =
        "aspect-square bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors";
    } else {
      // Mark cell
      this.playerMarkedCells.push(cellKey);
      cell.className =
        "aspect-square bg-yellow-800 hover:bg-yellow-700 cursor-pointer transition-colors";
    }
  }

  /**
   * Reset the map to initial state
   */
  _resetMap() {
    if (this.isCompleted) return;

    // Clear player markings
    this.playerMarkedCells = [];

    // Reset cell appearance
    const cells = this.mapGrid.querySelectorAll("div[data-row]");
    cells.forEach((cell) => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);

      // Check if it's a camera position
      const camera = this.securityCameras.find(
        (cam) => cam.position.row === row && cam.position.col === col
      );

      if (camera) {
        // Keep camera styling
        const directions = ["↑", "→", "↓", "←"];
        cell.className = `aspect-square flex items-center justify-center bg-${camera.color}-900 text-${camera.color}-500 font-bold border border-${camera.color}-500`;
        cell.textContent = directions[camera.direction];
      } else {
        // Reset to default
        cell.className =
          "aspect-square bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors";
        cell.textContent = "";
      }
    });

    // Hide any messages
    this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
  }

  /**
   * Reveal the correct coverage
   */
  _revealCorrectCoverage() {
    // Mark all cells with their correct status
    const cells = this.mapGrid.querySelectorAll("div[data-row]");

    cells.forEach((cell) => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      const cellKey = `${row},${col}`;

      // Skip camera positions
      const isCameraPosition = this.securityCameras.some(
        (camera) => camera.position.row === row && camera.position.col === col
      );

      if (isCameraPosition) return;

      const shouldBeMarked = this.correctCoverageCells.includes(cellKey);
      const wasMarked = this.playerMarkedCells.includes(cellKey);

      if (shouldBeMarked && wasMarked) {
        // Correct marking
        cell.className = "aspect-square bg-green-700 transition-colors";
      } else if (shouldBeMarked && !wasMarked) {
        // Missed marking
        cell.className = "aspect-square bg-red-900 transition-colors";
      } else if (!shouldBeMarked && wasMarked) {
        // False marking
        cell.className = "aspect-square bg-orange-900 transition-colors";
      }
    });
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
    this.messageElement.textContent = "Time's up! Submit your current mapping.";
    this.messageElement.className = "mb-4 text-red-400 text-center";
  }

  /**
   * Calculate score based on player's mapping accuracy
   * @returns {Object} - Score data with correctCount, totalCount and accuracy
   */
  _calculateScore() {
    let correctCount = 0;
    let falsePositives = 0;

    // Count correct markings
    this.playerMarkedCells.forEach((cellKey) => {
      if (this.correctCoverageCells.includes(cellKey)) {
        correctCount++;
      } else {
        falsePositives++;
      }
    });

    // Calculate false negatives (missed cells)
    const falseNegatives = this.correctCoverageCells.length - correctCount;

    // Calculate total errors
    const totalErrors = falsePositives + falseNegatives;

    // Calculate accuracy
    const totalCount = this.correctCoverageCells.length;
    const accuracy = correctCount / totalCount;

    // Penalize for false positives
    const adjustedAccuracy = Math.max(
      0,
      accuracy - (falsePositives / (this.gridSize * this.gridSize)) * 0.5
    );

    return {
      correctCount,
      totalCount,
      falsePositives,
      falseNegatives,
      accuracy,
      adjustedAccuracy,
      totalErrors,
    };
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    this._stopTimer();

    // Calculate score
    const score = this._calculateScore();

    // Create solution data to submit
    const solutionData = {
      playerMap: this.playerMarkedCells,
      correctMap: this.correctCoverageCells,
      score: score.adjustedAccuracy,
    };

    // Determine if player has passed based on accuracy
    const hasPassed = score.adjustedAccuracy >= this.minimumAccuracy;

    // Submit to game
    this.submitSolution(solutionData)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          // Show feedback based on accuracy
          this._revealCorrectCoverage();

          let message = "";
          if (score.adjustedAccuracy >= 0.7) {
            message = `Almost there! (${(score.adjustedAccuracy * 100).toFixed(
              1
            )}% accuracy). Try again with fewer errors.`;
          } else if (score.adjustedAccuracy >= 0.5) {
            message = `Improvement needed (${(
              score.adjustedAccuracy * 100
            ).toFixed(1)}% accuracy). Focus on camera directions.`;
          } else {
            message = `Low accuracy (${(score.adjustedAccuracy * 100).toFixed(
              1
            )}%). Remember to mark all cells covered by cameras.`;
          }

          this.messageElement.textContent = message;
          this.messageElement.className = "mb-4 text-red-400 text-center";

          // Enable reset for retry
          this.resetButton.textContent = "Try Again";
          this.resetButton.addEventListener("click", () =>
            this._regeneratePuzzle()
          );
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting mapping. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
      });
  }

  /**
   * Regenerate the puzzle for a retry
   */
  _regeneratePuzzle() {
    // Reset player data
    this.playerMarkedCells = [];
    this.correctCoverageCells = [];

    // Reset timer
    this.timeRemaining = 180;
    if (this.timerElement) {
      this.timerElement.textContent = this._formatTime(this.timeRemaining);
      this.timerElement.className = "text-yellow-400 font-mono";
    }

    // Generate new security system
    this._generateSecuritySystem();

    // Reset UI
    this._resetMap();

    // Restart timer
    this._startTimer();
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

export default SecuritySystemPuzzle;
