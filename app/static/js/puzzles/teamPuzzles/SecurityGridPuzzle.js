// SecurityGridPuzzle.js - Team Puzzle 2: Security Grid Hack
// Difficulty: 2/5 - Moderate difficulty requiring careful coordination

class SecurityGridPuzzle {
  constructor(containerElement, puzzleData, callbacks, playerRole) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.playerRole = playerRole;
    this.isComplete = false;

    // Grid size
    this.gridSize = 6; // 6x6 grid

    // Team state tracking
    this.teamState = {
      gridState: this._createInitialGrid(),
      currentPlayer: null,
      playerPositions: {
        Hacker: { row: 0, col: 0 },
        "Safe Cracker": { row: 0, col: this.gridSize - 1 },
        Demolitions: { row: this.gridSize - 1, col: 0 },
        Lookout: { row: this.gridSize - 1, col: this.gridSize - 1 },
      },
      playerReachedObjective: {
        Hacker: false,
        "Safe Cracker": false,
        Demolitions: false,
        Lookout: false,
      },
      completionStatus: "incomplete",
    };

    // Objectives - each player needs to reach their designated control panel
    this.objectives = {
      Hacker: {
        row: Math.floor(this.gridSize / 2),
        col: Math.floor(this.gridSize / 2) - 1,
      },
      "Safe Cracker": {
        row: Math.floor(this.gridSize / 2) - 1,
        col: Math.floor(this.gridSize / 2),
      },
      Demolitions: {
        row: Math.floor(this.gridSize / 2),
        col: Math.floor(this.gridSize / 2) + 1,
      },
      Lookout: {
        row: Math.floor(this.gridSize / 2) + 1,
        col: Math.floor(this.gridSize / 2),
      },
    };

    // Role colors
    this.roleColors = {
      Hacker: { bg: "bg-cyan-600", text: "text-cyan-100" },
      "Safe Cracker": { bg: "bg-yellow-600", text: "text-yellow-100" },
      Demolitions: { bg: "bg-red-600", text: "text-red-100" },
      Lookout: { bg: "bg-green-600", text: "text-green-100" },
    };

    // DOM elements
    this.gridElement = null;
    this.statusElement = null;
    this.controlsElement = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this._createUI();
    this._setupEventListeners();

    // Add security grid obstacles
    this._addGridObstacles();

    // Render the grid
    this._renderGrid();

    this.callbacks.showMessage(
      "Work together to navigate the security grid. Each team member must reach their designated control panel.",
      "info"
    );
  }

  /**
   * Create the UI for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className = "security-grid-puzzle flex flex-col space-y-4";

    // Instructions
    const instructions = document.createElement("div");
    instructions.className =
      "instructions p-3 bg-gray-900 rounded-lg text-white text-center";
    instructions.innerHTML = `
      <p>Each team member must reach their colored control panel by navigating through the security grid.</p>
      <p class="text-sm text-gray-400 mt-1">Be careful! Some grid cells can only be passed by specific roles.</p>
    `;
    puzzleContainer.appendChild(instructions);

    // Grid display
    const gridContainer = document.createElement("div");
    gridContainer.className = "grid-container flex justify-center";

    this.gridElement = document.createElement("div");
    this.gridElement.className = `grid grid-cols-${this.gridSize} gap-1 w-full max-w-md`;

    gridContainer.appendChild(this.gridElement);
    puzzleContainer.appendChild(gridContainer);

    // Status display
    this.statusElement = document.createElement("div");
    this.statusElement.className =
      "status p-3 bg-gray-900 rounded-lg grid grid-cols-2 gap-2";

    // Add status for each role
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];
    roles.forEach((role) => {
      const roleStatus = document.createElement("div");
      roleStatus.className = `p-2 rounded ${this.roleColors[role].bg} ${this.roleColors[role].text}`;
      roleStatus.innerHTML = `
        <div class="font-bold">${role}</div>
        <div class="status-text text-sm">At start position</div>
      `;
      this.statusElement.appendChild(roleStatus);
    });

    puzzleContainer.appendChild(this.statusElement);

    // Controls
    this.controlsElement = document.createElement("div");
    this.controlsElement.className = "controls p-3 bg-gray-800 rounded-lg";

    // Add current player indicator
    const playerIndicator = document.createElement("div");
    playerIndicator.className = `current-player p-2 rounded mb-3 ${
      this.roleColors[this.playerRole].bg
    } ${this.roleColors[this.playerRole].text} text-center font-bold`;
    playerIndicator.textContent = `You are: ${this.playerRole}`;
    this.controlsElement.appendChild(playerIndicator);

    // Movement controls
    const movementControls = document.createElement("div");
    movementControls.className =
      "movement-controls grid grid-cols-3 gap-2 max-w-xs mx-auto";

    // Create the directional buttons in a grid layout
    for (let i = 0; i < 9; i++) {
      const button = document.createElement("button");
      button.className =
        "h-12 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors";

      if (i === 1) {
        // Up
        button.innerHTML = "↑";
        button.dataset.direction = "up";
        button.classList.add("directional-btn");
      } else if (i === 3) {
        // Left
        button.innerHTML = "←";
        button.dataset.direction = "left";
        button.classList.add("directional-btn");
      } else if (i === 5) {
        // Right
        button.innerHTML = "→";
        button.dataset.direction = "right";
        button.classList.add("directional-btn");
      } else if (i === 7) {
        // Down
        button.innerHTML = "↓";
        button.dataset.direction = "down";
        button.classList.add("directional-btn");
      } else {
        button.style.visibility = "hidden"; // Hide the corner buttons
      }

      movementControls.appendChild(button);
    }

    this.controlsElement.appendChild(movementControls);
    puzzleContainer.appendChild(this.controlsElement);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Create initial grid state
   * @returns {Array} Grid state
   */
  _createInitialGrid() {
    const grid = [];

    for (let row = 0; row < this.gridSize; row++) {
      const gridRow = [];
      for (let col = 0; col < this.gridSize; col++) {
        gridRow.push({
          type: "empty",
          allowedRoles: ["Hacker", "Safe Cracker", "Demolitions", "Lookout"],
          occupiedBy: null,
        });
      }
      grid.push(gridRow);
    }

    return grid;
  }

  /**
   * Add obstacles and special cells to the grid
   */
  _addGridObstacles() {
    const grid = this.teamState.gridState;

    // Place control panels (objectives)
    for (const [role, position] of Object.entries(this.objectives)) {
      grid[position.row][position.col] = {
        type: "objective",
        targetRole: role,
        allowedRoles: ["Hacker", "Safe Cracker", "Demolitions", "Lookout"],
        occupiedBy: null,
      };
    }

    // Place obstacles
    const obstacleCount = Math.floor(this.gridSize * this.gridSize * 0.2); // 20% of cells are obstacles

    for (let i = 0; i < obstacleCount; i++) {
      let row, col;

      // Make sure we don't place obstacles on starting positions, objectives, or other obstacles
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (
        this._isStartingPosition(row, col) ||
        this._isObjective(row, col) ||
        grid[row][col].type === "obstacle"
      );

      grid[row][col] = {
        type: "obstacle",
        allowedRoles: [],
        occupiedBy: null,
      };
    }

    // Place role-specific cells
    const roleSpecificCount = Math.floor(this.gridSize * this.gridSize * 0.15); // 15% of cells are role-specific
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];

    for (let i = 0; i < roleSpecificCount; i++) {
      let row, col;

      // Make sure we don't place on starting positions, objectives, or obstacles
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (
        this._isStartingPosition(row, col) ||
        this._isObjective(row, col) ||
        grid[row][col].type !== "empty"
      );

      // Randomly select a role that can pass through this cell
      const allowedRole = roles[Math.floor(Math.random() * roles.length)];

      grid[row][col] = {
        type: "role-specific",
        allowedRoles: [allowedRole],
        occupiedBy: null,
      };
    }

    // Add shared-access cells (two roles can pass)
    const sharedAccessCount = Math.floor(this.gridSize * this.gridSize * 0.1); // 10% shared access

    for (let i = 0; i < sharedAccessCount; i++) {
      let row, col;

      // Make sure we don't place on starting positions, objectives, or non-empty cells
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (
        this._isStartingPosition(row, col) ||
        this._isObjective(row, col) ||
        grid[row][col].type !== "empty"
      );

      // Randomly select two roles
      const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);
      const allowedRoles = [shuffledRoles[0], shuffledRoles[1]];

      grid[row][col] = {
        type: "role-specific",
        allowedRoles: allowedRoles,
        occupiedBy: null,
      };
    }

    // Place players at their starting positions
    for (const [role, position] of Object.entries(
      this.teamState.playerPositions
    )) {
      grid[position.row][position.col].occupiedBy = role;
    }

    // Ensure there's a valid path for each player to their objective
    this._ensureValidPaths();

    this.teamState.gridState = grid;
  }

  /**
   * Check if a cell is a starting position
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {boolean} - Whether the cell is a starting position
   */
  _isStartingPosition(row, col) {
    for (const position of Object.values(this.teamState.playerPositions)) {
      if (position.row === row && position.col === col) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a cell is an objective
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {boolean} - Whether the cell is an objective
   */
  _isObjective(row, col) {
    for (const position of Object.values(this.objectives)) {
      if (position.row === row && position.col === col) {
        return true;
      }
    }
    return false;
  }

  /**
   * Ensure there's a valid path for each player to their objective
   * This is a simplified implementation - just ensures there are enough empty cells
   */
  _ensureValidPaths() {
    const grid = this.teamState.gridState;

    // For simplicity, we'll just ensure there are enough empty cells around obstacles
    // A more sophisticated implementation would use pathfinding algorithms

    // Clear some cells around objectives
    for (const position of Object.values(this.objectives)) {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
          const row = position.row + rowOffset;
          const col = position.col + colOffset;

          if (
            row >= 0 &&
            row < this.gridSize &&
            col >= 0 &&
            col < this.gridSize &&
            grid[row][col].type === "obstacle"
          ) {
            // Convert some obstacles to empty cells
            if (Math.random() < 0.7) {
              // 70% chance to clear
              grid[row][col] = {
                type: "empty",
                allowedRoles: [
                  "Hacker",
                  "Safe Cracker",
                  "Demolitions",
                  "Lookout",
                ],
                occupiedBy: null,
              };
            }
          }
        }
      }
    }
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    // Add event listeners to directional buttons
    this.controlsElement
      .querySelectorAll(".directional-btn")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const direction = button.dataset.direction;
          this._movePlayer(direction);
        });
      });

    // Add keyboard controls
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        this._movePlayer("up");
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        this._movePlayer("left");
      } else if (e.key === "ArrowRight" || e.key === "d") {
        this._movePlayer("right");
      } else if (e.key === "ArrowDown" || e.key === "s") {
        this._movePlayer("down");
      }
    });
  }

  /**
   * Move player in a direction
   * @param {string} direction - Direction to move (up, right, down, left)
   */
  _movePlayer(direction) {
    if (this.isComplete) return;

    // Get current player position
    const playerPos = this.teamState.playerPositions[this.playerRole];
    if (!playerPos) return;

    let newRow = playerPos.row;
    let newCol = playerPos.col;

    // Calculate new position
    switch (direction) {
      case "up":
        newRow = Math.max(0, playerPos.row - 1);
        break;
      case "right":
        newCol = Math.min(this.gridSize - 1, playerPos.col + 1);
        break;
      case "down":
        newRow = Math.min(this.gridSize - 1, playerPos.row + 1);
        break;
      case "left":
        newCol = Math.max(0, playerPos.col - 1);
        break;
    }

    // Check if new position is valid
    if (this._isValidMove(newRow, newCol)) {
      // Update grid occupancy
      const grid = this.teamState.gridState;
      grid[playerPos.row][playerPos.col].occupiedBy = null;
      grid[newRow][newCol].occupiedBy = this.playerRole;

      // Update player position
      this.teamState.playerPositions[this.playerRole] = {
        row: newRow,
        col: newCol,
      };

      // Check if player reached their objective
      this._checkObjectiveReached(newRow, newCol);

      // Send update to team
      this._sendTeamUpdate();

      // Update display
      this._renderGrid();
    } else {
      // Show error message
      this.callbacks.showMessage("You can't move there!", "error");
    }
  }

  /**
   * Check if a move is valid
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {boolean} - Whether the move is valid
   */
  _isValidMove(row, col) {
    const grid = this.teamState.gridState;
    const cell = grid[row][col];

    // Can't move to a cell occupied by another player
    if (cell.occupiedBy && cell.occupiedBy !== this.playerRole) {
      return false;
    }

    // Can't move to obstacle
    if (cell.type === "obstacle") {
      return false;
    }

    // Check if player's role is allowed to enter this cell
    return cell.allowedRoles.includes(this.playerRole);
  }

  /**
   * Check if player reached their objective
   * @param {number} row - Row index
   * @param {number} col - Column index
   */
  _checkObjectiveReached(row, col) {
    const objective = this.objectives[this.playerRole];

    if (row === objective.row && col === objective.col) {
      this.teamState.playerReachedObjective[this.playerRole] = true;
      this.callbacks.showMessage(
        `You've reached your control panel!`,
        "success"
      );

      // Check if all players reached their objectives
      this._checkAllObjectivesReached();
    }
  }

  /**
   * Check if all players reached their objectives
   */
  _checkAllObjectivesReached() {
    const allReached = Object.values(
      this.teamState.playerReachedObjective
    ).every((reached) => reached);

    if (allReached && this.teamState.completionStatus === "incomplete") {
      this.teamState.completionStatus = "complete";
      this.isComplete = true;

      // Update UI
      this._renderGrid();

      // Show success message
      this.callbacks.showMessage(
        "Security grid bypassed! All control panels activated.",
        "success"
      );

      // Send update to team
      this._sendTeamUpdate();
    }
  }

  /**
   * Render the grid
   */
  _renderGrid() {
    if (!this.gridElement) return;

    this.gridElement.innerHTML = "";
    const grid = this.teamState.gridState;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = grid[row][col];
        const cellElement = document.createElement("div");

        // Base cell styling
        cellElement.className =
          "aspect-square flex items-center justify-center rounded relative";

        // Determine cell appearance based on type
        if (cell.type === "obstacle") {
          cellElement.classList.add("bg-gray-900");
          cellElement.innerHTML = `<div class="w-full h-full bg-gray-900 rounded flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>`;
        } else if (cell.type === "objective") {
          // Control panel styling based on target role
          const roleColor = this.roleColors[cell.targetRole].bg;
          cellElement.classList.add(roleColor.replace("600", "900"));
          cellElement.innerHTML = `<div class="w-full h-full rounded flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
            </svg>
          </div>`;

          // Add a glow if this objective is for the current player
          if (cell.targetRole === this.playerRole) {
            cellElement.classList.add(
              "ring-2",
              "ring-white",
              "ring-opacity-50"
            );
          }
        } else if (cell.type === "role-specific") {
          // Role-specific cell styling
          if (cell.allowedRoles.length === 1) {
            // Only one role can pass
            const roleColor = this.roleColors[cell.allowedRoles[0]].bg.replace(
              "600",
              "800"
            );
            cellElement.classList.add(roleColor, "bg-opacity-50");
          } else {
            // Multiple roles can pass
            cellElement.classList.add("bg-gray-700", "bg-opacity-50");
          }

          // Add icons for allowed roles
          const roleIcons = cell.allowedRoles
            .map((role) => {
              const color = this.roleColors[role].text;
              return `<span class="inline-block w-2 h-2 rounded-full ${this.roleColors[role].bg} mx-0.5"></span>`;
            })
            .join("");

          cellElement.innerHTML = `<div class="absolute bottom-0 left-0 right-0 flex justify-center pb-1">${roleIcons}</div>`;
        } else {
          // Empty cell
          cellElement.classList.add("bg-gray-800");
        }

        // Add player marker if cell is occupied
        if (cell.occupiedBy) {
          const playerMarker = document.createElement("div");
          playerMarker.className = `absolute inset-1 rounded-full ${
            this.roleColors[cell.occupiedBy].bg
          } flex items-center justify-center text-white font-bold`;
          playerMarker.textContent = cell.occupiedBy.charAt(0);

          // Highlight current player
          if (cell.occupiedBy === this.playerRole) {
            playerMarker.classList.add("ring-2", "ring-white", "animate-pulse");
          }

          cellElement.appendChild(playerMarker);
        }

        this.gridElement.appendChild(cellElement);
      }
    }

    // Update status display
    this._updateStatusDisplay();

    // If all objectives reached, show success effect
    if (this.teamState.completionStatus === "complete") {
      this._showSuccessEffect();
    }
  }

  /**
   * Update the team status display
   */
  _updateStatusDisplay() {
    const statusElements = this.statusElement.querySelectorAll(".status-text");
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];

    roles.forEach((role, index) => {
      const statusText = statusElements[index];
      if (statusText) {
        if (this.teamState.playerReachedObjective[role]) {
          statusText.textContent = "Control panel activated ✓";
          statusText.parentElement.classList.add("bg-opacity-100");
        } else {
          statusText.textContent = "Moving to control panel...";
          statusText.parentElement.classList.add("bg-opacity-70");
        }
      }
    });
  }

  /**
   * Show success effect when all objectives are reached
   */
  _showSuccessEffect() {
    // Show success overlay
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center z-10 animate-pulse";
    successOverlay.innerHTML = `
      <div class="text-white text-2xl font-bold p-4 bg-gray-900 bg-opacity-90 rounded">
        SECURITY GRID BYPASSED
      </div>
    `;

    // Only add if not already there
    if (!this.gridElement.querySelector(".animate-pulse")) {
      // Position relative for absolute overlay
      this.gridElement.style.position = "relative";
      this.gridElement.appendChild(successOverlay);
    }
  }

  /**
   * Send team update
   */
  _sendTeamUpdate() {
    if (this.callbacks.sendTeamUpdate) {
      this.callbacks.sendTeamUpdate(this.teamState);
    }
  }

  /**
   * Handle team update from other players
   * @param {Object} updateData - Update data
   */
  handleTeamUpdate(updateData) {
    // Update our local state with the received data
    Object.assign(this.teamState, updateData);

    // Check completion status
    if (updateData.completionStatus === "complete") {
      this.isComplete = true;
    }

    // Update display
    this._renderGrid();
  }

  /**
   * Get the current solution
   * @returns {Object} - Solution object
   */
  getSolution() {
    return {
      allObjectivesReached: this.teamState.completionStatus === "complete",
      playerReachedObjective: this.teamState.playerReachedObjective,
    };
  }

  /**
   * Validate the solution
   * @param {Object} solution - Solution to validate
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution(solution) {
    return solution && solution.allObjectivesReached === true;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Security grid is still active. All team members must reach their control panels.";
  }

  /**
   * Show success UI when puzzle is solved
   */
  showSuccess() {
    // Already handled in rendering
  }

  /**
   * Clean up event listeners and references
   */
  cleanup() {
    // Remove keyboard event listeners
    document.removeEventListener("keydown", this._movePlayer);
  }
}

export default SecurityGridPuzzle;
