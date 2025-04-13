// lockCombinationPuzzle.js - Puzzle for cracking a safe combination
// Difficulty: 1/5 - Introductory puzzle for Safe Cracker role

class LockCombinationPuzzle {
  constructor(gameAreaElement, puzzleData, callbacks) {
    this.gameArea = gameAreaElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle-specific properties
    this.combination = [];
    this.playerInput = [];
    this.lockPositions = 3;
    this.minValue = 0;
    this.maxValue = 99;
    this.dialElement = null;
    this.lockDisplay = null;
    this.currentPositionIndex = 0;
    this.feedback = [];
    this.difficultyLevel = puzzleData.difficulty || 1;

    // Audio elements
    this.clickSound = null;
    this.successSound = null;
    this.errorSound = null;
  }

  initialize() {
    // Adjust difficulty
    this.setupDifficulty();

    // Generate the combination
    this.generateCombination();

    // Create the user interface
    this.createUI();

    // Initialize sounds
    this.initializeSounds();

    // Show instructions
    this.callbacks.showMessage(
      "Rotate the dial to find the correct combination!",
      "info"
    );
  }

  setupDifficulty() {
    // Adjust puzzle parameters based on difficulty
    switch (this.difficultyLevel) {
      case 1:
        this.lockPositions = 3; // 3 numbers to guess
        this.minValue = 0;
        this.maxValue = 99;
        break;
      case 2:
        this.lockPositions = 3;
        this.minValue = 0;
        this.maxValue = 99;
        break;
      case 3:
        this.lockPositions = 4;
        this.minValue = 0;
        this.maxValue = 99;
        break;
      case 4:
      case 5:
        this.lockPositions = 4;
        this.minValue = 0;
        this.maxValue = 99;
        break;
      default:
        this.lockPositions = 3;
        this.minValue = 0;
        this.maxValue = 99;
    }

    // Reset player input
    this.playerInput = new Array(this.lockPositions).fill(0);
    this.feedback = new Array(this.lockPositions).fill(null);
  }

  generateCombination() {
    this.combination = [];
    for (let i = 0; i < this.lockPositions; i++) {
      const num =
        Math.floor(Math.random() * (this.maxValue - this.minValue + 1)) +
        this.minValue;
      this.combination.push(num);
    }
    console.log("Generated combination:", this.combination); // For debugging
  }

  createUI() {
    this.gameArea.innerHTML = "";

    // Add main container
    const container = document.createElement("div");
    container.className =
      "flex flex-col items-center justify-center h-full p-4 bg-gray-900 rounded-lg";

    // Title
    const title = document.createElement("h3");
    title.className = "text-xl font-bold text-white mb-4";
    title.textContent = "Safe Combination Lock";
    container.appendChild(title);

    // Instruction
    const instruction = document.createElement("p");
    instruction.className = "text-gray-300 mb-6 text-center";
    instruction.textContent =
      "Find the correct combination to unlock the safe. Listen for clues as you rotate the dial.";
    container.appendChild(instruction);

    // Combination display
    this.lockDisplay = document.createElement("div");
    this.lockDisplay.className =
      "flex items-center justify-center space-x-3 mb-6";

    for (let i = 0; i < this.lockPositions; i++) {
      const positionDisplay = document.createElement("div");
      positionDisplay.className =
        "w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-3xl font-mono text-white border-2 border-gray-700";
      positionDisplay.textContent = "00";
      positionDisplay.dataset.position = i;
      positionDisplay.id = `lock-position-${i}`;
      this.lockDisplay.appendChild(positionDisplay);
    }

    container.appendChild(this.lockDisplay);

    // Lock dial
    const dialContainer = document.createElement("div");
    dialContainer.className = "relative w-48 h-48 mb-6";

    this.dialElement = document.createElement("div");
    this.dialElement.className =
      "absolute inset-0 rounded-full bg-gray-700 border-4 border-gray-600 shadow-lg flex items-center justify-center";
    this.dialElement.style.transform = "rotate(0deg)";

    // Add dial markings
    for (let i = 0; i < 10; i++) {
      const marking = document.createElement("div");
      marking.className = "absolute w-1 h-6 bg-white";
      marking.style.top = "5px";
      marking.style.left = "50%";
      marking.style.transform = `translateX(-50%) rotate(${i * 36}deg)`;
      marking.style.transformOrigin = "50% 110px";
      this.dialElement.appendChild(marking);

      // Add number
      const number = document.createElement("div");
      number.className = "absolute text-white text-sm font-bold";
      number.textContent = i * 10;
      number.style.transformOrigin = "50% 80px";
      number.style.transform = `rotate(${i * 36}deg) translateY(-65px)`;
      this.dialElement.appendChild(number);
    }

    // Add dial pointer
    const pointer = document.createElement("div");
    pointer.className =
      "absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0";
    pointer.style.borderLeft = "10px solid transparent";
    pointer.style.borderRight = "10px solid transparent";
    pointer.style.borderBottom = "20px solid red";
    dialContainer.appendChild(pointer);

    // Add center of dial
    const dialCenter = document.createElement("div");
    dialCenter.className =
      "absolute inset-0 rounded-full flex items-center justify-center";

    const centerKnob = document.createElement("div");
    centerKnob.className =
      "w-12 h-12 rounded-full bg-gray-500 border-2 border-gray-400 flex items-center justify-center text-white text-sm";
    centerKnob.textContent = this.playerInput[this.currentPositionIndex];

    dialCenter.appendChild(centerKnob);
    this.dialElement.appendChild(dialCenter);

    dialContainer.appendChild(this.dialElement);
    container.appendChild(dialContainer);

    // Controls
    const controls = document.createElement("div");
    controls.className = "flex space-x-4 mb-4";

    // Left rotation button
    const leftButton = document.createElement("button");
    leftButton.className =
      "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700";
    leftButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>';
    leftButton.addEventListener("click", () => this.rotateDial(-1));

    // Right rotation button
    const rightButton = document.createElement("button");
    rightButton.className =
      "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700";
    rightButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>';
    rightButton.addEventListener("click", () => this.rotateDial(1));

    controls.appendChild(leftButton);
    controls.appendChild(rightButton);
    container.appendChild(controls);

    // Position selector
    const positionSelector = document.createElement("div");
    positionSelector.className = "flex space-x-2 mb-6";

    for (let i = 0; i < this.lockPositions; i++) {
      const posButton = document.createElement("button");
      posButton.className =
        i === this.currentPositionIndex
          ? "px-3 py-1 bg-yellow-600 text-white rounded-lg"
          : "px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700";
      posButton.textContent = `#${i + 1}`;
      posButton.addEventListener("click", () => this.selectPosition(i));
      positionSelector.appendChild(posButton);
    }

    container.appendChild(positionSelector);

    // Submit button
    const submitButton = document.createElement("button");
    submitButton.className =
      "px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700";
    submitButton.textContent = "Check Combination";
    submitButton.addEventListener("click", () => this.checkCombination());
    container.appendChild(submitButton);

    this.gameArea.appendChild(container);

    // Update the display
    this.updateLockDisplay();
  }

  initializeSounds() {
    // Create audio elements
    this.clickSound = new Audio("../static/sounds/lock-click.mp3");
    this.clickSound.volume = 0.3;

    this.successSound = new Audio("../static/sounds/lock-open.mp3");
    this.successSound.volume = 0.5;

    this.errorSound = new Audio("../static/sounds/lock-error.mp3");
    this.errorSound.volume = 0.3;
  }

  rotateDial(direction) {
    // Update the current position value
    this.playerInput[this.currentPositionIndex] =
      (this.playerInput[this.currentPositionIndex] + direction + 100) % 100;

    // Play click sound
    this.playClickSound();

    // Provide audio feedback based on distance from correct value
    this.provideAudioFeedback();

    // Animate the dial
    const currentRotation = this.dialElement.style.transform
      ? parseInt(this.dialElement.style.transform.replace(/[^0-9-]/g, ""))
      : 0;

    const newRotation = currentRotation + direction * 36;
    this.dialElement.style.transform = `rotate(${newRotation}deg)`;

    // Update the display
    this.updateLockDisplay();
  }

  selectPosition(index) {
    this.currentPositionIndex = index;

    // Update buttons to show current position
    const posButtons = document.querySelectorAll(".flex.space-x-2 button");
    posButtons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.remove("bg-gray-600", "hover:bg-gray-700");
        btn.classList.add("bg-yellow-600");
      } else {
        btn.classList.remove("bg-yellow-600");
        btn.classList.add("bg-gray-600", "hover:bg-gray-700");
      }
    });

    // Update display
    this.updateLockDisplay();
  }

  updateLockDisplay() {
    // Update each position display
    for (let i = 0; i < this.lockPositions; i++) {
      const display = document.getElementById(`lock-position-${i}`);
      if (display) {
        // Show the current value
        display.textContent = this.playerInput[i].toString().padStart(2, "0");

        // Highlight the current position
        if (i === this.currentPositionIndex) {
          display.classList.add("border-yellow-500");
          display.classList.remove("border-gray-700");
        } else {
          display.classList.remove("border-yellow-500");
          display.classList.add("border-gray-700");
        }

        // Show feedback if available
        if (this.feedback[i] !== null) {
          if (this.feedback[i] === "correct") {
            display.classList.add("bg-green-700");
            display.classList.remove(
              "bg-gray-800",
              "bg-red-700",
              "bg-yellow-700"
            );
          } else if (this.feedback[i] === "close") {
            display.classList.add("bg-yellow-700");
            display.classList.remove(
              "bg-gray-800",
              "bg-red-700",
              "bg-green-700"
            );
          } else {
            display.classList.add("bg-red-700");
            display.classList.remove(
              "bg-gray-800",
              "bg-green-700",
              "bg-yellow-700"
            );
          }
        } else {
          display.classList.add("bg-gray-800");
          display.classList.remove(
            "bg-green-700",
            "bg-red-700",
            "bg-yellow-700"
          );
        }
      }
    }
  }

  playClickSound() {
    try {
      // Clone the sound to allow rapid clicks
      const clickSound = this.clickSound.cloneNode();
      clickSound.volume = 0.2;
      clickSound
        .play()
        .catch((e) => console.warn("Could not play click sound:", e));
    } catch (e) {
      console.warn("Could not play click sound:", e);
    }
  }

  provideAudioFeedback() {
    const currentValue = this.playerInput[this.currentPositionIndex];
    const targetValue = this.combination[this.currentPositionIndex];

    // Calculate distance (considering wrap-around)
    const directDistance = Math.abs(currentValue - targetValue);
    const wrapDistance = 100 - directDistance;
    const distance = Math.min(directDistance, wrapDistance);

    // Play audio feedback based on distance
    try {
      let feedbackSound;

      if (distance === 0) {
        // Correct value!
        feedbackSound = new Audio("../static/sounds/correct-tone.mp3");
        feedbackSound.volume = 0.3;
      } else if (distance <= 5) {
        // Very close
        feedbackSound = new Audio("../static/sounds/very-close.mp3");
        feedbackSound.volume = 0.3 * (1 - distance / 10);
      } else if (distance <= 15) {
        // Getting closer
        feedbackSound = new Audio("../static/sounds/getting-close.mp3");
        feedbackSound.volume = 0.2 * (1 - distance / 20);
      }

      if (feedbackSound) {
        feedbackSound
          .play()
          .catch((e) => console.warn("Could not play feedback sound:", e));
      }
    } catch (e) {
      console.warn("Could not play audio feedback:", e);
    }
  }

  checkCombination() {
    let correct = 0;
    let close = 0;

    // Reset feedback
    this.feedback = new Array(this.lockPositions).fill(null);

    // Check each position
    for (let i = 0; i < this.lockPositions; i++) {
      const currentValue = this.playerInput[i];
      const targetValue = this.combination[i];

      // Calculate distance (considering wrap-around)
      const directDistance = Math.abs(currentValue - targetValue);
      const wrapDistance = 100 - directDistance;
      const distance = Math.min(directDistance, wrapDistance);

      if (distance === 0) {
        // Correct!
        this.feedback[i] = "correct";
        correct++;
      } else if (distance <= 5) {
        // Close!
        this.feedback[i] = "close";
        close++;
      } else {
        // Wrong
        this.feedback[i] = "wrong";
      }
    }

    // Update the display
    this.updateLockDisplay();

    // Check if all positions are correct
    if (correct === this.lockPositions) {
      // Success!
      this.showSuccess();
      return true;
    } else {
      // Failure
      this.errorSound
        .play()
        .catch((e) => console.warn("Could not play error sound:", e));

      // Show feedback
      let message = `${correct} correct digits. `;
      if (close > 0) {
        message += `${close} digits are close.`;
      } else {
        message += "Try again!";
      }

      this.callbacks.showMessage(message, "warning");
      return false;
    }
  }

  showSuccess() {
    // Play success sound
    this.successSound
      .play()
      .catch((e) => console.warn("Could not play success sound:", e));

    // Show success message
    this.callbacks.showMessage("Safe unlocked successfully!", "success");

    // Animate success
    this.animateSuccess();
  }

  animateSuccess() {
    // Add success animation to the lock display
    const lockDisplay = this.lockDisplay;
    if (lockDisplay) {
      lockDisplay.classList.add("animate-pulse");

      // Create open safe image or animation
      const safeOpen = document.createElement("div");
      safeOpen.className =
        "mt-6 p-4 bg-green-800 bg-opacity-30 rounded-lg text-center animate-fadeIn";
      safeOpen.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <p class="text-green-300 font-bold text-xl mt-2">SAFE UNLOCKED!</p>
            `;

      this.gameArea.querySelector(".flex.flex-col").appendChild(safeOpen);
    }
  }

  getSolution() {
    return { combination: this.playerInput };
  }

  validateSolution(solution) {
    if (!solution || !solution.combination) return false;

    // Check if the provided combination matches the correct one
    for (let i = 0; i < this.lockPositions; i++) {
      if (solution.combination[i] !== this.combination[i]) {
        return false;
      }
    }

    return true;
  }

  getErrorMessage() {
    return "That's not the correct combination. Try again!";
  }

  cleanup() {
    // Stop any playing audio
    if (this.clickSound) this.clickSound.pause();
    if (this.successSound) this.successSound.pause();
    if (this.errorSound) this.errorSound.pause();

    // Remove event listeners
    this.gameArea.innerHTML = "";
  }
}

export default LockCombinationPuzzle;
