// SurveillancePuzzle.js - Surveillance Evasion Puzzle for the Lookout role
// Difficulty: 1/5 - Easy puzzle to start with

class SurveillancePuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Grid size
    this.gridSize = 5; // 5x5 grid
    this.grid = [];
    this.playerPosition = { x: 0, y: 0 };
    this.exitPosition = { x: 4, y: 4 };

    // Camera settings
    this.cameras = [];
    this.numCameras = 3; // Number of cameras for difficulty 1

    // UI elements
    this.gridElement = null;
    this.messageElement = null;

    // Movement tracking
    this.moveCount = 0;
    this.maxMoves = 20; // Players have a limited number of moves
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Initialize grid
    this._initializeGrid();

    // Place cameras
    this._placeCameras();

    // Render initial state
    this._renderGrid();

    // Add event listeners
    this._setupEventListeners();

    // Display instructions
    this._showMessage("Avoid the camera sight lines and reach the exit.");
  }

  /**
   * Create the UI elements for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "surveillance-puzzle flex flex-col items-center justify-center h-full";

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-center text-gray-300";
    instructions.innerHTML = `
      <p class="mb-2">Navigate to the exit without being caught by cameras.</p>
      <p class="text-sm">
        <span class="bg-blue-500 text-white px-2 py-1 rounded">You</span>
        <span class="ml-2 bg-red-500 text-white px-2 py-1 rounded">Camera</span>
        <span class="ml-2 bg-green-500 text-white px-2 py-1 rounded">Exit</span>
      </p>
      <p class="text-sm mt-1">Moves left: <span id="moves-counter">${this.maxMoves}</span></p>
    `;
    puzzleContainer.appendChild(instructions);

    // Grid container
    this.gridElement = document.createElement("div");
    this.gridElement.className = "grid grid-cols-5 gap-1 w-80 h-80";
    puzzleContainer.appendChild(this.gridElement);

    // Message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mt-4 text-center h-8 text-white font-medium";
    puzzleContainer.appendChild(this.messageElement);

    // Arrow controls for mobile
    const controlsElement = document.createElement("div");
    controlsElement.className = "mt-4 grid grid-cols-3 gap-2 w-40";
    controlsElement.innerHTML = `
      <div></div>
      <button id="move-up" class="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded">↑</button>
      <div></div>
      <button id="move-left" class="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded">←</button>
      <div></div>
      <button id="move-right" class="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded">→</button>
      <div></div>
      <button id="move-down" class="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded">↓</button>
      <div></div>
    `;
    puzzleContainer.appendChild(controlsElement);

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
          underCamera: false,
        });
      }
      this.grid.push(row);
    }

    // Set player and exit positions
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "player";
    this.grid[this.exitPosition.y][this.exitPosition.x].type = "exit";
  }

  /**
   * Place cameras on the grid
   */
  _placeCameras() {
    this.cameras = [];

    // Clear existing cameras
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].type === "camera") {
          this.grid[y][x].type = "empty";
        }
        this.grid[y][x].underCamera = false;
      }
    }

    // Place new cameras
    for (let i = 0; i < this.numCameras; i++) {
      let x, y;

      // Make sure cameras don't overlap with player, exit, or other cameras
      do {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
      } while (
        (x === this.playerPosition.x && y === this.playerPosition.y) ||
        (x === this.exitPosition.x && y === this.exitPosition.y) ||
        this.grid[y][x].type === "camera"
      );

      this.grid[y][x].type = "camera";
      this.cameras.push({ x, y, direction: this._getRandomDirection() });
    }

    // Calculate camera sight lines
    this._calculateCameraSightlines();
  }

  /**
   * Calculate which cells are under camera surveillance
   */
  _calculateCameraSightlines() {
    // Clear existing surveillance
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x].underCamera = false;
      }
    }

    // For each camera, calculate its line of sight
    this.cameras.forEach((camera) => {
      const { x, y, direction } = camera;

      // Define direction vectors
      const directionVectors = {
        up: { dx: 0, dy: -1 },
        right: { dx: 1, dy: 0 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
      };

      const vector = directionVectors[direction];

      // Mark cells in camera's line of sight
      let currX = x + vector.dx;
      let currY = y + vector.dy;

      while (
        currX >= 0 &&
        currX < this.gridSize &&
        currY >= 0 &&
        currY < this.gridSize
      ) {
        this.grid[currY][currX].underCamera = true;
        currX += vector.dx;
        currY += vector.dy;
      }
    });
  }

  /**
   * Get a random camera direction
   * @returns {string} - Direction (up, right, down, left)
   */
  _getRandomDirection() {
    const directions = ["up", "right", "down", "left"];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  /**
   * Render the grid on the UI
   */
  _renderGrid() {
    if (!this.gridElement) return;

    this.gridElement.innerHTML = "";

    // Update moves counter
    const movesCounter = document.getElementById("moves-counter");
    if (movesCounter) {
      movesCounter.textContent = this.maxMoves - this.moveCount;
    }

    // Create cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const cellElement = document.createElement("div");

        // Basic cell styling
        cellElement.className =
          "flex items-center justify-center w-full h-full rounded";

        // Set cell color based on type
        if (cell.type === "player") {
          cellElement.classList.add("bg-blue-500");
          cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">👤</span>`;
        } else if (cell.type === "camera") {
          cellElement.classList.add("bg-red-500");

          // Show camera direction with an arrow
          const arrowSymbols = {
            up: "↑",
            right: "→",
            down: "↓",
            left: "←",
          };

          const cameraIndex = this.cameras.findIndex(
            (c) => c.x === x && c.y === y
          );
          if (cameraIndex !== -1) {
            const direction = this.cameras[cameraIndex].direction;
            cellElement.innerHTML = `<span class="text-white text-lg">${arrowSymbols[direction]}</span>`;
          }
        } else if (cell.type === "exit") {
          cellElement.classList.add("bg-green-500");
          cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">🚪</span>`;
        } else {
          cellElement.classList.add("bg-gray-700");
        }

        // Highlight cells under camera surveillance
        if (cell.underCamera) {
          cellElement.classList.add(
            "ring-2",
            "ring-red-400",
            "ring-opacity-60"
          );

          // Add a subtle gradient for better visibility of the camera's line of sight
          if (cell.type === "empty") {
            cellElement.classList.add(
              "bg-gradient-to-br",
              "from-gray-700",
              "to-red-900",
              "bg-opacity-40"
            );
          }
        }

        // Add data attributes for position
        cellElement.dataset.x = x;
        cellElement.dataset.y = y;

        this.gridElement.appendChild(cellElement);
      }
    }
  }

  /**
   * Set up event listeners for keyboard controls
   */
  _setupEventListeners() {
    // Keyboard controls
    document.addEventListener("keydown", this._handleKeyDown.bind(this));

    // Button controls
    document
      .getElementById("move-up")
      ?.addEventListener("click", () => this._movePlayer(0, -1));
    document
      .getElementById("move-down")
      ?.addEventListener("click", () => this._movePlayer(0, 1));
    document
      .getElementById("move-left")
      ?.addEventListener("click", () => this._movePlayer(-1, 0));
    document
      .getElementById("move-right")
      ?.addEventListener("click", () => this._movePlayer(1, 0));
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    // Only process keyboard events if puzzle is active
    if (this.isComplete) return;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        this._movePlayer(0, -1);
        break;
      case "ArrowRight":
        event.preventDefault();
        this._movePlayer(1, 0);
        break;
      case "ArrowDown":
        event.preventDefault();
        this._movePlayer(0, 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        this._movePlayer(-1, 0);
        break;
    }
  }

  /**
   * Move the player in the specified direction
   * @param {number} dx - X direction
   * @param {number} dy - Y direction
   */
  _movePlayer(dx, dy) {
    if (this.isComplete) return;

    const newX = this.playerPosition.x + dx;
    const newY = this.playerPosition.y + dy;

    // Check if the new position is within the grid
    if (
      newX < 0 ||
      newX >= this.gridSize ||
      newY < 0 ||
      newY >= this.gridSize
    ) {
      this._showMessage("You can't move outside the grid!");
      return;
    }

    // Update move counter
    this.moveCount++;

    // Clear player from current position
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "empty";

    // Update player position
    this.playerPosition.x = newX;
    this.playerPosition.y = newY;

    // Check if player reached the exit
    if (
      this.playerPosition.x === this.exitPosition.x &&
      this.playerPosition.y === this.exitPosition.y
    ) {
      this._handleSuccess();
      return;
    }

    // Update grid with new player position
    if (this.grid[newY][newX].type !== "exit") {
      this.grid[newY][newX].type = "player";
    }

    // Check if player is under camera
    if (this.grid[newY][newX].underCamera) {
      this._handleCaught();
      return;
    }

    // Check if player ran out of moves
    if (this.moveCount >= this.maxMoves) {
      this._handleOutOfMoves();
      return;
    }

    // Update the grid display
    this._renderGrid();
  }

  /**
   * Handle player success (reached exit)
   */
  _handleSuccess() {
    this.isComplete = true;
    this._showMessage("You successfully reached the exit!", "success");

    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Handle player caught by camera
   */
  _handleCaught() {
    this._showMessage("You were caught by a camera! Try again.", "error");

    // Reset player position
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "empty";
    this.playerPosition = { x: 0, y: 0 };
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "player";

    // Apply penalty to moves
    this.moveCount += 3;

    // Check if out of moves after penalty
    if (this.moveCount >= this.maxMoves) {
      this._handleOutOfMoves();
      return;
    }

    // Re-render the grid
    this._renderGrid();
  }

  /**
   * Handle player running out of moves
   */
  _handleOutOfMoves() {
    this._showMessage("You ran out of moves!", "error");

    // Reset the puzzle
    this._initializeGrid();
    this._placeCameras();
    this.moveCount = 0;

    // Re-render the grid
    this._renderGrid();
  }

  /**
   * Show a message to the player
   * @param {string} message - Message to display
   * @param {string} type - Message type (info, success, error)
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
      default:
        this.messageElement.classList.add("text-white");
    }

    this.messageElement.textContent = message;
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    document.removeEventListener("keydown", this._handleKeyDown);
    document
      .getElementById("move-up")
      ?.removeEventListener("click", this._movePlayer);
    document
      .getElementById("move-down")
      ?.removeEventListener("click", this._movePlayer);
    document
      .getElementById("move-left")
      ?.removeEventListener("click", this._movePlayer);
    document
      .getElementById("move-right")
      ?.removeEventListener("click", this._movePlayer);
  }

  /**
   * Get the current solution
   * @returns {Object} - The solution data
   */
  getSolution() {
    return {
      moveCount: this.moveCount,
      reachedExit: this.isComplete,
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
    return "You need to reach the exit safely to complete the puzzle!";
  }

  /**
   * Handle random events like security patrols
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    switch (eventType) {
      case "security_patrol":
        this._showMessage(
          "Security patrol spotted! Be extra careful.",
          "warning"
        );
        // Maybe add extra camera temporarily
        if (this.numCameras < 5) {
          this.numCameras++;
          this._placeCameras();
          this._renderGrid();

          // Reset after duration
          setTimeout(() => {
            this.numCameras--;
            this._placeCameras();
            this._renderGrid();
            this._showMessage("Security patrol has moved on.");
          }, duration * 1000);
        }
        break;

      case "camera_sweep":
        this._showMessage(
          "Camera sweep in progress! Cameras rotating.",
          "warning"
        );

        // Rotate camera directions
        this.cameras.forEach((camera) => {
          const directions = ["up", "right", "down", "left"];
          const currentIndex = directions.indexOf(camera.direction);
          camera.direction = directions[(currentIndex + 1) % 4];
        });

        this._calculateCameraSightlines();
        this._renderGrid();
        break;
    }
  }
}

export default SurveillancePuzzle;
