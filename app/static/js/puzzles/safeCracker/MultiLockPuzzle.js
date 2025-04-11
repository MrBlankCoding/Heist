// MultiLockPuzzle.js - Stage 4 Multi-Lock puzzle for Safe Cracker role

import BasePuzzle from "./BasePuzzle.js";

class MultiLockPuzzle extends BasePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    super(containerElement, puzzleData, submitSolutionCallback);

    // Multi-lock specific properties
    this.lockCount = 3; // Three different locks to solve
    this.currentLock = 0;
    this.lockSolutions = [];
    this.playerSolutions = [null, null, null];
    this.locks = [];

    // Lock-specific elements
    this.lockContainers = [];
    this.lockDisplay = null;
    this.clueElement = null;

    // Lock 1: Directional arrows
    this.directionalSequence = [];
    this.playerDirections = [];

    // Lock 2: Symbol matching
    this.symbolPairs = [];
    this.selectedSymbols = [];

    // Lock 3: Numeric keypad
    this.keypadCode = "";
    this.playerCode = "";
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    super.initialize();

    // Get game area
    const gameArea = this.containerElement.querySelector(
      "div.flex.justify-center"
    );

    // Generate or load puzzle data
    if (!this.puzzleData.data || !this.puzzleData.data.lockSolutions) {
      this._generateLockSolutions();
    } else {
      this.lockSolutions = this.puzzleData.data.lockSolutions;
    }

    // Set up the multi lock display
    this._setupMultiLockPuzzle(gameArea);

    // Initially hide "Submit" button, we'll use "Next Lock" instead
    this.submitButton.style.display = "none";
  }

  /**
   * Generate random solutions for each lock
   */
  _generateLockSolutions() {
    // Lock 1: Directional sequence (up, down, left, right)
    const directions = ["up", "down", "left", "right"];
    const dirSequence = [];
    for (let i = 0; i < 5; i++) {
      dirSequence.push(
        directions[Math.floor(Math.random() * directions.length)]
      );
    }

    // Lock 2: Symbol matching (6 pairs among 12 symbols)
    const symbols = [
      "♠",
      "♥",
      "♦",
      "♣",
      "★",
      "☼",
      "☀",
      "☂",
      "☯",
      "♫",
      "♪",
      "☮",
    ];
    const shuffledSymbols = [...symbols].sort(() => Math.random() - 0.5);
    const symbolPairs = [];
    for (let i = 0; i < 6; i++) {
      symbolPairs.push([shuffledSymbols[i * 2], shuffledSymbols[i * 2 + 1]]);
    }

    // Lock 3: Numeric keypad (4-digit code)
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }

    this.lockSolutions = [dirSequence, symbolPairs, code];
  }

  /**
   * Set up the multi-lock puzzle interface
   * @param {HTMLElement} container - Container element
   */
  _setupMultiLockPuzzle(container) {
    container.innerHTML = "";
    container.className = "flex flex-col items-center w-full max-w-2xl";

    // Create lock navigation display
    this.lockDisplay = document.createElement("div");
    this.lockDisplay.className = "flex justify-center mb-6 w-full";

    for (let i = 0; i < this.lockCount; i++) {
      const lockIndicator = document.createElement("div");
      lockIndicator.className = "flex flex-col items-center mx-4";

      const lockIcon = document.createElement("div");
      lockIcon.className =
        "w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-2 cursor-pointer transition-all";
      if (i === this.currentLock) {
        lockIcon.classList.add("border-2", "border-yellow-400", "bg-gray-600");
      }

      // Add lock number
      const lockNum = document.createElement("span");
      lockNum.className = "text-white font-bold";
      lockNum.textContent = (i + 1).toString();
      lockIcon.appendChild(lockNum);

      // Add lock status
      const lockStatus = document.createElement("div");
      lockStatus.className = "text-gray-400 text-sm";
      lockStatus.textContent =
        i === this.currentLock
          ? "Current"
          : i < this.currentLock
          ? "Unlocked"
          : "Locked";

      // Disable clicking on future locks, but allow going back to previous ones
      if (i <= this.currentLock) {
        lockIcon.addEventListener("click", () => this._switchToLock(i));
      } else {
        lockIcon.classList.add("opacity-50");
      }

      lockIndicator.appendChild(lockIcon);
      lockIndicator.appendChild(lockStatus);

      this.lockDisplay.appendChild(lockIndicator);
    }

    // Create clue element
    this.clueElement = document.createElement("div");
    this.clueElement.className =
      "bg-gray-800 border border-yellow-600 p-3 rounded-md text-gray-300 text-sm mb-4 w-full text-center";
    this.clueElement.textContent =
      "First, crack the directional lock using the correct sequence...";

    // Create lock containers (one for each lock, only one visible at a time)
    for (let i = 0; i < this.lockCount; i++) {
      const lockContainer = document.createElement("div");
      lockContainer.className = "w-full";
      lockContainer.style.display = i === this.currentLock ? "block" : "none";

      this.lockContainers.push(lockContainer);
    }

    // Set up each specific lock
    this._setupDirectionalLock(this.lockContainers[0]);
    this._setupSymbolLock(this.lockContainers[1]);
    this._setupKeypadLock(this.lockContainers[2]);

    // Create next/solve button
    const nextButton = document.createElement("button");
    nextButton.className = "heist-button mx-auto block mt-4";
    nextButton.textContent = "Solve This Lock";
    nextButton.addEventListener("click", () => this._handleNextLock());

    // Assemble all elements
    container.appendChild(this.lockDisplay);
    container.appendChild(this.clueElement);

    for (let lockContainer of this.lockContainers) {
      container.appendChild(lockContainer);
    }

    container.appendChild(nextButton);
  }

  /**
   * Set up the directional lock (Lock 1)
   * @param {HTMLElement} container - Container element
   */
  _setupDirectionalLock(container) {
    // Create sequence display
    const sequenceDisplay = document.createElement("div");
    sequenceDisplay.className = "flex justify-center mb-6";

    // Show empty slots for the directional sequence
    for (let i = 0; i < 5; i++) {
      const slot = document.createElement("div");
      slot.className =
        "w-12 h-12 bg-gray-700 border border-gray-600 rounded-md mx-1 flex items-center justify-center";
      slot.dataset.index = i;
      sequenceDisplay.appendChild(slot);
    }

    // Create directional pad
    const dirPad = document.createElement("div");
    dirPad.className = "grid grid-cols-3 gap-2 w-40 h-40 mx-auto";

    // Create 4 directional buttons (up, right, down, left)
    const directions = [
      { dir: "up", symbol: "↑", gridArea: "1 / 2 / span 1 / span 1" },
      { dir: "right", symbol: "→", gridArea: "2 / 3 / span 1 / span 1" },
      { dir: "down", symbol: "↓", gridArea: "3 / 2 / span 1 / span 1" },
      { dir: "left", symbol: "←", gridArea: "2 / 1 / span 1 / span 1" },
    ];

    // Create button for each direction
    for (const direction of directions) {
      const btn = document.createElement("button");
      btn.className =
        "bg-gray-700 hover:bg-gray-600 text-white text-2xl rounded-md flex items-center justify-center transition-all";
      btn.style.gridArea = direction.gridArea;
      btn.textContent = direction.symbol;

      btn.addEventListener("click", () =>
        this._addDirectionToSequence(direction.dir)
      );

      dirPad.appendChild(btn);
    }

    // Create center button (to clear)
    const clearBtn = document.createElement("button");
    clearBtn.className =
      "bg-red-700 hover:bg-red-600 text-white rounded-md flex items-center justify-center text-sm transition-all";
    clearBtn.style.gridArea = "2 / 2 / span 1 / span 1";
    clearBtn.textContent = "CLEAR";
    clearBtn.addEventListener("click", () => this._clearDirectionSequence());
    dirPad.appendChild(clearBtn);

    // Add elements to container
    container.appendChild(sequenceDisplay);
    container.appendChild(dirPad);

    // Store reference to sequence display
    this.dirSequenceDisplay = sequenceDisplay;
  }

  /**
   * Add a direction to the sequence
   * @param {string} direction - Direction to add (up, down, left, right)
   */
  _addDirectionToSequence(direction) {
    if (this.playerDirections.length >= 5) return;

    // Add to player sequence
    this.playerDirections.push(direction);

    // Update display
    const slots = this.dirSequenceDisplay.querySelectorAll("div");
    const currentSlot = slots[this.playerDirections.length - 1];

    // Show the direction
    let arrowSymbol = "?";
    switch (direction) {
      case "up":
        arrowSymbol = "↑";
        break;
      case "down":
        arrowSymbol = "↓";
        break;
      case "left":
        arrowSymbol = "←";
        break;
      case "right":
        arrowSymbol = "→";
        break;
    }

    currentSlot.textContent = arrowSymbol;
    currentSlot.className =
      "w-12 h-12 bg-gray-700 border border-yellow-400 rounded-md mx-1 flex items-center justify-center text-2xl text-yellow-400";
  }

  /**
   * Clear the directional sequence
   */
  _clearDirectionSequence() {
    this.playerDirections = [];

    // Reset display
    const slots = this.dirSequenceDisplay.querySelectorAll("div");
    slots.forEach((slot) => {
      slot.textContent = "";
      slot.className =
        "w-12 h-12 bg-gray-700 border border-gray-600 rounded-md mx-1 flex items-center justify-center";
    });
  }

  /**
   * Set up the symbol matching lock (Lock 2)
   * @param {HTMLElement} container - Container element
   */
  _setupSymbolLock(container) {
    // Instructions
    const instructions = document.createElement("p");
    instructions.className = "text-gray-300 text-center mb-4";
    instructions.textContent =
      "Match the symbols that belong together. Select two symbols to connect them.";
    container.appendChild(instructions);

    // Create symbols grid
    const symbolsGrid = document.createElement("div");
    symbolsGrid.className = "grid grid-cols-4 gap-2 mx-auto mb-4";
    symbolsGrid.style.maxWidth = "320px";

    // Get all symbols (12 total from 6 pairs)
    const allSymbols = this.lockSolutions[1].flat();

    // Shuffle the symbols
    const shuffledSymbols = [...allSymbols].sort(() => Math.random() - 0.5);

    // Create a button for each symbol
    shuffledSymbols.forEach((symbol, index) => {
      const btn = document.createElement("div");
      btn.className =
        "w-16 h-16 bg-gray-700 rounded-md flex items-center justify-center text-2xl text-white cursor-pointer transition-all";
      btn.textContent = symbol;
      btn.dataset.symbol = symbol;
      btn.dataset.index = index;

      btn.addEventListener("click", () => this._handleSymbolClick(btn));

      symbolsGrid.appendChild(btn);
    });

    // Create matched pairs display
    const pairsDisplay = document.createElement("div");
    pairsDisplay.className = "flex flex-wrap justify-center gap-2 mt-4";

    // Add elements to container
    container.appendChild(symbolsGrid);
    container.appendChild(pairsDisplay);

    // Store references
    this.symbolsGrid = symbolsGrid;
    this.pairsDisplay = pairsDisplay;
  }

  /**
   * Handle symbol click in the symbol matching puzzle
   * @param {HTMLElement} symbolElement - Clicked symbol element
   */
  _handleSymbolClick(symbolElement) {
    // Ignore if already matched
    if (symbolElement.classList.contains("bg-green-600")) return;

    // If already selected, deselect it
    if (symbolElement.classList.contains("bg-yellow-600")) {
      symbolElement.classList.remove("bg-yellow-600");
      this.selectedSymbols = this.selectedSymbols.filter(
        (s) => s.element !== symbolElement
      );
      return;
    }

    // Select this symbol
    symbolElement.classList.add("bg-yellow-600");
    this.selectedSymbols.push({
      element: symbolElement,
      symbol: symbolElement.dataset.symbol,
    });

    // If we have two selected, check if they form a pair
    if (this.selectedSymbols.length === 2) {
      const [first, second] = this.selectedSymbols;

      // Check if they form a valid pair
      const isPair = this.lockSolutions[1].some(
        (pair) =>
          (pair[0] === first.symbol && pair[1] === second.symbol) ||
          (pair[0] === second.symbol && pair[1] === first.symbol)
      );

      if (isPair) {
        // Mark as matched
        first.element.classList.remove("bg-yellow-600");
        second.element.classList.remove("bg-yellow-600");
        first.element.classList.add("bg-green-600");
        second.element.classList.add("bg-green-600");

        // Add to pairs display
        const pairElement = document.createElement("div");
        pairElement.className = "bg-green-800 rounded-md px-3 py-1 text-white";
        pairElement.textContent = `${first.symbol} + ${second.symbol}`;
        this.pairsDisplay.appendChild(pairElement);

        // Add to player solution
        if (!this.playerSolutions[1]) {
          this.playerSolutions[1] = [];
        }
        this.playerSolutions[1].push([first.symbol, second.symbol]);

        // Check if all pairs are matched
        if (this.playerSolutions[1].length === 6) {
          this.messageElement.textContent =
            "All pairs matched! Ready to proceed.";
          this.messageElement.className = "mb-4 text-green-400 text-center";
        }
      } else {
        // Wrong pair - flash red
        first.element.classList.remove("bg-yellow-600");
        second.element.classList.add("bg-red-600");

        setTimeout(() => {
          second.element.classList.remove("bg-red-600");
        }, 500);
      }

      // Clear selected
      this.selectedSymbols = [];
    }
  }

  /**
   * Set up the keypad lock (Lock 3)
   * @param {HTMLElement} container - Container element
   */
  _setupKeypadLock(container) {
    // Create keypad container
    const keypadContainer = document.createElement("div");
    keypadContainer.className = "flex flex-col items-center";

    // Create code display
    const codeDisplay = document.createElement("div");
    codeDisplay.className =
      "bg-black w-full max-w-xs h-12 mb-4 rounded-md border border-gray-700 flex items-center justify-end px-3";

    const codeText = document.createElement("div");
    codeText.className = "font-mono text-2xl text-green-500 tracking-wider";
    codeText.textContent = "____";
    codeDisplay.appendChild(codeText);

    // Create keypad
    const keypad = document.createElement("div");
    keypad.className = "grid grid-cols-3 gap-2 max-w-xs";

    // Add number buttons 1-9
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement("button");
      btn.className =
        "bg-gray-700 hover:bg-gray-600 text-white text-xl w-16 h-16 rounded-md transition-all";
      btn.textContent = i.toString();
      btn.addEventListener("click", () =>
        this._handleKeypadInput(i.toString())
      );
      keypad.appendChild(btn);
    }

    // Add special buttons (clear, 0, backspace)
    const clearBtn = document.createElement("button");
    clearBtn.className =
      "bg-red-700 hover:bg-red-600 text-white text-sm w-16 h-16 rounded-md transition-all";
    clearBtn.textContent = "CLEAR";
    clearBtn.addEventListener("click", () => this._handleKeypadClear());

    const zeroBtn = document.createElement("button");
    zeroBtn.className =
      "bg-gray-700 hover:bg-gray-600 text-white text-xl w-16 h-16 rounded-md transition-all";
    zeroBtn.textContent = "0";
    zeroBtn.addEventListener("click", () => this._handleKeypadInput("0"));

    const backBtn = document.createElement("button");
    backBtn.className =
      "bg-yellow-700 hover:bg-yellow-600 text-white text-xl w-16 h-16 rounded-md transition-all";
    backBtn.innerHTML = "⌫";
    backBtn.addEventListener("click", () => this._handleKeypadBackspace());

    keypad.appendChild(clearBtn);
    keypad.appendChild(zeroBtn);
    keypad.appendChild(backBtn);

    // Add elements to container
    keypadContainer.appendChild(codeDisplay);
    keypadContainer.appendChild(keypad);
    container.appendChild(keypadContainer);

    // Store references
    this.codeText = codeText;
  }

  /**
   * Handle keypad number input
   * @param {string} num - Number pressed (0-9)
   */
  _handleKeypadInput(num) {
    if (this.playerCode.length >= 4) return;

    this.playerCode += num;
    this._updateKeypadDisplay();
  }

  /**
   * Handle keypad clear
   */
  _handleKeypadClear() {
    this.playerCode = "";
    this._updateKeypadDisplay();
  }

  /**
   * Handle keypad backspace
   */
  _handleKeypadBackspace() {
    if (this.playerCode.length > 0) {
      this.playerCode = this.playerCode.slice(0, -1);
      this._updateKeypadDisplay();
    }
  }

  /**
   * Update the keypad display
   */
  _updateKeypadDisplay() {
    let displayText = this.playerCode.padEnd(4, "_");
    this.codeText.textContent = displayText;
  }

  /**
   * Switch to a specific lock
   * @param {number} lockIndex - Index of the lock to switch to
   */
  _switchToLock(lockIndex) {
    if (lockIndex > this.currentLock) return; // Can't skip ahead

    // Hide all lock containers
    this.lockContainers.forEach((container) => {
      container.style.display = "none";
    });

    // Show the selected lock
    this.lockContainers[lockIndex].style.display = "block";
    this.currentLock = lockIndex;

    // Update lock indicators
    const lockIcons = this.lockDisplay.querySelectorAll(".rounded-full");
    lockIcons.forEach((icon, i) => {
      if (i === lockIndex) {
        icon.classList.add("border-2", "border-yellow-400", "bg-gray-600");
      } else {
        icon.classList.remove("border-2", "border-yellow-400", "bg-gray-600");
      }
    });

    // Update lock statuses
    const lockStatuses = this.lockDisplay.querySelectorAll(".text-sm");
    lockStatuses.forEach((status, i) => {
      if (i === lockIndex) {
        status.textContent = "Current";
        status.className = "text-yellow-400 text-sm";
      } else if (i < lockIndex) {
        status.textContent = "Unlocked";
        status.className = "text-green-400 text-sm";
      } else {
        status.textContent = "Locked";
        status.className = "text-gray-400 text-sm";
      }
    });

    // Update clue text
    switch (lockIndex) {
      case 0:
        this.clueElement.textContent =
          "First, crack the directional lock using the correct sequence...";
        break;
      case 1:
        this.clueElement.textContent =
          "Now, match the symbols that belong together...";
        break;
      case 2:
        this.clueElement.textContent =
          "Finally, enter the correct 4-digit combination to open the vault...";
        break;
    }
  }

  /**
   * Handle solve/next button click
   */
  _handleNextLock() {
    // Different behavior based on current lock
    switch (this.currentLock) {
      case 0: // Directional lock
        if (this.playerDirections.length !== 5) {
          this.messageElement.textContent =
            "You must enter exactly 5 directions!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          return;
        }
        this.playerSolutions[0] = [...this.playerDirections];
        if (this._validateDirectionalLock()) {
          this._advanceToNextLock();
        } else {
          this._showLockError();
        }
        break;

      case 1: // Symbol lock
        if (!this.playerSolutions[1] || this.playerSolutions[1].length !== 6) {
          this.messageElement.textContent = "You must match all 6 pairs!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          return;
        }
        if (this._validateSymbolLock()) {
          this._advanceToNextLock();
        } else {
          this._showLockError();
        }
        break;

      case 2: // Keypad lock
        if (this.playerCode.length !== 4) {
          this.messageElement.textContent = "You must enter a 4-digit code!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          return;
        }
        this.playerSolutions[2] = this.playerCode;
        if (this._validateKeypadLock()) {
          this._finalizeMultiLock();
        } else {
          this._showLockError();
        }
        break;
    }
  }

  /**
   * Validate the directional lock solution
   * @returns {boolean} Whether the solution is correct
   */
  _validateDirectionalLock() {
    const solution = this.lockSolutions[0];
    const playerSolution = this.playerSolutions[0];

    return playerSolution.join(",") === solution.join(",");
  }

  /**
   * Validate the symbol lock solution
   * @returns {boolean} Whether the solution is correct
   */
  _validateSymbolLock() {
    const solution = this.lockSolutions[1];
    const playerSolution = this.playerSolutions[1];

    // Check if all required pairs are present (order doesn't matter)
    return solution.every((pair) => {
      return playerSolution.some((playerPair) => {
        // Check both ways (a,b) and (b,a)
        return (
          (playerPair[0] === pair[0] && playerPair[1] === pair[1]) ||
          (playerPair[0] === pair[1] && playerPair[1] === pair[0])
        );
      });
    });
  }

  /**
   * Validate the keypad lock solution
   * @returns {boolean} Whether the solution is correct
   */
  _validateKeypadLock() {
    return this.playerSolutions[2] === this.lockSolutions[2];
  }

  /**
   * Advance to the next lock
   */
  _advanceToNextLock() {
    this.messageElement.textContent = "Lock successfully opened!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Update the current lock status
    const lockStatuses = this.lockDisplay.querySelectorAll(".text-sm");
    lockStatuses[this.currentLock].textContent = "Unlocked";
    lockStatuses[this.currentLock].className = "text-green-400 text-sm";

    // Move to next lock after a delay
    setTimeout(() => {
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
      this._switchToLock(this.currentLock + 1);
    }, 1000);
  }

  /**
   * Show error for incorrect lock solution
   */
  _showLockError() {
    this.messageElement.textContent = "Incorrect solution. Try again!";
    this.messageElement.className = "mb-4 text-red-400 text-center";

    // Clear input based on current lock
    if (this.currentLock === 0) {
      this._clearDirectionSequence();
    } else if (this.currentLock === 2) {
      this._handleKeypadClear();
    }
  }

  /**
   * Finalize the multi-lock solution
   */
  _finalizeMultiLock() {
    // Show success feedback
    this.messageElement.textContent = "All locks successfully opened!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Update lock status
    const lockStatuses = this.lockDisplay.querySelectorAll(".text-sm");
    lockStatuses[this.currentLock].textContent = "Unlocked";
    lockStatuses[this.currentLock].className = "text-green-400 text-sm";

    // Submit the complete solution
    this.submitSolution(this.playerSolutions)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent =
            "Error verifying solution. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting solution. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
      });
  }

  /**
   * Disable or enable puzzle interaction
   * @param {boolean} disabled - Whether to disable interaction
   */
  disableInteraction(disabled) {
    super.disableInteraction(disabled);

    // Apply to all interactive elements in all locks
    if (disabled) {
      this.containerElement
        .querySelectorAll("button, .cursor-pointer")
        .forEach((el) => {
          el.classList.add("opacity-50", "pointer-events-none");
        });
    } else {
      this.containerElement
        .querySelectorAll("button, .cursor-pointer")
        .forEach((el) => {
          el.classList.remove("opacity-50", "pointer-events-none");
        });
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    super.cleanup();

    // Clean up all event listeners
    this.containerElement
      .querySelectorAll("button, .cursor-pointer")
      .forEach((el) => {
        el.removeEventListener("click", null);
      });
  }

  /**
   * Get puzzle title
   * @returns {string} Puzzle title
   */
  _getPuzzleTitle() {
    return "Multi-Lock System";
  }

  /**
   * Get puzzle instructions
   * @returns {string} Puzzle instructions
   */
  _getInstructions() {
    return "Crack multiple locks in the correct order to access the inner vault. Each lock requires a different approach.";
  }
}

export default MultiLockPuzzle;
