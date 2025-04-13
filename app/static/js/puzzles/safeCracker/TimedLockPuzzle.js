// timedLockPuzzle.js - Time-based lock puzzle for safe cracker
// Difficulty: 5/5 - Player must solve a complex combination under time pressure

class TimedLockPuzzle {
  constructor(gameAreaElement, puzzleData, callbacks) {
    this.gameArea = gameAreaElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle properties
    this.difficultyLevel = puzzleData.difficulty || 5;
    this.lockElements = []; // List of interactive lock elements
    this.lockSequence = []; // Sequence of elements to unlock
    this.currentStep = 0; // Current step in the sequence
    this.maxSteps = 5; // Default number of steps

    // Time challenge properties
    this.intervalTimers = [];
    this.randomizeInterval = 5000; // ms between random element changes
    this.lockTime = 2000; // ms to hold a lock in place
    this.lockingTimeout = null;
    this.elementStates = []; // Current state of each element
    this.lockingInProgress = false;

    // Audio elements
    this.tickSound = null;
    this.lockSound = null;
    this.unlockSound = null;
    this.successSound = null;
    this.failSound = null;
  }

  initialize() {
    // Setup difficulty
    this.setupDifficulty();

    // Create the user interface
    this.createUI();

    // Generate lock sequence
    this.generateLockSequence();

    // Initialize sounds
    this.initializeSounds();

    // Start randomization timers
    this.startRandomization();

    // Display instructions
    this.callbacks.showMessage(
      "Stabilize all locks in the correct sequence to open the timed security system",
      "info"
    );
  }

  setupDifficulty() {
    // Adjust puzzle parameters based on difficulty
    switch (this.difficultyLevel) {
      case 1:
        this.maxSteps = 3;
        this.randomizeInterval = 7000;
        this.lockTime = 2500;
        break;
      case 2:
        this.maxSteps = 4;
        this.randomizeInterval = 6000;
        this.lockTime = 2300;
        break;
      case 3:
        this.maxSteps = 5;
        this.randomizeInterval = 5000;
        this.lockTime = 2000;
        break;
      case 4:
        this.maxSteps = 6;
        this.randomizeInterval = 4000;
        this.lockTime = 1800;
        break;
      case 5:
        this.maxSteps = 7;
        this.randomizeInterval = 3000;
        this.lockTime = 1500;
        break;
      default:
        this.maxSteps = 5;
        this.randomizeInterval = 5000;
        this.lockTime = 2000;
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
    title.textContent = "Timed Security System";
    container.appendChild(title);

    // Instructions
    const instruction = document.createElement("p");
    instruction.className = "text-gray-300 mb-6 text-center";
    instruction.textContent =
      "Stabilize each lock in sequence before the timer resets it. The correct sequence is shown by the colored indicators.";
    container.appendChild(instruction);

    // Sequence indicator
    const sequenceContainer = document.createElement("div");
    sequenceContainer.className = "flex space-x-2 mb-6";
    sequenceContainer.id = "sequence-container";

    for (let i = 0; i < this.maxSteps; i++) {
      const step = document.createElement("div");
      step.className =
        "w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center";
      step.id = `step-${i}`;
      step.innerHTML = `<span class="text-xs text-white">${i + 1}</span>`;
      sequenceContainer.appendChild(step);
    }

    container.appendChild(sequenceContainer);

    // Status display
    const statusDisplay = document.createElement("div");
    statusDisplay.className = "text-lg font-bold text-yellow-400 mb-6";
    statusDisplay.id = "lock-status";
    statusDisplay.textContent = "Stabilize the locks in sequence";
    container.appendChild(statusDisplay);

    // Lock elements container
    const locksContainer = document.createElement("div");
    locksContainer.className = "grid grid-cols-3 gap-4 mb-6";
    locksContainer.id = "locks-container";

    // Create 6 lock elements (2 rows of 3)
    for (let i = 0; i < 6; i++) {
      const lockElement = document.createElement("div");
      lockElement.className =
        "w-24 h-24 bg-gray-800 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:bg-gray-700 relative";
      lockElement.id = `lock-${i}`;

      // Add a visual indicator of the element's state
      const stateIndicator = document.createElement("div");
      stateIndicator.className = "w-16 h-16 rounded-full bg-gray-600 mb-2";
      stateIndicator.id = `indicator-${i}`;
      lockElement.appendChild(stateIndicator);

      // Add a label
      const label = document.createElement("div");
      label.className = "text-xs text-gray-300";
      label.textContent = `Lock ${i + 1}`;
      lockElement.appendChild(label);

      // Add click event to stabilize the lock
      lockElement.addEventListener("click", () => this.onLockClick(i));

      // Add to container
      locksContainer.appendChild(lockElement);

      // Store element reference
      this.lockElements.push(lockElement);

      // Initialize state
      this.elementStates.push({
        value: Math.random(),
        locked: false,
        correct: false,
      });
    }

    container.appendChild(locksContainer);

    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4";
    resetButton.textContent = "Reset Locks";
    resetButton.addEventListener("click", () => this.resetLocks());
    container.appendChild(resetButton);

    this.gameArea.appendChild(container);

    // Update the visual state of all elements
    this.updateLockVisuals();
  }

  generateLockSequence() {
    this.lockSequence = [];

    // Create an array of indexes (0-5 for 6 elements)
    const indexes = [0, 1, 2, 3, 4, 5];

    // Shuffle the array
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    // Take the first maxSteps elements
    this.lockSequence = indexes.slice(0, this.maxSteps);

    // Color the sequence indicators
    const colors = [
      "bg-red-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];

    for (let i = 0; i < this.maxSteps; i++) {
      const step = document.getElementById(`step-${i}`);
      if (step) {
        step.classList.remove("bg-gray-700");
        step.classList.add(colors[i % colors.length]);
      }
    }

    console.log("Generated lock sequence:", this.lockSequence); // For debugging
  }

  startRandomization() {
    // Clear any existing intervals
    this.stopRandomization();

    // Set up randomization for each element
    for (let i = 0; i < this.lockElements.length; i++) {
      // Skip if already locked correctly
      if (this.elementStates[i].correct) continue;

      // Create interval for this element
      const interval = setInterval(() => {
        // Skip if element is locked or already correct
        if (this.elementStates[i].locked || this.elementStates[i].correct)
          return;

        // Randomize state
        this.elementStates[i].value = Math.random();

        // Update visual
        this.updateLockVisuals();
      }, this.randomizeInterval * (0.8 + Math.random() * 0.4)); // Slight variation in timings

      this.intervalTimers.push(interval);
    }
  }

  stopRandomization() {
    // Clear all interval timers
    this.intervalTimers.forEach((interval) => clearInterval(interval));
    this.intervalTimers = [];
  }

  updateLockVisuals() {
    // Update the visual state of all elements
    for (let i = 0; i < this.lockElements.length; i++) {
      const indicator = document.getElementById(`indicator-${i}`);
      if (!indicator) continue;

      const state = this.elementStates[i];

      // Different visuals based on state
      if (state.correct) {
        // Correctly locked
        const sequencePosition = this.lockSequence.indexOf(i);
        const colors = [
          "bg-red-500",
          "bg-yellow-500",
          "bg-green-500",
          "bg-blue-500",
          "bg-purple-500",
          "bg-pink-500",
          "bg-indigo-500",
        ];

        indicator.className = `w-16 h-16 rounded-full ${
          colors[sequencePosition % colors.length]
        }`;
      } else if (state.locked) {
        // Temporarily locked
        indicator.className = "w-16 h-16 rounded-full bg-white";
      } else {
        // Regular state - visualize using different shades
        const hue = Math.floor(state.value * 360);
        indicator.className = "w-16 h-16 rounded-full";
        indicator.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;

        // Pulse animation while active
        indicator.style.animation = "pulse 1.5s infinite";
      }

      // Update the lock element's border
      const lockElement = this.lockElements[i];
      if (state.correct) {
        lockElement.classList.add("border-2", "border-green-500");
        lockElement.classList.remove("cursor-pointer", "hover:bg-gray-700");
      } else if (state.locked) {
        lockElement.classList.add("border-2", "border-white");
      } else {
        lockElement.classList.remove(
          "border-2",
          "border-green-500",
          "border-white"
        );
      }
    }

    // Update current step indicator
    for (let i = 0; i < this.maxSteps; i++) {
      const step = document.getElementById(`step-${i}`);
      if (step) {
        if (i === this.currentStep) {
          step.classList.add("ring-2", "ring-white", "ring-opacity-70");
        } else {
          step.classList.remove("ring-2", "ring-white", "ring-opacity-70");
        }
      }
    }
  }

  onLockClick(index) {
    // Ignore if already correct or currently locking something
    if (this.elementStates[index].correct || this.lockingInProgress) return;

    // Check if this is the correct next lock in sequence
    if (this.lockSequence[this.currentStep] === index) {
      // Correct lock selected!
      this.lockElement(index);
    } else {
      // Wrong lock selected
      this.showLockError(index);
    }
  }

  lockElement(index) {
    // Prevent other locks from being clicked during the locking process
    this.lockingInProgress = true;

    // Update status
    const statusDisplay = document.getElementById("lock-status");
    if (statusDisplay) {
      statusDisplay.textContent = `Stabilizing Lock ${index + 1}...`;
      statusDisplay.className = "text-lg font-bold text-blue-400 mb-6";
    }

    // Mark as locked
    this.elementStates[index].locked = true;
    this.updateLockVisuals();

    // Play locking sound
    this.playLockSound();

    // Start the locking timer
    let progress = 0;
    const progressStep = 10;
    const progressInterval = this.lockTime / (100 / progressStep);

    // Create progress bar
    const lockElement = this.lockElements[index];
    const progressBar = document.createElement("div");
    progressBar.className = "absolute bottom-0 left-0 h-1 bg-blue-500";
    progressBar.style.width = "0%";
    progressBar.id = `progress-${index}`;
    lockElement.appendChild(progressBar);

    // Update progress periodically
    const progressTimer = setInterval(() => {
      progress += progressStep;
      progressBar.style.width = `${progress}%`;

      // Play tick sound
      this.playTickSound();

      if (progress >= 100) {
        // Locking complete
        clearInterval(progressTimer);
        this.completeLock(index);
      }
    }, progressInterval);

    // Store timeout to clear if needed
    this.lockingTimeout = setTimeout(() => {
      clearInterval(progressTimer);
    }, this.lockTime + 100);
  }

  completeLock(index) {
    // Clear any progress bar
    const progressBar = document.getElementById(`progress-${index}`);
    if (progressBar) progressBar.remove();

    // Mark as correctly locked
    this.elementStates[index].locked = false;
    this.elementStates[index].correct = true;

    // Move to next step
    this.currentStep++;

    // Update status
    const statusDisplay = document.getElementById("lock-status");
    if (statusDisplay) {
      if (this.currentStep < this.maxSteps) {
        statusDisplay.textContent = `Lock ${index + 1} stabilized! ${
          this.maxSteps - this.currentStep
        } more to go.`;
        statusDisplay.className = "text-lg font-bold text-green-400 mb-6";
      } else {
        statusDisplay.textContent = "All locks stabilized!";
        statusDisplay.className = "text-lg font-bold text-green-500 mb-6";
      }
    }

    // Play unlock sound
    this.playUnlockSound();

    // Update visuals
    this.updateLockVisuals();

    // Allow further interactions
    this.lockingInProgress = false;

    // Check if all locks are done
    if (this.currentStep >= this.maxSteps) {
      this.onPuzzleComplete();
    }
  }

  showLockError(index) {
    // Show error feedback
    const lockElement = this.lockElements[index];
    lockElement.classList.add("animate-shake", "border-2", "border-red-500");

    // Update status
    const statusDisplay = document.getElementById("lock-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Wrong lock! Follow the numbered sequence.";
      statusDisplay.className = "text-lg font-bold text-red-500 mb-6";
    }

    // Play fail sound
    this.playFailSound();

    // Show the correct lock to try
    const correctIndex = this.lockSequence[this.currentStep];
    const correctElement = this.lockElements[correctIndex];
    correctElement.classList.add(
      "border-2",
      "border-yellow-500",
      "animate-pulse"
    );

    // Reset after animation
    setTimeout(() => {
      lockElement.classList.remove(
        "animate-shake",
        "border-2",
        "border-red-500"
      );
      correctElement.classList.remove(
        "border-2",
        "border-yellow-500",
        "animate-pulse"
      );

      // Reset status
      if (statusDisplay) {
        statusDisplay.textContent = "Stabilize the locks in sequence";
        statusDisplay.className = "text-lg font-bold text-yellow-400 mb-6";
      }
    }, 1500);

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
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .animate-pulse {
                    animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `;
      document.head.appendChild(style);
    }
  }

  resetLocks() {
    // Only allow reset if not all locks are correct
    if (this.currentStep >= this.maxSteps) return;

    // Clear any ongoing locking process
    if (this.lockingTimeout) {
      clearTimeout(this.lockingTimeout);
      this.lockingTimeout = null;
    }

    // Reset all locks except the correctly locked ones
    for (let i = 0; i < this.elementStates.length; i++) {
      if (!this.elementStates[i].correct) {
        this.elementStates[i].locked = false;
        this.elementStates[i].value = Math.random();
      }

      // Remove any progress bars
      const progressBar = document.getElementById(`progress-${i}`);
      if (progressBar) progressBar.remove();
    }

    // Update status
    const statusDisplay = document.getElementById("lock-status");
    if (statusDisplay) {
      statusDisplay.textContent =
        "Locks reset. Continue from the current step.";
      statusDisplay.className = "text-lg font-bold text-yellow-400 mb-6";
    }

    // Update visuals
    this.updateLockVisuals();

    // Allow further interactions
    this.lockingInProgress = false;

    // Restart randomization
    this.startRandomization();
  }

  onPuzzleComplete() {
    // Stop all randomization
    this.stopRandomization();

    // Show success message
    this.callbacks.showMessage(
      "All locks stabilized! Timed security system disabled.",
      "success"
    );

    // Play success sound
    this.playSuccessSound();

    // Show success animation
    this.animateSuccess();
  }

  animateSuccess() {
    // Animate locks in a wave pattern
    this.lockElements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add("animate-bounce");

        setTimeout(() => {
          element.classList.remove("animate-bounce");
        }, 1000);
      }, index * 150);
    });

    // Create success overlay
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "mt-6 p-4 bg-green-800 bg-opacity-30 rounded-lg text-center animate-fadeIn";
    successOverlay.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-green-300 font-bold text-xl mt-2">TIMED SECURITY DISABLED</p>
        `;

    this.gameArea.querySelector(".flex.flex-col").appendChild(successOverlay);

    // Add keyframes for fadeIn animation if they don't exist
    if (!document.getElementById("fadeIn-keyframes")) {
      const style = document.createElement("style");
      style.id = "fadeIn-keyframes";
      style.textContent = `
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-in-out;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce {
                    animation: bounce 0.5s ease-in-out;
                }
            `;
      document.head.appendChild(style);
    }
  }

  initializeSounds() {
    // Create audio elements
    this.tickSound = new Audio("../static/sounds/lock-tick.mp3");
    this.tickSound.volume = 0.1;

    this.lockSound = new Audio("../static/sounds/lock-engage.mp3");
    this.lockSound.volume = 0.3;

    this.unlockSound = new Audio("../static/sounds/lock-click.mp3");
    this.unlockSound.volume = 0.3;

    this.successSound = new Audio("../static/sounds/puzzle-complete.mp3");
    this.successSound.volume = 0.4;

    this.failSound = new Audio("../static/sounds/lock-error.mp3");
    this.failSound.volume = 0.3;
  }

  playTickSound() {
    try {
      // Clone the sound to allow rapid ticks
      const tickSound = this.tickSound.cloneNode();
      tickSound.volume = 0.05;
      tickSound
        .play()
        .catch((e) => console.warn("Could not play tick sound:", e));
    } catch (e) {
      console.warn("Could not play tick sound:", e);
    }
  }

  playLockSound() {
    try {
      this.lockSound
        .play()
        .catch((e) => console.warn("Could not play lock sound:", e));
    } catch (e) {
      console.warn("Could not play lock sound:", e);
    }
  }

  playUnlockSound() {
    try {
      this.unlockSound
        .play()
        .catch((e) => console.warn("Could not play unlock sound:", e));
    } catch (e) {
      console.warn("Could not play unlock sound:", e);
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

  playFailSound() {
    try {
      this.failSound
        .play()
        .catch((e) => console.warn("Could not play fail sound:", e));
    } catch (e) {
      console.warn("Could not play fail sound:", e);
    }
  }

  getSolution() {
    return {
      currentStep: this.currentStep,
      maxSteps: this.maxSteps,
      sequence: this.lockSequence,
    };
  }

  validateSolution(solution) {
    // Check if all locks have been correctly activated
    return this.currentStep >= this.maxSteps;
  }

  getErrorMessage() {
    return `Not all locks have been stabilized. ${this.currentStep} of ${this.maxSteps} complete.`;
  }

  cleanup() {
    // Stop all randomization
    this.stopRandomization();

    // Clear any ongoing timeout
    if (this.lockingTimeout) {
      clearTimeout(this.lockingTimeout);
      this.lockingTimeout = null;
    }

    // Stop any playing audio
    if (this.tickSound) this.tickSound.pause();
    if (this.lockSound) this.lockSound.pause();
    if (this.unlockSound) this.unlockSound.pause();
    if (this.successSound) this.successSound.pause();
    if (this.failSound) this.failSound.pause();

    // Clear game area
    this.gameArea.innerHTML = "";
  }
}

export default TimedLockPuzzle;
