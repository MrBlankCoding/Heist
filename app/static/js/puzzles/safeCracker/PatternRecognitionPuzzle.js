// PatternRecognitionPuzzle.js - Stage 3 Pattern Recognition puzzle for Safe Cracker role

import BasePuzzle from "./BasePuzzle.js";

class PatternRecognitionPuzzle extends BasePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    super(containerElement, puzzleData, submitSolutionCallback);

    // Pattern puzzle specific properties
    this.gridSize = 5; // 5x5 grid
    this.patternSequence = [];
    this.playerSequence = [];
    this.maxPatternLength = 8;
    this.currentPatternLength = 5; // Start with 5 steps
    this.isShowingPattern = false;

    // Grid elements
    this.gridContainer = null;
    this.gridCells = [];
    this.sequenceDisplay = null;
    this.showPatternButton = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    super.initialize();

    // Get game area div
    const gameArea = this.containerElement.querySelector(
      "div.flex.justify-center"
    );
    this._setupPatternPuzzle(gameArea);

    // Generate a pattern sequence if not provided
    if (!this.puzzleData.data || !this.puzzleData.data.sequence) {
      this._generateRandomPattern();
    } else {
      this.patternSequence = this.puzzleData.data.sequence;
    }

    // Initially disable submit button until pattern is shown
    this.submitButton.disabled = true;
  }

  /**
   * Set up the pattern recognition puzzle interface
   * @param {HTMLElement} container - Container element
   */
  _setupPatternPuzzle(container) {
    container.innerHTML = "";
    container.className = "flex flex-col items-center";

    // Create show pattern button
    this.showPatternButton = document.createElement("button");
    this.showPatternButton.className =
      "bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-full mb-4 transition-all";
    this.showPatternButton.textContent = "Show Pattern";
    this.showPatternButton.addEventListener("click", () => this._showPattern());
    container.appendChild(this.showPatternButton);

    // Create grid container
    this.gridContainer = document.createElement("div");
    this.gridContainer.className = "grid gap-1 mb-6";
    this.gridContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
    this.gridContainer.style.width = "300px";
    this.gridContainer.style.height = "300px";

    // Create grid cells
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      const cell = document.createElement("div");
      cell.className =
        "bg-gray-700 rounded-md flex items-center justify-center transition-all";
      cell.style.width = "56px";
      cell.style.height = "56px";
      cell.dataset.index = i;

      // Highlight border of cells on the edge
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      if (
        row === 0 ||
        row === this.gridSize - 1 ||
        col === 0 ||
        col === this.gridSize - 1
      ) {
        cell.classList.add("border", "border-yellow-800");
      }

      // Add click event
      cell.addEventListener("click", () => this._cellClicked(i));

      this.gridCells.push(cell);
      this.gridContainer.appendChild(cell);
    }
    container.appendChild(this.gridContainer);

    // Create sequence display
    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className = "flex space-x-2 mb-4";

    // Create indicator lights for sequence length
    for (let i = 0; i < this.maxPatternLength; i++) {
      const light = document.createElement("div");
      light.className = "w-4 h-4 rounded-full bg-gray-700";
      if (i < this.currentPatternLength) {
        light.className = "w-4 h-4 rounded-full bg-yellow-400";
      }
      this.sequenceDisplay.appendChild(light);
    }
    container.appendChild(this.sequenceDisplay);

    // Add instruction note
    const note = document.createElement("p");
    note.className = "text-gray-400 text-sm mt-2";
    note.textContent =
      "Watch the pattern, then recreate it by clicking on the grid in the same order.";
    container.appendChild(note);
  }

  /**
   * Generate a random pattern sequence
   */
  _generateRandomPattern() {
    this.patternSequence = [];

    // Start with a cell on the perimeter
    const perimeter = [];

    // Top and bottom rows
    for (let i = 0; i < this.gridSize; i++) {
      perimeter.push(i); // Top row
      perimeter.push(this.gridSize * (this.gridSize - 1) + i); // Bottom row
    }

    // Left and right columns (excluding corners already counted)
    for (let i = 1; i < this.gridSize - 1; i++) {
      perimeter.push(i * this.gridSize); // Left column
      perimeter.push(i * this.gridSize + (this.gridSize - 1)); // Right column
    }

    // First cell is randomly chosen from the perimeter
    const firstIndex = Math.floor(Math.random() * perimeter.length);
    this.patternSequence.push(perimeter[firstIndex]);

    // Generate the rest of the sequence by choosing cells adjacent to previous ones
    for (let i = 1; i < this.maxPatternLength; i++) {
      const lastCell = this.patternSequence[i - 1];
      const row = Math.floor(lastCell / this.gridSize);
      const col = lastCell % this.gridSize;

      // Find possible adjacent cells (including diagonals)
      const possibleNextCells = [];

      for (
        let r = Math.max(0, row - 1);
        r <= Math.min(this.gridSize - 1, row + 1);
        r++
      ) {
        for (
          let c = Math.max(0, col - 1);
          c <= Math.min(this.gridSize - 1, col + 1);
          c++
        ) {
          if (r !== row || c !== col) {
            // Not the same cell
            const cellIndex = r * this.gridSize + c;
            // Don't use cells already in the sequence
            if (!this.patternSequence.includes(cellIndex)) {
              possibleNextCells.push(cellIndex);
            }
          }
        }
      }

      // If no valid adjacent cells, pick any unused cell
      if (possibleNextCells.length === 0) {
        const unusedCells = Array.from(
          { length: this.gridSize * this.gridSize },
          (_, i) => i
        ).filter((i) => !this.patternSequence.includes(i));

        if (unusedCells.length > 0) {
          possibleNextCells.push(
            unusedCells[Math.floor(Math.random() * unusedCells.length)]
          );
        } else {
          // If all cells are used (unlikely), just pick a random one
          possibleNextCells.push(
            Math.floor(Math.random() * (this.gridSize * this.gridSize))
          );
        }
      }

      // Pick a random cell from the possible next cells
      const nextCell =
        possibleNextCells[Math.floor(Math.random() * possibleNextCells.length)];
      this.patternSequence.push(nextCell);
    }
  }

  /**
   * Show the pattern sequence
   */
  _showPattern() {
    if (this.isShowingPattern) return;

    this.isShowingPattern = true;
    this.showPatternButton.disabled = true;
    this.playerSequence = [];

    // Reset grid
    this.gridCells.forEach((cell) => {
      cell.classList.remove("bg-green-500", "bg-yellow-500");
      cell.classList.add("bg-gray-700");
    });

    // Update sequence lights
    this._updateSequenceDisplay();

    // Show each step in the pattern sequentially
    let delay = 500; // Initial delay
    const sequenceToShow = this.patternSequence.slice(
      0,
      this.currentPatternLength
    );

    // Show pattern message
    this.messageElement.textContent = "Watch carefully...";
    this.messageElement.className = "mb-4 text-yellow-400 text-center";

    sequenceToShow.forEach((cellIndex, step) => {
      setTimeout(() => {
        // Highlight the cell
        const cell = this.gridCells[cellIndex];
        cell.classList.remove("bg-gray-700");
        cell.classList.add("bg-yellow-500");

        // Add step number
        const numElement = document.createElement("span");
        numElement.className = "text-black font-bold text-lg";
        numElement.textContent = (step + 1).toString();
        cell.innerHTML = "";
        cell.appendChild(numElement);

        // Reset after a short delay
        setTimeout(() => {
          cell.classList.remove("bg-yellow-500");
          cell.classList.add("bg-gray-700");
          cell.innerHTML = "";

          // After last step, enable interaction
          if (step === sequenceToShow.length - 1) {
            this.isShowingPattern = false;
            this.showPatternButton.disabled = false;
            this.messageElement.textContent = "Now recreate the pattern!";
          }
        }, 800);
      }, delay);

      delay += 1000; // 800ms highlight + 200ms gap
    });
  }

  /**
   * Handle cell click
   * @param {number} cellIndex - Index of the clicked cell
   */
  _cellClicked(cellIndex) {
    if (this.isShowingPattern) return;

    // Add to player sequence
    this.playerSequence.push(cellIndex);

    // Show feedback
    const cell = this.gridCells[cellIndex];
    cell.classList.remove("bg-gray-700");
    cell.classList.add("bg-green-500");

    // Add step number
    const numElement = document.createElement("span");
    numElement.className = "text-white font-bold text-lg";
    numElement.textContent = this.playerSequence.length.toString();
    cell.innerHTML = "";
    cell.appendChild(numElement);

    // Update sequence display
    this._updateSequenceDisplay();

    // Check if the selected cell matches the pattern so far
    const currentIndex = this.playerSequence.length - 1;
    if (
      this.playerSequence[currentIndex] !== this.patternSequence[currentIndex]
    ) {
      // Wrong cell
      cell.classList.remove("bg-green-500");
      cell.classList.add("bg-red-500");

      this.messageElement.textContent = "Incorrect pattern! Try again.";
      this.messageElement.className = "mb-4 text-red-400 text-center";

      // Wait and reset
      setTimeout(() => {
        // Reset grid
        this.gridCells.forEach((c) => {
          c.classList.remove("bg-green-500", "bg-red-500");
          c.classList.add("bg-gray-700");
          c.innerHTML = "";
        });

        this.playerSequence = [];
        this._updateSequenceDisplay();
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, 1500);

      return;
    }

    // Check if full pattern is entered
    if (this.playerSequence.length === this.currentPatternLength) {
      // Enable submit button
      this.submitButton.disabled = false;
      this.messageElement.textContent = "Pattern complete! Submit your answer.";
      this.messageElement.className = "mb-4 text-green-400 text-center";
    }
  }

  /**
   * Update the sequence display
   */
  _updateSequenceDisplay() {
    const lights = this.sequenceDisplay.querySelectorAll("div");

    lights.forEach((light, i) => {
      if (i < this.currentPatternLength) {
        // Set color based on whether this position has been entered
        if (i < this.playerSequence.length) {
          light.className = "w-4 h-4 rounded-full bg-green-500";
        } else {
          light.className = "w-4 h-4 rounded-full bg-yellow-400";
        }
      }
    });
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    // Check if full pattern has been entered
    if (this.playerSequence.length < this.currentPatternLength) {
      this.messageElement.textContent =
        "You must recreate the full pattern first!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Verifying...";

    this.submitSolution(this.playerSequence)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent = "Wrong pattern. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = true;
          this.submitButton.textContent = "Submit Pattern";

          // Reset player sequence and grid
          setTimeout(() => {
            this.playerSequence = [];
            this._updateSequenceDisplay();

            // Reset grid
            this.gridCells.forEach((cell) => {
              cell.classList.remove("bg-green-500", "bg-red-500");
              cell.classList.add("bg-gray-700");
              cell.innerHTML = "";
            });
          }, 1500);
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting pattern. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Submit Pattern";
      });
  }

  /**
   * Disable or enable puzzle interaction
   * @param {boolean} disabled - Whether to disable interaction
   */
  disableInteraction(disabled) {
    super.disableInteraction(disabled);

    this.showPatternButton.disabled = disabled;

    if (disabled) {
      this.gridContainer.classList.add("opacity-50", "pointer-events-none");
    } else {
      this.gridContainer.classList.remove("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    super.cleanup();

    if (this.showPatternButton) {
      this.showPatternButton.removeEventListener("click", null);
    }

    if (this.gridCells) {
      this.gridCells.forEach((cell) => {
        cell.removeEventListener("click", null);
      });
    }

    this.gridContainer = null;
    this.gridCells = [];
    this.sequenceDisplay = null;
    this.showPatternButton = null;
  }

  /**
   * Get puzzle title
   * @returns {string} Puzzle title
   */
  _getPuzzleTitle() {
    return "Pattern Recognition";
  }

  /**
   * Get puzzle instructions
   * @returns {string} Puzzle instructions
   */
  _getInstructions() {
    return "Identify the pattern sequence and recreate it in the exact same order. Click 'Show Pattern' to see the sequence.";
  }
}

export default PatternRecognitionPuzzle;
