// hackerPuzzleController.js - Controls puzzles for the Hacker role

class HackerPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.gridSize = 5; // Default
    this.grid = [];
    this.currentPath = [];
    this.isDragging = false;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;

    // DOM elements will be created during initialization
    this.gridElement = null;
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
    header.className = "text-xl font-bold text-blue-400 mb-4";
    header.textContent = `Hacker Mission: ${this._getPuzzleTitle()}`;
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
    gameArea.className = "flex justify-center mb-6";
    this.containerElement.appendChild(gameArea);

    // Determine which puzzle to render based on stage/type
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "circuit") {
      this._setupCircuitPuzzle(gameArea);
    } else if (puzzleType === "password_crack") {
      this._setupPasswordCrackPuzzle(gameArea);
    } else if (puzzleType === "firewall_bypass") {
      this._setupFirewallBypassPuzzle(gameArea);
    } else if (puzzleType === "encryption_key") {
      this._setupEncryptionKeyPuzzle(gameArea);
    } else if (puzzleType === "system_override") {
      this._setupSystemOverridePuzzle(gameArea);
    } else {
      // Fallback to circuit puzzle if type unknown
      this._setupCircuitPuzzle(gameArea);
    }

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Submit Solution";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent =
      "Access granted! Circuit completed successfully.";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable grid
    if (this.gridElement) {
      this.gridElement.classList.add("opacity-50", "pointer-events-none");
    }

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Circuit Complete";
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
    if (eventType === "system_check") {
      // For system check, temporarily disable the grid
      if (this.gridElement) {
        this.gridElement.classList.add("opacity-50", "pointer-events-none");
      }
      this.submitButton.disabled = true;

      // Re-enable after duration
      setTimeout(() => {
        if (this.gridElement) {
          this.gridElement.classList.remove(
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
    // Clear event listeners if needed
    if (this.gridElement) {
      const cells = this.gridElement.querySelectorAll(".grid-cell");
      cells.forEach((cell) => {
        cell.removeEventListener("mousedown", null);
        cell.removeEventListener("mouseenter", null);
        cell.removeEventListener("mouseup", null);
      });
    }

    // Clear references
    this.gridElement = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Private: Setup circuit puzzle (Stage 1)
   * @param {HTMLElement} container - Container element
   */
  _setupCircuitPuzzle(container) {
    // Get puzzle data
    const { grid_size, start_point, end_point, barriers, switches } =
      this.puzzleData.data;
    this.gridSize = grid_size || 5;

    // Create grid
    this.grid = Array(this.gridSize)
      .fill()
      .map(() => Array(this.gridSize).fill(0));

    // Set start and end points
    this.grid[start_point[0]][start_point[1]] = 2; // Start
    this.grid[end_point[0]][end_point[1]] = 3; // End

    // Set barriers
    barriers.forEach(([x, y]) => {
      this.grid[x][y] = 4; // Barrier
    });

    // Set switches
    switches.forEach(([x, y]) => {
      this.grid[x][y] = 5; // Switch
    });

    // Create the grid element
    this.gridElement = document.createElement("div");
    this.gridElement.className =
      "grid grid-cols-" + this.gridSize + " gap-1 bg-gray-900 p-4 rounded-lg";
    this.gridElement.style.width = this.gridSize * 60 + "px";

    // Create cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = document.createElement("div");
        cell.className =
          "grid-cell w-12 h-12 rounded-md flex items-center justify-center cursor-pointer";
        cell.dataset.x = x;
        cell.dataset.y = y;

        // Set cell appearance based on grid value
        this._updateCellAppearance(cell, this.grid[x][y]);

        // Add event listeners for circuit drawing
        cell.addEventListener("mousedown", (e) =>
          this._handleCellMouseDown(e, x, y)
        );
        cell.addEventListener("mouseenter", (e) =>
          this._handleCellMouseEnter(e, x, y)
        );

        this.gridElement.appendChild(cell);
      }
    }

    // Add mouseup event to document to end dragging
    document.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    container.appendChild(this.gridElement);
  }

  /**
   * Private: Update cell appearance based on its type
   * @param {HTMLElement} cell - Cell element
   * @param {number} type - Cell type (0: empty, 1: path, 2: start, 3: end, 4: barrier, 5: switch)
   */
  _updateCellAppearance(cell, type) {
    // Reset classes
    cell.className =
      "grid-cell w-12 h-12 rounded-md flex items-center justify-center";

    switch (type) {
      case 0: // Empty
        cell.classList.add(
          "bg-gray-700",
          "hover:bg-gray-600",
          "cursor-pointer"
        );
        break;
      case 1: // Path
        cell.classList.add("bg-blue-500", "cursor-pointer");
        break;
      case 2: // Start
        cell.classList.add("bg-green-600", "cursor-not-allowed");
        cell.innerHTML =
          '<div class="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center text-xs font-bold">IN</div>';
        break;
      case 3: // End
        cell.classList.add("bg-red-600", "cursor-not-allowed");
        cell.innerHTML =
          '<div class="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-xs font-bold">OUT</div>';
        break;
      case 4: // Barrier
        cell.classList.add("bg-gray-900", "cursor-not-allowed");
        cell.innerHTML =
          '<div class="w-full h-full border-2 border-gray-600 rounded-md"></div>';
        break;
      case 5: // Switch
        cell.classList.add("bg-yellow-600", "cursor-pointer");
        cell.innerHTML =
          '<div class="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold">S</div>';
        break;
    }
  }

  /**
   * Private: Handle mouse down on a cell
   * @param {Event} e - Mouse event
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   */
  _handleCellMouseDown(e, x, y) {
    // Can only start drawing from start, end, or empty cells
    const cellType = this.grid[x][y];
    if (cellType === 4) return; // Can't start from barriers

    // Clear previous path
    this._clearPath();

    // Start new path
    this.isDragging = true;

    // Add first cell to path
    this._addToPath(x, y);
  }

  /**
   * Private: Handle mouse enter on a cell
   * @param {Event} e - Mouse event
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   */
  _handleCellMouseEnter(e, x, y) {
    if (!this.isDragging) return;

    // Check if cell is valid to add to path
    const cellType = this.grid[x][y];
    if (cellType === 4) return; // Can't go through barriers

    // Check if cell is adjacent to the last cell in the path
    const lastCell = this.currentPath[this.currentPath.length - 1];
    const dx = Math.abs(x - lastCell.x);
    const dy = Math.abs(y - lastCell.y);

    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      // Add to path
      this._addToPath(x, y);
    }
  }

  /**
   * Private: Add a cell to the current path
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   */
  _addToPath(x, y) {
    // Skip if cell is already in path
    if (this.currentPath.some((cell) => cell.x === x && cell.y === y)) {
      return;
    }

    // Add to path
    this.currentPath.push({ x, y });

    // Don't modify start/end/barrier/switch cells
    const cellType = this.grid[x][y];
    if (cellType === 0) {
      // Update grid
      this.grid[x][y] = 1; // Mark as path

      // Update cell appearance
      const cell = this.gridElement.querySelector(
        `[data-x="${x}"][data-y="${y}"]`
      );
      this._updateCellAppearance(cell, 1);
    }
  }

  /**
   * Private: Clear the current path
   */
  _clearPath() {
    // Reset grid
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (this.grid[x][y] === 1) {
          this.grid[x][y] = 0;

          // Update cell appearance
          const cell = this.gridElement.querySelector(
            `[data-x="${x}"][data-y="${y}"]`
          );
          this._updateCellAppearance(cell, 0);
        }
      }
    }

    // Clear path array
    this.currentPath = [];
  }

  /**
   * Private: Handle submit button click
   */
  _handleSubmit() {
    // Check if the path is complete
    const { start_point, end_point, switches } = this.puzzleData.data;

    // Verify path contains start and end points
    const hasStart = this.currentPath.some(
      (cell) => cell.x === start_point[0] && cell.y === start_point[1]
    );
    const hasEnd = this.currentPath.some(
      (cell) => cell.x === end_point[0] && cell.y === end_point[1]
    );

    // Verify path contains all switches
    const allSwitchesIncluded = switches.every(([x, y]) =>
      this.currentPath.some((cell) => cell.x === x && cell.y === y)
    );

    if (!hasStart || !hasEnd) {
      this.messageElement.textContent =
        "Error: Circuit must connect input to output!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    if (!allSwitchesIncluded) {
      this.messageElement.textContent =
        "Error: All switches must be connected!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Convert path to solution format
    const solution = this.currentPath.map((cell) => [cell.x, cell.y]);

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Uploading code...";

    this.submitSolution(solution)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent = "Invalid circuit path. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Submit Solution";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting solution. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Submit Solution";
      });
  }

  /**
   * Private: Get puzzle title based on type/stage
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "circuit":
        return "Circuit Bypass";
      case "password_crack":
        return "Password Decryption";
      case "firewall_bypass":
        return "Firewall Bypass";
      case "encryption_key":
        return "Encryption Key Recovery";
      case "system_override":
        return "System Override";
      default:
        return "Unknown Mission";
    }
  }

  /**
   * Private: Get puzzle instructions based on type/stage
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    switch (puzzleType) {
      case "circuit":
        return "Create a circuit path from Input to Output that passes through all yellow Switch points. Drag to create the path.";
      case "password_crack":
        return "Decrypt the password by identifying the correct sequence of characters.";
      case "firewall_bypass":
        return "Bypass the firewall by finding vulnerabilities in the security matrix.";
      case "encryption_key":
        return "Recover encryption keys by solving the binary sequence puzzle.";
      case "system_override":
        return "Override the main security system by hacking all terminals simultaneously.";
      default:
        return "Complete your mission to proceed.";
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
        return "Warning: Security patrol detected. Proceed with caution.";
      case "camera_sweep":
        return "Alert: Camera sweep in progress. Minimize activity.";
      case "system_check":
        return "Critical: System performing integrity check. Connection paused.";
      default:
        return "Security alert detected!";
    }
  }

  /**
   * Private: Setup Password Crack puzzle (Stage 2)
   * Would be implemented for stage 2
   */
  _setupPasswordCrackPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent =
      "Password cracking puzzle will be available in Stage 2";
    container.appendChild(message);
  }

  /**
   * Private: Setup Firewall Bypass puzzle (Stage 3)
   * Would be implemented for stage 3
   */
  _setupFirewallBypassPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent = "Firewall bypass puzzle will be available in Stage 3";
    container.appendChild(message);
  }

  /**
   * Private: Setup Encryption Key puzzle (Stage 4)
   * Would be implemented for stage 4
   */
  _setupEncryptionKeyPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent = "Encryption key puzzle will be available in Stage 4";
    container.appendChild(message);
  }

  /**
   * Private: Setup System Override puzzle (Stage 5)
   * Would be implemented for stage 5
   */
  _setupSystemOverridePuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-yellow-400";
    message.textContent = "System override puzzle will be available in Stage 5";
    container.appendChild(message);
  }
}

export default HackerPuzzleController;
