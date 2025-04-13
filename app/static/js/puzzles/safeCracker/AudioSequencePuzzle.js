// audioSequencePuzzle.js - Audio-based sequence puzzle for safe cracker
// Difficulty: 4/5 - Player must identify and reproduce an audio pattern

class AudioSequencePuzzle {
  constructor(gameAreaElement, puzzleData, callbacks) {
    this.gameArea = gameAreaElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle properties
    this.difficultyLevel = puzzleData.difficulty || 4;
    this.sequence = []; // The audio sequence to reproduce
    this.playerSequence = []; // The player's input sequence
    this.isPlayingSequence = false;
    this.sequenceLength = 5; // Default sequence length
    this.buttons = []; // Audio button elements

    // Audio context
    this.audioContext = null;
    this.gainNode = null;

    // Audio notes - using pentatonic scale for pleasant combinations
    this.noteFrequencies = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.0, // G4
      440.0, // A4
    ];

    // Timing
    this.noteDuration = 0.5; // seconds
    this.noteSpacing = 0.15; // seconds
    this.playbackTimeout = null;
  }

  initialize() {
    // Setup difficulty
    this.setupDifficulty();

    // Create the user interface
    this.createUI();

    // Generate sequence
    this.generateSequence();

    // Initialize audio context
    this.initializeAudio();

    // Display instructions
    this.callbacks.showMessage(
      "Listen to the sequence and reproduce it to unlock the safe",
      "info"
    );

    // Play the sequence after a short delay
    setTimeout(() => {
      this.playSequence();
    }, 1500);
  }

  setupDifficulty() {
    // Adjust parameters based on difficulty
    switch (this.difficultyLevel) {
      case 1:
        this.sequenceLength = 3;
        this.noteDuration = 0.6;
        this.noteSpacing = 0.2;
        break;
      case 2:
        this.sequenceLength = 4;
        this.noteDuration = 0.55;
        this.noteSpacing = 0.18;
        break;
      case 3:
        this.sequenceLength = 5;
        this.noteDuration = 0.5;
        this.noteSpacing = 0.15;
        break;
      case 4:
        this.sequenceLength = 6;
        this.noteDuration = 0.45;
        this.noteSpacing = 0.13;
        break;
      case 5:
        this.sequenceLength = 7;
        this.noteDuration = 0.4;
        this.noteSpacing = 0.1;
        break;
      default:
        this.sequenceLength = 5;
        this.noteDuration = 0.5;
        this.noteSpacing = 0.15;
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
    title.textContent = "Audio Tumbler Lock";
    container.appendChild(title);

    // Instructions
    const instruction = document.createElement("p");
    instruction.className = "text-gray-300 mb-6 text-center";
    instruction.textContent =
      "Listen to the audio sequence and reproduce it by clicking the buttons in the correct order.";
    container.appendChild(instruction);

    // Status display
    const statusDisplay = document.createElement("div");
    statusDisplay.className = "text-lg font-bold text-yellow-400 mb-4";
    statusDisplay.id = "audio-status";
    statusDisplay.textContent = "Listen carefully...";
    container.appendChild(statusDisplay);

    // Sequence display
    const sequenceDisplay = document.createElement("div");
    sequenceDisplay.className =
      "flex items-center justify-center space-x-2 mb-6";
    sequenceDisplay.id = "sequence-display";

    for (let i = 0; i < this.sequenceLength; i++) {
      const indicator = document.createElement("div");
      indicator.className =
        "w-6 h-6 rounded-full bg-gray-700 border border-gray-600";
      indicator.id = `sequence-indicator-${i}`;
      sequenceDisplay.appendChild(indicator);
    }

    container.appendChild(sequenceDisplay);

    // Audio buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "grid grid-cols-5 gap-3 mb-6";

    // Create buttons for each note
    const buttonColors = [
      "bg-red-600", // C4
      "bg-yellow-500", // D4
      "bg-green-600", // E4
      "bg-blue-600", // G4
      "bg-purple-600", // A4
    ];

    for (let i = 0; i < this.noteFrequencies.length; i++) {
      const button = document.createElement("button");
      button.className = `w-16 h-16 rounded-full ${buttonColors[i]} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white`;
      button.dataset.note = i;
      button.disabled = this.isPlayingSequence;

      // Add click event
      button.addEventListener("click", () => this.onButtonClick(i));

      // Store button references
      this.buttons.push(button);

      // Add to container
      buttonsContainer.appendChild(button);
    }

    container.appendChild(buttonsContainer);

    // Control buttons
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "flex space-x-4";

    // Play sequence button
    const playButton = document.createElement("button");
    playButton.className =
      "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700";
    playButton.textContent = "Play Sequence";
    playButton.id = "play-button";
    playButton.addEventListener("click", () => {
      if (!this.isPlayingSequence) {
        this.playSequence();
      }
    });
    controlsContainer.appendChild(playButton);

    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700";
    resetButton.textContent = "Reset Input";
    resetButton.addEventListener("click", () => this.resetPlayerSequence());
    controlsContainer.appendChild(resetButton);

    container.appendChild(controlsContainer);

    this.gameArea.appendChild(container);
  }

  generateSequence() {
    this.sequence = [];
    // Generate random sequence of notes
    for (let i = 0; i < this.sequenceLength; i++) {
      const noteIndex = Math.floor(Math.random() * this.noteFrequencies.length);
      this.sequence.push(noteIndex);
    }

    console.log("Generated sequence:", this.sequence); // For debugging
  }

  initializeAudio() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.5;
      this.gainNode.connect(this.audioContext.destination);
    } catch (e) {
      console.error("Could not initialize audio context:", e);
      this.callbacks.showMessage(
        "Audio not supported in your browser. Please try another browser.",
        "error"
      );
    }
  }

  playSequence() {
    if (!this.audioContext) return;

    // Update status
    const statusDisplay = document.getElementById("audio-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Listen carefully...";
      statusDisplay.className = "text-lg font-bold text-yellow-400 mb-4";
    }

    // Disable buttons during playback
    this.isPlayingSequence = true;
    this.buttons.forEach((button) => {
      button.disabled = true;
      button.classList.add("opacity-50");
    });

    // Reset player sequence
    this.resetPlayerSequence();

    // Clear any existing playback
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
    }

    // Play each note in sequence with timing
    this.sequence.forEach((noteIndex, step) => {
      const timeOffset = step * (this.noteDuration + this.noteSpacing) * 1000;

      setTimeout(() => {
        // Play the note
        this.playNote(noteIndex);

        // Highlight the corresponding indicator
        const indicator = document.getElementById(`sequence-indicator-${step}`);
        if (indicator) {
          indicator.classList.remove("bg-gray-700");
          indicator.classList.add("bg-white", "animate-pulse");

          setTimeout(() => {
            indicator.classList.remove("bg-white", "animate-pulse");
            indicator.classList.add("bg-gray-700");
          }, this.noteDuration * 1000);
        }

        // If this is the last note, enable input after playback
        if (step === this.sequence.length - 1) {
          this.playbackTimeout = setTimeout(() => {
            this.enablePlayerInput();
          }, this.noteDuration * 1000 + 300);
        }
      }, timeOffset);
    });
  }

  enablePlayerInput() {
    // Update status
    const statusDisplay = document.getElementById("audio-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Your turn - reproduce the sequence";
      statusDisplay.className = "text-lg font-bold text-green-400 mb-4";
    }

    // Enable buttons
    this.isPlayingSequence = false;
    this.buttons.forEach((button) => {
      button.disabled = false;
      button.classList.remove("opacity-50");
    });

    // Clear player sequence
    this.playerSequence = [];
  }

  playNote(noteIndex) {
    if (!this.audioContext) return;

    try {
      // Highlight the corresponding button
      if (this.buttons[noteIndex]) {
        this.buttons[noteIndex].classList.add("ring-2", "ring-white");
        setTimeout(() => {
          this.buttons[noteIndex].classList.remove("ring-2", "ring-white");
        }, this.noteDuration * 1000);
      }

      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = this.noteFrequencies[noteIndex];

      // Connect to gain node
      oscillator.connect(this.gainNode);

      // Start and stop the oscillator
      oscillator.start();

      // Add a slight fade out for a smoother sound
      this.gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + this.noteDuration
      );

      // Stop after duration
      setTimeout(() => {
        oscillator.stop();
        oscillator.disconnect();
      }, this.noteDuration * 1000);
    } catch (e) {
      console.error("Could not play note:", e);
    }
  }

  onButtonClick(noteIndex) {
    if (this.isPlayingSequence) return;

    // Play the selected note
    this.playNote(noteIndex);

    // Add to player sequence
    this.playerSequence.push(noteIndex);

    // Update the display
    this.updateSequenceDisplay();

    // Check if sequence is complete
    if (this.playerSequence.length === this.sequence.length) {
      // Delay checking to let the last note play
      setTimeout(() => {
        this.checkSequence();
      }, this.noteDuration * 1000);
    }
  }

  updateSequenceDisplay() {
    // Update sequence indicators
    for (let i = 0; i < this.sequenceLength; i++) {
      const indicator = document.getElementById(`sequence-indicator-${i}`);
      if (indicator) {
        if (i < this.playerSequence.length) {
          // Show filled indicator for input notes
          indicator.classList.remove("bg-gray-700");
          indicator.classList.add("bg-blue-500");
        } else {
          // Show empty indicator for remaining positions
          indicator.classList.remove("bg-blue-500");
          indicator.classList.add("bg-gray-700");
        }
      }
    }
  }

  resetPlayerSequence() {
    this.playerSequence = [];
    this.updateSequenceDisplay();
  }

  checkSequence() {
    let isCorrect = true;

    // Check if sequences match
    if (this.playerSequence.length !== this.sequence.length) {
      isCorrect = false;
    } else {
      for (let i = 0; i < this.sequence.length; i++) {
        if (this.playerSequence[i] !== this.sequence[i]) {
          isCorrect = false;
          break;
        }
      }
    }

    if (isCorrect) {
      this.onSuccess();
    } else {
      this.onError();
    }

    return isCorrect;
  }

  onSuccess() {
    // Update status
    const statusDisplay = document.getElementById("audio-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Sequence correct!";
      statusDisplay.className = "text-lg font-bold text-green-500 mb-4";
    }

    // Play success animation
    this.animateSuccess();

    // Disable buttons
    this.buttons.forEach((button) => {
      button.disabled = true;
      button.classList.add("opacity-50");
    });

    // Play success sound
    this.playSuccessSound();

    // Show success message
    this.callbacks.showMessage(
      "Audio sequence correctly matched! Safe unlocked.",
      "success"
    );
  }

  onError() {
    // Update status
    const statusDisplay = document.getElementById("audio-status");
    if (statusDisplay) {
      statusDisplay.textContent = "Incorrect sequence. Try again.";
      statusDisplay.className = "text-lg font-bold text-red-500 mb-4";
    }

    // Show error animation
    this.animateError();

    // Play error sound
    this.playErrorSound();

    // Reset after delay
    setTimeout(() => {
      this.resetPlayerSequence();

      if (statusDisplay) {
        statusDisplay.textContent = "Your turn - reproduce the sequence";
        statusDisplay.className = "text-lg font-bold text-green-400 mb-4";
      }
    }, 2000);

    // Show error message
    this.callbacks.showMessage(
      "Incorrect sequence. Listen again and try to match the pattern.",
      "error"
    );
  }

  animateSuccess() {
    // Animate sequence indicators
    for (let i = 0; i < this.sequenceLength; i++) {
      const indicator = document.getElementById(`sequence-indicator-${i}`);
      if (indicator) {
        setTimeout(() => {
          indicator.classList.remove("bg-blue-500", "bg-gray-700");
          indicator.classList.add("bg-green-500", "animate-pulse");
        }, i * 100);
      }
    }

    // Create success overlay
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "mt-6 p-4 bg-green-800 bg-opacity-30 rounded-lg text-center animate-fadeIn";
    successOverlay.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-green-300 font-bold text-xl mt-2">AUDIO MATCH SUCCESSFUL</p>
        `;

    this.gameArea.querySelector(".flex.flex-col").appendChild(successOverlay);

    // Add keyframes for fadeIn animation if they don't exist
    if (!document.getElementById("audio-keyframes")) {
      const style = document.createElement("style");
      style.id = "audio-keyframes";
      style.textContent = `
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

  animateError() {
    // Flash indicators red
    for (let i = 0; i < this.playerSequence.length; i++) {
      const indicator = document.getElementById(`sequence-indicator-${i}`);
      if (indicator) {
        indicator.classList.remove("bg-blue-500", "bg-gray-700");
        indicator.classList.add("bg-red-500");

        setTimeout(() => {
          indicator.classList.remove("bg-red-500");
          indicator.classList.add("bg-gray-700");
        }, 1000);
      }
    }
  }

  playSuccessSound() {
    try {
      // Create a pleasing success sound using multiple notes
      if (this.audioContext) {
        const now = this.audioContext.currentTime;

        // Play a chord
        [261.63, 329.63, 392.0].forEach((freq, i) => {
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();

          osc.frequency.value = freq;
          osc.type = "sine";

          gain.gain.value = 0.2;

          osc.connect(gain);
          gain.connect(this.audioContext.destination);

          osc.start(now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
          osc.stop(now + 1.5);
        });
      }
    } catch (e) {
      console.error("Could not play success sound:", e);
    }
  }

  playErrorSound() {
    try {
      // Create an error sound
      if (this.audioContext) {
        const now = this.audioContext.currentTime;

        // Play dissonant notes
        [440, 415.3].forEach((freq, i) => {
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();

          osc.frequency.value = freq;
          osc.type = "square";

          gain.gain.value = 0.1;

          osc.connect(gain);
          gain.connect(this.audioContext.destination);

          osc.start(now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.stop(now + 0.3);
        });
      }
    } catch (e) {
      console.error("Could not play error sound:", e);
    }
  }

  getSolution() {
    return { sequence: this.playerSequence };
  }

  validateSolution(solution) {
    if (!solution || !solution.sequence || !Array.isArray(solution.sequence))
      return false;

    // Check if the provided sequence matches the correct one
    if (solution.sequence.length !== this.sequence.length) return false;

    for (let i = 0; i < this.sequence.length; i++) {
      if (solution.sequence[i] !== this.sequence[i]) return false;
    }

    return true;
  }

  getErrorMessage() {
    return "The audio sequence does not match the required pattern. Try again.";
  }

  cleanup() {
    // Clear any active timeouts
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext
        .close()
        .catch((e) => console.warn("Could not close audio context:", e));
    }

    // Clear game area
    this.gameArea.innerHTML = "";
  }
}

export default AudioSequencePuzzle;
