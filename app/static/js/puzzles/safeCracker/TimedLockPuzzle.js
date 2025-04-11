// TimedLockPuzzle.js - Stage 5 Timed Lock puzzle for Safe Cracker role

import BasePuzzle from "./BasePuzzle.js";

class TimedLockPuzzle extends BasePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    super(containerElement, puzzleData, submitSolutionCallback);

    // Timed lock specific properties
    this.maxTime = 60; // 60 seconds
    this.remainingTime = this.maxTime;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.alarmActive = false;
    this.lockSections = 5; // 5 sections to unlock
    this.currentSection = 0;
    this.unlockedSections = [];
    this.targetSequence = [];
    this.playerSequence = [];

    // DOM elements
    this.timerDisplay = null;
    this.lockDisplay = null;
    this.dialElement = null;
    this.alarmLight = null;
    this.progressBar = null;
    this.startButton = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    super.initialize();

    // Get game area
    const gameArea = this.containerElement.querySelector(
      "div.flex.justify-center"
    );

    // Generate sequence if not provided
    if (!this.puzzleData.data || !this.puzzleData.data.sequence) {
      this._generateSequence();
    } else {
      this.targetSequence = this.puzzleData.data.sequence;
    }

    // Set up the timed lock puzzle
    this._setupTimedLockPuzzle(gameArea);

    // Hide submit button initially - we'll use our own start/stop buttons
    this.submitButton.style.display = "none";
  }

  /**
   * Generate a random sequence for the lock
   */
  _generateSequence() {
    this.targetSequence = [];
    for (let i = 0; i < this.lockSections; i++) {
      // Each section has a target position (0-39)
      this.targetSequence.push(Math.floor(Math.random() * 40));
    }
  }

  /**
   * Set up the timed lock puzzle interface
   * @param {HTMLElement} container - Container element
   */
  _setupTimedLockPuzzle(container) {
    container.innerHTML = "";
    container.className = "flex flex-col items-center w-full";

    // Create alarm light
    this.alarmLight = document.createElement("div");
    this.alarmLight.className =
      "w-12 h-12 rounded-full mb-4 border-4 border-gray-800 bg-gray-700";

    // Create timer display
    const timerContainer = document.createElement("div");
    timerContainer.className =
      "flex justify-between items-center w-full max-w-md mb-6";

    const timerLabel = document.createElement("div");
    timerLabel.className = "font-bold text-gray-300";
    timerLabel.textContent = "Vault Security Timer:";

    this.timerDisplay = document.createElement("div");
    this.timerDisplay.className = "font-mono text-2xl text-yellow-400";
    this.timerDisplay.textContent = this._formatTime(this.remainingTime);

    timerContainer.appendChild(timerLabel);
    timerContainer.appendChild(this.timerDisplay);

    // Create progress bar
    this.progressBar = document.createElement("div");
    this.progressBar.className =
      "w-full max-w-md h-2 bg-gray-700 rounded-full mb-6 overflow-hidden";

    const progressFill = document.createElement("div");
    progressFill.className = "h-full bg-yellow-400 transition-all duration-500";
    progressFill.style.width = "0%";
    this.progressBar.appendChild(progressFill);

    // Create lock container
    const lockContainer = document.createElement("div");
    lockContainer.className =
      "relative bg-gray-800 border-2 border-gray-600 rounded-lg p-6 w-full max-w-md mb-6";

    // Create lock display (vault sections)
    this.lockDisplay = document.createElement("div");
    this.lockDisplay.className =
      "flex justify-between items-center w-full mb-6";

    // Create lock sections
    for (let i = 0; i < this.lockSections; i++) {
      const section = document.createElement("div");
      section.className =
        "w-12 h-12 rounded-md bg-red-900 flex items-center justify-center text-white font-bold transition-all";
      section.textContent = (i + 1).toString();

      // Mark as current section if it's the first one
      if (i === 0) {
        section.classList.remove("bg-red-900");
        section.classList.add("bg-yellow-600");
      }

      this.lockDisplay.appendChild(section);
    }

    // Create target display
    const targetDisplay = document.createElement("div");
    targetDisplay.className = "text-center mb-4 font-mono text-green-400";
    targetDisplay.textContent = `Target: ${this.targetSequence[0]}`;

    // Create dial
    const dialContainer = document.createElement("div");
    dialContainer.className =
      "relative w-48 h-48 bg-gray-700 rounded-full mx-auto border-4 border-gray-600 flex items-center justify-center";

    this.dialElement = document.createElement("div");
    this.dialElement.className =
      "absolute w-40 h-40 bg-gray-600 rounded-full cursor-pointer flex items-center justify-center transition-all";

    // Add dial markings
    for (let i = 0; i < 40; i++) {
      const mark = document.createElement("div");
      const angle = (i / 40) * 360;
      mark.className =
        "absolute w-1 h-3 bg-white rounded-full top-0 left-1/2 transform -translate-x-1/2 origin-bottom";
      mark.style.transform = `rotate(${angle}deg)`;

      // Add number every 10 marks
      if (i % 10 === 0) {
        mark.className =
          "absolute w-1 h-5 bg-yellow-400 rounded-full top-0 left-1/2 transform -translate-x-1/2 origin-bottom";

        const number = document.createElement("div");
        number.className = "absolute text-yellow-400 text-xs font-bold";
        number.textContent = i.toString();
        number.style.transform = `rotate(${-angle}deg) translateY(-22px)`;

        mark.appendChild(number);
      }

      this.dialElement.appendChild(mark);
    }

    // Add dial pointer
    const pointer = document.createElement("div");
    pointer.className =
      "absolute w-2 h-14 bg-red-500 rounded-full top-50 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
    pointer.style.transformOrigin = "bottom center";
    this.dialElement.appendChild(pointer);

    // Add current position display
    this.positionDisplay = document.createElement("div");
    this.positionDisplay.className = "text-white font-mono text-2xl";
    this.positionDisplay.textContent = "0";
    this.dialElement.appendChild(this.positionDisplay);

    // Assemble dial container
    dialContainer.appendChild(this.dialElement);

    // Create control buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex justify-between mt-4 w-full";

    // Left button (counterclockwise)
    const leftButton = document.createElement("button");
    leftButton.className =
      "bg-blue-700 hover:bg-blue-600 text-white py-2 px-6 rounded-full transition-all";
    leftButton.innerHTML = "← CCW";
    leftButton.addEventListener("click", () => this._rotateDial(-1));

    // Right button (clockwise)
    const rightButton = document.createElement("button");
    rightButton.className =
      "bg-blue-700 hover:bg-blue-600 text-white py-2 px-6 rounded-full transition-all";
    rightButton.innerHTML = "CW →";
    rightButton.addEventListener("click", () => this._rotateDial(1));

    // Set position button
    const setButton = document.createElement("button");
    setButton.className =
      "bg-green-700 hover:bg-green-600 text-white py-2 px-6 rounded-full transition-all";
    setButton.textContent = "Set Position";
    setButton.addEventListener("click", () => this._setCurrentPosition());

    buttonContainer.appendChild(leftButton);
    buttonContainer.appendChild(setButton);
    buttonContainer.appendChild(rightButton);

    // Start/stop button
    this.startButton = document.createElement("button");
    this.startButton.className = "heist-button mx-auto block mt-8";
    this.startButton.textContent = "Start Cracking";
    this.startButton.addEventListener("click", () => this._toggleTimer());

    // Assemble the lock container
    lockContainer.appendChild(this.lockDisplay);
    lockContainer.appendChild(targetDisplay);
    lockContainer.appendChild(dialContainer);
    lockContainer.appendChild(buttonContainer);

    // Store references
    this.targetDisplay = targetDisplay;

    // Assemble all elements
    container.appendChild(this.alarmLight);
    container.appendChild(timerContainer);
    container.appendChild(this.progressBar);
    container.appendChild(lockContainer);
    container.appendChild(this.startButton);

    // Disable controls initially until start is pressed
    this._setControlsEnabled(false);
  }

  /**
   * Rotate the dial in the specified direction
   * @param {number} direction - Direction to rotate (1 for clockwise, -1 for counterclockwise)
   */
  _rotateDial(direction) {
    const currentPosition = parseInt(this.positionDisplay.textContent);
    let newPosition;

    if (direction > 0) {
      // Clockwise
      newPosition = (currentPosition + 1) % 40;
    } else {
      // Counterclockwise
      newPosition = (currentPosition - 1 + 40) % 40;
    }

    // Update display
    this.positionDisplay.textContent = newPosition.toString();

    // Update dial rotation
    this.dialElement.style.transform = `rotate(${newPosition * 9}deg)`; // 9 degrees per position (360 / 40)

    // Play click sound
    this._playClickSound();

    // Trigger random alarm if unlucky (10% chance)
    if (this.isTimerRunning && Math.random() < 0.1 && !this.alarmActive) {
      this._triggerTemporaryAlarm();
    }
  }

  /**
   * Play a click sound when rotating the dial
   */
  _playClickSound() {
    const audio = new Audio("/static/sounds/lock_click.mp3");
    audio.volume = 0.2;
    audio.play().catch((e) => console.log("Audio play error:", e));
  }

  /**
   * Set the current position
   */
  _setCurrentPosition() {
    const currentPosition = parseInt(this.positionDisplay.textContent);
    const targetPosition = this.targetSequence[this.currentSection];

    // Add to player sequence
    this.playerSequence.push(currentPosition);

    // Check if position matches target
    if (currentPosition === targetPosition) {
      // Correct position
      this._unlockCurrentSection();
    } else {
      // Wrong position
      this._handleWrongPosition();
    }
  }

  /**
   * Unlock the current section
   */
  _unlockCurrentSection() {
    // Mark this section as unlocked
    this.unlockedSections.push(this.currentSection);

    // Update UI
    const sections = this.lockDisplay.querySelectorAll("div");
    sections[this.currentSection].classList.remove("bg-yellow-600");
    sections[this.currentSection].classList.add("bg-green-600");

    // Update progress bar
    const progressFill = this.progressBar.querySelector("div");
    progressFill.style.width = `${
      (this.unlockedSections.length / this.lockSections) * 100
    }%`;

    // Move to next section or complete puzzle
    if (this.unlockedSections.length < this.lockSections) {
      this.currentSection++;

      // Update target display
      this.targetDisplay.textContent = `Target: ${
        this.targetSequence[this.currentSection]
      }`;

      // Highlight next section
      sections[this.currentSection].classList.remove("bg-red-900");
      sections[this.currentSection].classList.add("bg-yellow-600");

      // Success feedback
      this.messageElement.textContent = `Section ${this.currentSection} unlocked!`;
      this.messageElement.className = "mb-4 text-green-400 text-center";

      // Hide success message after a short delay
      setTimeout(() => {
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, 1500);
    } else {
      // All sections unlocked
      this._completeTimedPuzzle();
    }
  }

  /**
   * Handle wrong position
   */
  _handleWrongPosition() {
    // Show error message
    this.messageElement.textContent = "Wrong position! Try again.";
    this.messageElement.className = "mb-4 text-red-400 text-center";

    // Penalty: reduce time
    this.remainingTime = Math.max(1, this.remainingTime - 5);
    this.timerDisplay.textContent = this._formatTime(this.remainingTime);
    this.timerDisplay.classList.add("text-red-500");

    // Flash timer red
    setTimeout(() => {
      this.timerDisplay.classList.remove("text-red-500");
    }, 500);

    // Trigger alarm
    this._triggerTemporaryAlarm();

    // Hide error message after a short delay
    setTimeout(() => {
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }, 1500);
  }

  /**
   * Trigger a temporary alarm
   */
  _triggerTemporaryAlarm() {
    if (this.alarmActive) return;

    this.alarmActive = true;

    // Visual alarm
    this.alarmLight.classList.remove("bg-gray-700");
    this.alarmLight.classList.add("bg-red-600", "animate-pulse");

    // Play alarm sound
    const audio = new Audio("/static/sounds/alarm.mp3");
    audio.volume = 0.3;
    const audioPromise = audio
      .play()
      .catch((e) => console.log("Audio play error:", e));

    // Disable controls briefly
    this._setControlsEnabled(false);

    // End alarm after delay
    setTimeout(() => {
      this.alarmLight.classList.remove("bg-red-600", "animate-pulse");
      this.alarmLight.classList.add("bg-gray-700");
      this.alarmActive = false;

      // Re-enable controls if timer is still running
      if (this.isTimerRunning) {
        this._setControlsEnabled(true);
      }

      // Stop alarm sound
      if (audioPromise && audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }, 3000);
  }

  /**
   * Start or stop the timer
   */
  _toggleTimer() {
    if (this.isTimerRunning) {
      // Stop timer
      this._stopTimer();
      this.startButton.textContent = "Resume Cracking";
      this._setControlsEnabled(false);
    } else {
      // Start timer
      this._startTimer();
      this.startButton.textContent = "Pause Cracking";
      this._setControlsEnabled(true);
    }
  }

  /**
   * Start the timer
   */
  _startTimer() {
    if (this.isTimerRunning) return;

    this.isTimerRunning = true;

    // Update timer every second
    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      this.timerDisplay.textContent = this._formatTime(this.remainingTime);

      // Update timer color based on remaining time
      if (this.remainingTime <= 10) {
        this.timerDisplay.className = "font-mono text-2xl text-red-500";

        // Flash alarm on low time
        if (this.remainingTime <= 5 && !this.alarmActive) {
          this.alarmLight.classList.toggle("bg-red-600");
          this.alarmLight.classList.toggle("bg-gray-700");
        }
      }

      // Check if time has run out
      if (this.remainingTime <= 0) {
        this._timeOut();
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  _stopTimer() {
    if (!this.isTimerRunning) return;

    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
  }

  /**
   * Handle time out
   */
  _timeOut() {
    this._stopTimer();

    // Show failure message
    this.messageElement.textContent = "Time's up! The vault security reset.";
    this.messageElement.className = "mb-4 text-red-400 text-center";

    // Disable controls
    this._setControlsEnabled(false);

    // Reset to initial state
    this._resetPuzzle();

    // Update button
    this.startButton.textContent = "Try Again";
  }

  /**
   * Reset the puzzle to initial state
   */
  _resetPuzzle() {
    // Reset timer
    this.remainingTime = this.maxTime;
    this.timerDisplay.textContent = this._formatTime(this.remainingTime);
    this.timerDisplay.className = "font-mono text-2xl text-yellow-400";

    // Reset sections
    this.currentSection = 0;
    this.unlockedSections = [];
    this.playerSequence = [];

    // Reset UI
    const sections = this.lockDisplay.querySelectorAll("div");
    sections.forEach((section, i) => {
      section.classList.remove("bg-green-600", "bg-yellow-600");

      if (i === 0) {
        section.classList.add("bg-yellow-600");
      } else {
        section.classList.add("bg-red-900");
      }
    });

    // Reset progress bar
    const progressFill = this.progressBar.querySelector("div");
    progressFill.style.width = "0%";

    // Update target display
    this.targetDisplay.textContent = `Target: ${this.targetSequence[0]}`;

    // Reset dial position
    this.positionDisplay.textContent = "0";
    this.dialElement.style.transform = "rotate(0deg)";
  }

  /**
   * Complete the puzzle
   */
  _completeTimedPuzzle() {
    // Stop timer
    this._stopTimer();

    // Disable controls
    this._setControlsEnabled(false);

    // Hide start/stop button
    this.startButton.style.display = "none";

    // Show success message
    this.messageElement.textContent = "Vault successfully unlocked!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Calculate score based on remaining time
    const timeBonus = Math.floor((this.remainingTime / this.maxTime) * 1000);

    // Update progress bar to full
    const progressFill = this.progressBar.querySelector("div");
    progressFill.style.width = "100%";
    progressFill.classList.remove("bg-yellow-400");
    progressFill.classList.add("bg-green-400");

    // Show real submit button
    this.submitButton.style.display = "block";
    this.submitButton.textContent = "Complete Vault Access";
    this.submitButton.disabled = false;
  }

  /**
   * Format time in MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Enable or disable puzzle controls
   * @param {boolean} enabled - Whether controls should be enabled
   */
  _setControlsEnabled(enabled) {
    const buttons = this.containerElement.querySelectorAll(
      "button:not(.heist-button)"
    );
    buttons.forEach((button) => {
      button.disabled = !enabled;
      if (enabled) {
        button.classList.remove("opacity-50");
      } else {
        button.classList.add("opacity-50");
      }
    });

    if (enabled) {
      this.dialElement.classList.add("cursor-pointer");
    } else {
      this.dialElement.classList.remove("cursor-pointer");
    }
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    // Submit solution with player sequence and remaining time
    const solution = {
      sequence: this.playerSequence,
      remainingTime: this.remainingTime,
    };

    this.submitSolution(solution)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent =
            "Error verifying solution. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting solution. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
      });
  }

  /**
   * Disable or enable puzzle interaction
   * @param {boolean} disabled - Whether to disable interaction
   */
  disableInteraction(disabled) {
    super.disableInteraction(disabled);

    // If timer is running, stop it
    if (disabled && this.isTimerRunning) {
      this._stopTimer();
    }

    // Apply to all buttons
    this._setControlsEnabled(!disabled);

    // Also affect start button
    if (this.startButton) {
      this.startButton.disabled = disabled;
      if (disabled) {
        this.startButton.classList.add("opacity-50");
      } else {
        this.startButton.classList.remove("opacity-50");
      }
    }
  }

  /**
   * Clean up event listeners and timers
   */
  cleanup() {
    super.cleanup();

    // Stop timer if running
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Remove event listeners
    if (this.startButton) {
      this.startButton.removeEventListener("click", null);
    }

    // Remove all button event listeners
    this.containerElement.querySelectorAll("button").forEach((button) => {
      button.removeEventListener("click", null);
    });
  }

  /**
   * Get puzzle title
   * @returns {string} Puzzle title
   */
  _getPuzzleTitle() {
    return "Vault Access";
  }

  /**
   * Get puzzle instructions
   * @returns {string} Puzzle instructions
   */
  _getInstructions() {
    return "Bypass the final security measures to access the vault. Crack all sections before the timer runs out!";
  }
}

export default TimedLockPuzzle;
