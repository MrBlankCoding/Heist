// Explosive Sequence Puzzle - Stage 4 puzzle for the Demolitions role

class ExplosiveSequencePuzzle {
  constructor(container, puzzleData, callbacks) {
    this.container = container;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isCompleted = false;

    // Puzzle-specific properties
    this.gridSize = 4; // 4x4 grid
    this.explosiveCharges = [];
    this.playerSequence = [];
    this.correctSequence = [];
    this.detonating = false;

    // DOM elements
    this.puzzleContainer = null;
    this.gridContainer = null;
    this.sequenceDisplay = null;
  }

  initialize() {
    // Create the main puzzle container
    this.puzzleContainer = document.createElement("div");
    this.puzzleContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-lg";

    // Add title
    const title = document.createElement("h4");
    title.className = "text-center text-red-500 mb-4";
    title.textContent = "Explosive Breach Sequence";
    this.puzzleContainer.appendChild(title);

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className =
      "mb-4 p-3 bg-gray-800 rounded border border-red-600 text-sm";

    instructions.innerHTML = `
      <div class="text-sm text-gray-300 mb-2">Breach Manual - Section 4.1:</div>
      <div class="text-yellow-400">
        <p>Set the explosive charges in the correct sequence.</p>
        <p>Charges must detonate in order from lowest to highest power.</p>
        <p>Follow the numeric patterns to determine the correct sequence.</p>
        <p>An incorrect sequence will result in mission failure.</p>
      </div>
    `;
    this.puzzleContainer.appendChild(instructions);

    // Create the explosive grid
    this.gridContainer = document.createElement("div");
    this.gridContainer.className =
      "grid grid-cols-4 gap-3 mb-6 bg-black p-4 rounded-lg";

    // Generate the explosive charges pattern
    this.generateExplosivePattern();

    // Create the explosive charges grid
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;

      const chargeData = this.explosiveCharges.find((c) => c.position === i);

      const cell = document.createElement("div");
      cell.className =
        "explosive-charge w-16 h-16 bg-gray-800 rounded-lg flex flex-col items-center justify-center cursor-pointer relative transition-all";
      cell.dataset.position = i;
      cell.dataset.value = chargeData ? chargeData.value : 0;

      // Add visual appearance for charge
      const chargeElement = document.createElement("div");
      chargeElement.className =
        "w-12 h-12 rounded-full flex items-center justify-center";

      if (chargeData) {
        // This is an active charge
        chargeElement.style.backgroundColor = this.getChargeColor(
          chargeData.value
        );
        chargeElement.style.border = "2px solid #f59e0b";
        chargeElement.innerHTML = `<span class="text-white font-bold text-xl">${chargeData.value}</span>`;

        // Add clicking behavior
        cell.addEventListener("click", () =>
          this.selectCharge(cell, chargeData)
        );
      } else {
        // Empty cell
        chargeElement.style.backgroundColor = "#374151";
      }

      cell.appendChild(chargeElement);
      this.gridContainer.appendChild(cell);
    }

    this.puzzleContainer.appendChild(this.gridContainer);

    // Add sequence display
    const sequenceSection = document.createElement("div");
    sequenceSection.className = "mb-4";

    const sequenceLabel = document.createElement("div");
    sequenceLabel.className = "text-white text-sm mb-2";
    sequenceLabel.textContent = "Current Detonation Sequence:";
    sequenceSection.appendChild(sequenceLabel);

    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className =
      "flex items-center justify-center gap-2 h-16 bg-gray-800 rounded p-2";
    this.updateSequenceDisplay();
    sequenceSection.appendChild(this.sequenceDisplay);

    this.puzzleContainer.appendChild(sequenceSection);

    // Add control buttons
    const controlButtons = document.createElement("div");
    controlButtons.className = "flex justify-center gap-4";

    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors";
    resetButton.textContent = "Reset Sequence";
    resetButton.addEventListener("click", () => this.resetSequence());
    controlButtons.appendChild(resetButton);

    // Detonate button
    const detonateButton = document.createElement("button");
    detonateButton.className =
      "px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors font-bold";
    detonateButton.textContent = "DETONATE";
    detonateButton.addEventListener("click", () => this.detonateSequence());
    controlButtons.appendChild(detonateButton);

    this.puzzleContainer.appendChild(controlButtons);

    // Add hint section based on difficulty
    if (this.puzzleData.difficulty <= 2) {
      const hintSection = document.createElement("div");
      hintSection.className =
        "mt-4 p-2 bg-gray-800 rounded border border-yellow-600";

      const hintTitle = document.createElement("div");
      hintTitle.className = "text-xs text-yellow-400 mb-1";
      hintTitle.textContent = "HINT:";
      hintSection.appendChild(hintTitle);

      const hintContent = document.createElement("div");
      hintContent.className = "text-xs text-white";

      // Provide a hint based on the pattern
      const patternHint = this.getPatternHint();
      hintContent.textContent = patternHint;

      hintSection.appendChild(hintContent);
      this.puzzleContainer.appendChild(hintSection);
    }

    // Add to main container
    this.container.appendChild(this.puzzleContainer);

    // Start countdown timer via callback
    this.callbacks.startCountdown(this.onTimeUp.bind(this));
  }

  generateExplosivePattern() {
    // Clear existing data
    this.explosiveCharges = [];
    this.correctSequence = [];

    // Determine complexity based on difficulty
    const numCharges = 6 + this.puzzleData.difficulty;

    if (this.puzzleData.difficulty <= 1) {
      // Easy - simple sequential pattern
      this.generateSimpleSequence(numCharges);
    } else if (this.puzzleData.difficulty === 2) {
      // Medium - numeric pattern with mathematical rule
      this.generatePatternSequence(numCharges);
    } else {
      // Hard - complex pattern with multiple rules
      this.generateComplexSequence(numCharges);
    }
  }

  generateSimpleSequence(numCharges) {
    // Simple sequence: just count from 1 to numCharges
    const positions = this.generateRandomPositions(numCharges);

    for (let i = 0; i < numCharges; i++) {
      const value = i + 1;
      this.explosiveCharges.push({
        position: positions[i],
        value: value,
      });

      // The correct sequence is just in ascending order
      this.correctSequence.push(value);
    }

    // Sort the correct sequence
    this.correctSequence.sort((a, b) => a - b);
  }

  generatePatternSequence(numCharges) {
    // Pattern sequence: use a simple mathematical pattern
    // Example: Fibonacci or powers of 2
    const pattern = Math.random() < 0.5 ? "fibonacci" : "powers";
    const positions = this.generateRandomPositions(numCharges);

    let values = [];
    if (pattern === "fibonacci") {
      // Fibonacci sequence
      values = [1, 2, 3, 5, 8, 13, 21, 34, 55];
    } else {
      // Powers of 2
      values = [1, 2, 4, 8, 16, 32, 64, 128, 256];
    }

    // Use only as many values as needed
    values = values.slice(0, numCharges);

    for (let i = 0; i < numCharges; i++) {
      this.explosiveCharges.push({
        position: positions[i],
        value: values[i],
      });

      // The correct sequence is just in ascending order
      this.correctSequence.push(values[i]);
    }

    // Sort the correct sequence
    this.correctSequence.sort((a, b) => a - b);
  }

  generateComplexSequence(numCharges) {
    // Complex sequence: use a combination of patterns
    // That require player to understand the rule
    const positions = this.generateRandomPositions(numCharges);

    // Create values with a hidden relationship
    // Example: values divisible by 3 go first, then even, then odd
    let values = [];
    let order = [];

    // Generate values that follow a complex rule
    for (let i = 0; i < numCharges; i++) {
      // Generate a number between 10 and 99
      const value = Math.floor(Math.random() * 90) + 10;
      values.push(value);

      // Determine detonation order based on the digit sum
      const digitSum = Math.floor(value / 10) + (value % 10);
      order.push({ value, digitSum });
    }

    // Sort by the rule (digit sum)
    order.sort((a, b) => a.digitSum - b.digitSum);

    // Create the explosive charges
    for (let i = 0; i < numCharges; i++) {
      this.explosiveCharges.push({
        position: positions[i],
        value: values[i],
      });

      // The correct sequence follows our rule
      this.correctSequence.push(order[i].value);
    }
  }

  generateRandomPositions(count) {
    // Generate random positions on the grid
    const positions = [];
    const totalCells = this.gridSize * this.gridSize;

    while (positions.length < count) {
      const position = Math.floor(Math.random() * totalCells);
      if (!positions.includes(position)) {
        positions.push(position);
      }
    }

    return positions;
  }

  selectCharge(cell, chargeData) {
    // Ignore if already detonating
    if (this.detonating) return;

    // Check if charge is already in sequence
    if (this.playerSequence.includes(chargeData.value)) {
      // Remove it from sequence
      this.playerSequence = this.playerSequence.filter(
        (v) => v !== chargeData.value
      );
      cell.classList.remove("ring-2", "ring-yellow-400");
    } else {
      // Add to sequence
      this.playerSequence.push(chargeData.value);
      cell.classList.add("ring-2", "ring-yellow-400");
    }

    // Update the display
    this.updateSequenceDisplay();
  }

  updateSequenceDisplay() {
    // Clear existing content
    this.sequenceDisplay.innerHTML = "";

    if (this.playerSequence.length === 0) {
      // No charges selected yet
      const placeholder = document.createElement("div");
      placeholder.className = "text-gray-500 text-sm";
      placeholder.textContent =
        "Select charges to create a detonation sequence...";
      this.sequenceDisplay.appendChild(placeholder);
      return;
    }

    // Add each charge to the sequence display
    this.playerSequence.forEach((value, index) => {
      const sequenceItem = document.createElement("div");
      sequenceItem.className =
        "w-10 h-10 rounded-full flex items-center justify-center";
      sequenceItem.style.backgroundColor = this.getChargeColor(value);
      sequenceItem.style.border = "2px solid #f59e0b";
      sequenceItem.innerHTML = `<span class="text-white font-bold">${value}</span>`;

      // Add order indicator
      const orderIndicator = document.createElement("div");
      orderIndicator.className =
        "absolute -top-2 -right-2 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white";
      orderIndicator.textContent = index + 1;
      sequenceItem.style.position = "relative";
      sequenceItem.appendChild(orderIndicator);

      this.sequenceDisplay.appendChild(sequenceItem);
    });
  }

  resetSequence() {
    // Clear the player sequence
    this.playerSequence = [];

    // Reset the highlighting on all charges
    const charges = document.querySelectorAll(".explosive-charge");
    charges.forEach((charge) => {
      charge.classList.remove("ring-2", "ring-yellow-400");
    });

    // Update the display
    this.updateSequenceDisplay();

    this.callbacks.showMessage("Sequence reset", "info");
  }

  detonateSequence() {
    // Check if we have the right number of charges
    if (this.playerSequence.length !== this.correctSequence.length) {
      this.callbacks.showMessage(
        `You need exactly ${this.correctSequence.length} charges!`,
        "error"
      );
      return;
    }

    // Start the detonation animation
    this.detonating = true;
    this.callbacks.showMessage("Detonation sequence initiated...", "warning");

    // Disable interaction during animation
    this.gridContainer.classList.add("pointer-events-none");

    // Run the detonation sequence
    this.runDetonationSequence().then((success) => {
      if (success) {
        // Sequence correct!
        this.isCompleted = true;
        this.callbacks.showSuccess();
      } else {
        // Sequence incorrect
        this.detonating = false;
        this.gridContainer.classList.remove("pointer-events-none");
        this.callbacks.showMessage(
          "Detonation failed! Incorrect sequence.",
          "error"
        );
      }
    });
  }

  runDetonationSequence() {
    return new Promise((resolve) => {
      // Check if the sequence is correct
      const isCorrect = this.checkSequence();

      // Animate the detonation sequence
      let index = 0;
      const detonateNext = () => {
        if (index >= this.playerSequence.length) {
          // We've gone through all charges
          setTimeout(() => {
            resolve(isCorrect);
          }, 500);
          return;
        }

        const value = this.playerSequence[index];
        const charge = this.explosiveCharges.find((c) => c.value === value);
        const cell = document.querySelector(
          `.explosive-charge[data-position="${charge.position}"]`
        );

        // Detonate animation
        cell.classList.add("detonating");

        // Add explosion effect
        const explosion = document.createElement("div");
        explosion.className =
          "absolute inset-0 rounded-lg flex items-center justify-center explosion-effect";
        explosion.innerHTML = `<span class="animate-ping text-2xl">💥</span>`;
        cell.appendChild(explosion);

        // Check if this is in the right sequence
        const isCorrectPosition = value === this.correctSequence[index];

        if (!isCorrectPosition && isCorrect) {
          // Stop the sequence if incorrect
          setTimeout(() => {
            resolve(false);
          }, 500);
          return;
        }

        // Move to next charge after delay
        setTimeout(() => {
          index++;
          detonateNext();
        }, 800);
      };

      // Start the sequence
      detonateNext();
    });
  }

  checkSequence() {
    // Compare player sequence with correct sequence
    if (this.playerSequence.length !== this.correctSequence.length) {
      return false;
    }

    // Check each position
    for (let i = 0; i < this.playerSequence.length; i++) {
      if (this.playerSequence[i] !== this.correctSequence[i]) {
        return false;
      }
    }

    return true;
  }

  getChargeColor(value) {
    // Color based on the value
    if (value < 10) {
      return "#3b82f6"; // Blue for small values
    } else if (value < 20) {
      return "#8b5cf6"; // Purple for medium values
    } else if (value < 50) {
      return "#ef4444"; // Red for large values
    } else {
      return "#f97316"; // Orange for very large values
    }
  }

  getPatternHint() {
    if (this.puzzleData.difficulty <= 1) {
      return "Arrange charges in ascending order by their number value.";
    } else if (this.puzzleData.difficulty === 2) {
      // Check if it's a Fibonacci sequence
      if (this.correctSequence[0] === 1 && this.correctSequence[1] === 2) {
        return "The sequence follows the Fibonacci pattern where each number is the sum of the two preceding ones.";
      } else {
        return "The sequence follows powers of 2 - each number is twice the previous one.";
      }
    } else {
      return "Look for a pattern in the digits. Try adding the digits together for each number.";
    }
  }

  onTimeUp() {
    if (this.isCompleted) return;

    // Show failure message
    this.callbacks.showMessage("Time's up! Breach failed.", "error");

    // Disable further interaction
    this.puzzleContainer.classList.add("opacity-75", "pointer-events-none");
    this.callbacks.disableSubmit();
  }

  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Special effects for events
    if (eventType === "security_patrol") {
      // Security patrol - briefly hide all numbers
      const chargeValues = document.querySelectorAll(".explosive-charge span");

      // Hide all values
      chargeValues.forEach((span) => {
        span.dataset.originalText = span.textContent;
        span.textContent = "?";
      });

      // Show values again after duration
      setTimeout(() => {
        chargeValues.forEach((span) => {
          if (span.dataset.originalText) {
            span.textContent = span.dataset.originalText;
            delete span.dataset.originalText;
          }
        });
      }, duration * 1000);
    }
  }

  cleanup() {
    // Clean up event listeners
    if (this.puzzleContainer) {
      this.puzzleContainer.remove();
    }

    this.puzzleContainer = null;
    this.gridContainer = null;
    this.sequenceDisplay = null;
  }

  getSubmissionData() {
    return {
      playerSequence: this.playerSequence,
      correctSequence: this.correctSequence,
      success: this.isCompleted,
    };
  }
}

// Add CSS to handle animations
const style = document.createElement("style");
style.textContent = `
  .detonating {
    animation: pulse 0.8s ease-in-out;
  }
  
  .explosion-effect {
    z-index: 10;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); background-color: #f97316; }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

export default ExplosiveSequencePuzzle;
