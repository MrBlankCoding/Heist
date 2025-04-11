// Pressure Plate Maze Puzzle - One player (Lookout) sees the correct path and must guide others
// through a maze of pressure plates to deactivate a laser grid

class PressurePlateMaze {
  constructor(container, playerRole, allRoles, onCompleteCallback) {
    this.container = container;
    this.playerRole = playerRole;
    this.allRoles = allRoles;
    this.onComplete = onCompleteCallback;
    this.isCompleted = false;

    // Puzzle specific properties
    this.mazeSize = 6; // 6x6 grid
    this.maze = []; // 2D array representing the maze
    this.correctPath = []; // Array of correct positions
    this.currentPositions = {}; // Current position of each player
    this.steps = 0; // Number of steps taken
    this.maxWrongSteps = 3; // Maximum wrong steps before reset
    this.wrongSteps = 0; // Current wrong steps counter
    this.showPathToLookout = true; // Lookout can see the path

    // DOM elements
    this.puzzleContainer = null;
    this.mazeElement = null;
    this.messageElement = null;
    this.stepCounter = null;
    this.directionButtons = null;
  }

  initialize() {
    // Create puzzle container
    this.puzzleContainer = document.createElement("div");
    this.puzzleContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-3xl";
    this.container.appendChild(this.puzzleContainer);

    // Add title
    const title = document.createElement("h4");
    title.className = "text-lg font-bold text-blue-400 mb-3";
    title.textContent = "Laser Grid Bypass";
    this.puzzleContainer.appendChild(title);

    // Add instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300 text-sm";

    if (this.playerRole === "Lookout") {
      instruction.textContent =
        "You can see the correct path. Guide your team through the pressure plate maze to deactivate the laser grid.";
    } else {
      instruction.textContent =
        "Navigate through the pressure plate maze by following the Lookout's instructions to deactivate the laser grid.";
    }

    this.puzzleContainer.appendChild(instruction);

    // Add message area
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center text-sm hidden";
    this.puzzleContainer.appendChild(this.messageElement);

    // Generate maze and path
    this._generateMaze();

    // Create maze display
    this._createMazeDisplay();

    // Create controls based on role
    this._createControls();
  }

  _generateMaze() {
    // Initialize empty maze
    for (let i = 0; i < this.mazeSize; i++) {
      this.maze[i] = Array(this.mazeSize).fill("empty");
    }

    // Set entrance (bottom row, random column)
    const entranceCol = Math.floor(Math.random() * this.mazeSize);
    const entrance = { row: this.mazeSize - 1, col: entranceCol };
    this.maze[entrance.row][entrance.col] = "entrance";

    // Set exit (top row, random column)
    const exitCol = Math.floor(Math.random() * this.mazeSize);
    const exit = { row: 0, col: exitCol };
    this.maze[exit.row][exit.col] = "exit";

    // Generate a random path from entrance to exit
    this._generatePath(entrance, exit);

    // Place initial position for all players at entrance
    this.allRoles.forEach((role) => {
      this.currentPositions[role] = { ...entrance };
    });

    // Add some traps (wrong pressure plates)
    this._addTraps();
  }

  _generatePath(start, end) {
    this.correctPath = [{ ...start }];

    let current = { ...start };

    while (!(current.row === end.row && current.col === end.col)) {
      // Get possible moves (up, left, right)
      const possibleMoves = [];

      // Prefer moving up to reach the exit
      if (current.row > 0) {
        possibleMoves.push({
          row: current.row - 1,
          col: current.col,
          dir: "up",
        });
      }

      // Can move left if not at leftmost column
      if (current.col > 0) {
        possibleMoves.push({
          row: current.row,
          col: current.col - 1,
          dir: "left",
        });
      }

      // Can move right if not at rightmost column
      if (current.col < this.mazeSize - 1) {
        possibleMoves.push({
          row: current.row,
          col: current.col + 1,
          dir: "right",
        });
      }

      // Avoid revisiting cells
      const validMoves = possibleMoves.filter((move) => {
        return this.maze[move.row][move.col] === "empty";
      });

      if (validMoves.length === 0) {
        // No valid moves, use any possible move
        if (possibleMoves.length === 0) {
          // No possible moves, path is stuck
          break;
        }

        // Choose a random direction
        const move =
          possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        // Move to the next position
        current = { row: move.row, col: move.col };
        this.correctPath.push({ ...current });

        // Mark as part of the path
        if (!(current.row === end.row && current.col === end.col)) {
          this.maze[current.row][current.col] = "path";
        }
      } else {
        // Choose a random valid direction with preference for upward movement
        let move;
        const upwardMoves = validMoves.filter((m) => m.dir === "up");

        if (upwardMoves.length > 0 && Math.random() < 0.7) {
          // 70% chance to move upward if possible
          move = upwardMoves[Math.floor(Math.random() * upwardMoves.length)];
        } else {
          move = validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        // Move to the next position
        current = { row: move.row, col: move.col };
        this.correctPath.push({ ...current });

        // Mark as part of the path
        if (!(current.row === end.row && current.col === end.col)) {
          this.maze[current.row][current.col] = "path";
        }
      }
    }

    return this.correctPath;
  }

  _addTraps() {
    // Add traps (wrong pressure plates) to empty cells
    let trapCount = Math.floor(this.mazeSize * this.mazeSize * 0.3); // 30% of cells are traps

    while (trapCount > 0) {
      const row = Math.floor(Math.random() * this.mazeSize);
      const col = Math.floor(Math.random() * this.mazeSize);

      if (this.maze[row][col] === "empty") {
        this.maze[row][col] = "trap";
        trapCount--;
      }
    }
  }

  _createMazeDisplay() {
    // Create maze container
    const mazeContainer = document.createElement("div");
    mazeContainer.className = "mb-6 mx-auto";

    // Create maze grid
    this.mazeElement = document.createElement("div");
    this.mazeElement.className = "grid gap-1 mb-4 mx-auto";
    this.mazeElement.style.display = "grid";
    this.mazeElement.style.gridTemplateColumns = `repeat(${this.mazeSize}, 48px)`;

    // Create cells
    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        const cell = document.createElement("div");
        cell.className =
          "h-12 w-12 border border-gray-700 rounded flex items-center justify-center relative";
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Set cell appearance based on maze content and player role
        this._setCellAppearance(cell, row, col);

        this.mazeElement.appendChild(cell);
      }
    }

    mazeContainer.appendChild(this.mazeElement);

    // Add step counter
    this.stepCounter = document.createElement("div");
    this.stepCounter.className = "text-sm text-gray-400 mt-2 mb-4 text-center";
    this.stepCounter.textContent = `Steps: ${this.steps} | Wrong Steps: ${this.wrongSteps}/${this.maxWrongSteps}`;
    mazeContainer.appendChild(this.stepCounter);

    this.puzzleContainer.appendChild(mazeContainer);

    // Add legend if player is Lookout
    if (this.playerRole === "Lookout") {
      const legend = document.createElement("div");
      legend.className =
        "grid grid-cols-3 gap-2 text-xs text-gray-400 bg-gray-800 p-2 rounded mb-4";

      legend.innerHTML = `
        <div class="flex items-center">
          <div class="w-4 h-4 bg-green-700 rounded mr-1"></div>
          <span>Entrance</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-blue-700 rounded mr-1"></div>
          <span>Safe Path</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-red-700 rounded mr-1"></div>
          <span>Exit</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-gray-700 border border-yellow-500 rounded mr-1"></div>
          <span>Current Position</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-red-900 rounded mr-1"></div>
          <span>Trapped Plate</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-gray-700 rounded mr-1"></div>
          <span>Unknown Plate</span>
        </div>
      `;

      this.puzzleContainer.appendChild(legend);
    }
  }

  _setCellAppearance(cell, row, col) {
    const cellType = this.maze[row][col];
    let bgColor = "bg-gray-800";
    let content = "";

    // Check if this cell is a player's current position
    const isPlayerPosition = Object.values(this.currentPositions).some(
      (pos) => pos.row === row && pos.col === col
    );

    if (isPlayerPosition) {
      // Cell contains at least one player
      bgColor = "bg-gray-700";
      cell.classList.add("border-yellow-500");

      // Count how many players are on this cell
      const playersHere = Object.entries(this.currentPositions)
        .filter(([_, pos]) => pos.row === row && pos.col === col)
        .map(([role, _]) => role);

      if (playersHere.length === 1) {
        content = this._getRoleEmoji(playersHere[0]);
      } else {
        content = `<div class="text-xs text-center">${playersHere.length} players</div>`;
      }
    } else if (cellType === "entrance") {
      bgColor = "bg-green-700";
      content = "S";
    } else if (cellType === "exit") {
      bgColor = "bg-red-700";
      content = "E";
    } else if (
      cellType === "path" &&
      this.playerRole === "Lookout" &&
      this.showPathToLookout
    ) {
      bgColor = "bg-blue-700";
    } else if (
      cellType === "trap" &&
      this.playerRole === "Lookout" &&
      this.showPathToLookout
    ) {
      bgColor = "bg-red-900";
    }

    cell.className = `h-12 w-12 border border-gray-700 rounded flex items-center justify-center relative ${bgColor}`;
    cell.innerHTML = content;
  }

  _getRoleEmoji(role) {
    switch (role) {
      case "Hacker":
        return "💻";
      case "Safe Cracker":
        return "🔓";
      case "Demolitions":
        return "💥";
      case "Lookout":
        return "👁️";
      default:
        return "👤";
    }
  }

  _createControls() {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "bg-gray-800 p-4 rounded-lg mb-4";

    if (this.playerRole === "Lookout") {
      // Lookout sees a message explaining they need to guide others
      const lookoutMessage = document.createElement("div");
      lookoutMessage.className = "text-yellow-400 mb-3 text-center";
      lookoutMessage.textContent =
        "You can see the safe path. Guide your team using voice communication!";
      controlsContainer.appendChild(lookoutMessage);

      // Add a toggle to show/hide path (for challenge)
      const toggleContainer = document.createElement("div");
      toggleContainer.className = "flex items-center justify-center mb-3";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "text-sm text-gray-300 mr-2";
      toggleLabel.textContent = "Show path:";
      toggleContainer.appendChild(toggleLabel);

      const toggleButton = document.createElement("button");
      toggleButton.className =
        "px-3 py-1 rounded bg-blue-600 text-white text-sm";
      toggleButton.textContent = this.showPathToLookout ? "ON" : "OFF";

      toggleButton.addEventListener("click", () => {
        this.showPathToLookout = !this.showPathToLookout;
        toggleButton.textContent = this.showPathToLookout ? "ON" : "OFF";
        toggleButton.className = `px-3 py-1 rounded ${
          this.showPathToLookout ? "bg-blue-600" : "bg-gray-600"
        } text-white text-sm`;

        // Update maze display
        this._updateMazeDisplay();
      });

      toggleContainer.appendChild(toggleButton);
      controlsContainer.appendChild(toggleContainer);
    } else {
      // Other roles get movement controls
      const controlsLabel = document.createElement("div");
      controlsLabel.className = "text-center text-gray-300 mb-3 text-sm";
      controlsLabel.textContent = "Movement Controls:";
      controlsContainer.appendChild(controlsLabel);

      // Create direction buttons grid
      this.directionButtons = document.createElement("div");
      this.directionButtons.className =
        "grid grid-cols-3 gap-2 max-w-xs mx-auto";

      // Create buttons
      const buttonData = [
        { dir: null, text: "", class: "" },
        { dir: "up", text: "⬆️", class: "bg-gray-700 hover:bg-gray-600" },
        { dir: null, text: "", class: "" },
        { dir: "left", text: "⬅️", class: "bg-gray-700 hover:bg-gray-600" },
        { dir: null, text: "🧍", class: "bg-gray-800" },
        { dir: "right", text: "➡️", class: "bg-gray-700 hover:bg-gray-600" },
        { dir: null, text: "", class: "" },
        { dir: "down", text: "⬇️", class: "bg-gray-700 hover:bg-gray-600" },
        { dir: null, text: "", class: "" },
      ];

      buttonData.forEach((button) => {
        const btn = document.createElement("div");

        if (button.dir) {
          btn.className = `${button.class} h-12 w-12 rounded flex items-center justify-center cursor-pointer`;
          btn.textContent = button.text;

          // Add click event
          btn.addEventListener("click", () => {
            this._movePlayer(button.dir);
          });
        } else if (button.text) {
          btn.className = `${button.class} h-12 w-12 rounded flex items-center justify-center`;
          btn.textContent = button.text;
        } else {
          btn.className = "h-12 w-12";
        }

        this.directionButtons.appendChild(btn);
      });

      controlsContainer.appendChild(this.directionButtons);

      // Add key controls
      window.addEventListener("keydown", (e) => {
        if (this.isCompleted) return;

        switch (e.key) {
          case "ArrowUp":
            this._movePlayer("up");
            break;
          case "ArrowDown":
            this._movePlayer("down");
            break;
          case "ArrowLeft":
            this._movePlayer("left");
            break;
          case "ArrowRight":
            this._movePlayer("right");
            break;
        }
      });
    }

    this.puzzleContainer.appendChild(controlsContainer);

    // Add help text
    const helpText = document.createElement("div");
    helpText.className =
      "text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700";

    if (this.playerRole === "Lookout") {
      helpText.innerHTML = `
        <div class="font-bold text-blue-400 mb-1">Lookout Instructions:</div>
        <ul class="list-disc pl-5 space-y-1 text-xs">
          <li>You can see the safe path through the laser grid</li>
          <li>Guide your team members by telling them which direction to move</li>
          <li>Be clear and precise - a wrong step could trigger the alarm</li>
          <li>The team can only make ${this.maxWrongSteps} wrong steps before the system resets</li>
          <li>All team members must reach the exit to succeed</li>
        </ul>
      `;
    } else {
      helpText.innerHTML = `
        <div class="font-bold text-blue-400 mb-1">Team Member Instructions:</div>
        <ul class="list-disc pl-5 space-y-1 text-xs">
          <li>Listen carefully to the Lookout who can see the safe path</li>
          <li>Use the direction buttons or arrow keys to move</li>
          <li>Step only on the pressure plates the Lookout indicates are safe</li>
          <li>The team can only make ${this.maxWrongSteps} wrong steps before the system resets</li>
          <li>All team members must reach the exit to succeed</li>
        </ul>
      `;
    }

    this.puzzleContainer.appendChild(helpText);
  }

  _movePlayer(direction) {
    if (this.isCompleted) return;

    // Get current position
    const currentPos = this.currentPositions[this.playerRole];

    // Calculate new position
    let newRow = currentPos.row;
    let newCol = currentPos.col;

    switch (direction) {
      case "up":
        newRow = Math.max(0, currentPos.row - 1);
        break;
      case "down":
        newRow = Math.min(this.mazeSize - 1, currentPos.row + 1);
        break;
      case "left":
        newCol = Math.max(0, currentPos.col - 1);
        break;
      case "right":
        newCol = Math.min(this.mazeSize - 1, currentPos.col + 1);
        break;
    }

    // Check if position changed
    if (newRow === currentPos.row && newCol === currentPos.col) {
      // Hit maze boundary, no change
      return;
    }

    // Update position
    this.currentPositions[this.playerRole] = { row: newRow, col: newCol };
    this.steps++;

    // Check if step was correct
    const cellType = this.maze[newRow][newCol];
    let stepCorrect = false;

    if (cellType === "path" || cellType === "entrance" || cellType === "exit") {
      stepCorrect = true;
    }

    // Update message
    if (!stepCorrect) {
      this.wrongSteps++;
      this.messageElement.textContent = `Warning! Pressure plate trap detected! (${this.wrongSteps}/${this.maxWrongSteps})`;
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

      // Add trap effect
      this._showTrapEffect(newRow, newCol);

      // Check if max wrong steps reached
      if (this.wrongSteps >= this.maxWrongSteps) {
        this._resetPositions();
      }
    } else {
      this.messageElement.className =
        "mb-4 text-yellow-400 text-center text-sm hidden";
    }

    // Update step counter
    this.stepCounter.textContent = `Steps: ${this.steps} | Wrong Steps: ${this.wrongSteps}/${this.maxWrongSteps}`;

    // Update maze display
    this._updateMazeDisplay();

    // Check if player reached exit
    if (cellType === "exit") {
      this._handlePlayerAtExit();
    }
  }

  _showTrapEffect(row, col) {
    // Find the cell element
    const cell = this.mazeElement.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );

    if (cell) {
      // Add trap animation
      cell.classList.add("bg-red-600");
      cell.style.animation = "trapTrigger 0.5s ease-in-out 3";

      // Add a temporary style for the trap animation
      const style = document.createElement("style");
      style.textContent = `
        @keyframes trapTrigger {
          0% { transform: scale(1); box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
          50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(255, 0, 0, 0.8); }
          100% { transform: scale(1); box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
        }
      `;
      document.head.appendChild(style);

      // Remove animation after it completes
      setTimeout(() => {
        cell.classList.remove("bg-red-600");
        cell.style.animation = "";
      }, 2000);
    }
  }

  _resetPositions() {
    this.messageElement.textContent =
      "Too many wrong steps! Positions reset to entrance.";
    this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

    // Reset all players to entrance
    const entranceRow = this.mazeSize - 1;
    const entranceCol = this.maze[entranceRow].findIndex(
      (cell) => cell === "entrance"
    );

    this.allRoles.forEach((role) => {
      this.currentPositions[role] = { row: entranceRow, col: entranceCol };
    });

    // Reset wrong steps
    this.wrongSteps = 0;

    // Update maze display
    this._updateMazeDisplay();

    // Update step counter
    this.stepCounter.textContent = `Steps: ${this.steps} | Wrong Steps: ${this.wrongSteps}/${this.maxWrongSteps}`;
  }

  _updateMazeDisplay() {
    // Update all cells
    for (let row = 0; row < this.mazeSize; row++) {
      for (let col = 0; col < this.mazeSize; col++) {
        const cell = this.mazeElement.querySelector(
          `[data-row="${row}"][data-col="${col}"]`
        );
        if (cell) {
          this._setCellAppearance(cell, row, col);
        }
      }
    }
  }

  _handlePlayerAtExit() {
    // Check if all players are at the exit
    const exitRow = 0;
    const exitCol = this.maze[exitRow].findIndex((cell) => cell === "exit");

    const allPlayersAtExit = this.allRoles.every((role) => {
      const pos = this.currentPositions[role];
      return pos.row === exitRow && pos.col === exitCol;
    });

    if (allPlayersAtExit) {
      this._handleSuccess();
    } else {
      // This player reached the exit, but not everyone is there yet
      const playersRemaining = this.allRoles.filter((role) => {
        const pos = this.currentPositions[role];
        return !(pos.row === exitRow && pos.col === exitCol);
      }).length;

      this.messageElement.textContent = `You've reached the exit! Waiting for ${playersRemaining} more team members...`;
      this.messageElement.className = "mb-4 text-green-400 text-center text-sm";
    }
  }

  _handleSuccess() {
    this.isCompleted = true;

    // Update message
    this.messageElement.textContent =
      "Congratulations! All team members have successfully navigated the pressure plate maze!";
    this.messageElement.className = "mb-4 text-green-400 text-center text-sm";

    // Visual feedback
    this.mazeElement.classList.add("success");
    this.mazeElement.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.7)";

    // Disable controls
    if (this.directionButtons) {
      this.directionButtons.classList.add("opacity-50", "pointer-events-none");
    }

    // Show success message
    const successMessage = document.createElement("div");
    successMessage.className =
      "bg-green-900 text-green-300 p-3 rounded-lg text-center mb-4 animate-pulse";
    successMessage.textContent = "Laser grid deactivated successfully!";
    this.puzzleContainer.appendChild(successMessage);

    // Call completion callback
    if (this.onComplete) {
      this.onComplete(true);
    }
  }

  handleRandomEvent(eventType) {
    if (this.isCompleted) return;

    if (eventType === "security_patrol") {
      this.messageElement.textContent =
        "Security patrol detected! Move carefully to avoid detection.";
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

      // Temporarily make the path invisible to the Lookout
      if (this.playerRole === "Lookout" && this.showPathToLookout) {
        this.showPathToLookout = false;
        this._updateMazeDisplay();

        // Restore after delay
        setTimeout(() => {
          if (this.isCompleted) return;

          this.showPathToLookout = true;
          this._updateMazeDisplay();
          this.messageElement.className =
            "mb-4 text-yellow-400 text-center text-sm hidden";
        }, 5000);
      }
    }
  }

  cleanup() {
    // Remove DOM elements
    if (this.puzzleContainer && this.puzzleContainer.parentNode) {
      this.puzzleContainer.parentNode.removeChild(this.puzzleContainer);
    }

    // Remove key event listener
    window.removeEventListener("keydown", this._handleKeyDown);

    this.mazeElement = null;
    this.messageElement = null;
    this.stepCounter = null;
    this.directionButtons = null;
    this.puzzleContainer = null;
  }
}

export default PressurePlateMaze;
