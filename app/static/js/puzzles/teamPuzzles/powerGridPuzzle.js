// Power Grid Puzzle - Team members see different parts of a grid and must communicate
// to successfully connect wires and restore power

class PowerGridPuzzle {
  constructor(
    container,
    playerRole,
    allRoles,
    onCompleteCallback,
    broadcastCallback
  ) {
    this.container = container;
    this.playerRole = playerRole;
    this.allRoles = allRoles;
    this.onComplete = onCompleteCallback;
    this.broadcastCallback = broadcastCallback;
    this.gridSize = 6; // 6x6 grid
    this.grid = [];
    this.playerView = []; // The part of the grid the player can see
    this.isCompleted = false;
    this.selectedWire = null;
    this.connections = []; // Track wire connections

    // DOM elements
    this.puzzleContainer = null;
    this.gridElement = null;
    this.messageElement = null;
  }

  initialize() {
    // Create puzzle container
    this.puzzleContainer = document.createElement("div");
    this.puzzleContainer.className =
      "bg-gray-900 rounded-lg p-4 w-full max-w-3xl";
    this.container.appendChild(this.puzzleContainer);

    // Add title
    const title = document.createElement("h4");
    title.className = "text-lg font-bold text-blue-400 mb-3";
    title.textContent = "Power Grid Restoration";
    this.puzzleContainer.appendChild(title);

    // Add instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300 text-sm";
    instruction.textContent =
      "Connect the wires to restore power. You can only see part of the grid. Communicate with your team!";
    this.puzzleContainer.appendChild(instruction);

    // Add message area
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center text-sm hidden";
    this.puzzleContainer.appendChild(this.messageElement);

    // Create grid
    this._generateGrid();
    this._createGridDisplay();
  }

  _generateGrid() {
    // Initialize empty grid
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = Array(this.gridSize).fill(null);
    }

    // Create the solution path - a connected path from start to end
    const startPoint = { x: 0, y: Math.floor(Math.random() * this.gridSize) };
    const endPoint = {
      x: this.gridSize - 1,
      y: Math.floor(Math.random() * this.gridSize),
    };

    // Set start and end points
    this.grid[startPoint.y][startPoint.x] = "start";
    this.grid[endPoint.y][endPoint.x] = "end";

    // Generate a random path between start and end
    this._generatePath(startPoint, endPoint);

    // Determine which parts of the grid each role can see
    this._assignViewableAreas();
  }

  _generatePath(start, end) {
    // Use a simple algorithm to create a path from start to end
    let current = { ...start };
    const path = [current];

    while (!(current.x === end.x && current.y === end.y)) {
      // Determine possible moves (right, up, down)
      const possibleMoves = [];

      // Prefer moving right to reach the end
      if (current.x < end.x) {
        possibleMoves.push({ x: current.x + 1, y: current.y, dir: "right" });
      }

      // Can move up if not at top
      if (current.y > 0) {
        possibleMoves.push({ x: current.x, y: current.y - 1, dir: "up" });
      }

      // Can move down if not at bottom
      if (current.y < this.gridSize - 1) {
        possibleMoves.push({ x: current.x, y: current.y + 1, dir: "down" });
      }

      // Randomly select a move
      const move =
        possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

      // Set wire type based on direction
      if (move.dir === "right") {
        this.grid[current.y][current.x] =
          this.grid[current.y][current.x] === "start"
            ? "start-right"
            : "horizontal";
        this.grid[move.y][move.x] =
          move.x === end.x && move.y === end.y ? "end-left" : "horizontal";
      } else if (move.dir === "up") {
        this.grid[current.y][current.x] =
          this.grid[current.y][current.x] === "start" ? "start-up" : "vertical";
        this.grid[move.y][move.x] =
          move.x === end.x && move.y === end.y ? "end-down" : "vertical";
      } else if (move.dir === "down") {
        this.grid[current.y][current.x] =
          this.grid[current.y][current.x] === "start"
            ? "start-down"
            : "vertical";
        this.grid[move.y][move.x] =
          move.x === end.x && move.y === end.y ? "end-up" : "vertical";
      }

      // Move to the next position
      current = { ...move };
      path.push(current);
    }

    return path;
  }

  _assignViewableAreas() {
    // Define which parts of the grid each role can see
    const viewableAreas = {
      Hacker: {
        startX: 0,
        endX: Math.floor(this.gridSize / 2),
        startY: 0,
        endY: Math.floor(this.gridSize / 2),
      },
      "Safe Cracker": {
        startX: Math.floor(this.gridSize / 2),
        endX: this.gridSize - 1,
        startY: 0,
        endY: Math.floor(this.gridSize / 2),
      },
      Demolitions: {
        startX: 0,
        endX: Math.floor(this.gridSize / 2),
        startY: Math.floor(this.gridSize / 2),
        endY: this.gridSize - 1,
      },
      Lookout: {
        startX: Math.floor(this.gridSize / 2),
        endX: this.gridSize - 1,
        startY: Math.floor(this.gridSize / 2),
        endY: this.gridSize - 1,
      },
    };

    // Get the viewable area for the current player
    const area = viewableAreas[this.playerRole] || viewableAreas["Hacker"]; // Default to Hacker view

    // Create player view grid (what they can see)
    for (let i = 0; i < this.gridSize; i++) {
      this.playerView[i] = Array(this.gridSize).fill("hidden");
    }

    // Set visible cells
    for (let y = area.startY; y <= area.endY; y++) {
      for (let x = area.startX; x <= area.endX; x++) {
        this.playerView[y][x] = this.grid[y][x];
      }
    }
  }

  _createGridDisplay() {
    // Create grid element
    this.gridElement = document.createElement("div");
    this.gridElement.className = "grid gap-1 mb-4 mx-auto";
    this.gridElement.style.display = "grid";
    this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 40px)`;

    // Create cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = document.createElement("div");
        cell.className =
          "h-10 w-10 border border-gray-700 rounded flex items-center justify-center";
        cell.dataset.x = x;
        cell.dataset.y = y;

        const cellType = this.playerView[y][x];

        if (cellType === "hidden") {
          cell.className += " bg-gray-800";
          cell.innerHTML = "?";

          // Make hidden cells interactive for placing wires
          cell.classList.add("cursor-pointer", "hover:bg-gray-700");

          // Add event listener for wire placement
          cell.addEventListener("click", () =>
            this._handleCellClick(x, y, cell)
          );
        } else {
          this._renderWireCell(cell, cellType);
        }

        this.gridElement.appendChild(cell);
      }
    }

    this.puzzleContainer.appendChild(this.gridElement);

    // Add help text
    const helpText = document.createElement("div");
    helpText.className = "text-sm text-gray-400 mt-2 mb-4";
    helpText.innerHTML =
      'Click on ? cells to place wires. <span class="text-yellow-400">Communicate your view to the team!</span>';
    this.puzzleContainer.appendChild(helpText);

    // Add wire selector
    this._createWireSelector();

    // Add check connection button
    const checkButton = document.createElement("button");
    checkButton.className =
      "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mx-auto block mt-4";
    checkButton.textContent = "Check Connections";
    checkButton.addEventListener("click", () => this._checkConnections());
    this.puzzleContainer.appendChild(checkButton);
  }

  _createWireSelector() {
    const selectorContainer = document.createElement("div");
    selectorContainer.className = "flex justify-center gap-3 mb-3";

    const wireTypes = [
      { id: "horizontal", label: "━", title: "Horizontal Wire" },
      { id: "vertical", label: "┃", title: "Vertical Wire" },
      { id: "corner-top-right", label: "┗", title: "Corner (Top-Right)" },
      { id: "corner-top-left", label: "┛", title: "Corner (Top-Left)" },
      { id: "corner-bottom-right", label: "┏", title: "Corner (Bottom-Right)" },
      { id: "corner-bottom-left", label: "┓", title: "Corner (Bottom-Left)" },
    ];

    wireTypes.forEach((wire) => {
      const wireButton = document.createElement("button");
      wireButton.className =
        "h-8 w-8 border border-gray-600 rounded flex items-center justify-center bg-gray-800 hover:bg-gray-700";
      wireButton.textContent = wire.label;
      wireButton.title = wire.title;

      wireButton.addEventListener("click", () => {
        // Remove selected class from all buttons
        selectorContainer.querySelectorAll("button").forEach((btn) => {
          btn.classList.remove("border-blue-500");
        });

        // Add selected class to clicked button
        wireButton.classList.add("border-blue-500");

        // Set selected wire
        this.selectedWire = wire.id;
      });

      selectorContainer.appendChild(wireButton);
    });

    this.puzzleContainer.appendChild(selectorContainer);

    // Select horizontal wire by default
    selectorContainer.querySelector("button").click();
  }

  _handleCellClick(x, y, cell) {
    if (!this.selectedWire || this.isCompleted) return;

    // Update the player's view
    this.playerView[y][x] = this.selectedWire;

    // Update cell display
    cell.innerHTML = "";
    cell.className =
      "h-10 w-10 border border-gray-700 rounded flex items-center justify-center cursor-pointer";

    this._renderWireCell(cell, this.selectedWire);

    // Add to connections
    this.connections.push({ x, y, type: this.selectedWire });

    // Broadcast this update to other players
    if (this.broadcastCallback) {
      this.broadcastCallback({
        action: "place_wire",
        x: x,
        y: y,
        wireType: this.selectedWire,
        playerRole: this.playerRole,
      });
    }
  }

  _renderWireCell(cell, cellType) {
    cell.innerHTML = "";

    switch (cellType) {
      case "start":
      case "start-right":
      case "start-up":
      case "start-down":
        cell.className += " bg-green-800";
        cell.innerHTML =
          '<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">S</div>';
        break;
      case "end":
      case "end-left":
      case "end-up":
      case "end-down":
        cell.className += " bg-red-800";
        cell.innerHTML =
          '<div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">E</div>';
        break;
      case "horizontal":
        cell.className += " bg-blue-900";
        cell.innerHTML = '<div class="w-8 h-2 bg-blue-500 rounded"></div>';
        break;
      case "vertical":
        cell.className += " bg-blue-900";
        cell.innerHTML = '<div class="w-2 h-8 bg-blue-500 rounded"></div>';
        break;
      case "corner-top-right":
        cell.className += " bg-blue-900";
        cell.innerHTML =
          '<div class="relative w-8 h-8"><div class="absolute left-0 bottom-0 w-8 h-2 bg-blue-500 rounded"></div><div class="absolute left-0 top-0 w-2 h-8 bg-blue-500 rounded"></div></div>';
        break;
      case "corner-top-left":
        cell.className += " bg-blue-900";
        cell.innerHTML =
          '<div class="relative w-8 h-8"><div class="absolute right-0 bottom-0 w-8 h-2 bg-blue-500 rounded"></div><div class="absolute right-0 top-0 w-2 h-8 bg-blue-500 rounded"></div></div>';
        break;
      case "corner-bottom-right":
        cell.className += " bg-blue-900";
        cell.innerHTML =
          '<div class="relative w-8 h-8"><div class="absolute left-0 top-0 w-8 h-2 bg-blue-500 rounded"></div><div class="absolute left-0 bottom-0 w-2 h-8 bg-blue-500 rounded"></div></div>';
        break;
      case "corner-bottom-left":
        cell.className += " bg-blue-900";
        cell.innerHTML =
          '<div class="relative w-8 h-8"><div class="absolute right-0 top-0 w-8 h-2 bg-blue-500 rounded"></div><div class="absolute right-0 bottom-0 w-2 h-8 bg-blue-500 rounded"></div></div>';
        break;
    }
  }

  _checkConnections() {
    // In a real implementation, this would verify if the player-placed wires create a valid path
    // For this demo, we'll simulate the challenge with a random success based on number of connections

    // Show checking message
    this.messageElement.textContent = "Checking power grid connections...";
    this.messageElement.className = "mb-4 text-yellow-400 text-center text-sm";

    // Broadcast check action to other players
    if (this.broadcastCallback) {
      this.broadcastCallback({
        action: "check_connections",
        playerRole: this.playerRole,
        connectionCount: this.connections.length,
      });
    }

    setTimeout(() => {
      // Simulate checking (in real implementation, would check actual path validity)
      const success = this.connections.length >= 5 && Math.random() > 0.3; // Higher chance of success with more connections

      if (success) {
        this.messageElement.textContent =
          "Power successfully restored! Grid connections complete.";
        this.messageElement.className =
          "mb-4 text-green-400 text-center text-sm";
        this.isCompleted = true;

        // Highlight successful path
        this._highlightSuccessPath();

        // Call completion callback
        if (this.onComplete) {
          this.onComplete(true);
        }
      } else {
        // Show which connections failed
        this.messageElement.textContent =
          "Connection failed! Some wires are not properly connected.";
        this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

        // Show a spark animation on a random connection
        const randomConnectionIndex = Math.floor(
          Math.random() * this.connections.length
        );
        if (randomConnectionIndex >= 0) {
          const failedConnection = this.connections[randomConnectionIndex];
          const cell = this.gridElement.querySelector(
            `[data-x="${failedConnection.x}"][data-y="${failedConnection.y}"]`
          );

          if (cell) {
            cell.classList.add("failed-connection");
            cell.style.animation = "spark 0.5s ease-in-out 3";

            // Add a temporary style for the spark animation
            const style = document.createElement("style");
            style.textContent = `
              @keyframes spark {
                0% { box-shadow: inset 0 0 5px rgba(255, 200, 0, 0.8); }
                50% { box-shadow: inset 0 0 20px rgba(255, 100, 0, 0.8); }
                100% { box-shadow: inset 0 0 5px rgba(255, 0, 0, 0.8); }
              }
              .failed-connection {
                position: relative;
                background-color: #541818 !important;
              }
            `;
            document.head.appendChild(style);

            // Remove failed connection status after animation
            setTimeout(() => {
              cell.classList.remove("failed-connection");
              cell.style.animation = "";
            }, 2000);
          }
        }
      }
    }, 1500);
  }

  _highlightSuccessPath() {
    // In a real implementation, would highlight the actual successful path
    // Here we're just simulating for demo purposes

    // Highlight all connections as successful
    setTimeout(() => {
      this.connections.forEach((connection) => {
        const cell = this.gridElement.querySelector(
          `[data-x="${connection.x}"][data-y="${connection.y}"]`
        );
        if (cell) {
          cell.style.animation = "powerflow 2s infinite";

          // Add style for power flow animation
          const style = document.createElement("style");
          style.textContent = `
            @keyframes powerflow {
              0% { box-shadow: inset 0 0 5px rgba(100, 255, 100, 0.5); }
              50% { box-shadow: inset 0 0 15px rgba(100, 255, 100, 0.8); }
              100% { box-shadow: inset 0 0 5px rgba(100, 255, 100, 0.5); }
            }
          `;
          document.head.appendChild(style);
        }
      });
    }, 500);
  }

  handleRandomEvent(eventType) {
    if (this.isCompleted) return;

    if (eventType === "power_surge") {
      this.messageElement.textContent =
        "Warning: Power surge detected! Connections may fail.";
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

      // Simulate a power surge affecting the grid
      this.gridElement.style.animation = "surge 1s ease-in-out";

      const style = document.createElement("style");
      style.textContent = `
        @keyframes surge {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.5); }
          100% { transform: scale(1); filter: brightness(1); }
        }
      `;
      document.head.appendChild(style);

      // Remove animation after it completes
      setTimeout(() => {
        this.gridElement.style.animation = "";
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center text-sm hidden";
      }, 1000);
    }
  }

  cleanup() {
    // Remove any event listeners and clean up resources
    if (this.puzzleContainer && this.puzzleContainer.parentNode) {
      this.puzzleContainer.parentNode.removeChild(this.puzzleContainer);
    }

    this.gridElement = null;
    this.messageElement = null;
    this.puzzleContainer = null;
  }

  /**
   * Handle remote update from another player
   * @param {Object} updateData - Update data
   * @param {string} senderId - ID of the player who sent the update
   */
  handleRemoteUpdate(updateData, senderId) {
    if (this.isCompleted) return;

    if (updateData.action === "place_wire") {
      // Another player placed a wire - update our local view
      const { x, y, wireType, playerRole } = updateData;

      // Only update if this cell is hidden (not in our view)
      if (this.playerView[y][x] === "hidden") {
        // Update the player's view
        this.playerView[y][x] = wireType;

        // Find and update the cell in the UI
        const cell = this.gridElement.querySelector(
          `[data-x="${x}"][data-y="${y}"]`
        );
        if (cell) {
          cell.innerHTML = "";
          cell.className =
            "h-10 w-10 border border-gray-700 rounded flex items-center justify-center";

          // Remove click event as this is now updated remotely
          cell.classList.remove("cursor-pointer", "hover:bg-gray-700");

          // Add an indicator showing which player placed this wire
          const roleIndicator = document.createElement("div");
          roleIndicator.className = "absolute top-0 right-0 text-xs";
          roleIndicator.textContent = playerRole.charAt(0); // First letter of role
          roleIndicator.style.color = this._getRoleColor(playerRole);
          cell.style.position = "relative";
          cell.appendChild(roleIndicator);

          this._renderWireCell(cell, wireType);
        }
      }
    } else if (updateData.action === "check_connections") {
      // Another player checked connections
      this.messageElement.textContent = "Teammate is checking connections...";
      this.messageElement.className =
        "mb-4 text-yellow-400 text-center text-sm";
    }
  }

  /**
   * Get color for a role
   * @param {string} role - Player role
   * @returns {string} - Color CSS class
   */
  _getRoleColor(role) {
    switch (role) {
      case "Hacker":
        return "#3b82f6"; // blue-500
      case "Safe Cracker":
        return "#f59e0b"; // yellow-500
      case "Demolitions":
        return "#ef4444"; // red-500
      case "Lookout":
        return "#10b981"; // green-500
      default:
        return "#6b7280"; // gray-500
    }
  }
}

export default PowerGridPuzzle;
