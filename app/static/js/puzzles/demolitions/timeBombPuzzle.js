// Time Bomb Puzzle - Disarm puzzle for the Demolitions role

class TimeBombPuzzle {
  constructor(container, puzzleData, callbacks) {
    this.container = container;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isCompleted = false;

    // Puzzle-specific properties
    this.sequence = [];
    this.playerSequence = [];
    this.sequenceLength = 4 + Math.min(puzzleData.difficulty || 1, 3);
    this.buttons = [];
    this.isWaiting = false;

    // DOM elements
    this.bombContainer = null;
    this.sequenceDisplay = null;
  }

  initialize() {
    // Generate puzzle sequence
    this.generateSequence();

    // Create bomb container
    this.bombContainer = document.createElement("div");
    this.bombContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-md flex flex-col items-center";

    // Add bomb display screen
    const displayScreen = document.createElement("div");
    displayScreen.className =
      "w-full bg-black border-2 border-red-600 rounded p-3 mb-4 flex flex-col items-center";

    // Add digital display with blinking cursor
    const digitalDisplay = document.createElement("div");
    digitalDisplay.className =
      "font-mono text-green-500 text-lg mb-2 flex items-center justify-center w-full";
    digitalDisplay.innerHTML = `DISARM CODE: <span class="ml-2 animate-pulse">|</span>`;
    displayScreen.appendChild(digitalDisplay);

    // Add sequence display
    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className =
      "font-mono text-red-500 text-sm flex items-center justify-center";
    this.updateSequenceDisplay();
    displayScreen.appendChild(this.sequenceDisplay);

    this.bombContainer.appendChild(displayScreen);

    // Add manual instructions
    const instructions = document.createElement("div");
    instructions.className =
      "mb-4 p-3 bg-gray-800 rounded border border-red-600 text-sm";

    instructions.innerHTML = `
      <div class="text-sm text-gray-300 mb-2">Bomb Disarm Manual - Section 2.3:</div>
      <div class="text-yellow-400">
        <p>Follow the correct wire sequence to disarm the bomb.</p>
        <p>A certain pattern must be followed.</p>
        <p>The correct colors will start blinking green.</p>
        <p>An incorrect sequence will accelerate the timer!</p>
      </div>
    `;
    this.bombContainer.appendChild(instructions);

    // Create button panel
    const buttonPanel = document.createElement("div");
    buttonPanel.className = "grid grid-cols-2 gap-3 w-full";

    const colors = ["red", "blue", "green", "yellow"];
    const colorNames = {
      red: "RED",
      blue: "BLUE",
      green: "GREEN",
      yellow: "YELLOW",
    };

    colors.forEach((color, index) => {
      const button = document.createElement("button");
      button.className = `bomb-button h-16 rounded-md transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center font-bold`;
      button.style.backgroundColor = this.getButtonColor(color);
      button.style.color =
        color === "yellow" || color === "green" ? "#000" : "#fff";
      button.textContent = colorNames[color];
      button.dataset.color = color;

      button.addEventListener("click", () => {
        if (this.isWaiting) return;
        this.pressButton(color);
      });

      this.buttons.push(button);
      buttonPanel.appendChild(button);
    });

    this.bombContainer.appendChild(buttonPanel);

    // Add hint screen that shows part of the sequence
    const hintSection = document.createElement("div");
    hintSection.className =
      "mt-4 p-2 bg-gray-800 rounded border border-yellow-600 w-full";

    const hintTitle = document.createElement("div");
    hintTitle.className = "text-xs text-yellow-400 mb-1";
    hintTitle.textContent = "HINT - First 2 steps:";
    hintSection.appendChild(hintTitle);

    const hintContent = document.createElement("div");
    hintContent.className = "flex items-center justify-center space-x-2";

    // Show hints for the first two steps
    for (let i = 0; i < Math.min(2, this.sequence.length); i++) {
      const colorHint = document.createElement("div");
      colorHint.className = "w-6 h-6 rounded-full";
      colorHint.style.backgroundColor = this.getButtonColor(this.sequence[i]);
      hintContent.appendChild(colorHint);
    }

    // Add question marks for remaining steps
    for (let i = 2; i < this.sequenceLength; i++) {
      const unknownHint = document.createElement("div");
      unknownHint.className =
        "w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs";
      unknownHint.textContent = "?";
      hintContent.appendChild(unknownHint);
    }

    hintSection.appendChild(hintContent);
    this.bombContainer.appendChild(hintSection);

    // Add to main container
    this.container.appendChild(this.bombContainer);

    // Start countdown timer via callback
    this.callbacks.startCountdown(this.onTimeUp.bind(this));
  }

  generateSequence() {
    const colors = ["red", "blue", "green", "yellow"];
    this.sequence = [];

    // Generate the sequence based on difficulty
    // The higher the difficulty, the more complex the pattern
    if (this.puzzleData.difficulty >= 3) {
      // Hard pattern - alternating pairs
      for (let i = 0; i < this.sequenceLength; i++) {
        if (i % 2 === 0) {
          // On even positions, use red or blue
          this.sequence.push(Math.random() < 0.5 ? "red" : "blue");
        } else {
          // On odd positions, use green or yellow
          this.sequence.push(Math.random() < 0.5 ? "green" : "yellow");
        }
      }
    } else {
      // Simple random sequence
      for (let i = 0; i < this.sequenceLength; i++) {
        const randomIndex = Math.floor(Math.random() * colors.length);
        this.sequence.push(colors[randomIndex]);
      }
    }
  }

  pressButton(color) {
    // Add to player sequence
    this.playerSequence.push(color);

    // Flash the button
    const button = this.buttons.find((btn) => btn.dataset.color === color);
    button.classList.add("opacity-50");
    setTimeout(() => {
      button.classList.remove("opacity-50");
    }, 200);

    // Update sequence display
    this.updateSequenceDisplay();

    // Check if sequence is correct so far
    const index = this.playerSequence.length - 1;
    if (this.playerSequence[index] !== this.sequence[index]) {
      // Wrong button! Show error and penalize
      this.callbacks.showMessage("Wrong sequence! Timer reduced!", "error");

      // Penalize by reducing time - make the bomb tick faster
      this.callbacks.reduceTime(5);

      // Reset player sequence
      this.playerSequence = [];
      this.updateSequenceDisplay();

      // Shake the bomb
      this.bombContainer.classList.add("animate-shake");
      setTimeout(() => {
        this.bombContainer.classList.remove("animate-shake");
      }, 500);

      return;
    }

    // Check if complete
    if (this.playerSequence.length === this.sequence.length) {
      this.isCompleted = true;

      // Victory animation
      this.playSuccessAnimation().then(() => {
        this.callbacks.showSuccess();
      });
    }
  }

  updateSequenceDisplay() {
    // Show player's current sequence as dots
    let display = "";

    for (let i = 0; i < this.sequenceLength; i++) {
      if (i < this.playerSequence.length) {
        const color = this.playerSequence[i];
        display += `<span class="inline-block w-4 h-4 rounded-full mx-1" style="background-color: ${this.getButtonColor(
          color
        )};"></span>`;
      } else {
        display += `<span class="inline-block w-4 h-4 rounded-full mx-1 bg-gray-700"></span>`;
      }
    }

    this.sequenceDisplay.innerHTML = display;
  }

  playSuccessAnimation() {
    return new Promise((resolve) => {
      this.isWaiting = true;

      // Disable buttons during animation
      this.buttons.forEach((button) => {
        button.disabled = true;
      });

      // Animate each button in sequence
      let index = 0;
      const animateNextButton = () => {
        if (index >= this.sequence.length) {
          this.isWaiting = false;
          resolve();
          return;
        }

        const color = this.sequence[index];
        const button = this.buttons.find((btn) => btn.dataset.color === color);

        // Flash green to indicate success
        button.style.backgroundColor = "#4ade80"; // Green
        button.style.transform = "scale(1.1)";
        button.style.boxShadow = "0 0 15px #4ade80";

        setTimeout(() => {
          // Reset button style
          button.style.backgroundColor = this.getButtonColor(color);
          button.style.transform = "";
          button.style.boxShadow = "";

          index++;
          animateNextButton();
        }, 300);
      };

      animateNextButton();
    });
  }

  onTimeUp() {
    if (this.isCompleted) return;

    // Show failure message
    this.callbacks.showMessage("BOOM! The bomb exploded!", "error");

    // Disable further interaction
    this.bombContainer.classList.add("opacity-75", "pointer-events-none");
    this.callbacks.disableSubmit();

    // Add explosion effect
    this.bombContainer.style.transform = "scale(1.5)";
    this.bombContainer.style.opacity = "0";
    this.bombContainer.style.transition = "all 0.5s";
  }

  getButtonColor(color) {
    const colorMap = {
      red: "#ef4444",
      blue: "#3b82f6",
      green: "#22c55e",
      yellow: "#eab308",
    };

    return colorMap[color] || "#6b7280";
  }

  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Special effects for events
    if (eventType === "system_check") {
      // System check might reveal one more hint
      const randomIndex =
        Math.floor(Math.random() * (this.sequence.length - 2)) + 2;

      // Create a temporary hint
      const hintBox = document.createElement("div");
      hintBox.className =
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black border-2 border-yellow-400 p-4 rounded z-50 flex flex-col items-center";

      const hintTitle = document.createElement("div");
      hintTitle.className = "text-yellow-400 mb-2";
      hintTitle.textContent = "SYSTEM GLITCH: REVEALED SEQUENCE STEP";
      hintBox.appendChild(hintTitle);

      const hintContent = document.createElement("div");
      hintContent.className = "flex items-center space-x-2";

      const positionIndicator = document.createElement("div");
      positionIndicator.className = "text-white";
      positionIndicator.textContent = `Position ${randomIndex + 1}:`;
      hintContent.appendChild(positionIndicator);

      const colorHint = document.createElement("div");
      colorHint.className = "w-8 h-8 rounded-full";
      colorHint.style.backgroundColor = this.getButtonColor(
        this.sequence[randomIndex]
      );
      hintContent.appendChild(colorHint);

      hintBox.appendChild(hintContent);
      document.body.appendChild(hintBox);

      // Remove after duration
      setTimeout(() => {
        hintBox.remove();
      }, duration * 1000);
    }
  }

  reset() {
    // Reset puzzle state
    this.playerSequence = [];
    this.isCompleted = false;
    this.updateSequenceDisplay();

    // Re-enable buttons
    this.buttons.forEach((button) => {
      button.disabled = false;
      button.style.backgroundColor = this.getButtonColor(button.dataset.color);
      button.style.transform = "";
      button.style.boxShadow = "";
    });
  }

  cleanup() {
    // Clean up event listeners
    if (this.buttons) {
      this.buttons.forEach((button) => {
        // Clone and replace to remove event listeners
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
          button.parentNode.replaceChild(newButton, button);
        }
      });
    }

    if (this.bombContainer) {
      this.bombContainer.remove();
    }

    this.buttons = [];
    this.bombContainer = null;
    this.sequenceDisplay = null;
  }

  getSubmissionData() {
    return {
      sequence: this.sequence,
      playerSequence: this.playerSequence,
    };
  }
}

export default TimeBombPuzzle;
