// AlarmPuzzle.js - Lookout puzzle for alarm system interface (type 4)

class AlarmPuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;

    // Alarm puzzle specific properties
    this.facilityMap = null;
    this.alarmTriggers = [];
    this.playerMarkedTriggers = [];
    this.correctTriggerCount = 0;
    this.timeRemaining = 120; // 2 minutes

    // DOM elements
    this.messageElement = null;
    this.submitButton = null;
    this.timerElement = null;
    this.timerInterval = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create game area
    const gameArea = document.createElement("div");
    gameArea.className = "flex flex-col items-center mb-6";
    this.containerElement.appendChild(gameArea);

    // Create header with title and timer
    const headerContainer = document.createElement("div");
    headerContainer.className = "flex justify-between items-center w-full mb-4";

    const title = document.createElement("h4");
    title.className = "text-lg text-green-400 font-bold";
    title.textContent = "Alarm System Interface";

    this.timerElement = document.createElement("div");
    this.timerElement.className = "text-yellow-400 font-mono";
    this.timerElement.textContent = this._formatTime(this.timeRemaining);

    headerContainer.appendChild(title);
    headerContainer.appendChild(this.timerElement);
    gameArea.appendChild(headerContainer);

    // Create instructions
    const instructions = document.createElement("p");
    instructions.className = "text-gray-300 mb-4 text-sm";
    instructions.innerHTML =
      "Identify and mark potential alarm triggers throughout the facility. <strong class='text-yellow-400'>Click on suspicious objects or areas</strong> that might trigger security alarms. Find at least 80% of triggers to succeed.";
    gameArea.appendChild(instructions);

    // Create facility map
    this._createFacilityMap(gameArea);

    // Create controls
    const controlsContainer = document.createElement("div");
    controlsContainer.className =
      "flex justify-between items-center w-full mt-4";

    // Trigger counter
    const triggerCounter = document.createElement("div");
    triggerCounter.className = "text-green-400";
    triggerCounter.id = "trigger-counter";
    triggerCounter.textContent = `Triggers identified: 0/${this.correctTriggerCount}`;

    // Submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button";
    this.submitButton.textContent = "Submit Analysis";
    this.submitButton.addEventListener("click", () => this._handleSubmit());

    controlsContainer.appendChild(triggerCounter);
    controlsContainer.appendChild(this.submitButton);
    gameArea.appendChild(controlsContainer);

    // Message element for feedback
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center hidden mt-4";
    gameArea.appendChild(this.messageElement);

    // Generate the alarm system data
    this._generateAlarmSystem();

    // Start timer
    this._startTimer();
  }

  /**
   * Get puzzle title
   * @returns {string} - Puzzle title
   */
  getTitle() {
    return "Alarm System Interface";
  }

  /**
   * Get puzzle instructions
   * @returns {string} - Puzzle instructions
   */
  getInstructions() {
    return "Identify and mark potential alarm triggers throughout the facility.";
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;
    this._stopTimer();

    // Update UI to show success
    this.messageElement.textContent =
      "Alarm system successfully analyzed! The team can now navigate safely.";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Reveal all triggers
    this._revealAllTriggers();

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Mission Complete";
    this.submitButton.className = "heist-button mx-auto block opacity-50";
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Show message about the random event
    this.messageElement.textContent = this._getRandomEventMessage(eventType);
    this.messageElement.className = "mb-4 text-red-400 text-center";

    // For the Lookout role, make random events less disruptive
    setTimeout(() => {
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }, duration * 500); // Half the time of other roles
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    this._stopTimer();

    // Clear references
    this.facilityMap = null;
    this.messageElement = null;
    this.submitButton = null;
    this.timerElement = null;
  }

  /**
   * Create facility map
   * @param {HTMLElement} container - Container element
   */
  _createFacilityMap(container) {
    const mapContainer = document.createElement("div");
    mapContainer.className =
      "relative bg-gray-800 rounded-lg border border-gray-700 mb-4";
    mapContainer.style.width = "min(100%, 600px)";
    mapContainer.style.height = "400px";

    // Store reference to map
    this.facilityMap = mapContainer;

    // Add building outline
    const buildingOutline = document.createElement("div");
    buildingOutline.className =
      "absolute inset-4 border-2 border-green-500 border-opacity-50";
    mapContainer.appendChild(buildingOutline);

    // Add room outlines
    this._createRooms(mapContainer);

    container.appendChild(mapContainer);
  }

  /**
   * Create room outlines in the facility
   * @param {HTMLElement} mapContainer - Map container element
   */
  _createRooms(mapContainer) {
    // Define room layouts
    const rooms = [
      { name: "Entrance", x: "10%", y: "10%", width: "25%", height: "20%" },
      { name: "Hallway", x: "35%", y: "10%", width: "50%", height: "20%" },
      { name: "Office A", x: "10%", y: "30%", width: "20%", height: "30%" },
      { name: "Office B", x: "10%", y: "60%", width: "20%", height: "30%" },
      { name: "Main Hall", x: "30%", y: "30%", width: "40%", height: "60%" },
      { name: "Security", x: "70%", y: "30%", width: "20%", height: "25%" },
      { name: "Server Room", x: "70%", y: "55%", width: "20%", height: "35%" },
      { name: "Vault", x: "85%", y: "10%", width: "10%", height: "20%" },
    ];

    rooms.forEach((room) => {
      const roomElement = document.createElement("div");
      roomElement.className =
        "absolute border border-green-500 border-opacity-70";
      roomElement.style.left = room.x;
      roomElement.style.top = room.y;
      roomElement.style.width = room.width;
      roomElement.style.height = room.height;

      // Add room label
      const label = document.createElement("div");
      label.className =
        "absolute top-0 left-0 text-xs text-green-400 bg-gray-800 px-1";
      label.textContent = room.name;
      roomElement.appendChild(label);

      mapContainer.appendChild(roomElement);
    });
  }

  /**
   * Generate alarm system data
   */
  _generateAlarmSystem() {
    // Clear existing data
    this.alarmTriggers = [];
    this.playerMarkedTriggers = [];

    // Trigger types with descriptions
    const triggerTypes = [
      { type: "motion", icon: "M", description: "Motion Sensor", color: "red" },
      {
        type: "pressure",
        icon: "P",
        description: "Pressure Plate",
        color: "yellow",
      },
      { type: "laser", icon: "L", description: "Laser Beam", color: "orange" },
      {
        type: "thermal",
        icon: "T",
        description: "Thermal Sensor",
        color: "purple",
      },
      {
        type: "sound",
        icon: "S",
        description: "Sound Detector",
        color: "blue",
      },
    ];

    // Place triggers based on difficulty
    const difficulty = this.puzzleData.difficulty || 1;
    const triggerCount = 8 + difficulty * 2; // 10-14 triggers based on difficulty

    // Create unique ID for each trigger
    let triggerId = 1;

    // Generate triggers at random positions
    for (let i = 0; i < triggerCount; i++) {
      // Random position within the map
      const x = 5 + Math.floor(Math.random() * 90);
      const y = 5 + Math.floor(Math.random() * 90);

      // Random trigger type
      const triggerType =
        triggerTypes[Math.floor(Math.random() * triggerTypes.length)];

      // Create trigger data
      const trigger = {
        id: `trigger-${triggerId++}`,
        position: { x: `${x}%`, y: `${y}%` },
        type: triggerType.type,
        icon: triggerType.icon,
        description: triggerType.description,
        color: triggerType.color,
        visible: Math.random() < 0.3, // Only 30% are immediately visible
      };

      this.alarmTriggers.push(trigger);
    }

    // Set the correct trigger count
    this.correctTriggerCount = this.alarmTriggers.length;

    // Update the counter
    const counterElement = document.getElementById("trigger-counter");
    if (counterElement) {
      counterElement.textContent = `Triggers identified: 0/${this.correctTriggerCount}`;
    }

    // Place triggers on the map
    this._placeTriggers();
  }

  /**
   * Place triggers on the map
   */
  _placeTriggers() {
    this.alarmTriggers.forEach((trigger) => {
      const triggerElement = document.createElement("div");
      triggerElement.id = trigger.id;
      triggerElement.className = `absolute w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 ${
        trigger.visible
          ? `bg-${trigger.color}-500 bg-opacity-70`
          : "bg-gray-700 bg-opacity-20 hover:bg-opacity-40"
      }`;
      triggerElement.style.left = trigger.position.x;
      triggerElement.style.top = trigger.position.y;
      triggerElement.style.transform = "translate(-50%, -50%)";

      // Add trigger icon
      triggerElement.innerHTML = `<span class="text-xs font-bold ${
        trigger.visible ? "text-white" : "text-transparent"
      }">${trigger.icon}</span>`;

      // Add click event
      triggerElement.addEventListener("click", () =>
        this._handleTriggerClick(trigger, triggerElement)
      );

      // Add to map
      this.facilityMap.appendChild(triggerElement);
    });
  }

  /**
   * Handle click on a trigger
   * @param {Object} trigger - Trigger data
   * @param {HTMLElement} element - Trigger DOM element
   */
  _handleTriggerClick(trigger, element) {
    if (this.isCompleted) return;

    // If trigger is already visible, do nothing
    if (trigger.visible) return;

    // If already marked by player, unmark it
    if (this.playerMarkedTriggers.includes(trigger.id)) {
      // Remove from marked triggers
      this.playerMarkedTriggers = this.playerMarkedTriggers.filter(
        (id) => id !== trigger.id
      );

      // Update appearance
      element.className =
        "absolute w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 bg-gray-700 bg-opacity-20 hover:bg-opacity-40";
      element.querySelector("span").className =
        "text-xs font-bold text-transparent";
    } else {
      // Add to marked triggers
      this.playerMarkedTriggers.push(trigger.id);

      // Update appearance to show as marked
      element.className = `absolute w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 bg-yellow-500 bg-opacity-70`;
      element.querySelector("span").className = "text-xs font-bold text-white";
    }

    // Update counter
    const counterElement = document.getElementById("trigger-counter");
    if (counterElement) {
      counterElement.textContent = `Triggers identified: ${this.playerMarkedTriggers.length}/${this.correctTriggerCount}`;
    }
  }

  /**
   * Reveal all triggers on the map
   */
  _revealAllTriggers() {
    this.alarmTriggers.forEach((trigger) => {
      const element = document.getElementById(trigger.id);
      if (!element) return;

      // Did player mark this correctly?
      const isMarkedByPlayer = this.playerMarkedTriggers.includes(trigger.id);

      if (trigger.visible || isMarkedByPlayer) {
        // Correctly identified trigger
        element.className = `absolute w-6 h-6 flex items-center justify-center rounded-full cursor-default bg-${trigger.color}-500 bg-opacity-70`;
      } else {
        // Missed trigger
        element.className = `absolute w-6 h-6 flex items-center justify-center rounded-full cursor-default bg-${trigger.color}-500 bg-opacity-40 border-2 border-red-500`;
      }

      // Show icon and type
      element.innerHTML = `<span class="text-xs font-bold text-white">${trigger.icon}</span>`;

      // Add tooltip
      const tooltip = document.createElement("div");
      tooltip.className =
        "absolute top-full left-1/2 transform -translate-x-1/2 text-xs bg-gray-900 text-white px-2 py-1 rounded whitespace-nowrap";
      tooltip.textContent = trigger.description;
      element.appendChild(tooltip);
    });
  }

  /**
   * Start the countdown timer
   */
  _startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      // Update timer display
      if (this.timerElement) {
        this.timerElement.textContent = this._formatTime(this.timeRemaining);

        // Change color when low on time
        if (this.timeRemaining <= 30) {
          this.timerElement.className = "text-red-400 font-mono";
        }
      }

      // Time's up
      if (this.timeRemaining <= 0) {
        this._stopTimer();
        this._handleTimeUp();
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Format time as MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Handle time running out
   */
  _handleTimeUp() {
    this.messageElement.textContent =
      "Time's up! Submit your current analysis.";
    this.messageElement.className = "mb-4 text-red-400 text-center";
  }

  /**
   * Calculate score based on player's identification accuracy
   * @returns {Object} - Score data
   */
  _calculateScore() {
    let correctlyMarked = 0;
    let totalHidden = 0;

    // Count hidden triggers (not immediately visible)
    this.alarmTriggers.forEach((trigger) => {
      if (!trigger.visible) {
        totalHidden++;

        // Check if player marked it
        if (this.playerMarkedTriggers.includes(trigger.id)) {
          correctlyMarked++;
        }
      }
    });

    // Calculate accuracy (just for hidden triggers)
    const accuracy = totalHidden > 0 ? correctlyMarked / totalHidden : 0;

    // Calculate overall completion (including visible ones)
    const totalVisible = this.alarmTriggers.length - totalHidden;
    const overallCompletion =
      (correctlyMarked + totalVisible) / this.alarmTriggers.length;

    return {
      correctlyMarked,
      totalHidden,
      totalVisible,
      accuracy,
      overallCompletion,
    };
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    this._stopTimer();

    // Calculate score
    const score = this._calculateScore();

    // Create solution data to submit
    const solutionData = {
      identifiedTriggers: this.playerMarkedTriggers,
      allTriggers: this.alarmTriggers.map((t) => t.id),
      score: score.overallCompletion,
    };

    // Check if player has passed (require at least 80% overall completion)
    const minimumCompletion = 0.8;
    const hasPassed = score.overallCompletion >= minimumCompletion;

    // Submit to game
    this.submitSolution(solutionData)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          // Show feedback and reveal all triggers
          this._revealAllTriggers();

          let message = "";
          if (score.overallCompletion >= 0.7) {
            message = `Almost there! Identified ${Math.round(
              score.overallCompletion * 100
            )}% of triggers. More careful scanning needed.`;
          } else if (score.overallCompletion >= 0.5) {
            message = `Improvement needed. Identified ${Math.round(
              score.overallCompletion * 100
            )}% of triggers. Look for subtle indicators.`;
          } else {
            message = `Low detection rate (${Math.round(
              score.overallCompletion * 100
            )}%). Try a more methodical approach.`;
          }

          this.messageElement.textContent = message;
          this.messageElement.className = "mb-4 text-red-400 text-center";

          // Update button
          this.submitButton.textContent = "Retry Analysis";
          this.submitButton.addEventListener("click", () =>
            window.location.reload()
          );
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting analysis. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
      });
  }

  /**
   * Get random event message
   * @param {string} eventType - Type of random event
   * @returns {string} - Event message
   */
  _getRandomEventMessage(eventType) {
    switch (eventType) {
      case "security_patrol":
        return "Alert: Unexpected security patrol detected! Continuing surveillance...";
      case "camera_sweep":
        return "Notice: Camera systems performing diagnostic sweep. Maintaining monitor status...";
      case "system_check":
        return "Update: Security system check in progress. Adapting observation...";
      default:
        return "Security alert detected! Maintaining surveillance...";
    }
  }
}

export default AlarmPuzzle;
