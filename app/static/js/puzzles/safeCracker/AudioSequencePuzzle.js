// AudioSequencePuzzle.js - Stage 2 Audio Sequence puzzle for Safe Cracker role

import BasePuzzle from "./BasePuzzle.js";

class AudioSequencePuzzle extends BasePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    super(containerElement, puzzleData, submitSolutionCallback);

    // Audio sequence specific properties
    this.audioSequence = [];
    this.playerSequence = [];
    this.currentSequenceLength = 4; // Start with 4 tones
    this.maxSequenceLength = 8;
    this.tones = [
      { frequency: 261.63, color: "#EF4444" }, // C4 - Red
      { frequency: 329.63, color: "#F59E0B" }, // E4 - Orange
      { frequency: 392.0, color: "#10B981" }, // G4 - Green
      { frequency: 523.25, color: "#3B82F6" }, // C5 - Blue
    ];
    this.isPlayingSequence = false;
    this.canInteract = false;
    this.audioContext = null;

    // DOM elements
    this.soundPadContainer = null;
    this.soundPads = [];
    this.sequenceDisplay = null;
    this.playButton = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    super.initialize();

    // Get game area div
    const gameArea = this.containerElement.querySelector(
      "div.flex.justify-center"
    );
    this._setupAudioSequencePuzzle(gameArea);

    // Generate a random sequence if not provided
    if (!this.puzzleData.data || !this.puzzleData.data.sequence) {
      this._generateRandomSequence();
    } else {
      this.audioSequence = this.puzzleData.data.sequence;
    }

    // Create audio context
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API not supported:", e);
      this.messageElement.textContent = "Audio not supported in your browser";
      this.messageElement.className = "mb-4 text-red-400 text-center";
    }

    // Initially disable submit button until sequence is played
    this.submitButton.disabled = true;
  }

  /**
   * Set up the audio sequence puzzle interface
   * @param {HTMLElement} container - Container element
   */
  _setupAudioSequencePuzzle(container) {
    container.innerHTML = "";
    container.className = "flex flex-col items-center";

    // Create sound pad container
    this.soundPadContainer = document.createElement("div");
    this.soundPadContainer.className = "grid grid-cols-2 gap-4 mb-4";

    // Create 4 sound pads
    for (let i = 0; i < 4; i++) {
      const pad = document.createElement("div");
      pad.className =
        "w-28 h-28 rounded-md cursor-pointer flex items-center justify-center text-white font-bold transition-all duration-150";
      pad.style.backgroundColor = this.tones[i].color;
      pad.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.3)";
      pad.dataset.toneIndex = i;

      // Add event listener for pad click
      pad.addEventListener("click", () => {
        if (!this.canInteract) return;
        this._padClicked(i);
      });

      this.soundPads.push(pad);
      this.soundPadContainer.appendChild(pad);
    }

    // Create play button
    this.playButton = document.createElement("button");
    this.playButton.className =
      "bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-full mb-4 transition-all";
    this.playButton.textContent = "Play Sequence";
    this.playButton.addEventListener("click", () => this._playSequence());

    // Create sequence display
    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className = "flex space-x-2 mb-6";

    // Create indicator lights for sequence length
    for (let i = 0; i < this.maxSequenceLength; i++) {
      const light = document.createElement("div");
      light.className = "w-4 h-4 rounded-full bg-gray-700";
      if (i < this.currentSequenceLength) {
        light.className = "w-4 h-4 rounded-full bg-yellow-400";
      }
      this.sequenceDisplay.appendChild(light);
    }

    // Add elements to container
    container.appendChild(this.playButton);
    container.appendChild(this.soundPadContainer);
    container.appendChild(this.sequenceDisplay);

    // Add instruction note
    const note = document.createElement("p");
    note.className = "text-gray-400 text-sm mt-2";
    note.textContent =
      "Listen to the sequence, then recreate it by clicking the pads in the correct order.";
    container.appendChild(note);
  }

  /**
   * Generate a random audio sequence
   */
  _generateRandomSequence() {
    this.audioSequence = [];
    for (let i = 0; i < this.maxSequenceLength; i++) {
      this.audioSequence.push(Math.floor(Math.random() * 4));
    }
  }

  /**
   * Play the audio sequence
   */
  _playSequence() {
    if (this.isPlayingSequence) return;

    this.isPlayingSequence = true;
    this.canInteract = false;
    this.playerSequence = [];

    // Disable buttons during sequence playback
    this.playButton.disabled = true;
    this.submitButton.disabled = true;

    // Visual feedback
    this.messageElement.textContent = "Listen carefully...";
    this.messageElement.className = "mb-4 text-yellow-400 text-center";

    // Play each tone in sequence
    let delay = 0;
    const sequenceToPlay = this.audioSequence.slice(
      0,
      this.currentSequenceLength
    );

    sequenceToPlay.forEach((toneIndex, i) => {
      setTimeout(() => {
        this._playTone(toneIndex);
        this._flashPad(toneIndex);

        // After last tone, allow player to input
        if (i === sequenceToPlay.length - 1) {
          setTimeout(() => {
            this.isPlayingSequence = false;
            this.canInteract = true;
            this.playButton.disabled = false;
            this.messageElement.textContent = "Now repeat the sequence!";
          }, 700);
        }
      }, delay);

      delay += 700; // 500ms tone + 200ms gap
    });
  }

  /**
   * Play a tone for a specific pad
   * @param {number} toneIndex - Index of the tone to play
   */
  _playTone(toneIndex) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = this.tones[toneIndex].frequency;

    // Create ADSR envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      0.7,
      this.audioContext.currentTime + 0.05
    );
    gainNode.gain.linearRampToValueAtTime(
      0.5,
      this.audioContext.currentTime + 0.2
    );
    gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + 0.5
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  /**
   * Visual flash animation for a pad
   * @param {number} padIndex - Index of the pad to flash
   */
  _flashPad(padIndex) {
    const pad = this.soundPads[padIndex];

    // Add flash effect
    pad.style.transform = "scale(1.1)";
    pad.style.filter = "brightness(1.5)";

    // Remove flash after animation
    setTimeout(() => {
      pad.style.transform = "scale(1)";
      pad.style.filter = "brightness(1)";
    }, 300);
  }

  /**
   * Handle pad click
   * @param {number} padIndex - Index of the clicked pad
   */
  _padClicked(padIndex) {
    // Play the tone
    this._playTone(padIndex);
    this._flashPad(padIndex);

    // Add to player sequence
    this.playerSequence.push(padIndex);

    // Update sequence display
    this._updateSequenceDisplay();

    // Check if player sequence matches audio sequence so far
    const currentIndex = this.playerSequence.length - 1;
    if (
      this.playerSequence[currentIndex] !== this.audioSequence[currentIndex]
    ) {
      // Wrong tone
      this.messageElement.textContent = "Incorrect! Try again.";
      this.messageElement.className = "mb-4 text-red-400 text-center";

      // Wait and reset
      setTimeout(() => {
        this.playerSequence = [];
        this._updateSequenceDisplay();
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, 1000);

      return;
    }

    // Check if full sequence is entered
    if (this.playerSequence.length === this.currentSequenceLength) {
      // Enable submit button
      this.submitButton.disabled = false;
      this.messageElement.textContent =
        "Sequence complete! Submit your answer.";
      this.messageElement.className = "mb-4 text-green-400 text-center";
    }
  }

  /**
   * Update the sequence display
   */
  _updateSequenceDisplay() {
    const lights = this.sequenceDisplay.querySelectorAll("div");

    lights.forEach((light, i) => {
      if (i < this.currentSequenceLength) {
        // Set color based on whether this position has been entered
        if (i < this.playerSequence.length) {
          light.className = "w-4 h-4 rounded-full bg-green-500";
        } else {
          light.className = "w-4 h-4 rounded-full bg-yellow-400";
        }
      }
    });
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    // Check if full sequence has been entered
    if (this.playerSequence.length < this.currentSequenceLength) {
      this.messageElement.textContent =
        "You must enter the full sequence first!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Verifying...";

    this.submitSolution(this.playerSequence)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent = "Wrong sequence. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = true;
          this.submitButton.textContent = "Submit Sequence";

          // Reset player sequence
          setTimeout(() => {
            this.playerSequence = [];
            this._updateSequenceDisplay();
          }, 1000);
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting sequence. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Submit Sequence";
      });
  }

  /**
   * Disable or enable puzzle interaction
   * @param {boolean} disabled - Whether to disable interaction
   */
  disableInteraction(disabled) {
    super.disableInteraction(disabled);

    this.canInteract = !disabled;
    this.playButton.disabled = disabled;

    if (disabled) {
      this.soundPadContainer.classList.add("opacity-50", "pointer-events-none");
    } else {
      this.soundPadContainer.classList.remove(
        "opacity-50",
        "pointer-events-none"
      );
    }
  }

  /**
   * Clean up event listeners and resources
   */
  cleanup() {
    super.cleanup();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch((e) => console.error(e));
    }

    // Remove event listeners
    if (this.playButton) {
      this.playButton.removeEventListener("click", null);
    }

    if (this.soundPads) {
      this.soundPads.forEach((pad) => {
        pad.removeEventListener("click", null);
      });
    }

    this.soundPadContainer = null;
    this.soundPads = [];
    this.sequenceDisplay = null;
    this.playButton = null;
  }

  /**
   * Get puzzle title
   * @returns {string} Puzzle title
   */
  _getPuzzleTitle() {
    return "Audio Sequence Lock";
  }

  /**
   * Get puzzle instructions
   * @returns {string} Puzzle instructions
   */
  _getInstructions() {
    return "Listen to the audio cues and replicate the correct sequence to unlock. Click 'Play Sequence' to hear the tones.";
  }
}

export default AudioSequencePuzzle;
