// EscapeRoutePuzzle.js - Escape Route Planning Puzzle for the Lookout role
// Difficulty: 5/5 - Hardest difficulty

class EscapeRoutePuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Grid properties
    this.gridSize = 8; // 8x8 grid for hardest difficulty
    this.grid = [];

    // Player properties
    this.playerPosition = { x: 0, y: 0 };
    this.exitPosition = { x: 7, y: 7 };

    // Security properties
    this.guards = []; // Guards that patrol
    this.cameras = []; // Fixed cameras
    this.lasers = []; // Laser barriers
    this.numGuards = 3;
    this.numCameras = 4;
    this.numLasers = 4;

    // Hazard tracking
    this.hazardTimer = null;
    this.hazardUpdateInterval = 800; // ms

    // Route planning
    this.plannedRoute = [];
    this.isRoutePlanning = true; // Start in planning mode
    this.isExecutingRoute = false;
    this.routeExecutionIndex = 0;
    this.routeExecutionTimer = null;

    // UI elements
    this.gridElement = null;
    this.messageElement = null;
    this.routeElement = null;
    this.controlsElement = null;

    // Timer display
    this.timerValue = 60; // 60 seconds to complete
    this.timerElement = null;
    this.timer = null;

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 5;
    this._adjustForDifficulty();
  }

  /**
   * Adjust parameters based on difficulty
   */
  _adjustForDifficulty() {
    // Grid size adjustment
    this.gridSize = 6 + Math.floor(this.difficulty / 2); // 8x8 for difficulty 5

    // Security adjustments
    this.numGuards = 2 + Math.floor(this.difficulty / 2); // 4 for difficulty 5
    this.numCameras = 3 + Math.floor(this.difficulty / 2); // 5 for difficulty 5
    this.numLasers = 3 + Math.floor(this.difficulty / 2); // 5 for difficulty 5

    // Timer adjustment
    this.timerValue = Math.max(30, 75 - this.difficulty * 5); // 50 seconds for difficulty 5
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Initialize grid
    this._initializeGrid();

    // Place security elements
    this._placeSecurityElements();

    // Start hazard timer for guard movements and laser activations
    this._startHazardTimer();

    // Start countdown timer
    this._startTimer();

    // Render initial state
    this._render();

    // Display instructions
    this._showMessage(
      "Plan a safe escape route avoiding all security measures!"
    );
  }

  /**
   * Create the UI elements for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "escape-route-puzzle flex flex-col items-center justify-center h-full";

    // Header with timer
    const header = document.createElement("div");
    header.className = "mb-4 w-full flex justify-between items-center";

    this.timerElement = document.createElement("div");
    this.timerElement.className =
      "bg-gray-800 px-3 py-1 rounded text-white font-mono";
    this.timerElement.textContent = `${this.timerValue}s`;
    header.appendChild(this.timerElement);

    puzzleContainer.appendChild(header);

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-center text-gray-300";
    instructions.innerHTML = `
      <p class="mb-2">Plan and execute a safe escape route through the security grid.</p>
      <p class="text-sm">
        <span class="bg-blue-500 text-white px-2 py-1 rounded">You</span>
        <span class="ml-2 bg-green-500 text-white px-2 py-1 rounded">Exit</span>
        <span class="ml-2 bg-red-500 text-white px-2 py-1 rounded">Guard</span>
        <span class="ml-2 bg-yellow-500 text-white px-2 py-1 rounded">Camera</span>
        <span class="ml-2 bg-purple-500 text-white px-2 py-1 rounded">Laser</span>
      </p>
    `;
    puzzleContainer.appendChild(instructions);

    // Route display
    this.routeElement = document.createElement("div");
    this.routeElement.className = "mb-2 text-center text-white text-sm";
    this.routeElement.textContent = "Route: Not planned yet";
    puzzleContainer.appendChild(this.routeElement);

    // Mode indicator
    this.modeElement = document.createElement("div");
    this.modeElement.className =
      "mb-2 text-center py-1 px-3 rounded bg-blue-600 text-white";
    this.modeElement.textContent =
      "PLANNING MODE: Click cells to plot your escape";
    puzzleContainer.appendChild(this.modeElement);

    // Grid container
    this.gridElement = document.createElement("div");
    this.gridElement.className = `grid gap-1 w-96 h-96`;
    this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
    this.gridElement.style.gridTemplateRows = `repeat(${this.gridSize}, 1fr)`;
    puzzleContainer.appendChild(this.gridElement);

    // Message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mt-4 text-center h-8 text-white font-medium";
    puzzleContainer.appendChild(this.messageElement);

    // Control buttons
    this.controlsElement = document.createElement("div");
    this.controlsElement.className = "mt-4 flex space-x-4";

    const executeButton = document.createElement("button");
    executeButton.className =
      "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50";
    executeButton.textContent = "Execute Route";
    executeButton.addEventListener("click", () => this._executeRoute());
    executeButton.disabled = true;
    this.executeButton = executeButton;
    this.controlsElement.appendChild(executeButton);

    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded";
    resetButton.textContent = "Reset Route";
    resetButton.addEventListener("click", () => this._resetRoute());
    this.controlsElement.appendChild(resetButton);

    puzzleContainer.appendChild(this.controlsElement);

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
          isPath: false,
          isSafe: true, // Initially assume all cells are safe
        });
      }
      this.grid.push(row);
    }

    // Place player at start (top left) and exit at end (bottom right)
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "player";
    this.grid[this.exitPosition.y][this.exitPosition.x].type = "exit";
  }

  /**
   * Place security elements on the grid
   */
  _placeSecurityElements() {
    // Reset security arrays
    this.guards = [];
    this.cameras = [];
    this.lasers = [];

    // Place guards - mobile security that patrols
    for (let i = 0; i < this.numGuards; i++) {
      let x, y;

      // Ensure guards don't overlap with player, exit, or other security
      do {
        x = 1 + Math.floor(Math.random() * (this.gridSize - 2));
        y = 1 + Math.floor(Math.random() * (this.gridSize - 2));
      } while (
        this._isOccupied(x, y) ||
        (x < 2 && y < 2) || // Keep away from start
        (x > this.gridSize - 3 && y > this.gridSize - 3) // Keep away from exit
      );

      this.grid[y][x].type = "guard";

      // Create guard with patrol pattern
      const guard = {
        id: i,
        x,
        y,
        // Each guard gets a specific patrol pattern
        patternType: i % 2 === 0 ? "horizontal" : "vertical",
        direction: Math.random() < 0.5 ? 1 : -1, // Random initial direction
        steps: 0,
        maxSteps: 2 + Math.floor(Math.random() * 3), // 2-4 steps before turning
      };

      this.guards.push(guard);
    }

    // Place cameras - static with sight lines
    for (let i = 0; i < this.numCameras; i++) {
      let x, y;

      // Ensure cameras don't overlap with player, exit, or other security
      do {
        x = 1 + Math.floor(Math.random() * (this.gridSize - 2));
        y = 1 + Math.floor(Math.random() * (this.gridSize - 2));
      } while (
        this._isOccupied(x, y) ||
        (x < 2 && y < 2) || // Keep away from start
        (x > this.gridSize - 3 && y > this.gridSize - 3) // Keep away from exit
      );

      this.grid[y][x].type = "camera";

      // Create camera with direction
      const directions = ["up", "right", "down", "left"];
      const camera = {
        id: i,
        x,
        y,
        direction: directions[Math.floor(Math.random() * directions.length)],
      };

      this.cameras.push(camera);

      // Calculate camera sight lines
      this._calculateCameraSightline(camera);
    }

    // Place lasers - barriers that activate/deactivate
    for (let i = 0; i < this.numLasers; i++) {
      let x, y, orientation;

      // Ensure lasers don't overlap with player, exit, or other security
      do {
        x = 1 + Math.floor(Math.random() * (this.gridSize - 2));
        y = 1 + Math.floor(Math.random() * (this.gridSize - 2));
        orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
      } while (
        this._isOccupied(x, y) ||
        (x < 2 && y < 2) || // Keep away from start
        (x > this.gridSize - 3 && y > this.gridSize - 3) // Keep away from exit
      );

      this.grid[y][x].type = "laser";

      // Create laser
      const laser = {
        id: i,
        x,
        y,
        orientation,
        active: Math.random() < 0.5, // Random initial state
        interval: 3000 + Math.random() * 2000, // 3-5 seconds between state changes
        lastToggle: Date.now(),
      };

      this.lasers.push(laser);

      // Calculate laser beams
      this._calculateLaserBeam(laser);
    }
  }

  /**
   * Check if a cell is occupied by any security element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} - Whether the cell is occupied
   */
  _isOccupied(x, y) {
    return this.grid[y][x].type !== "empty";
  }

  /**
   * Calculate camera sight line
   * @param {Object} camera - Camera object
   */
  _calculateCameraSightline(camera) {
    // Define direction vectors
    const directionVectors = {
      up: { dx: 0, dy: -1 },
      right: { dx: 1, dy: 0 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
    };

    const vector = directionVectors[camera.direction];

    // Mark cells in camera's line of sight
    let currX = camera.x + vector.dx;
    let currY = camera.y + vector.dy;

    while (
      currX >= 0 &&
      currX < this.gridSize &&
      currY >= 0 &&
      currY < this.gridSize
    ) {
      // Stop sight line at walls or other cameras
      if (["guard", "camera", "laser"].includes(this.grid[currY][currX].type)) {
        break;
      }

      // Mark cell as unsafe
      this.grid[currY][currX].isSafe = false;

      // Add an attribute to indicate camera sight
      this.grid[currY][currX].inCameraSight = true;

      currX += vector.dx;
      currY += vector.dy;
    }
  }

  /**
   * Calculate laser beam
   * @param {Object} laser - Laser object
   */
  _calculateLaserBeam(laser) {
    // Only calculate if laser is active
    if (!laser.active) return;

    if (laser.orientation === "horizontal") {
      // Horizontal laser - extends left and right
      // Go left
      for (let x = laser.x - 1; x >= 0; x--) {
        // Stop at obstacles
        if (["guard", "camera", "laser"].includes(this.grid[laser.y][x].type)) {
          break;
        }

        // Mark cell as unsafe
        this.grid[laser.y][x].isSafe = false;
        this.grid[laser.y][x].inLaserBeam = true;
      }

      // Go right
      for (let x = laser.x + 1; x < this.gridSize; x++) {
        // Stop at obstacles
        if (["guard", "camera", "laser"].includes(this.grid[laser.y][x].type)) {
          break;
        }

        // Mark cell as unsafe
        this.grid[laser.y][x].isSafe = false;
        this.grid[laser.y][x].inLaserBeam = true;
      }
    } else {
      // Vertical laser - extends up and down
      // Go up
      for (let y = laser.y - 1; y >= 0; y--) {
        // Stop at obstacles
        if (["guard", "camera", "laser"].includes(this.grid[y][laser.x].type)) {
          break;
        }

        // Mark cell as unsafe
        this.grid[y][laser.x].isSafe = false;
        this.grid[y][laser.x].inLaserBeam = true;
      }

      // Go down
      for (let y = laser.y + 1; y < this.gridSize; y++) {
        // Stop at obstacles
        if (["guard", "camera", "laser"].includes(this.grid[y][laser.x].type)) {
          break;
        }

        // Mark cell as unsafe
        this.grid[y][laser.x].isSafe = false;
        this.grid[y][laser.x].inLaserBeam = true;
      }
    }
  }

  /**
   * Clear all laser beams from the grid
   */
  _clearLaserBeams() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].inLaserBeam) {
          delete this.grid[y][x].inLaserBeam;

          // Reset isSafe if not in camera sight
          if (!this.grid[y][x].inCameraSight) {
            this.grid[y][x].isSafe = true;
          }
        }
      }
    }
  }

  /**
   * Start hazard timer for guard movements and laser toggling
   */
  _startHazardTimer() {
    this._stopHazardTimer();

    this.hazardTimer = setInterval(() => {
      // Move guards
      this._moveGuards();

      // Toggle lasers
      this._toggleLasers();

      // Render updated state
      this._render();

      // Check for player caught in execution mode
      if (this.isExecutingRoute) {
        this._checkCurrentPosition();
      }
    }, this.hazardUpdateInterval);
  }

  /**
   * Stop hazard timer
   */
  _stopHazardTimer() {
    if (this.hazardTimer) {
      clearInterval(this.hazardTimer);
      this.hazardTimer = null;
    }
  }

  /**
   * Move all guards according to their patrol patterns
   */
  _moveGuards() {
    // Update each guard position
    this.guards.forEach((guard) => {
      // Remove guard from current position
      this.grid[guard.y][guard.x].type = "empty";

      // Calculate new position based on pattern
      let newX = guard.x;
      let newY = guard.y;

      if (guard.patternType === "horizontal") {
        newX += guard.direction;
      } else {
        newY += guard.direction;
      }

      // Check if the guard would go out of bounds or hit an obstacle
      if (
        newX < 0 ||
        newX >= this.gridSize ||
        newY < 0 ||
        newY >= this.gridSize ||
        ["player", "exit", "camera", "laser", "guard"].includes(
          this.grid[newY][newX].type
        )
      ) {
        // Reverse direction
        guard.direction *= -1;

        // Calculate new position again
        if (guard.patternType === "horizontal") {
          newX = guard.x + guard.direction;
        } else {
          newY = guard.y + guard.direction;
        }
      }

      // Update guard position
      guard.x = newX;
      guard.y = newY;
      this.grid[guard.y][guard.x].type = "guard";

      // Increment steps
      guard.steps++;

      // Change direction if maxSteps reached
      if (guard.steps >= guard.maxSteps) {
        guard.direction *= -1;
        guard.steps = 0;
      }
    });
  }

  /**
   * Toggle lasers based on their intervals
   */
  _toggleLasers() {
    const now = Date.now();

    // Clear all laser beams
    this._clearLaserBeams();

    // Update laser states
    this.lasers.forEach((laser) => {
      // Check if it's time to toggle this laser
      if (now - laser.lastToggle >= laser.interval) {
        // Toggle active state
        laser.active = !laser.active;
        laser.lastToggle = now;
      }

      // If active, calculate laser beam
      if (laser.active) {
        this._calculateLaserBeam(laser);
      }
    });
  }

  /**
   * Start countdown timer
   */
  _startTimer() {
    this._stopTimer();

    this.timer = setInterval(() => {
      this.timerValue--;

      // Update timer display
      if (this.timerElement) {
        this.timerElement.textContent = `${this.timerValue}s`;

        // Change color when time is running low
        if (this.timerValue <= 10) {
          this.timerElement.classList.add("bg-red-600");
          this.timerElement.classList.remove("bg-gray-800");
        }
      }

      // Check if time is up
      if (this.timerValue <= 0) {
        this._handleTimeUp();
      }
    }, 1000);
  }

  /**
   * Stop countdown timer
   */
  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Handle time running out
   */
  _handleTimeUp() {
    this._stopTimer();
    this._stopHazardTimer();
    this._stopRouteExecution();

    this._showMessage("Time's up! The escape route was too slow.", "error");

    // Reset the puzzle after a short delay
    setTimeout(() => {
      this._resetPuzzle();
    }, 3000);
  }

  /**
   * Render the grid on the UI
   */
  _render() {
    if (!this.gridElement) return;

    this.gridElement.innerHTML = "";

    // Update route display
    this._updateRouteDisplay();

    // Create cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const cellElement = document.createElement("div");

        // Basic cell styling
        cellElement.className =
          "flex items-center justify-center w-full h-full rounded relative";

        // Set cell color based on type
        switch (cell.type) {
          case "player":
            cellElement.classList.add("bg-blue-500");
            cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">👤</span>`;
            break;
          case "exit":
            cellElement.classList.add("bg-green-500");
            cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">🚪</span>`;
            break;
          case "guard":
            cellElement.classList.add("bg-red-500");
            cellElement.innerHTML = `<span class="h-full w-full flex items-center justify-center">👮</span>`;
            break;
          case "camera":
            cellElement.classList.add("bg-yellow-500");

            // Show camera direction
            const directionSymbols = {
              up: "↑",
              right: "→",
              down: "↓",
              left: "←",
            };

            const camera = this.cameras.find((c) => c.x === x && c.y === y);
            if (camera) {
              cellElement.innerHTML = `<span class="text-white font-bold">${
                directionSymbols[camera.direction]
              }</span>`;
            } else {
              cellElement.innerHTML = `<span class="text-white font-bold">📷</span>`;
            }
            break;
          case "laser":
            cellElement.classList.add("bg-purple-500");

            // Show if laser is active and its orientation
            const laser = this.lasers.find((l) => l.x === x && l.y === y);
            if (laser) {
              const symbol = laser.orientation === "horizontal" ? "⬅➡" : "⬆⬇";
              const opacity = laser.active ? "opacity-100" : "opacity-50";
              cellElement.innerHTML = `<span class="text-white font-bold ${opacity}">${symbol}</span>`;
            } else {
              cellElement.innerHTML = `<span class="text-white font-bold">⚡</span>`;
            }
            break;
          default:
            // Empty cell or path cell
            if (cell.isPath) {
              cellElement.classList.add("bg-blue-300");
            } else {
              cellElement.classList.add("bg-gray-700");

              // Highlight cells that are unsafe
              if (!cell.isSafe) {
                if (cell.inCameraSight) {
                  cellElement.classList.add(
                    "ring-2",
                    "ring-yellow-400",
                    "ring-opacity-50"
                  );
                }
                if (cell.inLaserBeam) {
                  cellElement.classList.add(
                    "ring-2",
                    "ring-purple-400",
                    "ring-opacity-70"
                  );
                }
              }

              // In planning mode, highlight empty cells that can have path
              if (this.isRoutePlanning && !this.isExecutingRoute) {
                cellElement.classList.add(
                  "hover:bg-gray-600",
                  "cursor-pointer"
                );
              }
            }
        }

        // Add data attributes for position
        cellElement.dataset.x = x;
        cellElement.dataset.y = y;

        // Add click handler for planning mode
        if (this.isRoutePlanning && !this.isExecutingRoute) {
          cellElement.addEventListener("click", () =>
            this._handleCellClick(x, y)
          );
        }

        this.gridElement.appendChild(cellElement);
      }
    }
  }

  /**
   * Update the route display
   */
  _updateRouteDisplay() {
    if (!this.routeElement) return;

    if (this.plannedRoute.length === 0) {
      this.routeElement.textContent = "Route: Not planned yet";

      // Disable execute button
      if (this.executeButton) {
        this.executeButton.disabled = true;
      }
    } else {
      // Format route as coordinates
      const routeText = this.plannedRoute
        .map((point) => `(${point.x},${point.y})`)
        .join(" → ");

      this.routeElement.textContent = `Route: ${routeText}`;

      // Enable execute button if route reaches exit
      if (this.executeButton) {
        const lastPoint = this.plannedRoute[this.plannedRoute.length - 1];
        this.executeButton.disabled = !(
          lastPoint.x === this.exitPosition.x &&
          lastPoint.y === this.exitPosition.y
        );
      }
    }
  }

  /**
   * Handle cell click for path planning
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _handleCellClick(x, y) {
    // Ignore if not in planning mode or if puzzle is complete
    if (!this.isRoutePlanning || this.isComplete) return;

    // Can't click on security elements
    if (["guard", "camera", "laser"].includes(this.grid[y][x].type)) {
      this._showMessage(
        "Cannot plan route through security elements!",
        "error"
      );
      return;
    }

    // Check if we're starting a new path
    if (this.plannedRoute.length === 0) {
      // First point must be the player position
      if (x !== this.playerPosition.x || y !== this.playerPosition.y) {
        this._showMessage("Route must start at your position!", "error");
        return;
      }

      // Add starting point
      this.plannedRoute.push({ x, y });
      this.grid[y][x].isPath = true;
      this._render();
      return;
    }

    // Check if we're continuing an existing path
    const lastPoint = this.plannedRoute[this.plannedRoute.length - 1];

    // Calculate manhattan distance to ensure adjacent cells only
    const distance = Math.abs(x - lastPoint.x) + Math.abs(y - lastPoint.y);

    if (distance !== 1) {
      this._showMessage(
        "Path must be continuous! Click adjacent cells.",
        "error"
      );
      return;
    }

    // Check if this point is already in the path (except for removing the last point)
    const existingIndex = this.plannedRoute.findIndex(
      (p) => p.x === x && p.y === y
    );

    if (existingIndex !== -1) {
      // If it's the previous point, remove the last point
      if (existingIndex === this.plannedRoute.length - 2) {
        const removedPoint = this.plannedRoute.pop();
        this.grid[removedPoint.y][removedPoint.x].isPath = false;
        this._render();
        return;
      }

      // Otherwise, don't allow crossing the path
      this._showMessage("Path cannot cross itself!", "error");
      return;
    }

    // Add the point to the planned route
    this.plannedRoute.push({ x, y });
    this.grid[y][x].isPath = true;

    // Check if we've reached the exit
    if (x === this.exitPosition.x && y === this.exitPosition.y) {
      this._showMessage(
        "Route complete! Click 'Execute Route' to test it.",
        "success"
      );

      // Enable execute button
      if (this.executeButton) {
        this.executeButton.disabled = false;
      }
    }

    // Render updated state
    this._render();
  }

  /**
   * Reset the planned route
   */
  _resetRoute() {
    // Clear existing path
    for (const point of this.plannedRoute) {
      if (this.grid[point.y][point.x].type === "empty") {
        this.grid[point.y][point.x].isPath = false;
      }
    }

    // Reset route
    this.plannedRoute = [];

    // Disable execute button
    if (this.executeButton) {
      this.executeButton.disabled = true;
    }

    // Show message
    this._showMessage("Route cleared. Plan a new escape route.");

    // Render updated state
    this._render();
  }

  /**
   * Execute the planned route
   */
  _executeRoute() {
    // Ensure we have a valid route
    if (this.plannedRoute.length === 0) {
      this._showMessage("Plan a route first!", "error");
      return;
    }

    // Check if the route ends at the exit
    const lastPoint = this.plannedRoute[this.plannedRoute.length - 1];
    if (
      lastPoint.x !== this.exitPosition.x ||
      lastPoint.y !== this.exitPosition.y
    ) {
      this._showMessage("Route must reach the exit!", "error");
      return;
    }

    // Enter execution mode
    this.isRoutePlanning = false;
    this.isExecutingRoute = true;

    // Update UI
    this.modeElement.textContent = "EXECUTION MODE: Following planned route";
    this.modeElement.classList.remove("bg-blue-600");
    this.modeElement.classList.add("bg-green-600");

    // Disable buttons
    if (this.executeButton) {
      this.executeButton.disabled = true;
    }

    // Start at the beginning of the route
    this.routeExecutionIndex = 0;

    // Reset player position
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "empty";
    this.playerPosition = {
      x: this.plannedRoute[0].x,
      y: this.plannedRoute[0].y,
    };
    this.grid[this.playerPosition.y][this.playerPosition.x].type = "player";

    // Show message
    this._showMessage("Executing escape route...");

    // Render updated state
    this._render();

    // Start execution
    this._followRoute();
  }

  /**
   * Follow the planned route step by step
   */
  _followRoute() {
    // Stop any existing execution
    this._stopRouteExecution();

    // Set timer for movement
    this.routeExecutionTimer = setInterval(() => {
      // Move to next point in route
      this.routeExecutionIndex++;

      // Check if we've reached the end of the route
      if (this.routeExecutionIndex >= this.plannedRoute.length) {
        this._handleRouteCompletion();
        return;
      }

      // Update player position
      const nextPoint = this.plannedRoute[this.routeExecutionIndex];

      // Clear current position
      this.grid[this.playerPosition.y][this.playerPosition.x].type = "empty";

      // Update position
      this.playerPosition = { x: nextPoint.x, y: nextPoint.y };

      // Check if we're at the exit
      if (
        this.playerPosition.x === this.exitPosition.x &&
        this.playerPosition.y === this.exitPosition.y
      ) {
        this._handleRouteCompletion();
        return;
      }

      // Update grid with new player position
      this.grid[this.playerPosition.y][this.playerPosition.x].type = "player";

      // Check if player is in danger
      this._checkCurrentPosition();

      // Render updated state
      this._render();
    }, 500); // 500ms per move for smooth animation
  }

  /**
   * Stop route execution
   */
  _stopRouteExecution() {
    if (this.routeExecutionTimer) {
      clearInterval(this.routeExecutionTimer);
      this.routeExecutionTimer = null;
    }
  }

  /**
   * Check if player's current position is safe
   */
  _checkCurrentPosition() {
    const x = this.playerPosition.x;
    const y = this.playerPosition.y;

    // Check if player is caught by a guard
    if (this.guards.some((guard) => guard.x === x && guard.y === y)) {
      this._handlePlayerCaught("You were caught by a guard!");
      return;
    }

    // Check if player is in camera sight or laser beam
    if (!this.grid[y][x].isSafe) {
      let message = "You were detected by security!";

      if (this.grid[y][x].inCameraSight) {
        message = "You were spotted by a camera!";
      } else if (this.grid[y][x].inLaserBeam) {
        message = "You triggered a laser alarm!";
      }

      this._handlePlayerCaught(message);
      return;
    }
  }

  /**
   * Handle player being caught
   * @param {string} message - Message to display
   */
  _handlePlayerCaught(message) {
    // Stop execution
    this._stopRouteExecution();

    // Show failure message
    this._showMessage(message, "error");

    // Reset after a delay
    setTimeout(() => {
      this._resetPuzzle();
    }, 2000);
  }

  /**
   * Handle successful route completion
   */
  _handleRouteCompletion() {
    // Stop execution
    this._stopRouteExecution();

    // Mark puzzle as complete
    this.isComplete = true;

    // Stop hazards and timer
    this._stopHazardTimer();
    this._stopTimer();

    // Show success message
    this._showMessage(
      "Escape route successfully executed! Mission complete.",
      "success"
    );

    // Call success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Reset the entire puzzle
   */
  _resetPuzzle() {
    // Stop all timers
    this._stopRouteExecution();
    this._stopHazardTimer();
    this._stopTimer();

    // Reset properties
    this.isRoutePlanning = true;
    this.isExecutingRoute = false;
    this.plannedRoute = [];
    this.routeExecutionIndex = 0;

    // Reset grid
    this._initializeGrid();
    this._placeSecurityElements();

    // Reset timer
    this.timerValue = this.difficulty === 5 ? 50 : 60;
    if (this.timerElement) {
      this.timerElement.textContent = `${this.timerValue}s`;
      this.timerElement.classList.remove("bg-red-600");
      this.timerElement.classList.add("bg-gray-800");
    }

    // Update UI
    this.modeElement.textContent =
      "PLANNING MODE: Click cells to plot your escape";
    this.modeElement.classList.remove("bg-green-600");
    this.modeElement.classList.add("bg-blue-600");

    // Enable/disable buttons appropriately
    if (this.executeButton) {
      this.executeButton.disabled = true;
    }

    // Restart timers
    this._startHazardTimer();
    this._startTimer();

    // Show message
    this._showMessage("Puzzle reset. Plan a new escape route!");

    // Render updated state
    this._render();
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
    this._stopRouteExecution();
    this._stopHazardTimer();
    this._stopTimer();
  }

  /**
   * Get the current solution
   * @returns {Object} - The solution data
   */
  getSolution() {
    return {
      isComplete: this.isComplete,
      routeLength: this.plannedRoute.length,
      timeRemaining: this.timerValue,
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
    return "You need to plan and execute a successful escape route!";
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
          "Extra security patrol! Guards moving faster.",
          "warning"
        );

        // Temporarily speed up hazard timer
        const originalInterval = this.hazardUpdateInterval;
        this.hazardUpdateInterval = Math.max(
          300,
          this.hazardUpdateInterval / 2
        );

        // Restart timer with new interval
        this._stopHazardTimer();
        this._startHazardTimer();

        // Reset after duration
        setTimeout(() => {
          this.hazardUpdateInterval = originalInterval;
          this._stopHazardTimer();
          this._startHazardTimer();
          this._showMessage(
            "Security patrol ended. Normal operations resumed."
          );
        }, duration * 1000);
        break;

      case "camera_sweep":
        this._showMessage("Emergency camera sweep in progress!", "warning");

        // Temporarily have cameras rotate
        if (!this.isExecutingRoute) {
          this.cameras.forEach((camera) => {
            // Rotate camera
            const directions = ["up", "right", "down", "left"];
            const currentIndex = directions.indexOf(camera.direction);
            camera.direction = directions[(currentIndex + 1) % 4];

            // Recalculate sight lines
            this._clearAllCameraSightlines();
            this.cameras.forEach((cam) => this._calculateCameraSightline(cam));
          });

          // Render updated state
          this._render();
        }
        break;
    }
  }

  /**
   * Clear all camera sight lines
   */
  _clearAllCameraSightlines() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x].inCameraSight) {
          delete this.grid[y][x].inCameraSight;

          // Reset isSafe if not in laser beam
          if (!this.grid[y][x].inLaserBeam) {
            this.grid[y][x].isSafe = true;
          }
        }
      }
    }
  }
}

export default EscapeRoutePuzzle;
