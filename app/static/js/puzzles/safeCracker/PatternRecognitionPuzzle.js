// patternRecognitionPuzzle.js - Pattern recognition puzzle for safe cracker
// Difficulty: 2/5 - Player must identify and replicate security patterns

class PatternRecognitionPuzzle {
  constructor(gameAreaElement, puzzleData, callbacks) {
    this.gameArea = gameAreaElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle properties
    this.difficultyLevel = puzzleData.difficulty || 2;
    this.gridSize = 4; // Default 4x4 grid
    this.pattern = []; // Sequence of cells to activate
    this.playerPattern = []; // Player's input pattern
    this.isShowingPattern = false;
    this.isPlayerTurn = false;
    this.maxPatternLength = 5; // Default pattern length

    // UI elements
    this.gridContainer = null;
    this.gridCells = [];

    // Audio elements
    this.cellSounds = [];
    this.successSound = null;
    this.errorSound = null;

    // Animation timing
    this.showPatternDelay = 1000; // ms between showing each pattern step
    this.animationSpeed = 500; // ms for cell animations
  }

  initialize() {
    // Setup difficulty
    this.setupDifficulty();

    // Create the interface
    this.createUI();

    // Generate pattern
    this.generatePattern();

    // Initialize sounds
    this.initializeSounds();

    // Show instructions
    this.callbacks.showMessage(
      "Watch the pattern and repeat it to unlock the safe",
      "info"
    );

    // Start the puzzle after a short delay
    setTimeout(() => {
      this.showPattern();
    }, 1500);
  }

  setupDifficulty() {
    // Adjust puzzle parameters based on difficulty
    switch (this.difficultyLevel) {
      case 1:
        this.gridSize = 3;
        this.maxPatternLength = 4;
        break;
      case 2:
        this.gridSize = 4;
        this.maxPatternLength = 5;
        break;
      case 3:
        this.gridSize = 4;
        this.maxPatternLength = 7;
        break;
      case 4:
        this.gridSize = 5;
        this.maxPatternLength = 8;
        break;
      case 5:
        this.gridSize = 5;
        this.maxPatternLength = 10;
        break;
      default:
        this.gridSize = 4;
        this.maxPatternLength = 5;
    }
  }

  createUI() {
    this.gameArea.innerHTML = "";

    // Main container
    const container = document.createElement("div");
    container.className =
      "flex flex-col items-center justify-center h-full p-4 bg-gray-900 rounded-lg";

    // Title
    const title = document.createElement("h3");
    title.className = "text-xl font-bold text-white mb-4";
    title.textContent = "Security Pattern Lock";
    container.appendChild(title);

    // Instructions
    const instruction = document.createElement("p");
    instruction.className = "text-gray-300 mb-6 text-center";
    instruction.textContent =
      "Memorize the pattern sequence and repeat it exactly to bypass the security system.";
    container.appendChild(instruction);

    // Status display
    const statusDisplay = document.createElement("div");
    statusDisplay.className = "text-lg font-bold text-yellow-400 mb-4";
    statusDisplay.id = "pattern-status";
    statusDisplay.textContent = "Watch carefully...";
    container.appendChild(statusDisplay);

    // Grid container
    this.gridContainer = document.createElement("div");
    this.gridContainer.className = "grid gap-2 mb-6";
    this.gridContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

    // Create grid cells
    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      const cell = document.createElement("div");
      cell.className =
        "w-16 h-16 bg-gray-700 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-600 flex items-center justify-center";
      cell.dataset.index = i;

      // Add click event
      cell.addEventListener("click", () => this.onCellClick(i));

      // Store cell reference
      this.gridCells.push(cell);

      // Add to grid
      this.gridContainer.appendChild(cell);
    }

    container.appendChild(this.gridContainer);

    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4";
    resetButton.textContent = "Show Pattern Again";
    resetButton.addEventListener("click", () => {
      if (!this.isShowingPattern) {
        this.resetPlayerPattern();
        this.showPattern();
      }
    });
    container.appendChild(resetButton);

    // Submit button
    const submitButton = document.createElement("button");
    submitButton.className =
      "px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mt-4";
    submitButton.textContent = "Submit Pattern";
    submitButton.addEventListener("click", () => {
      if (this.isPlayerTurn) {
        this.checkPattern();
      }
    });
    container.appendChild(submitButton);

    this.gameArea.appendChild(container);
  }

  generatePattern() {
    this.pattern = [];
    const patternLength =
      Math.floor(this.maxPatternLength * 0.7) +
      Math.floor(Math.random() * (this.maxPatternLength * 0.3));

    // Generate random pattern
    let lastCell = -1;
    for (let i = 0; i < patternLength; i++) {
      let cell;
      do {
        cell = Math.floor(Math.random() * (this.gridSize * this.gridSize));
      } while (cell === lastCell); // Avoid immediate repeats for easier recognition

      this.pattern.push(cell);
      lastCell = cell;
    }

    console.log("Generated pattern:", this.pattern); // For debugging
  }

  initializeSounds() {
    // Create different sounds for each cell
    const baseNotes = [261.63, 293.66, 329.63, 349.23, 392.0]; // C4, D4, E4, F4, G4

    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      const noteIndex = i % baseNotes.length;
      const octaveShift = Math.floor(i / baseNotes.length);
      const freq = baseNotes[noteIndex] * Math.pow(2, octaveShift / 2);

      this.cellSounds.push({
        frequency: freq,
        play: () => this.playTone(freq, 0.3),
      });
    }

    // Success and error sounds
    this.successSound = new Audio("../static/sounds/pattern-complete.mp3");
    this.successSound.volume = 0.5;

    this.errorSound = new Audio("../static/sounds/pattern-error.mp3");
    this.errorSound.volume = 0.3;
  }

  playTone(frequency, duration) {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gainNode.gain.value = 0.3;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();

      // Fade out for a more pleasant sound
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, duration * 1000);
    } catch (e) {
      console.warn("Could not play tone:", e);
    }
  }

  showPattern() {
    const statusDisplay = document.getElementById("pattern-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Watch carefully...";
      statusDisplay.className = "text-lg font-bold text-yellow-400 mb-4";
    }

    this.isShowingPattern = true;
    this.isPlayerTurn = false;
    this.resetPlayerPattern();

    // Disable all cells during pattern display
    this.gridCells.forEach((cell) => {
      cell.classList.add("opacity-70");
      cell.classList.add("cursor-not-allowed");
      cell.classList.remove("hover:bg-gray-600");
    });

    // Show each step of the pattern with delay
    this.pattern.forEach((cellIndex, step) => {
      setTimeout(() => {
        this.highlightCell(cellIndex);

        // If this is the last step, enable player input after the animation
        if (step === this.pattern.length - 1) {
          setTimeout(() => {
            this.startPlayerTurn();
          }, this.animationSpeed + 500);
        }
      }, step * this.showPatternDelay);
    });
  }

  startPlayerTurn() {
    const statusDisplay = document.getElementById("pattern-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Your turn - repeat the pattern";
      statusDisplay.className = "text-lg font-bold text-green-400 mb-4";
    }

    this.isShowingPattern = false;
    this.isPlayerTurn = true;
    this.playerPattern = [];

    // Enable cells for player input
    this.gridCells.forEach((cell) => {
      cell.classList.remove("opacity-70");
      cell.classList.remove("cursor-not-allowed");
      cell.classList.add("hover:bg-gray-600");
    });
  }

  highlightCell(index) {
    if (index < 0 || index >= this.gridCells.length) return;

    const cell = this.gridCells[index];

    // Visual highlight
    cell.classList.add("bg-blue-500");
    cell.classList.remove("bg-gray-700");

    // Play sound
    if (this.cellSounds[index]) {
      this.cellSounds[index].play();
    }

    // Reset after animation
    setTimeout(() => {
      cell.classList.remove("bg-blue-500");
      cell.classList.add("bg-gray-700");
    }, this.animationSpeed);
  }

  onCellClick(index) {
    if (!this.isPlayerTurn) return;

    // Add to player pattern
    this.playerPattern.push(index);

    // Highlight cell
    this.highlightCell(index);

    // Check if pattern length matches - auto submit
    if (this.playerPattern.length === this.pattern.length) {
      setTimeout(() => {
        this.checkPattern();
      }, this.animationSpeed);
    }
  }

  resetPlayerPattern() {
    this.playerPattern = [];
  }

  checkPattern() {
    let isCorrect = true;

    // Check if patterns match
    if (this.playerPattern.length !== this.pattern.length) {
      isCorrect = false;
    } else {
      for (let i = 0; i < this.pattern.length; i++) {
        if (this.playerPattern[i] !== this.pattern[i]) {
          isCorrect = false;
          break;
        }
      }
    }

    if (isCorrect) {
      // Success!
      this.showSuccess();
    } else {
      // Incorrect pattern
      this.showError();
    }

    return isCorrect;
  }

  showSuccess() {
    const statusDisplay = document.getElementById("pattern-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Pattern correct!";
      statusDisplay.className = "text-lg font-bold text-green-500 mb-4";
    }

    // Play success sound
    if (this.successSound) {
      this.successSound
        .play()
        .catch((e) => console.warn("Could not play success sound:", e));
    }

    // Disable further input
    this.isPlayerTurn = false;
    this.gridCells.forEach((cell) => {
      cell.classList.add("opacity-70");
      cell.classList.add("cursor-not-allowed");
      cell.classList.remove("hover:bg-gray-600");
    });

    // Show success animation
    this.animateSuccess();

    // Notify the callback
    this.callbacks.showMessage(
      "Pattern match successful! Security override complete.",
      "success"
    );
  }

  showError() {
    const statusDisplay = document.getElementById("pattern-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Incorrect pattern! Try again.";
      statusDisplay.className = "text-lg font-bold text-red-500 mb-4";
    }

    // Play error sound
    if (this.errorSound) {
      this.errorSound
        .play()
        .catch((e) => console.warn("Could not play error sound:", e));
    }

    // Show error animation
    this.animateError();

    // Reset after delay
    setTimeout(() => {
      this.resetPlayerPattern();

      if (statusDisplay) {
        statusDisplay.textContent = "Your turn - repeat the pattern";
        statusDisplay.className = "text-lg font-bold text-green-400 mb-4";
      }
    }, 2000);

    // Notify the callback
    this.callbacks.showMessage(
      "Incorrect pattern! Watch carefully and try again.",
      "error"
    );
  }

  animateSuccess() {
    // Highlight all cells in a wave pattern
    this.gridCells.forEach((cell, index) => {
      setTimeout(() => {
        cell.classList.add("bg-green-500");
        cell.classList.remove("bg-gray-700");

        setTimeout(() => {
          cell.classList.remove("bg-green-500");
          cell.classList.add("bg-gray-700");
        }, 300);
      }, index * 50);
    });

    // Create success overlay
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "mt-4 p-4 bg-green-800 bg-opacity-30 rounded-lg text-center animate-fadeIn";
    successOverlay.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-green-300 font-bold text-xl mt-2">PATTERN ACCEPTED</p>
        `;

    this.gameArea.querySelector(".flex.flex-col").appendChild(successOverlay);
  }

  animateError() {
    // Shake the grid
    if (this.gridContainer) {
      this.gridContainer.classList.add("animate-shake");

      setTimeout(() => {
        this.gridContainer.classList.remove("animate-shake");
      }, 500);
    }

    // Flash all cells red
    this.gridCells.forEach((cell) => {
      cell.classList.add("bg-red-500");
      cell.classList.remove("bg-gray-700");

      setTimeout(() => {
        cell.classList.remove("bg-red-500");
        cell.classList.add("bg-gray-700");
      }, 300);
    });

    // Add keyframes for shake animation if they don't exist
    if (!document.getElementById("shake-keyframes")) {
      const style = document.createElement("style");
      style.id = "shake-keyframes";
      style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-5px); }
                    40%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-in-out;
                }
            `;
      document.head.appendChild(style);
    }
  }

  getSolution() {
    return { pattern: this.playerPattern };
  }

  validateSolution(solution) {
    if (!solution || !solution.pattern || !Array.isArray(solution.pattern))
      return false;

    // Check if the provided pattern matches the correct one
    if (solution.pattern.length !== this.pattern.length) return false;

    for (let i = 0; i < this.pattern.length; i++) {
      if (solution.pattern[i] !== this.pattern[i]) return false;
    }

    return true;
  }

  getErrorMessage() {
    return "Pattern does not match the security sequence. Try again.";
  }

  cleanup() {
    // Stop any playing audio
    if (this.successSound) this.successSound.pause();
    if (this.errorSound) this.errorSound.pause();

    // Remove event listeners by clearing the game area
    this.gameArea.innerHTML = "";

    // Clear references
    this.gridCells = [];
    this.cellSounds = [];
  }
}

export default PatternRecognitionPuzzle;
