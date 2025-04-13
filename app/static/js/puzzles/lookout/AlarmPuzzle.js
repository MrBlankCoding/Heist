// AlarmPuzzle.js - Alarm System Control Puzzle for the Lookout role
// Difficulty: 4/5 - Hard difficulty

class AlarmPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Alarm system properties
    this.alarmZones = [];
    this.numZones = 8; // Number of alarm zones
    this.activeAlarms = 0; // Number of currently active alarms
    this.totalDisabled = 0; // Total number of alarms successfully disabled

    // Sequence properties
    this.correctSequence = []; // The correct sequence to disable the alarm
    this.playerSequence = []; // The sequence entered by the player
    this.sequenceLength = 6; // Length of sequence to memorize

    // UI elements
    this.gridElement = null;
    this.messageElement = null;
    this.sequenceDisplayElement = null;
    this.statusElement = null;

    // Timer for active alarms and sequence display
    this.alarmTimer = null;
    this.sequenceTimer = null;
    this.alarmActivationDelay = 12000; // 12 seconds between alarms

    // Puzzle states
    this.isShowingSequence = false;
    this.isDisarmingMode = false;

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 4;
    this._adjustForDifficulty();

    // Solution tracking
    this.requiredDisarmed = 4; // Need to disarm 4 alarm sequences to complete
  }

  /**
   * Adjust parameters based on difficulty
   */
  _adjustForDifficulty() {
    // Adjust sequence length
    this.sequenceLength = 4 + this.difficulty; // 8 for difficulty 4

    // Adjust alarm activation delay (faster at higher difficulties)
    this.alarmActivationDelay = Math.max(6000, 15000 - this.difficulty * 2000);

    // Adjust required disarmed alarms
    this.requiredDisarmed = 3 + Math.floor(this.difficulty / 2); // 5 for difficulty 4
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Initialize alarm zones
    this._initializeAlarmZones();

    // Start first alarm after delay
    this._scheduleNextAlarm();

    // Render initial state
    this._render();

    // Display instructions
    this._showMessage(
      "Memorize alarm sequences and disable them before they trigger!"
    );
  }

  /**
   * Create the UI elements for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "alarm-puzzle flex flex-col items-center justify-center h-full";

    // Header with status
    this.statusElement = document.createElement("div");
    this.statusElement.className = "mb-4 text-white font-medium text-center";
    this.statusElement.textContent = `Alarms Disabled: 0/${this.requiredDisarmed}`;
    puzzleContainer.appendChild(this.statusElement);

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-center text-gray-300";
    instructions.innerHTML = `
      <p class="mb-2">Watch the sequence, then press the zones in the same order to disable the alarm.</p>
      <p class="text-sm">
        <span class="bg-blue-500 text-white px-2 py-1 rounded">Inactive</span>
        <span class="ml-2 bg-red-500 text-white px-2 py-1 rounded">Active</span>
        <span class="ml-2 bg-green-500 text-white px-2 py-1 rounded">Sequence</span>
      </p>
    `;
    puzzleContainer.appendChild(instructions);

    // Sequence display area
    this.sequenceDisplayElement = document.createElement("div");
    this.sequenceDisplayElement.className =
      "mb-4 flex justify-center gap-2 h-8";
    puzzleContainer.appendChild(this.sequenceDisplayElement);

    // Alarm grid
    this.gridElement = document.createElement("div");
    this.gridElement.className = "grid grid-cols-4 gap-4 w-96 h-96";
    puzzleContainer.appendChild(this.gridElement);

    // Message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mt-4 text-center h-8 text-white font-medium";
    puzzleContainer.appendChild(this.messageElement);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Initialize alarm zones
   */
  _initializeAlarmZones() {
    this.alarmZones = [];

    for (let i = 0; i < this.numZones; i++) {
      this.alarmZones.push({
        id: i,
        status: "inactive", // inactive, active, sequence, pressed
        countdown: 0,
        label: String.fromCharCode(65 + i), // A, B, C, D, etc.
      });
    }
  }

  /**
   * Schedule next alarm activation
   */
  _scheduleNextAlarm() {
    // Don't schedule if puzzle is complete
    if (this.isComplete) return;

    // Don't schedule if we're already showing a sequence
    if (this.isShowingSequence) return;

    // Don't schedule if an alarm is already active
    if (this.activeAlarms > 0) return;

    // Schedule alarm activation
    setTimeout(() => {
      this._activateRandomAlarm();
    }, this.alarmActivationDelay);
  }

  /**
   * Activate a random alarm
   */
  _activateRandomAlarm() {
    // Find available zones (inactive ones)
    const availableZones = this.alarmZones.filter(
      (zone) => zone.status === "inactive"
    );

    if (availableZones.length === 0) {
      // No available zones, try again later
      this._scheduleNextAlarm();
      return;
    }

    // Select a random zone
    const randomZone =
      availableZones[Math.floor(Math.random() * availableZones.length)];
    const zoneId = randomZone.id;

    // Generate a random sequence for this alarm
    this._generateSequence();

    // Show the sequence to the player
    this._showSequence(zoneId);
  }

  /**
   * Generate a random sequence for disarming
   */
  _generateSequence() {
    this.correctSequence = [];

    // Generate random sequence of zone IDs
    for (let i = 0; i < this.sequenceLength; i++) {
      const randomId = Math.floor(Math.random() * this.numZones);
      this.correctSequence.push(randomId);
    }

    // Reset player sequence
    this.playerSequence = [];
  }

  /**
   * Show the sequence to the player
   * @param {number} alarmZoneId - ID of the alarm zone being activated
   */
  _showSequence(alarmZoneId) {
    this.isShowingSequence = true;
    this.isDisarmingMode = false;

    // Update zone status
    this.alarmZones[alarmZoneId].status = "active";
    this.activeAlarms++;

    // Show message
    this._showMessage("Memorize the sequence to disable the alarm!", "warning");

    // Clear sequence display
    this._updateSequenceDisplay();

    // Render state
    this._render();

    // Show sequence with delay between each step
    let step = 0;

    const showNextStep = () => {
      // Clear all sequence highlights
      for (const zone of this.alarmZones) {
        if (zone.status === "sequence") {
          zone.status = zone.id === alarmZoneId ? "active" : "inactive";
        }
      }

      if (step < this.correctSequence.length) {
        // Highlight next zone in sequence
        const sequenceZoneId = this.correctSequence[step];

        // If sequence zone is the active alarm zone, use a different color
        if (sequenceZoneId === alarmZoneId) {
          // Using pressed status for a different visual
          this.alarmZones[sequenceZoneId].status = "pressed";
        } else {
          this.alarmZones[sequenceZoneId].status = "sequence";
        }

        // Render updated state
        this._render();

        // Move to next step
        step++;

        // Schedule next step
        setTimeout(showNextStep, 800);
      } else {
        // Sequence finished, enter disarming mode
        this._enterDisarmingMode(alarmZoneId);
      }
    };

    // Start showing sequence
    setTimeout(showNextStep, 1000);
  }

  /**
   * Enter disarming mode after showing sequence
   * @param {number} alarmZoneId - ID of the alarm zone being disarmed
   */
  _enterDisarmingMode(alarmZoneId) {
    this.isShowingSequence = false;
    this.isDisarmingMode = true;

    // Reset all zones except the active alarm
    for (const zone of this.alarmZones) {
      if (zone.status === "sequence" || zone.status === "pressed") {
        zone.status = zone.id === alarmZoneId ? "active" : "inactive";
      }
    }

    // Clear player sequence
    this.playerSequence = [];
    this._updateSequenceDisplay();

    // Start alarm countdown
    this.alarmZones[alarmZoneId].countdown = 30; // 30 seconds to disarm

    // Start countdown timer
    this._startAlarmCountdown(alarmZoneId);

    // Show message
    this._showMessage("Enter the sequence to disable the alarm!", "warning");

    // Render state
    this._render();
  }

  /**
   * Start countdown for an active alarm
   * @param {number} alarmZoneId - ID of the alarm zone with countdown
   */
  _startAlarmCountdown(alarmZoneId) {
    // Clear any existing timer
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }

    this.alarmTimer = setInterval(() => {
      // Reduce countdown
      this.alarmZones[alarmZoneId].countdown--;

      // Render updated state
      this._render();

      // Check if countdown expired
      if (this.alarmZones[alarmZoneId].countdown <= 0) {
        // Alarm triggered!
        this._handleAlarmTriggered(alarmZoneId);
      }
    }, 1000);
  }

  /**
   * Handle an alarm being triggered (failed to disarm in time)
   * @param {number} alarmZoneId - ID of the triggered alarm zone
   */
  _handleAlarmTriggered(alarmZoneId) {
    // Clear countdown timer
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }

    // Show failure message
    this._showMessage("Alarm triggered! Security alert raised.", "error");

    // Reset the zone after a delay
    setTimeout(() => {
      this.alarmZones[alarmZoneId].status = "inactive";
      this.activeAlarms--;

      // Render updated state
      this._render();

      // Schedule next alarm
      this._scheduleNextAlarm();
    }, 3000);
  }

  /**
   * Handle player pressing an alarm zone
   * @param {number} zoneId - ID of the pressed zone
   */
  _handleZonePress(zoneId) {
    // Ignore if we're showing sequence or puzzle is complete
    if (this.isShowingSequence || this.isComplete) return;

    // Ignore if we're not in disarming mode
    if (!this.isDisarmingMode) return;

    // Find the active alarm
    const activeAlarmZone = this.alarmZones.find(
      (zone) => zone.status === "active"
    );

    if (!activeAlarmZone) return;

    // Add to player sequence
    this.playerSequence.push(zoneId);

    // Update sequence display
    this._updateSequenceDisplay();

    // Temporarily change zone status to show it was pressed
    const originalStatus = this.alarmZones[zoneId].status;
    this.alarmZones[zoneId].status = "pressed";

    // Render update
    this._render();

    // Restore original status after a short delay
    setTimeout(() => {
      this.alarmZones[zoneId].status = originalStatus;
      this._render();

      // Check if sequence is complete
      if (this.playerSequence.length === this.correctSequence.length) {
        this._checkDisarmSequence(activeAlarmZone.id);
      }
    }, 300);
  }

  /**
   * Check if player entered the correct disarm sequence
   * @param {number} alarmZoneId - ID of the alarm zone being disarmed
   */
  _checkDisarmSequence(alarmZoneId) {
    // Compare sequences
    let isCorrect = true;

    for (let i = 0; i < this.correctSequence.length; i++) {
      if (this.playerSequence[i] !== this.correctSequence[i]) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      // Disarm successful!
      this._handleDisarmSuccess(alarmZoneId);
    } else {
      // Disarm failed
      this._handleDisarmFailure(alarmZoneId);
    }
  }

  /**
   * Handle successful alarm disarm
   * @param {number} alarmZoneId - ID of the disarmed alarm zone
   */
  _handleDisarmSuccess(alarmZoneId) {
    // Clear countdown timer
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }

    // Reset alarm zone
    this.alarmZones[alarmZoneId].status = "inactive";
    this.activeAlarms--;

    // Increment disarm counter
    this.totalDisabled++;

    // Update status display
    this._updateStatus();

    // Show success message
    this._showMessage("Alarm successfully disabled!", "success");

    // Check if puzzle is complete
    if (this.totalDisabled >= this.requiredDisarmed) {
      this._handlePuzzleSuccess();
      return;
    }

    // Reset state
    this.isDisarmingMode = false;
    this.playerSequence = [];
    this._updateSequenceDisplay();

    // Render updated state
    this._render();

    // Schedule next alarm
    this._scheduleNextAlarm();
  }

  /**
   * Handle failed alarm disarm
   * @param {number} alarmZoneId - ID of the alarm zone
   */
  _handleDisarmFailure(alarmZoneId) {
    // Show error message
    this._showMessage("Incorrect sequence! Try again.", "error");

    // Reset player sequence
    this.playerSequence = [];
    this._updateSequenceDisplay();

    // Apply penalty to countdown
    this.alarmZones[alarmZoneId].countdown = Math.max(
      5,
      this.alarmZones[alarmZoneId].countdown - 5
    );

    // Render updated state
    this._render();
  }

  /**
   * Handle successful puzzle completion
   */
  _handlePuzzleSuccess() {
    this.isComplete = true;

    // Clear any timers
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }

    // Show success message
    this._showMessage(
      "All alarms disabled! Security system bypassed.",
      "success"
    );

    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Update the status display
   */
  _updateStatus() {
    if (this.statusElement) {
      this.statusElement.textContent = `Alarms Disabled: ${this.totalDisabled}/${this.requiredDisarmed}`;
    }
  }

  /**
   * Update the sequence display
   */
  _updateSequenceDisplay() {
    if (!this.sequenceDisplayElement) return;

    // Clear existing display
    this.sequenceDisplayElement.innerHTML = "";

    if (this.isShowingSequence) {
      // Show "memorizing" message
      const message = document.createElement("div");
      message.className = "text-white font-medium animate-pulse";
      message.textContent = "Memorize the sequence...";
      this.sequenceDisplayElement.appendChild(message);
      return;
    }

    // Create dots/indicators for each step in the sequence
    for (let i = 0; i < this.sequenceLength; i++) {
      const dot = document.createElement("div");

      // Check if this position has been entered by player
      if (i < this.playerSequence.length) {
        // Show the zone label that was pressed
        const zoneId = this.playerSequence[i];
        const zoneLabel = this.alarmZones[zoneId].label;

        dot.className =
          "w-8 h-8 flex items-center justify-center bg-blue-600 text-white font-bold rounded-full";
        dot.textContent = zoneLabel;
      } else {
        // Empty slot
        dot.className = "w-8 h-8 border-2 border-gray-500 rounded-full";
      }

      this.sequenceDisplayElement.appendChild(dot);
    }
  }

  /**
   * Render the alarm zones
   */
  _render() {
    if (!this.gridElement) return;

    // Clear grid
    this.gridElement.innerHTML = "";

    // Create zone elements
    for (let i = 0; i < this.numZones; i++) {
      const zone = this.alarmZones[i];
      const zoneElement = document.createElement("div");

      // Basic styling
      zoneElement.className =
        "flex flex-col items-center justify-center h-full rounded-lg cursor-pointer relative";

      // Status-specific styling
      switch (zone.status) {
        case "inactive":
          zoneElement.classList.add("bg-blue-800", "hover:bg-blue-700");
          break;
        case "active":
          zoneElement.classList.add(
            "bg-red-600",
            "ring-2",
            "ring-red-400",
            "animate-pulse"
          );
          break;
        case "sequence":
          zoneElement.classList.add("bg-green-600");
          break;
        case "pressed":
          zoneElement.classList.add("bg-yellow-500");
          break;
      }

      // Zone label
      const label = document.createElement("div");
      label.className = "text-white font-bold text-2xl";
      label.textContent = zone.label;
      zoneElement.appendChild(label);

      // Countdown for active alarms
      if (zone.status === "active" && zone.countdown > 0) {
        const countdown = document.createElement("div");
        countdown.className = "text-white text-sm mt-1";
        countdown.textContent = `${zone.countdown}s`;
        zoneElement.appendChild(countdown);
      }

      // Add click handler
      zoneElement.addEventListener("click", () => this._handleZonePress(i));

      this.gridElement.appendChild(zoneElement);
    }
  }

  /**
   * Show a message to the player
   * @param {string} message - Message to display
   * @param {string} type - Message type (info, success, error, warning)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    // Reset classes
    this.messageElement.className = "mt-4 text-center h-8 font-medium";

    // Apply type-specific styling
    switch (type) {
      case "success":
        this.messageElement.classList.add("text-green-400");
        break;
      case "error":
        this.messageElement.classList.add("text-red-400");
        break;
      case "warning":
        this.messageElement.classList.add("text-yellow-400");
        break;
      default:
        this.messageElement.classList.add("text-white");
    }

    this.messageElement.textContent = message;
  }

  /**
   * Clean up event listeners and timers
   */
  cleanup() {
    if (this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }

    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
  }

  /**
   * Get the current solution
   * @returns {Object} - The solution data
   */
  getSolution() {
    return {
      disabledAlarms: this.totalDisabled,
      requiredAlarms: this.requiredDisarmed,
      isComplete: this.isComplete,
    };
  }

  /**
   * Validate the current solution
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution() {
    return this.isComplete;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return `Need to disable ${this.requiredDisarmed} alarms to complete the puzzle!`;
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    switch (eventType) {
      case "security_patrol":
        this._showMessage("Security patrol approaching! Hurry!", "warning");

        // Reduce countdown time for active alarms
        for (const zone of this.alarmZones) {
          if (zone.status === "active" && zone.countdown > 0) {
            zone.countdown = Math.max(5, zone.countdown - 10);
          }
        }

        // Update display
        this._render();
        break;

      case "system_check":
        this._showMessage(
          "System diagnostic in progress! Sequence scrambled.",
          "warning"
        );

        // If in disarming mode, scramble the display (but not actual sequence)
        if (this.isDisarmingMode) {
          // Temporarily hide display
          this.sequenceDisplayElement.classList.add("opacity-0");

          setTimeout(() => {
            this.sequenceDisplayElement.classList.remove("opacity-0");
          }, 3000);
        }
        break;
    }
  }
}

export default AlarmPuzzle;
