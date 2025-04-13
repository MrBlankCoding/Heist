// multiLockPuzzle.js - Multiple lock mechanisms puzzle for safe cracker
// Difficulty: 3/5 - Player must solve multiple lock types simultaneously

class MultiLockPuzzle {
  constructor(gameAreaElement, puzzleData, callbacks) {
    this.gameArea = gameAreaElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle properties
    this.difficultyLevel = puzzleData.difficulty || 3;
    this.locks = []; // Array of lock objects
    this.lockCount = 3; // Default number of locks
    this.solvedLocks = 0;

    // Sound effects
    this.lockClickSound = null;
    this.successSound = null;
    this.errorSound = null;
  }

  initialize() {
    // Setup difficulty
    this.setupDifficulty();

    // Create the user interface
    this.createUI();

    // Create locks
    this.generateLocks();

    // Initialize sounds
    this.initializeSounds();

    // Display initial instructions
    this.callbacks.showMessage("Solve all locks to open the safe", "info");
  }

  setupDifficulty() {
    // Adjust puzzle parameters based on difficulty
    switch (this.difficultyLevel) {
      case 1:
        this.lockCount = 2;
        break;
      case 2:
        this.lockCount = 3;
        break;
      case 3:
        this.lockCount = 3;
        break;
      case 4:
        this.lockCount = 4;
        break;
      case 5:
        this.lockCount = 5;
        break;
      default:
        this.lockCount = 3;
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
    title.textContent = "Multi-Lock Security System";
    container.appendChild(title);

    // Instructions
    const instruction = document.createElement("p");
    instruction.className = "text-gray-300 mb-6 text-center";
    instruction.textContent = `Solve all ${this.lockCount} locks to open the safe. Each lock has a different mechanism.`;
    container.appendChild(instruction);

    // Progress indicator
    const progressContainer = document.createElement("div");
    progressContainer.className =
      "w-full max-w-md h-4 bg-gray-700 rounded-full mb-6 overflow-hidden";

    const progressBar = document.createElement("div");
    progressBar.className = "h-full bg-blue-600 transition-all duration-300";
    progressBar.style.width = "0%";
    progressBar.id = "lock-progress";

    progressContainer.appendChild(progressBar);
    container.appendChild(progressContainer);

    // Locks container
    const locksContainer = document.createElement("div");
    locksContainer.className =
      "grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl";
    locksContainer.id = "locks-container";
    container.appendChild(locksContainer);

    this.gameArea.appendChild(container);
  }

  generateLocks() {
    const locksContainer = document.getElementById("locks-container");
    if (!locksContainer) return;

    // Clear any existing locks
    this.locks = [];
    locksContainer.innerHTML = "";

    // Determine which lock types to use based on difficulty
    const lockTypes = this.getLockTypes();

    // Create each lock
    for (let i = 0; i < this.lockCount; i++) {
      // Get a random lock type that hasn't been used yet
      const lockType = lockTypes[i % lockTypes.length];

      // Create lock container
      const lockContainer = document.createElement("div");
      lockContainer.className =
        "bg-gray-800 p-4 rounded-lg border-2 border-gray-700 flex flex-col items-center";
      lockContainer.id = `lock-${i}`;

      // Lock title
      const lockTitle = document.createElement("h4");
      lockTitle.className = "text-lg font-bold text-white mb-2";
      lockTitle.textContent = lockType.name;
      lockContainer.appendChild(lockTitle);

      // Lock status indicator
      const lockStatus = document.createElement("div");
      lockStatus.className =
        "flex items-center justify-center w-full text-sm text-yellow-500 mb-2";
      lockStatus.id = `lock-status-${i}`;
      lockStatus.innerHTML = '<span class="mr-1">●</span> Locked';
      lockContainer.appendChild(lockStatus);

      // Lock UI area
      const lockUI = document.createElement("div");
      lockUI.className = "w-full mt-2";
      lockUI.id = `lock-ui-${i}`;
      lockContainer.appendChild(lockUI);

      // Add to container
      locksContainer.appendChild(lockContainer);

      // Create lock object and initialize it
      const lock = {
        id: i,
        type: lockType.type,
        name: lockType.name,
        isSolved: false,
        solution: null,
        initialize: () => lockType.initialize(lockUI, i, this),
      };

      this.locks.push(lock);
      lock.initialize();
    }
  }

  getLockTypes() {
    // Define different lock types with their initialization functions
    return [
      {
        type: "rotary",
        name: "Rotary Dial Lock",
        initialize: (container, id, puzzle) =>
          this.createRotaryLock(container, id, puzzle),
      },
      {
        type: "slider",
        name: "Slider Alignment Lock",
        initialize: (container, id, puzzle) =>
          this.createSliderLock(container, id, puzzle),
      },
      {
        type: "keypad",
        name: "Digital Keypad Lock",
        initialize: (container, id, puzzle) =>
          this.createKeypadLock(container, id, puzzle),
      },
      {
        type: "color",
        name: "Color Sequence Lock",
        initialize: (container, id, puzzle) =>
          this.createColorLock(container, id, puzzle),
      },
      {
        type: "dial",
        name: "Precision Dial Lock",
        initialize: (container, id, puzzle) =>
          this.createPrecisionDialLock(container, id, puzzle),
      },
    ];
  }

  createRotaryLock(container, id, puzzle) {
    // Target value to reach
    const targetValue = Math.floor(Math.random() * 36) * 10; // 0, 10, 20, ..., 350

    // Create UI
    container.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="relative w-32 h-32 mb-4">
                    <div id="rotary-dial-${id}" class="absolute inset-0 rounded-full bg-gray-700 border-2 border-gray-600">
                        <div class="absolute top-0 left-1/2 w-2 h-6 bg-red-500 transform -translate-x-1/2"></div>
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="text-lg font-bold text-white">${targetValue}°</div>
                    </div>
                </div>
                <div class="flex space-x-4">
                    <button id="rotary-left-${id}" class="px-3 py-1 bg-blue-600 rounded text-white">⟲</button>
                    <button id="rotary-right-${id}" class="px-3 py-1 bg-blue-600 rounded text-white">⟳</button>
                </div>
            </div>
        `;

    // Initialize state
    let currentRotation = 0;
    const dial = document.getElementById(`rotary-dial-${id}`);

    // Add event listeners
    document
      .getElementById(`rotary-left-${id}`)
      .addEventListener("click", () => {
        currentRotation = (currentRotation - 10 + 360) % 360;
        dial.style.transform = `rotate(${currentRotation}deg)`;
        this.playLockClickSound();
        checkSolution();
      });

    document
      .getElementById(`rotary-right-${id}`)
      .addEventListener("click", () => {
        currentRotation = (currentRotation + 10) % 360;
        dial.style.transform = `rotate(${currentRotation}deg)`;
        this.playLockClickSound();
        checkSolution();
      });

    // Check if solution is correct
    const checkSolution = () => {
      if (currentRotation === targetValue) {
        this.solveLock(id);
      }
    };

    // Set the solution
    this.locks[id].solution = targetValue;
  }

  createSliderLock(container, id, puzzle) {
    // Generate target positions (random values between 20 and 80)
    const targetPositions = [];
    const sliderCount = 3 + (puzzle.difficultyLevel >= 4 ? 1 : 0);

    for (let i = 0; i < sliderCount; i++) {
      targetPositions.push(20 + Math.floor(Math.random() * 61)); // 20-80
    }

    // Create UI
    let slidersHTML = "";
    for (let i = 0; i < sliderCount; i++) {
      slidersHTML += `
                <div class="mb-3">
                    <input type="range" id="slider-${id}-${i}" class="w-full" min="0" max="100" value="50">
                    <div class="w-full flex justify-between text-xs text-gray-400 mt-1">
                        <span>0</span>
                        <span id="slider-value-${id}-${i}">50</span>
                        <span>100</span>
                    </div>
                </div>
            `;
    }

    container.innerHTML = `
            <div class="w-full px-2">
                <div class="mb-3 text-center text-sm text-gray-300">Align all sliders to the correct positions</div>
                ${slidersHTML}
                <div class="mt-2 text-center text-xs text-gray-400">Slider positions must be within ±3 of their targets</div>
            </div>
        `;

    // Initialize state and event listeners
    const sliders = [];
    const valueDisplays = [];

    for (let i = 0; i < sliderCount; i++) {
      const slider = document.getElementById(`slider-${id}-${i}`);
      const valueDisplay = document.getElementById(`slider-value-${id}-${i}`);

      sliders.push(slider);
      valueDisplays.push(valueDisplay);

      slider.addEventListener("input", () => {
        valueDisplay.textContent = slider.value;
        this.playLockClickSound();
        checkSolution();
      });
    }

    // Check if solution is correct
    const checkSolution = () => {
      let allCorrect = true;

      for (let i = 0; i < sliderCount; i++) {
        const value = parseInt(sliders[i].value);
        const target = targetPositions[i];

        // Check if within tolerance
        if (Math.abs(value - target) > 3) {
          allCorrect = false;
          break;
        }
      }

      if (allCorrect) {
        this.solveLock(id);
      }
    };

    // Set the solution
    this.locks[id].solution = targetPositions;
  }

  createKeypadLock(container, id, puzzle) {
    // Generate a 4-digit code
    const code = [];
    for (let i = 0; i < 4; i++) {
      code.push(Math.floor(Math.random() * 10));
    }

    // Create UI
    container.innerHTML = `
            <div class="flex flex-col items-center">
                <div id="keypad-display-${id}" class="w-full mb-3 p-2 bg-gray-900 font-mono text-center text-xl text-green-500 border border-gray-700">____</div>
                <div class="grid grid-cols-3 gap-2">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "C"]
                      .map(
                        (key) => `
                        <button id="keypad-${id}-${key}" class="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-lg text-white hover:bg-gray-600 ${
                          key === "" ? "opacity-0 cursor-default" : ""
                        }">
                            ${key === "C" ? "⌫" : key}
                        </button>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;

    // Initialize state
    let currentCode = "";
    const display = document.getElementById(`keypad-display-${id}`);

    // Add event listeners for keypad buttons
    for (let key of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const button = document.getElementById(`keypad-${id}-${key}`);
      if (button) {
        button.addEventListener("click", () => {
          if (currentCode.length < 4) {
            currentCode += key;
            updateDisplay();
            this.playLockClickSound();

            // Check solution when code is complete
            if (currentCode.length === 4) {
              checkSolution();
            }
          }
        });
      }
    }

    // Clear button
    const clearButton = document.getElementById(`keypad-${id}-C`);
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        currentCode = currentCode.slice(0, -1);
        updateDisplay();
        this.playLockClickSound();
      });
    }

    // Update display function
    const updateDisplay = () => {
      display.textContent = currentCode.padEnd(4, "_");
    };

    // Check if solution is correct
    const checkSolution = () => {
      const enteredCode = currentCode.split("").map(Number);
      let isCorrect = true;

      for (let i = 0; i < 4; i++) {
        if (enteredCode[i] !== code[i]) {
          isCorrect = false;
          break;
        }
      }

      if (isCorrect) {
        this.solveLock(id);
      } else {
        // Show error and reset after delay
        display.textContent = "ERROR";
        display.classList.add("text-red-500");
        display.classList.remove("text-green-500");

        setTimeout(() => {
          currentCode = "";
          display.classList.remove("text-red-500");
          display.classList.add("text-green-500");
          updateDisplay();
        }, 1000);
      }
    };

    // Set the solution
    this.locks[id].solution = code.join("");
  }

  createColorLock(container, id, puzzle) {
    // Define available colors
    const colors = [
      { name: "Red", bg: "bg-red-600", value: 0 },
      { name: "Green", bg: "bg-green-600", value: 1 },
      { name: "Blue", bg: "bg-blue-600", value: 2 },
      { name: "Yellow", bg: "bg-yellow-500", value: 3 },
      { name: "Purple", bg: "bg-purple-600", value: 4 },
    ];

    // Generate sequence length based on difficulty
    const sequenceLength = Math.min(
      colors.length,
      3 + Math.floor(puzzle.difficultyLevel / 2)
    );

    // Generate target sequence
    const targetSequence = [];
    for (let i = 0; i < sequenceLength; i++) {
      targetSequence.push(Math.floor(Math.random() * colors.length));
    }

    // Create UI
    let buttonHTML = "";
    for (let i = 0; i < colors.length; i++) {
      buttonHTML += `
                <button id="color-btn-${id}-${i}" class="w-10 h-10 rounded-full ${colors[i].bg}"></button>
            `;
    }

    container.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="mb-3 text-sm text-gray-300">Enter the color sequence</div>
                <div class="flex items-center justify-center space-x-2 mb-4" id="color-sequence-${id}">
                    ${Array(sequenceLength)
                      .fill(
                        `
                        <div class="w-8 h-8 rounded-full bg-gray-700 border border-gray-600"></div>
                    `
                      )
                      .join("")}
                </div>
                <div class="flex items-center justify-center space-x-2 mt-2">
                    ${buttonHTML}
                </div>
                <button id="color-reset-${id}" class="mt-3 px-3 py-1 text-sm bg-gray-700 rounded text-white">Reset</button>
            </div>
        `;

    // Initialize state
    let currentSequence = [];
    const sequenceDisplay = document.getElementById(`color-sequence-${id}`);
    const sequenceSlots = sequenceDisplay.querySelectorAll("div");

    // Add event listeners for color buttons
    for (let i = 0; i < colors.length; i++) {
      const button = document.getElementById(`color-btn-${id}-${i}`);
      if (button) {
        button.addEventListener("click", () => {
          if (currentSequence.length < sequenceLength) {
            currentSequence.push(i);
            updateDisplay();
            this.playLockClickSound();

            // Check solution when sequence is complete
            if (currentSequence.length === sequenceLength) {
              checkSolution();
            }
          }
        });
      }
    }

    // Reset button
    const resetButton = document.getElementById(`color-reset-${id}`);
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        currentSequence = [];
        updateDisplay();
        this.playLockClickSound();
      });
    }

    // Update display function
    const updateDisplay = () => {
      for (let i = 0; i < sequenceSlots.length; i++) {
        if (i < currentSequence.length) {
          const colorIndex = currentSequence[i];
          sequenceSlots[
            i
          ].className = `w-8 h-8 rounded-full ${colors[colorIndex].bg}`;
        } else {
          sequenceSlots[i].className =
            "w-8 h-8 rounded-full bg-gray-700 border border-gray-600";
        }
      }
    };

    // Check if solution is correct
    const checkSolution = () => {
      let isCorrect = true;

      for (let i = 0; i < sequenceLength; i++) {
        if (currentSequence[i] !== targetSequence[i]) {
          isCorrect = false;
          break;
        }
      }

      if (isCorrect) {
        this.solveLock(id);
      } else {
        // Show error and reset after delay
        sequenceSlots.forEach((slot) => {
          slot.classList.add("animate-pulse");
          slot.classList.add("bg-red-700");
          slot.classList.remove("bg-gray-700");
        });

        setTimeout(() => {
          currentSequence = [];
          updateDisplay();
          sequenceSlots.forEach((slot) => {
            slot.classList.remove("animate-pulse");
          });
        }, 1000);
      }
    };

    // Set the solution
    this.locks[id].solution = targetSequence
      .map((index) => colors[index].name)
      .join("-");
  }

  createPrecisionDialLock(container, id, puzzle) {
    // Generate target angle (a value between 0 and 359)
    const targetAngle = Math.floor(Math.random() * 360);

    // Create UI
    container.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="relative w-36 h-36 mb-4">
                    <div class="absolute inset-0 rounded-full bg-gray-800 border-2 border-gray-700">
                        <!-- Dial markings -->
                        ${Array(12)
                          .fill(0)
                          .map((_, i) => {
                            const deg = i * 30;
                            return `<div class="absolute w-0.5 h-4 bg-gray-400" style="top: 0; left: 50%; transform: translateX(-50%) rotate(${deg}deg); transform-origin: bottom center;"></div>`;
                          })
                          .join("")}
                    </div>
                    <div id="precision-dial-pointer-${id}" class="absolute top-0 left-1/2 w-0.5 h-18 bg-red-500 transform -translate-x-1/2" style="transform-origin: bottom center;"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div id="precision-dial-angle-${id}" class="text-lg font-bold text-white">0°</div>
                    </div>
                </div>
                <div class="flex justify-center items-center w-full">
                    <input type="range" id="precision-dial-slider-${id}" class="w-full" min="0" max="359" value="0">
                </div>
                <div class="mt-2 text-center text-xs text-gray-400">Target: ${targetAngle}° (±2° tolerance)</div>
            </div>
        `;

    // Initialize state
    let currentAngle = 0;
    const pointer = document.getElementById(`precision-dial-pointer-${id}`);
    const angleDisplay = document.getElementById(`precision-dial-angle-${id}`);
    const slider = document.getElementById(`precision-dial-slider-${id}`);

    // Update dial position
    const updateDial = (angle) => {
      pointer.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      angleDisplay.textContent = `${angle}°`;
    };

    // Add event listener for slider
    slider.addEventListener("input", () => {
      currentAngle = parseInt(slider.value);
      updateDial(currentAngle);
      this.playLockClickSound();
      checkSolution();
    });

    // Check if solution is correct
    const checkSolution = () => {
      // Calculate minimum angle difference (accounting for 0-359 wrap around)
      let diff = Math.abs(currentAngle - targetAngle);
      diff = Math.min(diff, 360 - diff);

      if (diff <= 2) {
        // 2-degree tolerance
        this.solveLock(id);
      }
    };

    // Set the solution
    this.locks[id].solution = targetAngle;
  }

  solveLock(id) {
    // Check if already solved
    if (this.locks[id].isSolved) return;

    // Mark lock as solved
    this.locks[id].isSolved = true;
    this.solvedLocks++;

    // Update lock UI
    const lockStatus = document.getElementById(`lock-status-${id}`);
    if (lockStatus) {
      lockStatus.innerHTML =
        '<span class="mr-1 text-green-500">●</span> <span class="text-green-500">Unlocked</span>';
    }

    const lockContainer = document.getElementById(`lock-${id}`);
    if (lockContainer) {
      lockContainer.classList.remove("border-gray-700");
      lockContainer.classList.add("border-green-600");

      // Add success animation
      lockContainer.style.animation = "pulseSuccess 1s";
    }

    // Update progress bar
    this.updateProgress();

    // Play success sound
    this.playSuccessSound();

    // Check if all locks are solved
    if (this.solvedLocks === this.lockCount) {
      this.onAllLocksSolved();
    } else {
      this.callbacks.showMessage(
        `Lock ${id + 1} opened! ${
          this.lockCount - this.solvedLocks
        } more to go.`,
        "info"
      );
    }
  }

  updateProgress() {
    const progressBar = document.getElementById("lock-progress");
    if (progressBar) {
      const percentage = (this.solvedLocks / this.lockCount) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  onAllLocksSolved() {
    // Display success message
    this.callbacks.showMessage(
      "All locks opened! Safe access granted.",
      "success"
    );

    // Add success animation to the game area
    const container = this.gameArea.querySelector(".flex.flex-col");
    if (container) {
      const successOverlay = document.createElement("div");
      successOverlay.className =
        "mt-6 p-4 bg-green-800 bg-opacity-30 rounded-lg text-center animate-pulse";
      successOverlay.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <p class="text-green-300 font-bold text-xl mt-2">SAFE UNLOCKED!</p>
            `;

      container.appendChild(successOverlay);
    }
  }

  initializeSounds() {
    // Create audio elements
    this.lockClickSound = new Audio("../static/sounds/lock-click.mp3");
    this.lockClickSound.volume = 0.2;

    this.successSound = new Audio("../static/sounds/lock-success.mp3");
    this.successSound.volume = 0.3;

    this.errorSound = new Audio("../static/sounds/lock-error.mp3");
    this.errorSound.volume = 0.3;
  }

  playLockClickSound() {
    try {
      // Clone the sound to allow rapid clicks
      const clickSound = this.lockClickSound.cloneNode();
      clickSound.volume = 0.1;
      clickSound
        .play()
        .catch((e) => console.warn("Could not play click sound:", e));
    } catch (e) {
      console.warn("Could not play click sound:", e);
    }
  }

  playSuccessSound() {
    try {
      this.successSound
        .play()
        .catch((e) => console.warn("Could not play success sound:", e));
    } catch (e) {
      console.warn("Could not play success sound:", e);
    }
  }

  getSolution() {
    // Collect the solutions for all locks
    const solutions = this.locks.map((lock) => ({
      id: lock.id,
      type: lock.type,
      solution: lock.solution,
      solved: lock.isSolved,
    }));

    return { locks: solutions };
  }

  validateSolution(solution) {
    // Check if all locks are solved
    return this.solvedLocks === this.lockCount;
  }

  getErrorMessage() {
    return `Not all locks have been opened. ${this.solvedLocks} of ${this.lockCount} solved.`;
  }

  cleanup() {
    // Stop any playing audio
    if (this.lockClickSound) this.lockClickSound.pause();
    if (this.successSound) this.successSound.pause();
    if (this.errorSound) this.errorSound.pause();

    // Clear game area
    this.gameArea.innerHTML = "";
  }
}

export default MultiLockPuzzle;
