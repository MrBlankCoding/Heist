// Final Detonation Puzzle - Finale puzzle for the Demolitions role

class FinalDetonationPuzzle {
  constructor(container, puzzleData, callbacks) {
    this.container = container;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isCompleted = false;

    // Puzzle-specific properties
    this.gridSize = 5; // 5x5 grid for the map
    this.map = [];
    this.charges = [];
    this.selectedCharges = [];
    this.maxCharges = 3 + Math.min(puzzleData.difficulty, 2);
    this.pathSolution = [];

    // DOM elements
    this.puzzleContainer = null;
    this.mapContainer = null;
    this.controlPanel = null;
    this.chargeInventory = null;
  }

  initialize() {
    // Create main container
    this.puzzleContainer = document.createElement("div");
    this.puzzleContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-2xl";

    // Add title
    const title = document.createElement("h4");
    title.className = "text-center text-red-500 mb-4";
    title.textContent = "Final Escape Route Detonation";
    this.puzzleContainer.appendChild(title);

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className =
      "mb-4 p-3 bg-gray-800 rounded border border-red-600 text-sm";

    instructions.innerHTML = `
      <div class="text-sm text-gray-300 mb-2">Final Escape Protocol - Section 5.3:</div>
      <div class="text-yellow-400">
        <p>Create an escape path by strategically placing ${this.maxCharges} explosive charges.</p>
        <p>There must be a continuous path from START to EXIT.</p>
        <p>Charges can only be placed on walls (gray cells).</p>
        <p>Avoid placing charges near sensitive areas (marked in red).</p>
      </div>
    `;
    this.puzzleContainer.appendChild(instructions);

    // Generate the map
    this.generateMap();

    // Create the map display
    this.mapContainer = document.createElement("div");
    this.mapContainer.className =
      "grid grid-cols-5 gap-1 mb-4 p-3 bg-black rounded-lg";

    // Create the map cells
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cellType = this.map[row][col];
        const cell = document.createElement("div");
        cell.className =
          "map-cell w-16 h-16 flex items-center justify-center rounded-md relative";
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.type = cellType;

        // Style based on cell type
        this.styleCellByType(cell, cellType);

        // Add click handler for wall cells
        if (cellType === "wall") {
          cell.addEventListener("click", () =>
            this.toggleCharge(cell, row, col)
          );
        }

        this.mapContainer.appendChild(cell);
      }
    }

    this.puzzleContainer.appendChild(this.mapContainer);

    // Create charge inventory
    this.createChargeInventory();

    // Create control panel
    this.createControlPanel();

    // Add to main container
    this.container.appendChild(this.puzzleContainer);

    // Start countdown timer via callback
    this.callbacks.startCountdown(this.onTimeUp.bind(this));
  }

  generateMap() {
    // Initialize empty map
    this.map = Array(this.gridSize)
      .fill()
      .map(() => Array(this.gridSize).fill("wall"));

    // Define start and exit positions
    const start = { row: 0, col: 0 };
    const exit = { row: this.gridSize - 1, col: this.gridSize - 1 };

    // Set start and exit
    this.map[start.row][start.col] = "start";
    this.map[exit.row][exit.col] = "exit";

    // Add some open paths based on difficulty
    const openPathCount = 6 + (3 - this.puzzleData.difficulty) * 2;

    // Generate some open paths
    for (let i = 0; i < openPathCount; i++) {
      let row, col;
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (this.map[row][col] !== "wall");

      this.map[row][col] = "path";
    }

    // Add some sensitive areas that can't be blown up
    const sensitiveCount = Math.min(this.puzzleData.difficulty + 1, 4);

    for (let i = 0; i < sensitiveCount; i++) {
      let row, col;
      do {
        row = Math.floor(Math.random() * this.gridSize);
        col = Math.floor(Math.random() * this.gridSize);
      } while (this.map[row][col] !== "wall");

      this.map[row][col] = "sensitive";
    }

    // Find a possible solution path to ensure puzzle is solvable
    this.findSolutionPath();
  }

  findSolutionPath() {
    // Create a copy of the map for testing
    const testMap = JSON.parse(JSON.stringify(this.map));

    // Add some potential charge locations to create a valid path
    const potentialCharges = [];

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (testMap[row][col] === "wall") {
          potentialCharges.push({ row, col });
        }
      }
    }

    // Shuffle potential charges
    potentialCharges.sort(() => 0.5 - Math.random());

    // Select the first few as our solution
    this.pathSolution = potentialCharges.slice(0, this.maxCharges);

    // Mark these as "path" in the test map
    this.pathSolution.forEach((charge) => {
      testMap[charge.row][charge.col] = "path";
    });

    // TODO: Verify that a path exists from start to exit in the test map
    // This would use a pathfinding algorithm like A* or BFS
    // For now, we'll assume the random distribution creates a valid path
  }

  createChargeInventory() {
    // Create inventory section
    const inventorySection = document.createElement("div");
    inventorySection.className = "mb-4";

    const inventoryTitle = document.createElement("div");
    inventoryTitle.className = "text-white text-sm mb-2";
    inventoryTitle.textContent = "Explosive Charges Available:";
    inventorySection.appendChild(inventoryTitle);

    // Create the inventory display
    this.chargeInventory = document.createElement("div");
    this.chargeInventory.className =
      "flex items-center justify-center gap-3 p-2 bg-gray-800 rounded-lg";

    // Create charge indicators
    for (let i = 0; i < this.maxCharges; i++) {
      const charge = document.createElement("div");
      charge.className =
        "w-10 h-10 rounded-lg bg-red-600 border-2 border-yellow-500 flex items-center justify-center text-white font-bold";
      charge.textContent = "💣";
      this.chargeInventory.appendChild(charge);

      // Add to charges array
      this.charges.push(charge);
    }

    inventorySection.appendChild(this.chargeInventory);
    this.puzzleContainer.appendChild(inventorySection);
  }

  createControlPanel() {
    // Create control panel
    this.controlPanel = document.createElement("div");
    this.controlPanel.className = "flex justify-between items-center";

    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors";
    resetButton.textContent = "Reset Map";
    resetButton.addEventListener("click", () => this.resetMap());
    this.controlPanel.appendChild(resetButton);

    // Detonate button
    const detonateButton = document.createElement("button");
    detonateButton.className =
      "px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors font-bold";
    detonateButton.textContent = "DETONATE CHARGES";
    detonateButton.addEventListener("click", () => this.detonateCharges());
    this.controlPanel.appendChild(detonateButton);

    this.puzzleContainer.appendChild(this.controlPanel);
  }

  styleCellByType(cell, type) {
    // Set appearance based on cell type
    switch (type) {
      case "start":
        cell.className += " bg-green-800";
        cell.innerHTML = `<span class="text-white font-bold">START</span>`;
        break;
      case "exit":
        cell.className += " bg-blue-800";
        cell.innerHTML = `<span class="text-white font-bold">EXIT</span>`;
        break;
      case "path":
        cell.className += " bg-gray-600";
        break;
      case "wall":
        cell.className += " bg-gray-700 cursor-pointer hover:bg-gray-600";
        break;
      case "sensitive":
        cell.className += " bg-red-900 relative";
        cell.innerHTML = `<span class="text-red-200 text-xs">DANGER</span>`;
        // Add warning icon
        const warning = document.createElement("div");
        warning.className = "absolute top-1 right-1 text-yellow-400 text-xs";
        warning.textContent = "⚠️";
        cell.appendChild(warning);
        break;
    }
  }

  toggleCharge(cell, row, col) {
    // Check if already a charge here
    const existingIndex = this.selectedCharges.findIndex(
      (c) => c.row === row && c.col === col
    );

    if (existingIndex !== -1) {
      // Remove charge
      this.selectedCharges.splice(existingIndex, 1);
      cell.classList.remove("bg-red-600", "ring-2", "ring-yellow-400");
      cell.classList.add("bg-gray-700");
      cell.innerHTML = "";

      // Update inventory
      this.updateChargeInventory();
      return;
    }

    // Check if we have charges left
    if (this.selectedCharges.length >= this.maxCharges) {
      this.callbacks.showMessage(
        `Maximum ${this.maxCharges} charges allowed!`,
        "warning"
      );
      return;
    }

    // Add charge to this location
    this.selectedCharges.push({ row, col });
    cell.classList.remove("bg-gray-700");
    cell.classList.add("bg-red-600", "ring-2", "ring-yellow-400");

    // Add explosion icon
    cell.innerHTML = `<span class="text-2xl">💣</span>`;

    // Update inventory
    this.updateChargeInventory();
  }

  updateChargeInventory() {
    // Update charge inventory display
    const chargesLeft = this.maxCharges - this.selectedCharges.length;

    this.charges.forEach((charge, index) => {
      if (index < chargesLeft) {
        charge.classList.remove("opacity-30");
      } else {
        charge.classList.add("opacity-30");
      }
    });
  }

  resetMap() {
    // Clear selected charges
    this.selectedCharges = [];

    // Reset the map display
    const cells = document.querySelectorAll(".map-cell[data-type='wall']");
    cells.forEach((cell) => {
      cell.classList.remove("bg-red-600", "ring-2", "ring-yellow-400");
      cell.classList.add("bg-gray-700");
      cell.innerHTML = "";
    });

    // Reset inventory
    this.updateChargeInventory();

    this.callbacks.showMessage("Map reset", "info");
  }

  detonateCharges() {
    // Check if we have the right number of charges
    if (this.selectedCharges.length < this.maxCharges) {
      this.callbacks.showMessage(
        `Place ${this.maxCharges} charges to create an escape route!`,
        "warning"
      );
      return;
    }

    // Verify charges are valid (not on sensitive areas)
    for (const charge of this.selectedCharges) {
      if (this.map[charge.row][charge.col] === "sensitive") {
        this.callbacks.showMessage(
          `Cannot place charges on sensitive areas!`,
          "error"
        );
        return;
      }
    }

    // Start detonation animation
    this.animateDetonation().then(() => {
      // Check if the solution is valid
      const isValid = this.checkValidPath();

      if (isValid) {
        // Puzzle solved!
        this.isCompleted = true;
        this.callbacks.showSuccess();
      } else {
        this.callbacks.showMessage(
          "No valid escape path found! Try a different arrangement.",
          "error"
        );
      }
    });
  }

  animateDetonation() {
    return new Promise((resolve) => {
      // Disable interaction during animation
      this.mapContainer.classList.add("pointer-events-none");

      // Display detonation message
      this.callbacks.showMessage("Charges detonating...", "warning");

      // Animate each charge
      let index = 0;
      const detonateNext = () => {
        if (index >= this.selectedCharges.length) {
          // All charges detonated, show blast result
          setTimeout(() => {
            this.showDetonationResult();
            resolve();
          }, 500);
          return;
        }

        const charge = this.selectedCharges[index];
        const cell = document.querySelector(
          `.map-cell[data-row="${charge.row}"][data-col="${charge.col}"]`
        );

        // Add explosion animation
        cell.innerHTML = `<span class="text-4xl animate-ping">💥</span>`;
        cell.classList.add("detonating");

        // Play explosion sound if available
        // this.playSound('explosion');

        // Next charge
        setTimeout(() => {
          index++;
          detonateNext();
        }, 600);
      };

      // Start the sequence
      detonateNext();
    });
  }

  showDetonationResult() {
    // Convert all charge positions to paths
    this.selectedCharges.forEach((charge) => {
      const cell = document.querySelector(
        `.map-cell[data-row="${charge.row}"][data-col="${charge.col}"]`
      );
      cell.classList.remove("bg-red-600", "detonating");
      cell.classList.add("bg-gray-600");
      cell.innerHTML = "";
      cell.dataset.type = "path";
    });

    // Create a visual pathway highlighting
    const pathCells = document.querySelectorAll(
      '.map-cell[data-type="path"], .map-cell[data-type="start"], .map-cell[data-type="exit"]'
    );

    pathCells.forEach((cell) => {
      // Add a subtle glow to show the path
      cell.classList.add("path-highlight");
    });
  }

  checkValidPath() {
    // Create a test map with the player's charges
    const testMap = JSON.parse(JSON.stringify(this.map));

    // Add the player's charges as paths
    this.selectedCharges.forEach((charge) => {
      testMap[charge.row][charge.col] = "path";
    });

    // For a simplified check, just ensure there are enough adjacent paths
    // from start to exit
    // A full implementation would use proper pathfinding

    const startCell = { row: 0, col: 0 };
    const endCell = { row: this.gridSize - 1, col: this.gridSize - 1 };

    // Count how many path cells are adjacent to the start
    const startAdjacentPaths = this.countAdjacentPaths(startCell, testMap);
    const endAdjacentPaths = this.countAdjacentPaths(endCell, testMap);

    // Simple check - there should be paths next to both start and exit
    return startAdjacentPaths > 0 && endAdjacentPaths > 0;
  }

  countAdjacentPaths(cell, map) {
    let count = 0;
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 }, // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }, // right
    ];

    for (const dir of directions) {
      const newRow = cell.row + dir.row;
      const newCol = cell.col + dir.col;

      // Check if in bounds
      if (
        newRow >= 0 &&
        newRow < this.gridSize &&
        newCol >= 0 &&
        newCol < this.gridSize
      ) {
        // Check if it's a path
        if (map[newRow][newCol] === "path") {
          count++;
        }
      }
    }

    return count;
  }

  onTimeUp() {
    if (this.isCompleted) return;

    // Show failure message
    this.callbacks.showMessage(
      "Time's up! Failed to create escape route.",
      "error"
    );

    // Disable further interaction
    this.puzzleContainer.classList.add("opacity-75", "pointer-events-none");
    this.callbacks.disableSubmit();
  }

  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Special effects for events
    if (eventType === "security_patrol") {
      // Security patrol - highlight dangerous areas
      const sensitiveAreas = document.querySelectorAll(
        '.map-cell[data-type="sensitive"]'
      );

      sensitiveAreas.forEach((area) => {
        area.classList.add("animate-pulse", "bg-red-600");
      });

      // Reset after duration
      setTimeout(() => {
        sensitiveAreas.forEach((area) => {
          area.classList.remove("animate-pulse", "bg-red-600");
        });
      }, duration * 1000);
    }
  }

  cleanup() {
    // Clean up event listeners
    if (this.puzzleContainer) {
      this.puzzleContainer.remove();
    }

    this.puzzleContainer = null;
    this.mapContainer = null;
    this.controlPanel = null;
    this.chargeInventory = null;
  }

  getSubmissionData() {
    return {
      selectedCharges: this.selectedCharges,
      solutionCharges: this.pathSolution,
      success: this.isCompleted,
    };
  }
}

// Add CSS to handle animations
const style = document.createElement("style");
style.textContent = `
  .detonating {
    animation: explosion 0.6s ease-in-out;
  }
  
  .path-highlight {
    box-shadow: inset 0 0 15px rgba(59, 130, 246, 0.5);
    transition: all 0.3s ease;
  }
  
  @keyframes explosion {
    0% { transform: scale(1); }
    50% { transform: scale(1.5); background-color: #f97316; }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

export default FinalDetonationPuzzle;
