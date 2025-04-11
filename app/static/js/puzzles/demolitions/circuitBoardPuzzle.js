// Circuit Board Puzzle - Repair puzzle for the Demolitions role

class CircuitBoardPuzzle {
  constructor(container, puzzleData, callbacks) {
    this.container = container;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isCompleted = false;

    // Puzzle-specific properties
    this.boardSize = 5; // 5x5 grid
    this.circuitConnections = [];
    this.connections = [];
    this.selectedComponent = null;
    this.correctPathFound = false;

    // DOM elements
    this.boardContainer = null;
    this.componentsContainer = null;
    this.circuitElements = [];
  }

  initialize() {
    // Create circuit board container
    this.boardContainer = document.createElement("div");
    this.boardContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-lg";

    // Add circuit board title
    const boardTitle = document.createElement("h4");
    boardTitle.className = "text-center text-yellow-500 mb-4";
    boardTitle.textContent = "Circuit Board Repair System";
    this.boardContainer.appendChild(boardTitle);

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className =
      "mb-4 p-3 bg-gray-800 rounded border border-blue-600 text-sm";

    instructions.innerHTML = `
      <div class="text-sm text-gray-300 mb-2">Repair Manual - Section 3.7:</div>
      <div class="text-yellow-400">
        <p>Complete the circuit by connecting components from START to END.</p>
        <p>The circuit must pass through exactly ${
          3 + this.puzzleData.difficulty
        } components.</p>
        <p>Create a valid path without crossing wires.</p>
      </div>
    `;
    this.boardContainer.appendChild(instructions);

    // Generate the circuit board puzzle
    this.generateCircuitPuzzle();

    // Create the circuit board grid
    const boardGrid = document.createElement("div");
    boardGrid.className = "grid grid-cols-5 gap-2 p-2 bg-black rounded-lg mb-4";

    // Create cells for the grid
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const cell = document.createElement("div");
        cell.className =
          "circuit-cell w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center relative";
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.id = `${row}-${col}`;

        // Check if this is a special cell
        const isStart = row === 0 && col === 0;
        const isEnd = row === this.boardSize - 1 && col === this.boardSize - 1;

        if (isStart) {
          cell.classList.add("bg-green-900");
          cell.innerHTML = `<div class="text-green-400 font-bold text-sm">START</div>`;
        } else if (isEnd) {
          cell.classList.add("bg-red-900");
          cell.innerHTML = `<div class="text-red-400 font-bold text-sm">END</div>`;
        } else {
          // Make the cell a potential drop target
          cell.addEventListener("click", () =>
            this.handleCellClick(cell, row, col)
          );
        }

        boardGrid.appendChild(cell);
      }
    }

    this.boardContainer.appendChild(boardGrid);

    // Create component palette
    this.componentsContainer = document.createElement("div");
    this.componentsContainer.className =
      "flex flex-wrap justify-center gap-2 mt-4 p-2 bg-gray-800 rounded-lg";

    // Add component types
    const components = [
      { type: "straight", symbol: "│", rotations: ["│", "─"] },
      { type: "corner", symbol: "┌", rotations: ["┌", "┐", "┘", "└"] },
      { type: "t-junction", symbol: "┬", rotations: ["┬", "┤", "┴", "├"] },
      { type: "cross", symbol: "┼", rotations: ["┼"] },
    ];

    components.forEach((component) => {
      const componentElm = document.createElement("div");
      componentElm.className =
        "component w-10 h-10 bg-blue-900 rounded-md flex items-center justify-center cursor-pointer text-2xl text-yellow-300 hover:bg-blue-800 transition-colors";
      componentElm.dataset.type = component.type;
      componentElm.dataset.rotations = JSON.stringify(component.rotations);
      componentElm.dataset.currentRotation = 0;
      componentElm.textContent = component.symbol;

      // Add click handler to select component
      componentElm.addEventListener("click", () =>
        this.selectComponent(componentElm, component)
      );

      this.componentsContainer.appendChild(componentElm);
    });

    this.boardContainer.appendChild(this.componentsContainer);

    // Add a reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors";
    resetButton.textContent = "Reset Board";
    resetButton.addEventListener("click", () => this.resetBoard());
    this.boardContainer.appendChild(resetButton);

    // Add to main container
    this.container.appendChild(this.boardContainer);

    // Start countdown timer via callback
    this.callbacks.startCountdown(this.onTimeUp.bind(this));
  }

  generateCircuitPuzzle() {
    // For this puzzle, we'll create a valid path from start to end
    // that the player will need to recreate using the components

    // Define start and end points
    const start = { row: 0, col: 0 };
    const end = { row: this.boardSize - 1, col: this.boardSize - 1 };

    // Determine complexity based on difficulty
    const requiredComponents = 3 + this.puzzleData.difficulty;

    // Generate a random but valid path that passes through the required number of components
    this.generateValidPath(start, end, requiredComponents);
  }

  generateValidPath(start, end, componentCount) {
    // Initialize the circuit path, starting with just the start point
    this.circuitConnections = [
      { row: start.row, col: start.col, type: "start" },
    ];

    // For simplicity in this demo, we'll define a preset path based on difficulty
    // In a real game, this would use a proper algorithm to generate varied paths

    if (this.puzzleData.difficulty === 1) {
      // Easy path - mostly straight line with a few turns
      this.circuitConnections.push({
        row: 0,
        col: 1,
        type: "straight",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 0,
        col: 2,
        type: "corner",
        rotation: 2,
      });
      this.circuitConnections.push({
        row: 1,
        col: 2,
        type: "straight",
        rotation: 0,
      });
      this.circuitConnections.push({
        row: 2,
        col: 2,
        type: "corner",
        rotation: 3,
      });
      this.circuitConnections.push({
        row: 2,
        col: 3,
        type: "straight",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 2,
        col: 4,
        type: "corner",
        rotation: 2,
      });
      this.circuitConnections.push({
        row: 3,
        col: 4,
        type: "straight",
        rotation: 0,
      });
      this.circuitConnections.push({ row: 4, col: 4, type: "end" });
    } else if (this.puzzleData.difficulty === 2) {
      // Medium path - more complex with T-junctions
      this.circuitConnections.push({
        row: 0,
        col: 1,
        type: "straight",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 0,
        col: 2,
        type: "t-junction",
        rotation: 2,
      });
      this.circuitConnections.push({
        row: 1,
        col: 2,
        type: "corner",
        rotation: 3,
      });
      this.circuitConnections.push({
        row: 1,
        col: 3,
        type: "straight",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 1,
        col: 4,
        type: "corner",
        rotation: 2,
      });
      this.circuitConnections.push({
        row: 2,
        col: 4,
        type: "t-junction",
        rotation: 3,
      });
      this.circuitConnections.push({
        row: 2,
        col: 3,
        type: "corner",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 3,
        col: 3,
        type: "corner",
        rotation: 3,
      });
      this.circuitConnections.push({
        row: 3,
        col: 4,
        type: "straight",
        rotation: 0,
      });
      this.circuitConnections.push({ row: 4, col: 4, type: "end" });
    } else {
      // Hard path - complex with crosses and multiple junctions
      this.circuitConnections.push({
        row: 1,
        col: 0,
        type: "straight",
        rotation: 0,
      });
      this.circuitConnections.push({
        row: 2,
        col: 0,
        type: "corner",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 2,
        col: 1,
        type: "t-junction",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 2,
        col: 2,
        type: "cross",
        rotation: 0,
      });
      this.circuitConnections.push({
        row: 2,
        col: 3,
        type: "corner",
        rotation: 1,
      });
      this.circuitConnections.push({
        row: 3,
        col: 3,
        type: "corner",
        rotation: 3,
      });
      this.circuitConnections.push({
        row: 3,
        col: 2,
        type: "t-junction",
        rotation: 0,
      });
      this.circuitConnections.push({
        row: 4,
        col: 2,
        type: "corner",
        rotation: 0,
      });
      this.circuitConnections.push({
        row: 4,
        col: 3,
        type: "straight",
        rotation: 1,
      });
      this.circuitConnections.push({ row: 4, col: 4, type: "end" });
    }
  }

  selectComponent(element, component) {
    // Deselect previously selected component
    if (this.selectedComponent) {
      this.selectedComponent.classList.remove("ring-2", "ring-yellow-400");
    }

    // Select new component
    this.selectedComponent = element;
    element.classList.add("ring-2", "ring-yellow-400");

    // Show a hint about the component
    this.callbacks.showMessage(
      `Selected: ${component.type} component. Click on the board to place.`,
      "info"
    );
  }

  handleCellClick(cell, row, col) {
    // Check if a component is selected
    if (!this.selectedComponent) {
      this.callbacks.showMessage("Select a component first!", "warning");
      return;
    }

    // Check if cell is already occupied
    if (cell.dataset.occupied === "true") {
      // Allow rotating the component if it's already placed
      this.rotateComponent(cell);
      return;
    }

    // Get component data
    const type = this.selectedComponent.dataset.type;
    const rotations = JSON.parse(this.selectedComponent.dataset.rotations);

    // Place the component
    cell.dataset.occupied = "true";
    cell.dataset.componentType = type;
    cell.dataset.rotation = "0";

    // Add the symbol
    const componentDisplay = document.createElement("div");
    componentDisplay.className = "text-3xl text-yellow-300";
    componentDisplay.textContent = rotations[0];
    cell.innerHTML = "";
    cell.appendChild(componentDisplay);

    // Add to connections
    this.connections.push({
      row,
      col,
      type,
      rotation: 0,
      element: cell,
    });

    // Check if the path is complete
    this.checkCircuitPath();
  }

  rotateComponent(cell) {
    const type = cell.dataset.componentType;
    const currentRotation = parseInt(cell.dataset.rotation);
    const rotations = JSON.parse(this.selectedComponent.dataset.rotations);

    // Calculate new rotation
    const newRotation = (currentRotation + 1) % rotations.length;
    cell.dataset.rotation = newRotation.toString();

    // Update display
    const componentDisplay = cell.querySelector("div");
    componentDisplay.textContent = rotations[newRotation];

    // Update connections data
    const connection = this.connections.find(
      (c) =>
        c.row === parseInt(cell.dataset.row) &&
        c.col === parseInt(cell.dataset.col)
    );
    if (connection) {
      connection.rotation = newRotation;
    }

    // Check if the path is complete
    this.checkCircuitPath();
  }

  checkCircuitPath() {
    // For a simplified version, we'll just check if all the right positions
    // have components matching our solution path

    if (this.connections.length < this.circuitConnections.length - 2) {
      // Not enough components placed yet
      return;
    }

    // Check each required position (excluding start and end)
    let allCorrect = true;

    for (let i = 1; i < this.circuitConnections.length - 1; i++) {
      const required = this.circuitConnections[i];
      const placed = this.connections.find(
        (c) => c.row === required.row && c.col === required.col
      );

      if (
        !placed ||
        placed.type !== required.type ||
        placed.rotation !== required.rotation
      ) {
        allCorrect = false;
        break;
      }
    }

    if (allCorrect) {
      // Path is complete!
      this.correctPathFound = true;
      this.isCompleted = true;
      this.handleSuccess();
    }
  }

  handleSuccess() {
    // Animation for success
    this.animations = [];

    // Highlight the correct path
    this.circuitConnections.forEach((connection, index) => {
      setTimeout(() => {
        const cell = document.querySelector(
          `.circuit-cell[data-id="${connection.row}-${connection.col}"]`
        );
        if (cell) {
          // Add glow effect
          cell.classList.add("ring-2", "ring-green-500");

          // Animate power flowing
          const glow = document.createElement("div");
          glow.className = "absolute inset-0 bg-green-500 rounded-md opacity-0";
          cell.appendChild(glow);

          // Animate the glow
          setTimeout(() => {
            glow.style.transition = "opacity 0.3s";
            glow.style.opacity = "0.3";
          }, 50);
        }
      }, index * 200);
    });

    // Show success after animation completes
    setTimeout(() => {
      this.callbacks.showSuccess();
    }, this.circuitConnections.length * 200 + 500);
  }

  resetBoard() {
    // Clear all placed components
    this.connections = [];

    // Reset the board visually
    const cells = document.querySelectorAll(".circuit-cell");
    cells.forEach((cell) => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);

      // Skip start and end cells
      if (
        (row === 0 && col === 0) ||
        (row === this.boardSize - 1 && col === this.boardSize - 1)
      ) {
        return;
      }

      // Clear the cell
      cell.innerHTML = "";
      cell.classList.remove("ring-2", "ring-green-500");
      delete cell.dataset.occupied;
      delete cell.dataset.componentType;
      delete cell.dataset.rotation;
    });

    // Deselect component
    if (this.selectedComponent) {
      this.selectedComponent.classList.remove("ring-2", "ring-yellow-400");
      this.selectedComponent = null;
    }

    this.callbacks.showMessage("Board reset", "info");
  }

  onTimeUp() {
    if (this.isCompleted) return;

    // Show failure message
    this.callbacks.showMessage("Time's up! Circuit repair failed.", "error");

    // Disable further interaction
    this.boardContainer.classList.add("opacity-75", "pointer-events-none");
    this.callbacks.disableSubmit();
  }

  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // For circuit overload, show sparks on random components
    if (eventType === "system_check") {
      // Create spark effect on a few random components
      const cells = document.querySelectorAll(
        ".circuit-cell[data-occupied='true']"
      );
      const affectedCells = Array.from(cells)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      affectedCells.forEach((cell) => {
        // Add spark animation
        cell.classList.add("spark-effect");

        // Remove after duration
        setTimeout(() => {
          cell.classList.remove("spark-effect");
        }, duration * 1000);
      });
    }
  }

  cleanup() {
    // Clean up event listeners
    if (this.boardContainer) {
      // Using cloneNode would be more thorough for cleaning listeners,
      // but for simplicity we'll just remove the container
      this.boardContainer.remove();
    }

    this.boardContainer = null;
    this.componentsContainer = null;
    this.circuitElements = [];
    this.selectedComponent = null;
  }

  getSubmissionData() {
    return {
      connections: this.connections.map((conn) => ({
        row: conn.row,
        col: conn.col,
        type: conn.type,
        rotation: conn.rotation,
      })),
      success: this.correctPathFound,
    };
  }
}

// Add some CSS that will be injected
const style = document.createElement("style");
style.textContent = `
  .spark-effect {
    animation: spark 0.5s ease-in-out infinite alternate;
  }
  
  @keyframes spark {
    0% { box-shadow: 0 0 5px #ffdd00; }
    100% { box-shadow: 0 0 20px #ff9900, 0 0 30px #ff5500; }
  }
  
  .animate-shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }
  
  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
`;
document.head.appendChild(style);

export default CircuitBoardPuzzle;
