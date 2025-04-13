// circuitBoardPuzzle.js - Circuit Board Repair Puzzle for the Demolitions role
// Difficulty: 3/5 - Medium-Hard difficulty

class CircuitBoardPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Circuit board properties
    this.gridSize = 6; // 6x6 grid for medium difficulty
    this.grid = [];
    this.paths = []; // Array of circuit paths
    this.components = []; // Array of components to place
    this.brokenComponents = []; // Components that need fixing

    // Active component and placement
    this.selectedComponent = null;
    this.selectedRotation = 0;

    // Component types
    this.componentTypes = [
      { type: "resistor", shape: "I", connections: [0, 2] },
      { type: "capacitor", shape: "I", connections: [0, 2] },
      { type: "diode", shape: "I", connections: [0, 2] },
      { type: "transistor", shape: "T", connections: [0, 1, 2] },
      { type: "switch", shape: "L", connections: [0, 1] },
      { type: "ic", shape: "+", connections: [0, 1, 2, 3] },
    ];

    // UI elements
    this.boardElement = null;
    this.componentsContainer = null;
    this.messageElement = null;
    this.rotateButton = null;

    // Timer for blinking broken components
    this.blinkTimer = null;

    // Adjacency directions (Up, Right, Down, Left)
    this.directions = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 3;
    this._adjustDifficulty();
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Initialize grid
    this._initializeGrid();

    // Generate circuit paths and broken components
    this._generateCircuitPaths();

    // Generate components to place
    this._generateComponents();

    // Render the circuit board
    this._renderBoard();

    // Start blinking effect for broken components
    this._startBlinkEffect();

    // Display instructions
    this._showMessage(
      "Repair the circuit board by placing components in the correct positions."
    );
  }

  /**
   * Create the puzzle UI
   */
  _createUI() {
    // Clear container
    this.containerElement.innerHTML = "";

    // Create puzzle container
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className = "circuit-puzzle flex flex-col items-center p-4";

    // Create circuit board
    this.boardElement = document.createElement("div");
    this.boardElement.className =
      "circuit-board grid gap-1 mb-4 bg-gray-900 p-3 rounded-lg";
    this.boardElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
    puzzleContainer.appendChild(this.boardElement);

    // Create rotate button
    this.rotateButton = document.createElement("button");
    this.rotateButton.className =
      "rotate-button px-3 py-2 bg-blue-600 text-white rounded mb-4 disabled:opacity-50";
    this.rotateButton.textContent = "Rotate Component";
    this.rotateButton.disabled = true;
    this.rotateButton.addEventListener("click", () =>
      this._rotateSelectedComponent()
    );
    puzzleContainer.appendChild(this.rotateButton);

    // Create component selection area
    const componentsTitle = document.createElement("div");
    componentsTitle.className = "text-white text-center mb-2";
    componentsTitle.textContent = "Available Components:";
    puzzleContainer.appendChild(componentsTitle);

    this.componentsContainer = document.createElement("div");
    this.componentsContainer.className =
      "components-container flex flex-wrap gap-2 mb-4 justify-center";
    puzzleContainer.appendChild(this.componentsContainer);

    // Create message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "message mt-4 p-2 w-full text-center rounded-lg";
    puzzleContainer.appendChild(this.messageElement);

    // Add to main container
    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Initialize the grid
   */
  _initializeGrid() {
    this.grid = [];

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.grid[y][x] = {
          x: x,
          y: y,
          type: "empty",
          connections: [],
          isPath: false,
          isBroken: false,
          component: null,
          rotation: 0,
          element: null,
        };
      }
    }
  }

  /**
   * Generate circuit paths for the board
   */
  _generateCircuitPaths() {
    this.paths = [];
    this.brokenComponents = [];

    // Number of paths based on difficulty
    const numPaths = 2 + Math.min(2, this.difficulty - 2);

    // Generate each path
    for (let i = 0; i < numPaths; i++) {
      const path = this._generateSinglePath();
      if (path && path.length > 0) {
        this.paths.push(path);

        // Place some components on the path
        this._placeBrokenComponentsOnPath(path);
      }
    }
  }

  /**
   * Generate a single circuit path
   * @returns {Array} - Array of cells on the path
   */
  _generateSinglePath() {
    // Start from an edge
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX, startY;

    switch (edge) {
      case 0: // Top edge
        startX = Math.floor(Math.random() * this.gridSize);
        startY = 0;
        break;
      case 1: // Right edge
        startX = this.gridSize - 1;
        startY = Math.floor(Math.random() * this.gridSize);
        break;
      case 2: // Bottom edge
        startX = Math.floor(Math.random() * this.gridSize);
        startY = this.gridSize - 1;
        break;
      case 3: // Left edge
        startX = 0;
        startY = Math.floor(Math.random() * this.gridSize);
        break;
    }

    // Path finding
    const visited = {};
    const path = [];
    const queue = [{ x: startX, y: startY, path: [] }];

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (visited[key]) continue;
      visited[key] = true;

      const currentPath = [...current.path, this.grid[current.y][current.x]];

      // If we've reached another edge and path is long enough
      if (
        (current.x === 0 ||
          current.x === this.gridSize - 1 ||
          current.y === 0 ||
          current.y === this.gridSize - 1) &&
        current.x !== startX &&
        current.y !== startY &&
        currentPath.length > 4
      ) {
        return currentPath;
      }

      // Try each direction
      this.directions.forEach((dir, dirIndex) => {
        const nextX = current.x + dir.x;
        const nextY = current.y + dir.y;

        // Check if the next position is valid
        if (
          nextX >= 0 &&
          nextX < this.gridSize &&
          nextY >= 0 &&
          nextY < this.gridSize &&
          !visited[`${nextX},${nextY}`]
        ) {
          // Add to queue
          queue.push({
            x: nextX,
            y: nextY,
            path: currentPath,
          });
        }
      });
    }

    // If no complete path found, return partial path
    return [];
  }

  /**
   * Place broken components on a circuit path
   * @param {Array} path - Path to place components on
   */
  _placeBrokenComponentsOnPath(path) {
    if (path.length < 3) return;

    // Number of components to break
    const numBroken = 1 + Math.floor(Math.random() * 2);

    // Find appropriate positions (not at the edges)
    const validPositions = path.filter((cell, index) => {
      return index > 0 && index < path.length - 1;
    });

    // Shuffle array
    const shuffled = [...validPositions].sort(() => 0.5 - Math.random());

    // Take the first numBroken elements
    for (let i = 0; i < Math.min(numBroken, shuffled.length); i++) {
      const cell = shuffled[i];

      // Mark as broken
      this.grid[cell.y][cell.x].isBroken = true;
      this.grid[cell.y][cell.x].type = "broken";

      // Determine connections based on adjacent path cells
      const connections = [];
      this.directions.forEach((dir, dirIndex) => {
        const adjX = cell.x + dir.x;
        const adjY = cell.y + dir.y;

        // If adjacent cell is in the path, add its direction to connections
        const adjInPath = path.some((p) => p.x === adjX && p.y === adjY);
        if (adjInPath) {
          connections.push(dirIndex);
        }
      });

      // Store broken component with required connections
      this.brokenComponents.push({
        x: cell.x,
        y: cell.y,
        connections: connections,
        fixed: false,
      });

      this.grid[cell.y][cell.x].connections = connections;
    }

    // Mark all path cells
    path.forEach((cell) => {
      this.grid[cell.y][cell.x].isPath = true;
      if (!this.grid[cell.y][cell.x].isBroken) {
        this.grid[cell.y][cell.x].type = "path";
      }
    });
  }

  /**
   * Generate components that can be placed
   */
  _generateComponents() {
    this.components = [];

    // Create components for each broken part plus some extras
    const totalComponents = this.brokenComponents.length + 2;

    // For each broken component, create a matching component
    this.brokenComponents.forEach((broken) => {
      const connections = broken.connections;

      // Find a suitable component type
      let matchingType = this.componentTypes.find((type) => {
        return type.connections.length === connections.length;
      });

      // If no exact match, use a component with more connections
      if (!matchingType) {
        matchingType = this.componentTypes.find((type) => {
          return type.connections.length >= connections.length;
        });
      }

      // Create the component
      if (matchingType) {
        this.components.push({
          type: matchingType.type,
          shape: matchingType.shape,
          connections: [...matchingType.connections],
          used: false,
        });
      }
    });

    // Add some random extra components
    for (let i = this.components.length; i < totalComponents; i++) {
      const randomType =
        this.componentTypes[
          Math.floor(Math.random() * this.componentTypes.length)
        ];
      this.components.push({
        type: randomType.type,
        shape: randomType.shape,
        connections: [...randomType.connections],
        used: false,
      });
    }

    // Shuffle components
    this.components.sort(() => 0.5 - Math.random());

    // Render components
    this._renderComponents();
  }

  /**
   * Render the circuit board
   */
  _renderBoard() {
    this.boardElement.innerHTML = "";

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];

        // Create cell element
        const cellElement = document.createElement("div");
        cellElement.className =
          "circuit-cell w-10 h-10 flex items-center justify-center rounded";

        // Style based on cell type
        if (cell.isPath) {
          cellElement.classList.add("bg-gray-800");

          // Add wires for path cells
          if (cell.type === "path") {
            // Add copper traces
            cellElement.classList.add("circuit-trace");
          }
        } else {
          cellElement.classList.add("bg-gray-700");
        }

        // Add broken component indicator
        if (cell.isBroken) {
          cellElement.classList.add("broken-component");
          cellElement.innerHTML = `<div class="absolute inset-0 flex items-center justify-center">X</div>`;
        }

        // Add component if present
        if (cell.component) {
          const componentElement = document.createElement("div");
          componentElement.className = `component ${cell.component.type} absolute inset-0 flex items-center justify-center`;

          // Add visual for component based on shape
          let componentVisual = "";
          switch (cell.component.shape) {
            case "I":
              componentVisual = '<div class="bg-blue-500 h-2 w-8"></div>';
              break;
            case "L":
              componentVisual =
                '<div class="bg-green-500 h-2 w-5 absolute right-1 top-3"></div><div class="bg-green-500 h-5 w-2 absolute right-1 top-3"></div>';
              break;
            case "T":
              componentVisual =
                '<div class="bg-yellow-500 h-2 w-8"></div><div class="bg-yellow-500 h-4 w-2 absolute top-4 left-4"></div>';
              break;
            case "+":
              componentVisual =
                '<div class="bg-purple-500 h-2 w-8"></div><div class="bg-purple-500 h-8 w-2 absolute left-4"></div>';
              break;
          }

          componentElement.innerHTML = componentVisual;

          // Apply rotation
          componentElement.style.transform = `rotate(${cell.rotation * 90}deg)`;

          cellElement.appendChild(componentElement);
        }

        // Add drop functionality
        cellElement.addEventListener("click", () =>
          this._handleCellClick(x, y)
        );

        // Store reference to the element
        cell.element = cellElement;
        this.boardElement.appendChild(cellElement);
      }
    }
  }

  /**
   * Render available components
   */
  _renderComponents() {
    this.componentsContainer.innerHTML = "";

    this.components.forEach((component, index) => {
      if (component.used) return;

      const componentElement = document.createElement("div");
      componentElement.className = `component-item ${
        component.type
      } w-12 h-12 bg-gray-800 rounded flex items-center justify-center relative ${
        this.selectedComponent === index ? "ring-2 ring-yellow-400" : ""
      }`;
      componentElement.dataset.index = index;

      // Add visual for component based on shape
      let componentVisual = "";
      switch (component.shape) {
        case "I":
          componentVisual = '<div class="bg-blue-500 h-2 w-8"></div>';
          break;
        case "L":
          componentVisual =
            '<div class="bg-green-500 h-2 w-5 absolute right-1 top-3"></div><div class="bg-green-500 h-5 w-2 absolute right-1 top-3"></div>';
          break;
        case "T":
          componentVisual =
            '<div class="bg-yellow-500 h-2 w-8"></div><div class="bg-yellow-500 h-4 w-2 absolute top-4 left-4"></div>';
          break;
        case "+":
          componentVisual =
            '<div class="bg-purple-500 h-2 w-8"></div><div class="bg-purple-500 h-8 w-2 absolute left-4"></div>';
          break;
      }

      componentElement.innerHTML = componentVisual;

      // Add label
      const label = document.createElement("div");
      label.className =
        "absolute bottom-0 w-full text-center text-xs text-white";
      label.textContent = component.type;
      componentElement.appendChild(label);

      // Apply rotation
      if (this.selectedComponent === index) {
        componentElement.style.transform = `rotate(${
          this.selectedRotation * 90
        }deg)`;
      }

      // Add click event
      componentElement.addEventListener("click", () =>
        this._selectComponent(index)
      );

      this.componentsContainer.appendChild(componentElement);
    });
  }

  /**
   * Start blinking effect for broken components
   */
  _startBlinkEffect() {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
    }

    let blinkState = true;
    this.blinkTimer = setInterval(() => {
      const brokenElements =
        this.containerElement.querySelectorAll(".broken-component");

      brokenElements.forEach((el) => {
        if (blinkState) {
          el.classList.add("bg-red-500", "bg-opacity-50");
        } else {
          el.classList.remove("bg-red-500", "bg-opacity-50");
        }
      });

      blinkState = !blinkState;
    }, 500);
  }

  /**
   * Handle cell click on the circuit board
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _handleCellClick(x, y) {
    const cell = this.grid[y][x];

    // If no component selected, do nothing
    if (this.selectedComponent === null) return;

    // If cell is not a broken component, do nothing
    if (!cell.isBroken) {
      this._showMessage(
        "You can only place components on broken circuit spots.",
        "error"
      );
      return;
    }

    // If cell already has a component, remove it first
    if (cell.component) {
      // Find component in components array
      const compIndex = this.components.findIndex(
        (c) => c.type === cell.component.type && c.used
      );

      if (compIndex !== -1) {
        this.components[compIndex].used = false;
      }

      // Clear cell
      cell.component = null;
      cell.rotation = 0;
    }

    // Place the selected component
    const component = this.components[this.selectedComponent];

    // Mark component as used
    component.used = true;

    // Set component in grid
    cell.component = {
      type: component.type,
      shape: component.shape,
      connections: this._rotateConnections(
        component.connections,
        this.selectedRotation
      ),
    };
    cell.rotation = this.selectedRotation;

    // Reset selection
    this.selectedComponent = null;
    this.selectedRotation = 0;
    this.rotateButton.disabled = true;

    // Re-render board and components
    this._renderBoard();
    this._renderComponents();

    // Check if all broken components are fixed
    this._checkCircuitComplete();
  }

  /**
   * Select a component to place
   * @param {number} index - Index of the component
   */
  _selectComponent(index) {
    if (this.components[index].used) return;

    this.selectedComponent = index;
    this.selectedRotation = 0;
    this.rotateButton.disabled = false;

    // Re-render components to show selection
    this._renderComponents();

    this._showMessage(
      `Selected ${this.components[index].type}. Click on a broken circuit spot to place it.`
    );
  }

  /**
   * Rotate the selected component
   */
  _rotateSelectedComponent() {
    if (this.selectedComponent === null) return;

    // Increment rotation (0, 1, 2, 3) = (0°, 90°, 180°, 270°)
    this.selectedRotation = (this.selectedRotation + 1) % 4;

    // Re-render components
    this._renderComponents();
  }

  /**
   * Rotate connection directions
   * @param {Array} connections - Original connections
   * @param {number} rotation - Rotation count (0-3)
   * @returns {Array} - Rotated connections
   */
  _rotateConnections(connections, rotation) {
    if (rotation === 0) return [...connections];

    return connections.map((direction) => (direction + rotation) % 4);
  }

  /**
   * Check if all broken components are fixed correctly
   */
  _checkCircuitComplete() {
    // Check each broken component
    const allFixed = this.brokenComponents.every((broken) => {
      const cell = this.grid[broken.y][broken.x];

      // If no component placed, not fixed
      if (!cell.component) return false;

      // Check if connections match
      const requiredConnections = new Set(broken.connections);
      const placedConnections = new Set(cell.component.connections);

      // Must have same number of connections
      if (requiredConnections.size !== placedConnections.size) return false;

      // Each required connection must be present
      for (const conn of requiredConnections) {
        if (!placedConnections.has(conn)) return false;
      }

      return true;
    });

    if (allFixed) {
      this._handleSuccess();
    }
  }

  /**
   * Handle successful completion
   */
  _handleSuccess() {
    this.isComplete = true;

    // Stop blinking
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }

    // Show success message
    this._showMessage("Circuit successfully repaired!", "success");

    // Trigger success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Show message
   * @param {string} message - Message to display
   * @param {string} type - Type of message (info, success, error)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    // Remove previous classes
    this.messageElement.className =
      "message mt-4 p-2 w-full text-center rounded-lg";

    // Add type-specific class
    switch (type) {
      case "success":
        this.messageElement.classList.add("bg-green-700", "text-white");
        break;
      case "error":
        this.messageElement.classList.add("bg-red-700", "text-white");
        break;
      default:
        this.messageElement.classList.add("bg-blue-700", "text-white");
    }

    this.messageElement.textContent = message;
  }

  /**
   * Adjust difficulty based on level
   */
  _adjustDifficulty() {
    if (this.difficulty > 3) {
      // Increase grid size for higher difficulties
      this.gridSize = 6 + (this.difficulty - 3);
    }
  }

  /**
   * Check if the solution is valid
   * @returns {boolean} - True if solution is valid
   */
  validateSolution() {
    return this.isComplete;
  }

  /**
   * Get the current solution
   * @returns {Object} - Current state of the board
   */
  getSolution() {
    return {
      completed: this.isComplete,
      brokenFixed: this.brokenComponents.length,
    };
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Please fix all broken circuit components.";
  }

  /**
   * Show success animation
   */
  showSuccess() {
    // Highlight all fixed components
    this.brokenComponents.forEach((broken) => {
      const cell = this.grid[broken.y][broken.x];
      if (cell && cell.element) {
        cell.element.classList.add("bg-green-500", "bg-opacity-40");

        // Add pulse animation
        cell.element.classList.add("animate-pulse");

        // Remove pulse after a few seconds
        setTimeout(() => {
          cell.element.classList.remove("animate-pulse");
        }, 2000);
      }
    });

    // Play circuit activation sound
    try {
      const activationSound = new Audio(
        "../static/sounds/circuit-activate.mp3"
      );
      activationSound.volume = 0.3;
      activationSound
        .play()
        .catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play circuit activation sound:", e);
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop blinking timer
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }

    // Remove event listeners
    if (this.rotateButton) {
      const clone = this.rotateButton.cloneNode(true);
      this.rotateButton.parentNode.replaceChild(clone, this.rotateButton);
      this.rotateButton = clone;
    }

    // Reset state
    this.grid = [];
    this.paths = [];
    this.components = [];
    this.brokenComponents = [];
    this.selectedComponent = null;
  }
}

export default CircuitBoardPuzzle;
