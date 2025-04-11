// encryptionKeyPuzzle.js - Stage 4 Hacker puzzle - Encryption key recovery

class EncryptionKeyPuzzle {
  constructor(containerElement, puzzleData) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.binarySequences = [];
    this.expectedResults = [];
    this.userResults = [];
    this.sequenceLength = 8;
    this.numSequences = 4;
    this.isActive = true;

    // DOM elements
    this.puzzleElement = null;
    this.sequencesContainer = null;
    this.validationMessage = null;
    this.keyDisplay = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Get puzzle data
    const { sequence_length, num_sequences } = this.puzzleData.data;
    this.sequenceLength = sequence_length || 8;
    this.numSequences = num_sequences || 4;

    // Initialize sequences
    this._initializeSequences();

    // Create UI
    this._createPuzzleUI();
  }

  /**
   * Initialize binary sequences and expected results
   */
  _initializeSequences() {
    this.binarySequences = [];
    this.expectedResults = [];
    this.userResults = Array(this.numSequences).fill("");

    // Use seed from puzzle data if available
    const seed = this.puzzleData.data.seed || Math.floor(Math.random() * 1000);
    const rand = this._seededRandom(seed);

    // Generate sequences and expected outputs
    for (let i = 0; i < this.numSequences; i++) {
      // Generate a binary sequence
      let sequence = "";
      for (let j = 0; j < this.sequenceLength; j++) {
        sequence += Math.floor(rand() * 2);
      }
      this.binarySequences.push(sequence);

      // Determine expected output based on operation
      let expectedOutput = "";
      const operation = i % 4; // Different operations for variety

      switch (operation) {
        case 0: // XOR with key
          const key = "10101010"; // Fixed key for XOR
          expectedOutput = this._xorSequences(sequence, key);
          break;
        case 1: // Reverse
          expectedOutput = sequence.split("").reverse().join("");
          break;
        case 2: // Complement (invert bits)
          expectedOutput = sequence
            .split("")
            .map((bit) => (bit === "0" ? "1" : "0"))
            .join("");
          break;
        case 3: // Shift right by 1
          expectedOutput =
            sequence.charAt(sequence.length - 1) +
            sequence.substring(0, sequence.length - 1);
          break;
      }

      this.expectedResults.push(expectedOutput);
    }
  }

  /**
   * Create the puzzle UI
   */
  _createPuzzleUI() {
    // Create main container
    this.puzzleElement = document.createElement("div");
    this.puzzleElement.className =
      "bg-gray-900 border-2 border-blue-500 rounded-lg p-4 w-full max-w-2xl text-gray-100";

    // Add header
    const header = document.createElement("div");
    header.className =
      "flex justify-between items-center border-b border-blue-500 pb-2 mb-4";

    const title = document.createElement("h3");
    title.className = "text-blue-400 font-bold";
    title.textContent = "ENCRYPTION KEY RECOVERY";

    const status = document.createElement("div");
    status.className = "flex items-center";

    const statusDot = document.createElement("div");
    statusDot.className = "w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse";

    const statusText = document.createElement("span");
    statusText.className = "text-xs text-red-400";
    statusText.textContent = "LOCKED";

    status.appendChild(statusDot);
    status.appendChild(statusText);

    header.appendChild(title);
    header.appendChild(status);

    this.puzzleElement.appendChild(header);

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-sm";
    instructions.innerHTML = `
      <p class="text-green-400 mb-2">ENCRYPTION KEY FRAGMENT RECOVERY SYSTEM</p>
      <p class="text-gray-300">Transform each binary sequence according to its encryption rule to retrieve the vault key fragments.</p>
      <p class="text-yellow-400 mt-2">Rules: <span class="text-gray-300">XOR with key, reverse, complement (invert), or rotate shift. Analyze and transform each sequence correctly.</span></p>
    `;

    this.puzzleElement.appendChild(instructions);

    // Create key display
    this.keyDisplay = document.createElement("div");
    this.keyDisplay.className = "mb-4 p-3 bg-gray-800 rounded-lg text-center";
    this.keyDisplay.innerHTML = `
      <div class="text-blue-400 text-sm font-bold mb-2">VAULT KEY STATUS</div>
      <div class="font-mono tracking-wider text-xl">⬤ ⬤ ⬤ ⬤</div>
    `;

    this.puzzleElement.appendChild(this.keyDisplay);

    // Create sequences container
    this.sequencesContainer = document.createElement("div");
    this.sequencesContainer.className = "space-y-4";

    // Add each sequence
    for (let i = 0; i < this.numSequences; i++) {
      const sequenceBox = this._createSequenceBox(i);
      this.sequencesContainer.appendChild(sequenceBox);
    }

    this.puzzleElement.appendChild(this.sequencesContainer);

    // Add validation message area
    this.validationMessage = document.createElement("div");
    this.validationMessage.className =
      "mt-4 text-center text-yellow-400 text-sm hidden";

    this.puzzleElement.appendChild(this.validationMessage);

    // Append to container
    this.containerElement.appendChild(this.puzzleElement);

    // Add CSS for blinking cursor
    const style = document.createElement("style");
    style.textContent = `
      @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0; }
        100% { opacity: 1; }
      }
      .blink-cursor::after {
        content: '|';
        animation: blink 1s infinite;
        color: #63B3ED;
      }
      .bit-cell {
        width: 1.5rem;
        height: 1.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 2px;
        font-family: monospace;
        font-weight: bold;
      }
      .operation-hint {
        opacity: 0;
        transition: opacity 0.3s;
      }
      .sequence-container:hover .operation-hint {
        opacity: 1;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Create a sequence box with input fields
   * @param {number} index - Sequence index
   * @returns {HTMLElement} - Sequence box element
   */
  _createSequenceBox(index) {
    const container = document.createElement("div");
    container.className =
      "sequence-container bg-gray-800 rounded-lg p-3 relative";

    // Add sequence label
    const sequenceLabel = document.createElement("div");
    sequenceLabel.className = "text-blue-400 text-sm mb-2";
    sequenceLabel.textContent = `Sequence #${index + 1}`;
    container.appendChild(sequenceLabel);

    // Create input hint
    const operationHint = document.createElement("div");
    operationHint.className =
      "operation-hint absolute right-3 top-3 text-xs text-gray-400";

    // Set hint based on operation
    const operation = index % 4;
    switch (operation) {
      case 0:
        operationHint.textContent = "Hint: XOR with 10101010";
        break;
      case 1:
        operationHint.textContent = "Hint: Reverse the sequence";
        break;
      case 2:
        operationHint.textContent = "Hint: Invert each bit (complement)";
        break;
      case 3:
        operationHint.textContent = "Hint: Shift right once (rotate)";
        break;
    }

    container.appendChild(operationHint);

    // Create input container
    const content = document.createElement("div");
    content.className = "flex flex-col space-y-3";

    // Create input sequence display
    const inputSequence = document.createElement("div");
    inputSequence.className =
      "flex justify-center items-center bg-gray-900 py-2 rounded";

    // Add each bit
    for (let i = 0; i < this.sequenceLength; i++) {
      const bitCell = document.createElement("div");
      bitCell.className = "bit-cell bg-gray-700 rounded";
      bitCell.textContent = this.binarySequences[index][i];
      inputSequence.appendChild(bitCell);
    }

    content.appendChild(inputSequence);

    // Create output sequence input
    const outputLabel = document.createElement("div");
    outputLabel.className = "text-xs text-gray-400";
    outputLabel.textContent = "Enter transformed sequence:";
    content.appendChild(outputLabel);

    const outputSequence = document.createElement("div");
    outputSequence.className = "flex justify-center items-center";

    // Add output inputs
    for (let i = 0; i < this.sequenceLength; i++) {
      const bitInput = document.createElement("input");
      bitInput.className =
        "bit-cell bg-gray-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500";
      bitInput.type = "text";
      bitInput.maxLength = 1;
      bitInput.dataset.index = i;
      bitInput.dataset.sequence = index;

      // Only allow 0 or 1
      bitInput.addEventListener("input", (e) => {
        const val = e.target.value;
        if (val !== "0" && val !== "1") {
          e.target.value = "";
        } else {
          // Auto-advance to next input
          this._updateUserSequence(index);

          if (i < this.sequenceLength - 1) {
            const nextInput = outputSequence.querySelector(
              `input[data-index="${i + 1}"]`
            );
            if (nextInput) nextInput.focus();
          } else {
            // When sequence is complete, check if it's correct
            this._validateSequence(index);
          }
        }
      });

      // Add keyboard navigation
      bitInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft" && i > 0) {
          const prevInput = outputSequence.querySelector(
            `input[data-index="${i - 1}"]`
          );
          if (prevInput) prevInput.focus();
        } else if (e.key === "ArrowRight" && i < this.sequenceLength - 1) {
          const nextInput = outputSequence.querySelector(
            `input[data-index="${i + 1}"]`
          );
          if (nextInput) nextInput.focus();
        }
      });

      outputSequence.appendChild(bitInput);
    }

    content.appendChild(outputSequence);

    // Add validation indicator
    const validationIndicator = document.createElement("div");
    validationIndicator.className = "text-center text-sm hidden";
    validationIndicator.dataset.validation = index;
    content.appendChild(validationIndicator);

    container.appendChild(content);

    return container;
  }

  /**
   * Update user sequence based on inputs
   * @param {number} sequenceIndex - Index of sequence to update
   */
  _updateUserSequence(sequenceIndex) {
    const inputs = this.sequencesContainer.querySelectorAll(
      `input[data-sequence="${sequenceIndex}"]`
    );
    let sequence = "";

    inputs.forEach((input) => {
      sequence += input.value || " ";
    });

    this.userResults[sequenceIndex] = sequence;

    // Update key display
    this._updateKeyDisplay();
  }

  /**
   * Validate a sequence
   * @param {number} sequenceIndex - Index of sequence to validate
   * @returns {boolean} - Whether the sequence is correct
   */
  _validateSequence(sequenceIndex) {
    const userSequence = this.userResults[sequenceIndex].replace(/\s/g, "");
    const expectedSequence = this.expectedResults[sequenceIndex];

    // Check if complete
    if (userSequence.length !== this.sequenceLength) {
      return false;
    }

    const isCorrect = userSequence === expectedSequence;

    // Update validation indicator
    const indicator = this.sequencesContainer.querySelector(
      `div[data-validation="${sequenceIndex}"]`
    );
    if (indicator) {
      indicator.className = "text-center text-sm";

      if (isCorrect) {
        indicator.textContent = "✓ Correct transformation";
        indicator.classList.add("text-green-400");
      } else {
        indicator.textContent = "✗ Incorrect transformation";
        indicator.classList.add("text-red-400");
      }

      indicator.classList.remove("hidden");
    }

    // Check if all sequences are correct
    this._checkAllSequences();

    return isCorrect;
  }

  /**
   * Check if all sequences are correct
   */
  _checkAllSequences() {
    // Count correct sequences
    let correctCount = 0;

    for (let i = 0; i < this.numSequences; i++) {
      const userSequence = this.userResults[i].replace(/\s/g, "");
      const expectedSequence = this.expectedResults[i];

      if (userSequence === expectedSequence) {
        correctCount++;
      }
    }

    // Update key display
    this._updateKeyDisplay();

    // Check if all are correct
    if (correctCount === this.numSequences) {
      this._puzzleComplete();
    } else {
      // Show validation message with progress
      this.validationMessage.textContent = `${correctCount} of ${this.numSequences} key fragments recovered`;
      this.validationMessage.className =
        "mt-4 text-center text-yellow-400 text-sm";
    }
  }

  /**
   * Update key display based on correct sequences
   */
  _updateKeyDisplay() {
    const keyFragment = this.keyDisplay.querySelector(".font-mono");
    if (!keyFragment) return;

    let keyHTML = "";

    for (let i = 0; i < this.numSequences; i++) {
      const userSequence = this.userResults[i].replace(/\s/g, "");
      const expectedSequence = this.expectedResults[i];

      if (userSequence === expectedSequence) {
        // This segment is correct
        keyHTML += `<span class="text-green-400">⬤</span> `;
      } else if (userSequence.length === this.sequenceLength) {
        // This segment is filled but incorrect
        keyHTML += `<span class="text-red-400">⬤</span> `;
      } else {
        // This segment is incomplete
        keyHTML += `<span class="text-gray-600">⬤</span> `;
      }
    }

    keyFragment.innerHTML = keyHTML.trim();
  }

  /**
   * Handle puzzle completion
   */
  _puzzleComplete() {
    // Show success message
    this.validationMessage.textContent =
      "All key fragments successfully recovered!";
    this.validationMessage.className =
      "mt-4 text-center text-green-400 text-sm";

    // Update status
    const statusDot = this.puzzleElement.querySelector(".rounded-full");
    const statusText = this.puzzleElement.querySelector("span");

    if (statusDot)
      statusDot.className = "w-2 h-2 rounded-full bg-green-500 mr-2";
    if (statusText) {
      statusText.className = "text-xs text-green-400";
      statusText.textContent = "UNLOCKED";
    }

    // Disable inputs
    const inputs = this.puzzleElement.querySelectorAll("input");
    inputs.forEach((input) => {
      input.disabled = true;
      input.classList.add("opacity-70");
    });

    // Display vault key
    const keyFragment = this.keyDisplay.querySelector(".font-mono");
    if (keyFragment) {
      const recoveredKey = this.expectedResults.join("");

      // Convert binary to hex
      let hexKey = "";
      for (let i = 0; i < recoveredKey.length; i += 4) {
        const chunk = recoveredKey.substr(i, 4);
        const hexDigit = parseInt(chunk, 2).toString(16).toUpperCase();
        hexKey += hexDigit;
      }

      // Update key display
      setTimeout(() => {
        keyFragment.innerHTML = `<span class="text-green-400">${hexKey}</span>`;
        keyFragment.className =
          "font-mono tracking-wider text-xl animate-pulse";
      }, 1000);
    }
  }

  /**
   * XOR two binary sequences
   * @param {string} seq1 - First sequence
   * @param {string} seq2 - Second sequence
   * @returns {string} - Result of XOR operation
   */
  _xorSequences(seq1, seq2) {
    let result = "";
    for (let i = 0; i < seq1.length; i++) {
      result += seq1[i] === seq2[i % seq2.length] ? "0" : "1";
    }
    return result;
  }

  /**
   * Create a seeded random number generator
   * @param {number} seed - Random seed
   * @returns {Function} - Seeded random function
   */
  _seededRandom(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Get the current solution
   * @returns {Array} - Array of user sequences
   */
  getSolution() {
    return this.userResults;
  }

  /**
   * Validate the solution
   * @returns {boolean} - Whether all sequences are correct
   */
  validateSolution() {
    for (let i = 0; i < this.numSequences; i++) {
      const userSequence = this.userResults[i].replace(/\s/g, "");

      // Check if all sequences are complete and correct
      if (
        userSequence.length !== this.sequenceLength ||
        userSequence !== this.expectedResults[i]
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get error message
   * @returns {string} - Error message
   */
  getErrorMessage() {
    // Count correct and complete sequences
    let correctCount = 0;
    let incompleteCount = 0;

    for (let i = 0; i < this.numSequences; i++) {
      const userSequence = this.userResults[i].replace(/\s/g, "");
      const expectedSequence = this.expectedResults[i];

      if (userSequence.length !== this.sequenceLength) {
        incompleteCount++;
      } else if (userSequence !== expectedSequence) {
        // It's complete but incorrect
      } else {
        correctCount++;
      }
    }

    if (incompleteCount > 0) {
      return `Please complete all ${incompleteCount} remaining sequence${
        incompleteCount > 1 ? "s" : ""
      }.`;
    } else {
      const incorrect = this.numSequences - correctCount;
      return `${incorrect} sequence${
        incorrect > 1 ? "s are" : " is"
      } incorrect. Please check your transformations.`;
    }
  }

  /**
   * Disable puzzle
   */
  disable() {
    this.isActive = false;
    if (this.puzzleElement) {
      this.puzzleElement.classList.add("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Enable puzzle
   */
  enable() {
    this.isActive = true;
    if (this.puzzleElement) {
      this.puzzleElement.classList.remove("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Nothing specific to clean up
    this.isActive = false;
  }
}

export default EncryptionKeyPuzzle;
