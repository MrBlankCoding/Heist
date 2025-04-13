// Firewall Bypass Puzzle - Level 3
// A puzzle where players need to find the right path through a firewall grid

class FirewallBypassPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle difficulty settings
    this.difficulty = puzzleData.difficulty || 3;
    this.gridSize = Math.min(8, 4 + this.difficulty);

    // Puzzle state
    this.grid = [];
    this.currentPath = [];
    this.revealedPackets = 0;
    this.totalPackets = 0;
    this.isComplete = false;
    this.selectedCell = null;

    // DOM elements
    this.gridElement = null;
    this.packetCounterElement = null;
  }

  initialize() {
    this._createGameArea();
    this._generateGrid();
    this._renderGrid();
    this._attachEventListeners();

    // Show instructions
    if (this.callbacks && this.callbacks.showMessage) {
      this.callbacks.showMessage(
        "Navigate through the firewall by finding safe paths to collect all data packets.",
        "info"
      );
    }
  }

  _createGameArea() {
    // Create container
    const gameContainer = document.createElement("div");
    gameContainer.className =
      "bg-gray-900 p-4 rounded-lg flex flex-col items-center";

    // Status header
    const header = document.createElement("div");
    header.className = "w-full mb-4 flex justify-between items-center";

    const title = document.createElement("div");
    title.className = "text-blue-400 text-lg font-mono";
    title.textContent = "FIREWALL BYPASS SYSTEM";
    header.appendChild(title);

    this.packetCounterElement = document.createElement("div");
    this.packetCounterElement.className =
      "bg-gray-800 text-yellow-300 px-3 py-1 rounded font-mono";
    this.packetCounterElement.textContent = "Packets: 0/0";
    header.appendChild(this.packetCounterElement);

    gameContainer.appendChild(header);

    // Grid container
    this.gridElement = document.createElement("div");
    this.gridElement.className = "grid gap-1 bg-gray-800 p-2 rounded-lg";
    // Grid template columns will be set dynamically based on grid size
    this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, minmax(0, 1fr))`;
    gameContainer.appendChild(this.gridElement);

    // Legend
    const legend = document.createElement("div");
    legend.className =
      "mt-4 grid grid-cols-2 gap-4 text-xs text-gray-300 w-full max-w-md";

    const legends = [
      { color: "#1F2937", text: "Unexplored" },
      { color: "#EF4444", text: "Firewall (Blocked)" },
      { color: "#3B82F6", text: "Safe Path" },
      { color: "#F59E0B", text: "Data Packet" },
    ];

    legends.forEach((item) => {
      const legendItem = document.createElement("div");
      legendItem.className = "flex items-center";

      const colorBox = document.createElement("div");
      colorBox.className = "w-4 h-4 mr-2 rounded";
      colorBox.style.backgroundColor = item.color;
      legendItem.appendChild(colorBox);

      const text = document.createElement("span");
      text.textContent = item.text;
      legendItem.appendChild(text);

      legend.appendChild(legendItem);
    });

    gameContainer.appendChild(legend);

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "mt-4 text-sm text-blue-300 text-center";
    instructions.textContent =
      "Click on adjacent cells to navigate through the firewall and collect all data packets.";
    gameContainer.appendChild(instructions);

    this.containerElement.appendChild(gameContainer);
  }

  _generateGrid() {
    this.grid = [];
    this.currentPath = [];
    this.totalPackets = 0;

    // Generate empty grid
    for (let y = 0; y < this.gridSize; y++) {
      const row = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({
          x,
          y,
          type: "unexplored", // unexplored, path, blocked, packet
          revealed: false,
          isStart: false,
          isEnd: false,
        });
      }
      this.grid.push(row);
    }

    // Set start position (always at 0,0)
    this.grid[0][0].type = "path";
    this.grid[0][0].revealed = true;
    this.grid[0][0].isStart = true;

    // Set end position (always at gridSize-1, gridSize-1)
    this.grid[this.gridSize - 1][this.gridSize - 1].type = "path";
    this.grid[this.gridSize - 1][this.gridSize - 1].isEnd = true;

    // Add the start position to the path
    this.currentPath.push({ x: 0, y: 0 });

    // Generate firewall blocks (increase with difficulty)
    const blockPercentage = 0.2 + this.difficulty * 0.05;
    const totalBlocks = Math.floor(
      this.gridSize * this.gridSize * blockPercentage
    );

    for (let i = 0; i < totalBlocks; i++) {
      let x, y;
      // Make sure we don't block start, end, or already blocked cells
      do {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
      } while (
        (x === 0 && y === 0) || // start
        (x === this.gridSize - 1 && y === this.gridSize - 1) || // end
        this.grid[y][x].type === "blocked" // already blocked
      );

      this.grid[y][x].type = "blocked";
    }

    // Ensure there's at least one valid path from start to end using A* pathfinding
    const pathExists = this._ensureValidPath();

    if (!pathExists) {
      // Regenerate the grid if no valid path exists
      this._generateGrid();
      return;
    }

    // Place data packets in random places (more with higher difficulty)
    const packetCount = 3 + this.difficulty;
    this.totalPackets = packetCount;

    for (let i = 0; i < packetCount; i++) {
      let x, y;
      // Make sure we don't place packets on blocked cells, start, or end
      do {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
      } while (
        this.grid[y][x].type === "blocked" || // blocked cell
        (x === 0 && y === 0) || // start
        (x === this.gridSize - 1 && y === this.gridSize - 1) || // end
        this.grid[y][x].type === "packet" // already a packet
      );

      this.grid[y][x].type = "packet";
    }

    // Update packet counter
    this._updatePacketCounter();
  }

  _ensureValidPath() {
    // Using A* pathfinding to check if there's a valid path from start to end
    const startPos = { x: 0, y: 0 };
    const endPos = { x: this.gridSize - 1, y: this.gridSize - 1 };

    // Open and closed lists
    const openList = [
      {
        ...startPos,
        g: 0,
        h: this._heuristic(startPos, endPos),
        f: this._heuristic(startPos, endPos),
      },
    ];
    const closedList = [];

    while (openList.length > 0) {
      // Find the node with the lowest f score
      let lowestIndex = 0;
      for (let i = 0; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const currentNode = openList[lowestIndex];

      // Check if we've reached the end
      if (currentNode.x === endPos.x && currentNode.y === endPos.y) {
        return true; // Path found
      }

      // Move current node from open to closed list
      openList.splice(lowestIndex, 1);
      closedList.push(currentNode);

      // Get neighbors
      const neighbors = this._getNeighbors(currentNode);

      for (const neighbor of neighbors) {
        // Skip if in closed list or blocked
        if (
          closedList.some(
            (node) => node.x === neighbor.x && node.y === neighbor.y
          ) ||
          this.grid[neighbor.y][neighbor.x].type === "blocked"
        ) {
          continue;
        }

        const gScore = currentNode.g + 1; // 1 is the distance to neighbor

        // Check if this path is better or node is not in open list
        const existingNode = openList.find(
          (node) => node.x === neighbor.x && node.y === neighbor.y
        );

        if (!existingNode || gScore < existingNode.g) {
          // This is a better path, update or add to open list
          const hScore = this._heuristic(neighbor, endPos);

          if (!existingNode) {
            openList.push({
              x: neighbor.x,
              y: neighbor.y,
              g: gScore,
              h: hScore,
              f: gScore + hScore,
              parent: { x: currentNode.x, y: currentNode.y },
            });
          } else {
            existingNode.g = gScore;
            existingNode.f = gScore + existingNode.h;
            existingNode.parent = { x: currentNode.x, y: currentNode.y };
          }
        }
      }
    }

    return false; // No path found
  }

  _heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  _getNeighbors(position) {
    const { x, y } = position;
    const neighbors = [];

    // Check all 4 adjacent cells
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 }, // right
      { x: 0, y: 1 }, // down
      { x: -1, y: 0 }, // left
    ];

    for (const dir of directions) {
      const newX = x + dir.x;
      const newY = y + dir.y;

      // Check if in bounds
      if (
        newX >= 0 &&
        newX < this.gridSize &&
        newY >= 0 &&
        newY < this.gridSize
      ) {
        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
  }

  _renderGrid() {
    if (!this.gridElement) return;

    // Clear existing grid
    this.gridElement.innerHTML = "";

    // Create grid cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const cellElement = document.createElement("div");

        // Set common cell styles
        cellElement.className =
          "aspect-square flex items-center justify-center rounded transition-all duration-200";
        cellElement.dataset.x = x;
        cellElement.dataset.y = y;

        // Style based on cell type and revealed state
        if (cell.revealed) {
          switch (cell.type) {
            case "path":
              cellElement.className += " bg-blue-600";
              break;
            case "blocked":
              cellElement.className += " bg-red-600";
              break;
            case "packet":
              cellElement.className += " bg-yellow-500";
              // Add packet indicator
              const packetIcon = document.createElement("div");
              packetIcon.className =
                "w-3/4 h-3/4 rounded-full bg-yellow-300 animate-pulse";
              cellElement.appendChild(packetIcon);
              break;
            default:
              cellElement.className += " bg-gray-700";
          }
        } else {
          // Unexplored cell
          cellElement.className += " bg-gray-800 hover:bg-gray-700";
        }

        // Special styling for start and end
        if (cell.isStart) {
          cellElement.className += " bg-green-600";
          cellElement.textContent = "S";
        }

        if (cell.isEnd) {
          if (cell.revealed) {
            cellElement.className += " bg-green-600";
          }
          cellElement.textContent = "E";
        }

        // Special styling for current position
        const currentPos = this.currentPath[this.currentPath.length - 1];
        if (currentPos && x === currentPos.x && y === currentPos.y) {
          cellElement.className += " ring-2 ring-white";
        }

        // Check if cell is reachable from current position
        if (!cell.revealed) {
          const isReachable = this._isAdjacentToPath(x, y);
          if (isReachable) {
            cellElement.className += " cursor-pointer animate-pulse";
          } else {
            cellElement.className += " opacity-80";
          }
        }

        this.gridElement.appendChild(cellElement);
      }
    }
  }

  _isAdjacentToPath(x, y) {
    // Check if (x,y) is adjacent to the current path
    const currentPos = this.currentPath[this.currentPath.length - 1];
    if (!currentPos) return false;

    // Calculate Manhattan distance to current position
    const distance = Math.abs(x - currentPos.x) + Math.abs(y - currentPos.y);

    // Cell is adjacent if distance is 1
    return distance === 1;
  }

  _attachEventListeners() {
    this.gridElement.addEventListener("click", (e) => {
      // Find the clicked cell
      const cell = e.target.closest("[data-x]");
      if (!cell) return;

      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);

      this._handleCellClick(x, y);
    });
  }

  _handleCellClick(x, y) {
    if (this.isComplete) return;

    // Get the cell
    const cell = this.grid[y][x];

    // Skip if already revealed
    if (cell.revealed) return;

    // Check if adjacent to current path
    if (!this._isAdjacentToPath(x, y)) return;

    // Reveal the cell
    cell.revealed = true;

    // Handle cell based on type
    switch (cell.type) {
      case "blocked":
        // Hit a firewall block
        this._playSound("error");

        // Reduce timer as penalty
        if (this.callbacks && this.callbacks.reduceTime) {
          this.callbacks.reduceTime(5);
        }

        // Show message
        if (this.callbacks && this.callbacks.showMessage) {
          this.callbacks.showMessage(
            "Firewall detected! Security protocols engaged.",
            "error"
          );
        }
        break;

      case "path":
        // Found a safe path
        this._playSound("path");
        this.currentPath.push({ x, y });

        // Check if reached the end
        if (cell.isEnd) {
          this._checkCompletion();
        }
        break;

      case "packet":
        // Collected a data packet
        this._playSound("packet");
        this.revealedPackets++;
        this._updatePacketCounter();
        this.currentPath.push({ x, y });
        break;

      default:
        // Unexplored cell, mark as path
        cell.type = "path";
        this._playSound("path");
        this.currentPath.push({ x, y });
        break;
    }

    // Re-render the grid
    this._renderGrid();

    // Check if all packets are collected and end reached
    this._checkCompletion();
  }

  _checkCompletion() {
    // Check if current position is the end cell
    const currentPos = this.currentPath[this.currentPath.length - 1];
    const endCell = this.grid[this.gridSize - 1][this.gridSize - 1];

    const reachedEnd =
      currentPos.x === this.gridSize - 1 && currentPos.y === this.gridSize - 1;
    const allPacketsCollected = this.revealedPackets === this.totalPackets;

    if (reachedEnd) {
      if (allPacketsCollected) {
        // Complete success - all packets and reached end
        this.isComplete = true;

        // Play success sound
        this._playSound("success");

        // Show success message
        if (this.callbacks && this.callbacks.showSuccess) {
          this.callbacks.showSuccess();
        }

        if (this.callbacks && this.callbacks.showMessage) {
          this.callbacks.showMessage(
            "Firewall bypassed successfully! All data packets retrieved.",
            "success"
          );
        }
      } else {
        // Reached end but missing packets
        if (this.callbacks && this.callbacks.showMessage) {
          this.callbacks.showMessage(
            `Missing ${
              this.totalPackets - this.revealedPackets
            } data packets! You need to collect all packets.`,
            "warning"
          );
        }
      }
    }
  }

  _updatePacketCounter() {
    if (this.packetCounterElement) {
      this.packetCounterElement.textContent = `Packets: ${this.revealedPackets}/${this.totalPackets}`;

      // Update styling based on progress
      if (this.revealedPackets === this.totalPackets) {
        this.packetCounterElement.className =
          "bg-green-700 text-white px-3 py-1 rounded font-mono";
      }
    }
  }

  _playSound(type) {
    try {
      let sound;
      switch (type) {
        case "path":
          sound = new Audio("../static/sounds/path-click.mp3");
          sound.volume = 0.2;
          break;
        case "packet":
          sound = new Audio("../static/sounds/packet-collect.mp3");
          sound.volume = 0.3;
          break;
        case "error":
          sound = new Audio("../static/sounds/firewall-block.mp3");
          sound.volume = 0.3;
          break;
        case "success":
          sound = new Audio("../static/sounds/firewall-bypass.mp3");
          sound.volume = 0.3;
          break;
        default:
          return;
      }

      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  // Methods required by UniversalPuzzleController
  getSolution() {
    return {
      pathLength: this.currentPath.length,
      packetsCollected: this.revealedPackets,
      completed: this.isComplete,
    };
  }

  validateSolution() {
    return this.isComplete;
  }

  getErrorMessage() {
    const missingPackets = this.totalPackets - this.revealedPackets;
    if (missingPackets > 0) {
      return `Missing ${missingPackets} data packets. Collect all packets before reaching the exit.`;
    }
    return "Navigate through the firewall to reach the exit point.";
  }

  showSuccess() {
    // Add visual success indication
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        // Skip blocked cells
        if (this.grid[y][x].type === "blocked") continue;

        // Reveal all remaining cells
        this.grid[y][x].revealed = true;
      }
    }

    // Re-render with success styling
    this._renderGrid();

    // Add success animation
    const animateSuccess = () => {
      // Highlight the path
      this.currentPath.forEach((pos, index) => {
        setTimeout(() => {
          const cellElement = this.gridElement.querySelector(
            `[data-x="${pos.x}"][data-y="${pos.y}"]`
          );
          if (cellElement) {
            cellElement.classList.add("bg-green-500", "scale-110");
            setTimeout(() => {
              cellElement.classList.remove("scale-110");
            }, 300);
          }
        }, index * 100); // Stagger the animation
      });
    };

    // Run animation
    animateSuccess();
  }

  cleanup() {
    // Remove event listeners
    if (this.gridElement) {
      this.gridElement.removeEventListener("click", this._handleCellClick);
    }
  }

  handleRandomEvent(eventType, duration) {
    if (eventType === "security_patrol") {
      // Temporarily hide some revealed cells
      const revealedCells = [];

      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          if (
            this.grid[y][x].revealed &&
            !this.grid[y][x].isStart &&
            !this.grid[y][x].isEnd
          ) {
            revealedCells.push({ x, y });
          }
        }
      }

      // Randomly select some cells to hide
      const cellsToHide = Math.min(revealedCells.length, 3);
      const shuffled = [...revealedCells].sort(() => 0.5 - Math.random());
      const selectedCells = shuffled.slice(0, cellsToHide);

      // Hide selected cells temporarily
      selectedCells.forEach((pos) => {
        this.grid[pos.y][pos.x].revealed = false;
      });

      // Show the grid with hidden cells
      this._renderGrid();

      // Restore the cells after duration
      setTimeout(() => {
        selectedCells.forEach((pos) => {
          this.grid[pos.y][pos.x].revealed = true;
        });
        this._renderGrid();
      }, duration * 1000);
    }
  }
}

export default FirewallBypassPuzzle;
