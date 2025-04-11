// circuitPuzzle.js - Stage 1 Hacker puzzle - Circuit connection challenge

class CircuitPuzzle {
  constructor(containerElement, puzzleData) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.gridSize = 5; // Default
    this.grid = [];
    this.currentPath = [];
    this.isDragging = false;

    // DOM elements
    this.gridElement = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
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
    this._createGridElement();
  }

  /**
   * Create the grid element with cells
   */
  _createGridElement() {
    this.gridElement = document.createElement("div");
    this.gridElement.className =
      "grid gap-1 bg-gray-900 p-4 rounded-lg select-none";
    this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, minmax(0, 1fr))`;
    this.gridElement.style.width = `${this.gridSize * 60}px`;

    // Create cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = document.createElement("div");
        cell.className =
          "grid-cell w-12 h-12 rounded-md flex items-center justify-center";
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
        cell.addEventListener("touchstart", (e) => {
          e.preventDefault();
          this._handleCellMouseDown(e, x, y);
        });
        cell.addEventListener("touchmove", (e) => {
          e.preventDefault();
          const touch = e.touches[0];
          const elementsAtTouch = document.elementsFromPoint(
            touch.clientX,
            touch.clientY
          );
          const touchedCell = elementsAtTouch.find((el) =>
            el.classList.contains("grid-cell")
          );

          if (touchedCell) {
            const touchX = parseInt(touchedCell.dataset.x);
            const touchY = parseInt(touchedCell.dataset.y);
            this._handleCellMouseEnter(e, touchX, touchY);
          }
        });

        this.gridElement.appendChild(cell);
      }
    }

    // Add mouseup/touchend event to document to end dragging
    document.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    document.addEventListener("touchend", () => {
      this.isDragging = false;
    });

    // Add visual feedback for circuit energy
    this._addCircuitEnergyEffects();

    this.containerElement.appendChild(this.gridElement);
  }

  /**
   * Add visual effects for circuit energy
   */
  _addCircuitEnergyEffects() {
    // Add a pulsing effect container
    const energyEffectContainer = document.createElement("div");
    energyEffectContainer.className = "relative w-full h-full";
    energyEffectContainer.style.position = "absolute";
    energyEffectContainer.style.top = "0";
    energyEffectContainer.style.left = "0";
    energyEffectContainer.style.pointerEvents = "none";

    // Add a circuit diagram background (cosmetic)
    const circuitBg = document.createElement("div");
    circuitBg.className = "absolute inset-0 opacity-10";
    circuitBg.style.backgroundImage =
      "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHBhdGggZD0iTTAgMCBMIDEwMCAxMDAgTSA1MCAwIEwgNTAgMTAwIE0gMCA1MCBMIDM1IDUwIE0gNjUgNTAgTCAxMDAgNTAgTSAxMCAxMCBMIDM1IDM1IE0gNjUgNjUgTCA5MCA5MCBNIDM1IDY1IEwgNjUgMzUiIHN0cm9rZT0iIzAwZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+')";
    energyEffectContainer.appendChild(circuitBg);

    // Add container before the grid
    this.containerElement.appendChild(energyEffectContainer);
  }

  /**
   * Update cell appearance based on its type
   * @param {HTMLElement} cell - Cell element
   * @param {number} type - Cell type (0: empty, 1: path, 2: start, 3: end, 4: barrier, 5: switch)
   */
  _updateCellAppearance(cell, type) {
    // Reset classes
    cell.className =
      "grid-cell w-12 h-12 rounded-md flex items-center justify-center";
    cell.innerHTML = "";

    switch (type) {
      case 0: // Empty
        cell.classList.add(
          "bg-gray-700",
          "hover:bg-gray-600",
          "cursor-pointer",
          "transition-all",
          "duration-200"
        );
        break;
      case 1: // Path
        cell.classList.add(
          "bg-blue-500",
          "cursor-pointer",
          "pulse-effect",
          "transition-all",
          "duration-200"
        );
        // Add circuit line effect
        const pathInner = document.createElement("div");
        pathInner.className = "w-8 h-8 rounded-sm bg-blue-300 opacity-30";
        cell.appendChild(pathInner);
        break;
      case 2: // Start
        cell.classList.add(
          "bg-green-600",
          "cursor-not-allowed",
          "transition-all",
          "duration-200"
        );
        cell.innerHTML =
          '<div class="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center text-xs font-bold pulse-strong">IN</div>';
        break;
      case 3: // End
        cell.classList.add(
          "bg-red-600",
          "cursor-not-allowed",
          "transition-all",
          "duration-200"
        );
        cell.innerHTML =
          '<div class="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-xs font-bold">OUT</div>';
        break;
      case 4: // Barrier
        cell.classList.add(
          "bg-gray-900",
          "cursor-not-allowed",
          "transition-all",
          "duration-200"
        );
        const barrierInner = document.createElement("div");
        barrierInner.className =
          "w-full h-full border-2 border-gray-600 rounded-md flex items-center justify-center";
        barrierInner.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>';
        cell.appendChild(barrierInner);
        break;
      case 5: // Switch
        cell.classList.add(
          "bg-yellow-600",
          "cursor-pointer",
          "transition-all",
          "duration-200"
        );
        cell.innerHTML =
          '<div class="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold">S</div>';
        break;
    }
  }

  /**
   * Handle mouse down on a cell
   * @param {Event} e - Mouse event
   * @param {number} x - Cell x coordinate
   * @param {number} y - Cell y coordinate
   */
  _handleCellMouseDown(e, x, y) {
    // Can only start drawing from start, end, switch, or existing path cells
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
   * Handle mouse enter on a cell (for dragging)
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
   * Add a cell to the current path
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

    // Don't modify start/end/barrier/switch cells' values
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

    // Add a subtle sound effect to enhance user experience
    this._playConnectionSound();
  }

  /**
   * Play a connection sound effect
   */
  _playConnectionSound() {
    try {
      // Check if AudioContext is available
      if (window.AudioContext || window.webkitAudioContext) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();

        // Create an oscillator
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Connect the oscillator to the gain node and the gain node to the destination
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Set the oscillator type and frequency
        oscillator.type = "sine";
        oscillator.frequency.value = 880 + Math.random() * 220; // Random high-pitched tone

        // Set the gain value to a very low level
        gainNode.gain.value = 0.03; // Very quiet

        // Start and stop the oscillator
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
        }, 50);
      }
    } catch (e) {
      // Ignore any errors with audio - it's just an enhancement
      console.debug("Sound effect not available", e);
    }
  }

  /**
   * Clear the current path
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
   * Get the current solution
   * @returns {Array} - The current path as a solution
   */
  getSolution() {
    return this.currentPath.map((cell) => [cell.x, cell.y]);
  }

  /**
   * Validate the current solution
   * @param {Array} solution - The solution to validate
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution(solution) {
    const { start_point, end_point, switches } = this.puzzleData.data;

    // Verify path contains start and end points
    const hasStart = solution.some(
      ([x, y]) => x === start_point[0] && y === start_point[1]
    );
    const hasEnd = solution.some(
      ([x, y]) => x === end_point[0] && y === end_point[1]
    );

    // Verify path contains all switches
    const allSwitchesIncluded = switches.every(([x, y]) =>
      solution.some(([sX, sY]) => sX === x && sY === y)
    );

    return hasStart && hasEnd && allSwitchesIncluded;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    const { start_point, end_point, switches } = this.puzzleData.data;

    // Check each condition separately
    const hasStart = this.currentPath.some(
      (cell) => cell.x === start_point[0] && cell.y === start_point[1]
    );
    const hasEnd = this.currentPath.some(
      (cell) => cell.x === end_point[0] && cell.y === end_point[1]
    );

    // Verify path contains all switches
    const missingSwitches = switches.filter(
      ([x, y]) => !this.currentPath.some((cell) => cell.x === x && cell.y === y)
    );

    if (!hasStart || !hasEnd) {
      return "Error: Circuit must connect input to output!";
    }

    if (missingSwitches.length > 0) {
      return `Error: ${missingSwitches.length} switch${
        missingSwitches.length > 1 ? "es" : ""
      } not connected!`;
    }

    return "Invalid circuit path. Please try again.";
  }

  /**
   * Disable puzzle (used during random events or when completed)
   */
  disable() {
    if (this.gridElement) {
      this.gridElement.classList.add("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Enable puzzle after being disabled
   */
  enable() {
    if (this.gridElement) {
      this.gridElement.classList.remove("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Remove mouseup/touchend listeners
    document.removeEventListener("mouseup", () => {
      this.isDragging = false;
    });

    document.removeEventListener("touchend", () => {
      this.isDragging = false;
    });
  }
}

export default CircuitPuzzle;
