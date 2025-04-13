// Encryption Key Puzzle - Level 4
// A puzzle where players need to reconstruct an encryption key from fragments

class EncryptionKeyPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle difficulty settings
    this.difficulty = puzzleData.difficulty || 4;

    // Puzzle state
    this.keyLength = 4 + this.difficulty; // Key length increases with difficulty
    this.fragments = [];
    this.encryptionKey = [];
    this.selectedFragment = null;
    this.currentSolution = Array(this.keyLength).fill(null);
    this.isComplete = false;

    // DOM elements
    this.fragmentsContainer = null;
    this.solutionContainer = null;
    this.fragmentElements = [];
    this.solutionElements = [];
    this.terminalOutput = null;

    // Timer for decryption animation
    this.decryptionTimer = null;
  }

  initialize() {
    this._createGameArea();
    this._generateKey();
    this._generateFragments();
    this._renderFragments();
    this._renderSolution();
    this._attachEventListeners();
    this._showInstructions();
  }

  _createGameArea() {
    // Create main container
    const gameContainer = document.createElement("div");
    gameContainer.className = "bg-gray-900 p-4 rounded-lg";

    // Title and status
    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-4";

    const title = document.createElement("div");
    title.className = "text-cyan-400 text-lg font-mono";
    title.textContent = "ENCRYPTION KEY RECOVERY";
    header.appendChild(title);

    const systemStatus = document.createElement("div");
    systemStatus.className =
      "bg-gray-800 text-red-400 px-3 py-1 rounded font-mono text-sm";
    systemStatus.textContent = "SYSTEM LOCKED";
    header.appendChild(systemStatus);

    gameContainer.appendChild(header);

    // Terminal output
    this.terminalOutput = document.createElement("div");
    this.terminalOutput.className =
      "bg-black p-3 rounded h-32 mb-4 text-green-300 font-mono text-sm overflow-y-auto whitespace-pre-line";
    gameContainer.appendChild(this.terminalOutput);

    // Solution area (key slots)
    const solutionTitle = document.createElement("div");
    solutionTitle.className = "text-cyan-300 mb-2 font-mono text-sm";
    solutionTitle.textContent = "ENCRYPTION KEY";
    gameContainer.appendChild(solutionTitle);

    this.solutionContainer = document.createElement("div");
    this.solutionContainer.className =
      "flex justify-center gap-2 mb-6 flex-wrap";
    gameContainer.appendChild(this.solutionContainer);

    // Fragments area
    const fragmentsTitle = document.createElement("div");
    fragmentsTitle.className = "text-cyan-300 mb-2 font-mono text-sm";
    fragmentsTitle.textContent = "KEY FRAGMENTS";
    gameContainer.appendChild(fragmentsTitle);

    this.fragmentsContainer = document.createElement("div");
    this.fragmentsContainer.className = "grid grid-cols-3 sm:grid-cols-4 gap-2";
    gameContainer.appendChild(this.fragmentsContainer);

    // Decoder device
    const decoder = document.createElement("div");
    decoder.className =
      "mt-6 bg-gray-800 p-3 rounded-lg border border-cyan-700";

    const decoderTitle = document.createElement("div");
    decoderTitle.className = "text-cyan-400 text-center mb-2 font-mono text-sm";
    decoderTitle.textContent = "DECRYPTION UTILITY";
    decoder.appendChild(decoderTitle);

    const decoderButtonContainer = document.createElement("div");
    decoderButtonContainer.className = "flex justify-center gap-3";

    const verifyButton = document.createElement("button");
    verifyButton.className =
      "bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm";
    verifyButton.textContent = "Verify Key";
    verifyButton.dataset.action = "verify";
    decoderButtonContainer.appendChild(verifyButton);

    const resetButton = document.createElement("button");
    resetButton.className =
      "bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm";
    resetButton.textContent = "Reset";
    resetButton.dataset.action = "reset";
    decoderButtonContainer.appendChild(resetButton);

    decoder.appendChild(decoderButtonContainer);
    gameContainer.appendChild(decoder);

    this.containerElement.appendChild(gameContainer);

    // Log initial terminal messages
    this._appendToTerminal("> ENCRYPTION KEY INTEGRITY FAILURE");
    this._appendToTerminal("> SYSTEM SECURITY COMPROMISED");
    this._appendToTerminal("> ATTEMPTING KEY RECOVERY...");
    this._appendToTerminal(
      "\nKey fragments identified. Reassemble in correct order."
    );
  }

  _generateKey() {
    // Base key structure: a mix of hex values, symbols, and characters
    const keyCharsets = [
      // Hex values
      () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
          .toUpperCase(),
      // Symbols
      () => {
        const symbols = "#$%&*@!?+";
        return symbols[Math.floor(Math.random() * symbols.length)];
      },
      // Letters
      () => {
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed similar looking characters
        return letters[Math.floor(Math.random() * letters.length)];
      },
    ];

    // Generate key with mix of different charsets
    this.encryptionKey = [];
    for (let i = 0; i < this.keyLength; i++) {
      // Choose a charset based on position
      const charsetIndex = i % keyCharsets.length;
      const keyPart = keyCharsets[charsetIndex]();
      this.encryptionKey.push(keyPart);
    }
  }

  _generateFragments() {
    this.fragments = [];

    // Add the correct key fragments
    for (let i = 0; i < this.keyLength; i++) {
      this.fragments.push({
        id: i,
        value: this.encryptionKey[i],
        correctPosition: i,
        selected: false,
      });
    }

    // Add decoy fragments (more with higher difficulty)
    const decoyCount = Math.min(8, 2 + this.difficulty);

    for (let i = 0; i < decoyCount; i++) {
      // Generate a random fragment
      let value;

      // 50% chance to use a slightly modified real fragment to make it trickier
      if (Math.random() < 0.5) {
        const realKeyIndex = Math.floor(Math.random() * this.keyLength);
        const realValue = this.encryptionKey[realKeyIndex];

        // Modify it slightly
        if (/^[0-9A-F]{2}$/.test(realValue)) {
          // If it's a hex value, change one digit
          const pos = Math.floor(Math.random() * 2);
          const chars = "0123456789ABCDEF";
          let newChar;
          do {
            newChar = chars[Math.floor(Math.random() * chars.length)];
          } while (newChar === realValue[pos]);

          value =
            realValue.substring(0, pos) +
            newChar +
            realValue.substring(pos + 1);
        } else {
          // For other characters, just use a different one
          const charset = "#$%&*@!?+ABCDEFGHJKLMNPQRSTUVWXYZ";
          let newChar;
          do {
            newChar = charset[Math.floor(Math.random() * charset.length)];
          } while (newChar === realValue);

          value = newChar;
        }
      } else {
        // Generate a completely new value
        const charsets = [
          // Hex
          () =>
            Math.floor(Math.random() * 256)
              .toString(16)
              .padStart(2, "0")
              .toUpperCase(),
          // Symbol
          () => {
            const symbols = "#$%&*@!?+";
            return symbols[Math.floor(Math.random() * symbols.length)];
          },
          // Letter
          () => {
            const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            return letters[Math.floor(Math.random() * letters.length)];
          },
        ];

        const charsetIndex = Math.floor(Math.random() * charsets.length);
        value = charsets[charsetIndex]();
      }

      this.fragments.push({
        id: this.keyLength + i,
        value: value,
        correctPosition: -1, // No correct position for decoys
        selected: false,
      });
    }

    // Shuffle the fragments
    this.fragments = this._shuffleArray(this.fragments);
  }

  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  _renderFragments() {
    if (!this.fragmentsContainer) return;

    // Clear previous
    this.fragmentsContainer.innerHTML = "";
    this.fragmentElements = [];

    // Create fragment elements
    this.fragments.forEach((fragment, index) => {
      const fragmentElement = document.createElement("div");
      fragmentElement.className = `aspect-square flex items-center justify-center rounded border border-cyan-800 
        text-lg font-mono transition-all duration-200 cursor-pointer select-none
        ${
          fragment.selected
            ? "opacity-50 cursor-not-allowed"
            : "bg-gray-800 hover:bg-cyan-900"
        }`;
      fragmentElement.textContent = fragment.value;
      fragmentElement.dataset.index = index;

      // Vary appearance based on value type
      if (/^[0-9A-F]{2}$/.test(fragment.value)) {
        // Hex value
        fragmentElement.classList.add("text-orange-400");
      } else if (/^[A-Z]$/.test(fragment.value)) {
        // Letter
        fragmentElement.classList.add("text-blue-400");
      } else {
        // Symbol
        fragmentElement.classList.add("text-yellow-400");
      }

      this.fragmentsContainer.appendChild(fragmentElement);
      this.fragmentElements.push(fragmentElement);
    });
  }

  _renderSolution() {
    if (!this.solutionContainer) return;

    // Clear previous
    this.solutionContainer.innerHTML = "";
    this.solutionElements = [];

    // Create solution slots
    for (let i = 0; i < this.keyLength; i++) {
      const slotElement = document.createElement("div");
      slotElement.className = `w-12 h-12 flex items-center justify-center rounded border-2 border-cyan-700 
        bg-gray-800 text-lg font-mono transition-all duration-200 relative`;
      slotElement.dataset.position = i;

      // Position indicator
      const positionIndicator = document.createElement("div");
      positionIndicator.className =
        "absolute -top-2 -left-1 bg-gray-900 text-cyan-400 text-xs px-1 rounded-sm";
      positionIndicator.textContent = `${i + 1}`;
      slotElement.appendChild(positionIndicator);

      // If a fragment is placed in this position
      if (this.currentSolution[i] !== null) {
        const fragment = this.fragments[this.currentSolution[i]];
        slotElement.textContent = fragment.value;

        // Style based on value type
        if (/^[0-9A-F]{2}$/.test(fragment.value)) {
          slotElement.classList.add("text-orange-400");
        } else if (/^[A-Z]$/.test(fragment.value)) {
          slotElement.classList.add("text-blue-400");
        } else {
          slotElement.classList.add("text-yellow-400");
        }

        // Add remove button
        const removeButton = document.createElement("div");
        removeButton.className =
          "absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center cursor-pointer";
        removeButton.textContent = "×";
        removeButton.dataset.action = "remove";
        removeButton.dataset.position = i;
        slotElement.appendChild(removeButton);
      }

      this.solutionContainer.appendChild(slotElement);
      this.solutionElements.push(slotElement);
    }
  }

  _attachEventListeners() {
    // Fragment selection
    this.fragmentsContainer.addEventListener("click", (e) => {
      const fragmentElement = e.target.closest("[data-index]");
      if (!fragmentElement) return;

      const index = parseInt(fragmentElement.dataset.index, 10);
      this._selectFragment(index);
    });

    // Solution slot selection
    this.solutionContainer.addEventListener("click", (e) => {
      // Handle remove button click
      if (e.target.dataset.action === "remove") {
        const position = parseInt(e.target.dataset.position, 10);
        this._removeFromSolution(position);
        return;
      }

      // Handle slot click
      const slotElement = e.target.closest("[data-position]");
      if (!slotElement) return;

      const position = parseInt(slotElement.dataset.position, 10);
      this._placeInSolution(position);
    });

    // Button actions
    this.containerElement.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") {
        const action = e.target.dataset.action;

        if (action === "verify") {
          this._verifyKey();
        } else if (action === "reset") {
          this._resetPuzzle();
        }
      }
    });
  }

  _selectFragment(index) {
    // Don't allow selection if already solved
    if (this.isComplete) return;

    const fragment = this.fragments[index];

    // Skip if already selected
    if (fragment.selected) return;

    // Select the fragment
    this.selectedFragment = index;

    // Highlight the fragment
    this.fragmentElements.forEach((el, i) => {
      if (i === index) {
        el.classList.add("ring-2", "ring-cyan-400");
      } else {
        el.classList.remove("ring-2", "ring-cyan-400");
      }
    });

    // Highlight available solution slots
    this._highlightAvailableSlots();

    // Play select sound
    this._playSound("select");
  }

  _placeInSolution(position) {
    // Don't allow placement if already solved
    if (this.isComplete) return;

    // Check if a fragment is selected
    if (this.selectedFragment === null) return;

    // Check if position is already filled
    if (this.currentSolution[position] !== null) return;

    // Place fragment in solution
    this.currentSolution[position] = this.selectedFragment;

    // Mark fragment as selected
    this.fragments[this.selectedFragment].selected = true;

    // Reset selected fragment
    this.selectedFragment = null;

    // Re-render
    this._renderFragments();
    this._renderSolution();

    // Play place sound
    this._playSound("place");

    // Check if solution is complete
    const isComplete = this.currentSolution.every((index) => index !== null);
    if (isComplete) {
      this._appendToTerminal("\nKey fully assembled. Ready for verification.");
    }
  }

  _removeFromSolution(position) {
    // Don't allow removal if already solved
    if (this.isComplete) return;

    // Check if position has a fragment
    if (this.currentSolution[position] === null) return;

    // Get the fragment
    const fragmentIndex = this.currentSolution[position];

    // Mark fragment as not selected
    this.fragments[fragmentIndex].selected = false;

    // Remove from solution
    this.currentSolution[position] = null;

    // Re-render
    this._renderFragments();
    this._renderSolution();

    // Play remove sound
    this._playSound("remove");
  }

  _highlightAvailableSlots() {
    // Highlight empty slots
    this.solutionElements.forEach((el, i) => {
      if (this.currentSolution[i] === null) {
        el.classList.add("bg-gray-700", "border-cyan-500");
      } else {
        el.classList.remove("bg-gray-700", "border-cyan-500");
      }
    });
  }

  _verifyKey() {
    // Check if all positions are filled
    const isComplete = this.currentSolution.every((index) => index !== null);

    if (!isComplete) {
      this._appendToTerminal("\n> ERROR: Key incomplete. Fill all positions.");
      this._playSound("error");
      return;
    }

    // Validate the key
    let correctPositions = 0;
    let incorrectFragments = [];

    for (let i = 0; i < this.keyLength; i++) {
      const fragmentIndex = this.currentSolution[i];
      const fragment = this.fragments[fragmentIndex];

      if (fragment.correctPosition === i) {
        correctPositions++;
      } else {
        incorrectFragments.push(i + 1); // Position is 1-indexed for display
      }
    }

    // Start decryption animation
    this._startDecryptionAnimation();

    // Delay the result to simulate processing
    setTimeout(() => {
      if (correctPositions === this.keyLength) {
        // Success!
        this._appendToTerminal("\n> VERIFICATION SUCCESSFUL");
        this._appendToTerminal("> DECRYPTION SEQUENCE INITIATED");

        // Mark as complete
        this.isComplete = true;

        // Show success
        if (this.callbacks && this.callbacks.showSuccess) {
          this.callbacks.showSuccess();
        }

        // Play success sound
        this._playSound("success");
      } else {
        // Failed verification
        this._appendToTerminal("\n> VERIFICATION FAILED");
        this._appendToTerminal(
          `> ${correctPositions}/${this.keyLength} correct positions`
        );

        if (incorrectFragments.length <= 3) {
          // Give hint about incorrect positions
          this._appendToTerminal(
            `> Check positions: ${incorrectFragments.join(", ")}`
          );
        }

        // Play error sound
        this._playSound("error");

        // Reduce time for incorrect attempts
        if (this.callbacks && this.callbacks.reduceTime) {
          this.callbacks.reduceTime(5);
        }
      }

      // Stop animation
      this._stopDecryptionAnimation();
    }, 2000);
  }

  _resetPuzzle() {
    // Don't reset if already solved
    if (this.isComplete) return;

    // Reset the current solution
    this.currentSolution = Array(this.keyLength).fill(null);

    // Reset fragment selection
    this.fragments.forEach((fragment) => {
      fragment.selected = false;
    });

    this.selectedFragment = null;

    // Re-render
    this._renderFragments();
    this._renderSolution();

    // Log to terminal
    this._appendToTerminal("\n> KEY RESET. START OVER.");

    // Play reset sound
    this._playSound("reset");
  }

  _startDecryptionAnimation() {
    // Prevent multiple animations
    this._stopDecryptionAnimation();

    // Add a pulsing effect to the solution
    this.solutionElements.forEach((el) => {
      el.classList.add("animate-pulse");
    });

    this._appendToTerminal("\n> PROCESSING ENCRYPTION KEY...");

    // Simulate blinking cursor for processing
    let dots = 0;
    const processingEl = document.createElement("div");
    processingEl.className = "text-cyan-400";
    processingEl.id = "processing-indicator";
    this.terminalOutput.appendChild(processingEl);

    this.decryptionTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      processingEl.textContent = "> " + ".".repeat(dots);
      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }, 300);
  }

  _stopDecryptionAnimation() {
    // Clear timer
    if (this.decryptionTimer) {
      clearInterval(this.decryptionTimer);
      this.decryptionTimer = null;
    }

    // Remove processing indicator
    const processingEl = document.getElementById("processing-indicator");
    if (processingEl) {
      processingEl.remove();
    }

    // Remove animation
    this.solutionElements.forEach((el) => {
      el.classList.remove("animate-pulse");
    });
  }

  _appendToTerminal(text, type = "normal") {
    if (!this.terminalOutput) return;

    const entry = document.createElement("div");

    // Apply styling based on type
    switch (type) {
      case "error":
        entry.className = "text-red-400";
        break;
      case "success":
        entry.className = "text-green-400";
        break;
      case "warning":
        entry.className = "text-yellow-300";
        break;
      default:
        // Normal text
        break;
    }

    entry.textContent = text;
    this.terminalOutput.appendChild(entry);

    // Auto-scroll to bottom
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  _showInstructions() {
    this._appendToTerminal("\n> INSTRUCTIONS:");
    this._appendToTerminal("> 1. Select key fragments from below");
    this._appendToTerminal("> 2. Place them in the correct slots above");
    this._appendToTerminal("> 3. Click 'Verify Key' when complete");
  }

  _playSound(type) {
    try {
      let sound;
      switch (type) {
        case "select":
          sound = new Audio("../static/sounds/key-select.mp3");
          sound.volume = 0.2;
          break;
        case "place":
          sound = new Audio("../static/sounds/key-place.mp3");
          sound.volume = 0.2;
          break;
        case "remove":
          sound = new Audio("../static/sounds/key-remove.mp3");
          sound.volume = 0.2;
          break;
        case "success":
          sound = new Audio("../static/sounds/key-success.mp3");
          sound.volume = 0.3;
          break;
        case "error":
          sound = new Audio("../static/sounds/key-error.mp3");
          sound.volume = 0.2;
          break;
        case "reset":
          sound = new Audio("../static/sounds/key-reset.mp3");
          sound.volume = 0.2;
          break;
        default:
          return;
      }

      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  // Methods required by UniversalPuzzleController
  getSolution() {
    return {
      key: this.encryptionKey.join(""),
      completed: this.isComplete,
    };
  }

  validateSolution() {
    return this.isComplete;
  }

  getErrorMessage() {
    if (this.currentSolution.some((index) => index === null)) {
      return "Key incomplete. Fill all positions before verification.";
    }
    return "Key verification failed. Check fragment positions and try again.";
  }

  showSuccess() {
    // Show success animation in the UI
    this.solutionElements.forEach((el) => {
      el.classList.add("bg-green-700", "border-green-500");
    });

    // Update status display
    const systemStatus = this.containerElement.querySelector(
      ".bg-gray-800.text-red-400"
    );
    if (systemStatus) {
      systemStatus.className =
        "bg-green-800 text-green-300 px-3 py-1 rounded font-mono text-sm";
      systemStatus.textContent = "SYSTEM UNLOCKED";
    }

    // Play success sound
    this._playSound("success");
  }

  cleanup() {
    // Stop any timers
    this._stopDecryptionAnimation();

    // Remove event listeners
    if (this.fragmentsContainer) {
      this.fragmentsContainer.removeEventListener(
        "click",
        this._selectFragment
      );
    }

    if (this.solutionContainer) {
      this.solutionContainer.removeEventListener(
        "click",
        this._placeInSolution
      );
    }
  }

  handleRandomEvent(eventType, duration) {
    if (eventType === "security_patrol") {
      // Scramble some fragments temporarily
      this._appendToTerminal("\n> WARNING: Security scan detected!", "warning");
      this._appendToTerminal("> Anti-tampering measures active", "warning");

      // Temporarily disable interactions
      const originalFragments = [...this.fragments];

      // Scramble visible fragments
      this.fragments = this._shuffleArray(this.fragments);
      this._renderFragments();

      // Restore after duration
      setTimeout(() => {
        this.fragments = originalFragments;
        this._renderFragments();
        this._appendToTerminal("> Security scan complete. Access restored.");
      }, duration * 1000);
    }
  }
}

export default EncryptionKeyPuzzle;
