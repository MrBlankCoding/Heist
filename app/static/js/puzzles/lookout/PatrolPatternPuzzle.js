// PatrolPatternPuzzle.js - Lookout puzzle for patrol pattern analysis (type 2)

class PatrolPatternPuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;

    // Patrol puzzle specific properties
    this.patrolData = null;
    this.playerPredictions = [];
    this.timerInterval = null;
    this.simulationTime = 0;
    this.simulationRunning = false;
    this.timescale = 1;

    // DOM elements
    this.patrolContainer = null;
    this.mapContainer = null;
    this.timeMarker = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create game area
    const gameArea = document.createElement("div");
    gameArea.className = "flex flex-col items-center mb-6";
    this.containerElement.appendChild(gameArea);

    this._setupPatrolPatternPuzzle(gameArea);

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Submit Predictions";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Get puzzle title
   * @returns {string} - Puzzle title
   */
  getTitle() {
    return "Patrol Pattern Analysis";
  }

  /**
   * Get puzzle instructions
   * @returns {string} - Puzzle instructions
   */
  getInstructions() {
    return "Analyze the patrol routes and predict the timing of guard rotations.";
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Pause simulation
    this._pauseSimulation();

    // Update UI to show success
    this.messageElement.textContent =
      "Correct predictions! Patrol patterns successfully analyzed.";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable patrol UI
    if (this.patrolContainer) {
      this.patrolContainer.classList.add("opacity-50", "pointer-events-none");
    }

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Predictions Confirmed";
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
    // Stop simulation
    this._pauseSimulation();

    // Clear references
    this.patrolContainer = null;
    this.mapContainer = null;
    this.timeMarker = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Setup Patrol Pattern puzzle
   * @param {HTMLElement} container - Container element
   */
  _setupPatrolPatternPuzzle(container) {
    // Patrol puzzle data
    this.patrolData = this.puzzleData.data || this._generatePatrolData();
    this.playerPredictions = [];
    this.simulationTime = 0;

    // Create patrol map container
    this.patrolContainer = document.createElement("div");
    this.patrolContainer.className =
      "bg-gray-900 rounded-lg p-4 w-full max-w-4xl mb-6";

    // Create grid layout for the floor plan
    const mapContainer = document.createElement("div");
    mapContainer.className =
      "relative border-2 border-gray-700 bg-gray-800 w-full aspect-square max-w-xl mx-auto mb-4";

    // Add room labels and walls
    mapContainer.innerHTML = `
      <div class="absolute inset-0 grid grid-cols-4 grid-rows-4">
        ${this._createRoomGrid()}
      </div>
      ${this._createWalls()}
    `;

    // Add guard markers
    this.patrolData.guards.forEach((guard, index) => {
      const guardMarker = document.createElement("div");
      guardMarker.className =
        "absolute w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500";
      guardMarker.id = `guard-${index}`;
      guardMarker.style.left = `${guard.positions[0].x * 100}%`;
      guardMarker.style.top = `${guard.positions[0].y * 100}%`;

      // Add guard label
      const guardLabel = document.createElement("div");
      guardLabel.className =
        "absolute top-full left-1/2 transform -translate-x-1/2 text-xs text-red-400 whitespace-nowrap";
      guardLabel.textContent = `Guard ${index + 1}`;
      guardMarker.appendChild(guardLabel);

      mapContainer.appendChild(guardMarker);
    });

    // Create timeline container
    const timelineContainer = document.createElement("div");
    timelineContainer.className = "w-full max-w-xl mx-auto mb-4";

    // Create timeline
    const timeline = document.createElement("div");
    timeline.className =
      "w-full h-8 bg-gray-800 border border-gray-700 rounded-lg relative";

    // Create timeline marker
    this.timeMarker = document.createElement("div");
    this.timeMarker.className =
      "absolute top-0 bottom-0 w-1 bg-green-500 left-0 transition-all duration-300";
    timeline.appendChild(this.timeMarker);

    // Add checkpoints to timeline
    for (let i = 0; i <= 100; i += 25) {
      const checkpoint = document.createElement("div");
      checkpoint.className = "absolute top-full h-2 w-0.5 bg-gray-500";
      checkpoint.style.left = `${i}%`;

      const label = document.createElement("div");
      label.className =
        "absolute top-3 text-xs text-gray-400 transform -translate-x-1/2";
      label.textContent = `${i}s`;
      checkpoint.appendChild(label);

      timeline.appendChild(checkpoint);
    }

    timelineContainer.appendChild(timeline);

    // Create alarm prediction interface
    const predictionContainer = document.createElement("div");
    predictionContainer.className = "bg-gray-800 p-4 rounded-lg mb-4";

    const predictionHeader = document.createElement("div");
    predictionHeader.className = "text-green-400 font-semibold mb-2";
    predictionHeader.textContent =
      "Predict when guards will reach high-security areas:";

    // Create prediction form
    const predictionForm = document.createElement("div");
    predictionForm.className = "grid grid-cols-1 sm:grid-cols-2 gap-4";

    // Add high-security zones to predict
    this.patrolData.securityZones.forEach((zone, index) => {
      const zonePredictor = document.createElement("div");
      zonePredictor.className = "flex items-center space-x-2";

      const zoneColor = this._getSecurityZoneColor(zone.level);

      zonePredictor.innerHTML = `
        <div class="w-3 h-3 rounded-full bg-${zoneColor}-500"></div>
        <div class="text-gray-300 text-sm flex-grow">Zone ${index + 1} (${
        zone.name
      })</div>
      `;

      // Time input
      const timeInput = document.createElement("input");
      timeInput.type = "number";
      timeInput.min = "0";
      timeInput.max = "100";
      timeInput.step = "1";
      timeInput.className =
        "w-16 bg-gray-700 text-white rounded px-2 py-1 text-center";
      timeInput.placeholder = "0s";
      timeInput.dataset.zoneIndex = index;

      // Update player predictions
      timeInput.addEventListener("change", (e) => {
        this.playerPredictions[index] = parseInt(e.target.value, 10);
      });

      zonePredictor.appendChild(timeInput);
      predictionForm.appendChild(zonePredictor);
    });

    predictionContainer.appendChild(predictionHeader);
    predictionContainer.appendChild(predictionForm);

    // Create simulation controls
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "flex justify-center space-x-4 mb-4";

    // Play/pause button
    const playButton = document.createElement("button");
    playButton.className =
      "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded";
    playButton.innerHTML =
      '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>';
    playButton.addEventListener("click", () => this._toggleSimulation());

    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className =
      "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded";
    resetButton.innerHTML =
      '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"></path></svg>';
    resetButton.addEventListener("click", () => this._resetSimulation());

    // Speed controls
    const speedControl = document.createElement("div");
    speedControl.className = "flex items-center space-x-2";

    const speedLabel = document.createElement("span");
    speedLabel.className = "text-sm text-gray-400";
    speedLabel.textContent = "Speed:";

    const speedButtons = document.createElement("div");
    speedButtons.className = "flex space-x-1";

    [1, 2, 4].forEach((speed) => {
      const speedButton = document.createElement("button");
      speedButton.className = `px-2 py-1 text-xs rounded ${
        this.timescale === speed ? "bg-green-600" : "bg-gray-700"
      } text-white`;
      speedButton.textContent = `${speed}x`;
      speedButton.dataset.speed = speed;

      speedButton.addEventListener("click", (e) => {
        // Update speed buttons styling
        speedButtons.querySelectorAll("button").forEach((btn) => {
          btn.className = `px-2 py-1 text-xs rounded bg-gray-700 text-white`;
        });
        e.target.className = `px-2 py-1 text-xs rounded bg-green-600 text-white`;

        // Update timescale
        this.timescale = parseInt(e.target.dataset.speed, 10);
      });

      speedButtons.appendChild(speedButton);
    });

    speedControl.appendChild(speedLabel);
    speedControl.appendChild(speedButtons);

    controlsContainer.appendChild(playButton);
    controlsContainer.appendChild(resetButton);
    controlsContainer.appendChild(speedControl);

    // Add everything to the patrol container
    this.patrolContainer.appendChild(mapContainer);
    this.patrolContainer.appendChild(timelineContainer);
    this.patrolContainer.appendChild(predictionContainer);
    this.patrolContainer.appendChild(controlsContainer);

    // Store the map container for animations
    this.mapContainer = mapContainer;

    // Mark security zones on the map
    this._markSecurityZones();

    container.appendChild(this.patrolContainer);
  }

  /**
   * Generate random patrol data when not provided by server
   * @returns {Object} - Generated patrol data
   */
  _generatePatrolData() {
    // Define rooms in a 4x4 grid
    const rooms = [
      "Entrance",
      "Hallway A",
      "Lobby",
      "Hallway B",
      "Storage",
      "Hallway C",
      "Reception",
      "Security",
      "Server Room",
      "Hallway D",
      "Office",
      "Vault Hallway",
      "Maintenance",
      "Hallway E",
      "Conference",
      "Vault",
    ];

    // Define walls to create a believable layout
    const walls = [
      // Horizontal walls (format: startX, startY, endX, endY)
      [0.25, 0.25, 0.75, 0.25], // Example wall
      [0.25, 0.5, 0.5, 0.5],
      [0.75, 0.5, 1, 0.5],
      [0, 0.75, 0.25, 0.75],
      [0.5, 0.75, 0.75, 0.75],
      // Vertical walls
      [0.25, 0, 0.25, 0.25],
      [0.75, 0, 0.75, 0.25],
      [0.5, 0.25, 0.5, 0.5],
      [0.25, 0.5, 0.25, 0.75],
      [0.75, 0.5, 0.75, 0.75],
      [0.5, 0.75, 0.5, 1],
    ];

    // Define guards with patrol routes
    const guards = [
      {
        id: "guard-1",
        positions: [
          { x: 0.125, y: 0.125, time: 0 }, // Entrance
          { x: 0.375, y: 0.125, time: 10 }, // Hallway A
          { x: 0.625, y: 0.125, time: 20 }, // Lobby
          { x: 0.625, y: 0.375, time: 30 }, // Reception
          { x: 0.625, y: 0.625, time: 45 }, // Office
          { x: 0.375, y: 0.625, time: 55 }, // Hallway D
          { x: 0.125, y: 0.625, time: 65 }, // Server Room
          { x: 0.125, y: 0.375, time: 80 }, // Storage
          { x: 0.125, y: 0.125, time: 90 }, // Back to entrance
        ],
      },
      {
        id: "guard-2",
        positions: [
          { x: 0.875, y: 0.125, time: 0 }, // Hallway B
          { x: 0.875, y: 0.375, time: 15 }, // Security
          { x: 0.875, y: 0.625, time: 35 }, // Vault Hallway
          { x: 0.875, y: 0.875, time: 50 }, // Vault
          { x: 0.625, y: 0.875, time: 65 }, // Conference
          { x: 0.375, y: 0.875, time: 75 }, // Hallway E
          { x: 0.125, y: 0.875, time: 85 }, // Maintenance
          { x: 0.875, y: 0.125, time: 100 }, // Back to start
        ],
      },
    ];

    // Define security zones (high-security areas)
    const securityZones = [
      {
        id: "zone-1",
        name: "Server Room",
        position: { x: 0.125, y: 0.625 },
        radius: 0.075,
        level: "high",
        guardEnterTime: 65, // When guard 1 enters
      },
      {
        id: "zone-2",
        name: "Security Room",
        position: { x: 0.875, y: 0.375 },
        radius: 0.075,
        level: "medium",
        guardEnterTime: 15, // When guard 2 enters
      },
      {
        id: "zone-3",
        name: "Vault",
        position: { x: 0.875, y: 0.875 },
        radius: 0.075,
        level: "critical",
        guardEnterTime: 50, // When guard 2 enters
      },
    ];

    return {
      rooms,
      walls,
      guards,
      securityZones,
      duration: 100, // Total simulation time in seconds
    };
  }

  /**
   * Create room grid markup
   * @returns {string} - HTML string for room grid
   */
  _createRoomGrid() {
    let html = "";

    this.patrolData.rooms.forEach((room, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;

      html += `
        <div class="border border-gray-700 flex items-center justify-center">
          <div class="text-center">
            <div class="text-xs text-gray-400">${room}</div>
            <div class="text-xs text-gray-500">${row},${col}</div>
          </div>
        </div>
      `;
    });

    return html;
  }

  /**
   * Create walls markup
   * @returns {string} - HTML string for walls
   */
  _createWalls() {
    let html = "";

    this.patrolData.walls.forEach((wall, index) => {
      const [startX, startY, endX, endY] = wall;
      const isHorizontal = startY === endY;

      const width = isHorizontal ? (endX - startX) * 100 : 1;
      const height = isHorizontal ? 1 : (endY - startY) * 100;

      html += `
        <div 
          class="absolute bg-gray-600" 
          style="
            left: ${startX * 100}%; 
            top: ${startY * 100}%; 
            width: ${width}%; 
            height: ${height}%;
          "
        ></div>
      `;
    });

    return html;
  }

  /**
   * Mark security zones on the map
   */
  _markSecurityZones() {
    this.patrolData.securityZones.forEach((zone, index) => {
      const zoneMarker = document.createElement("div");
      const zoneColor = this._getSecurityZoneColor(zone.level);

      zoneMarker.className = `absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-${zoneColor}-500 bg-${zoneColor}-500 bg-opacity-20`;
      zoneMarker.style.left = `${zone.position.x * 100}%`;
      zoneMarker.style.top = `${zone.position.y * 100}%`;
      zoneMarker.style.width = `${zone.radius * 200}px`;
      zoneMarker.style.height = `${zone.radius * 200}px`;

      // Add zone label
      const zoneLabel = document.createElement("div");
      zoneLabel.className =
        "absolute top-full left-1/2 transform -translate-x-1/2 text-xs text-green-400 font-bold whitespace-nowrap";
      zoneLabel.textContent = `Zone ${index + 1}`;
      zoneMarker.appendChild(zoneLabel);

      this.mapContainer.appendChild(zoneMarker);
    });
  }

  /**
   * Get color based on security zone level
   * @param {string} level - Security level
   * @returns {string} - Color name
   */
  _getSecurityZoneColor(level) {
    switch (level) {
      case "low":
        return "blue";
      case "medium":
        return "yellow";
      case "high":
        return "orange";
      case "critical":
        return "red";
      default:
        return "gray";
    }
  }

  /**
   * Toggle simulation play/pause
   */
  _toggleSimulation() {
    if (this.simulationRunning) {
      this._pauseSimulation();
    } else {
      this._startSimulation();
    }
  }

  /**
   * Start patrol simulation
   */
  _startSimulation() {
    this.simulationRunning = true;

    // Clear existing interval if any
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Start timer
    this.timerInterval = setInterval(() => {
      this.simulationTime += 0.1 * this.timescale;

      // Cap at max duration
      if (this.simulationTime > this.patrolData.duration) {
        this.simulationTime = this.patrolData.duration;
        this._pauseSimulation();
      }

      // Update time marker
      this.timeMarker.style.left = `${
        (this.simulationTime / this.patrolData.duration) * 100
      }%`;

      // Update guard positions
      this._updateGuardPositions();
    }, 100); // Update every 100ms
  }

  /**
   * Pause simulation
   */
  _pauseSimulation() {
    this.simulationRunning = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Reset simulation to start
   */
  _resetSimulation() {
    this._pauseSimulation();
    this.simulationTime = 0;

    // Reset time marker
    this.timeMarker.style.left = "0%";

    // Reset guard positions
    this._updateGuardPositions();
  }

  /**
   * Update guard positions based on current time
   */
  _updateGuardPositions() {
    this.patrolData.guards.forEach((guard, guardIndex) => {
      const guardElement = document.getElementById(`guard-${guardIndex}`);
      if (!guardElement) return;

      // Find the two position waypoints surrounding the current time
      let startPos = null;
      let endPos = null;

      for (let i = 0; i < guard.positions.length - 1; i++) {
        if (
          this.simulationTime >= guard.positions[i].time &&
          this.simulationTime <= guard.positions[i + 1].time
        ) {
          startPos = guard.positions[i];
          endPos = guard.positions[i + 1];
          break;
        }
      }

      // If at the end of the route, loop back to beginning
      if (!startPos && !endPos && guard.positions.length > 1) {
        if (
          this.simulationTime > guard.positions[guard.positions.length - 1].time
        ) {
          startPos = guard.positions[guard.positions.length - 1];
          endPos = guard.positions[0];
          // Adjust time for looping
          endPos = { ...endPos, time: endPos.time + this.patrolData.duration };
        }
      }

      // If valid positions found, interpolate between them
      if (startPos && endPos) {
        const totalTime = endPos.time - startPos.time;
        const elapsed = this.simulationTime - startPos.time;
        const progress = elapsed / totalTime;

        // Linear interpolation
        const x = startPos.x + (endPos.x - startPos.x) * progress;
        const y = startPos.y + (endPos.y - startPos.y) * progress;

        // Update guard position
        guardElement.style.left = `${x * 100}%`;
        guardElement.style.top = `${y * 100}%`;
      }
    });
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    // Make sure we have predictions for all zones
    const allZonesPredicted = this.patrolData.securityZones.every(
      (_, i) => this.playerPredictions[i] !== undefined
    );

    if (!allZonesPredicted) {
      this.messageElement.textContent =
        "Please predict times for all security zones!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Compare predictions with actual times
    const correctPredictions = this.patrolData.securityZones.map((zone, i) => {
      const prediction = this.playerPredictions[i];
      const actual = zone.guardEnterTime;

      // Allow for a margin of error (5 seconds)
      return Math.abs(prediction - actual) <= 5;
    });

    // Determine overall success (require accuracy for critical zones)
    const criticalZones = this.patrolData.securityZones.filter(
      (z) => z.level === "critical"
    );
    const criticalZoneIndexes = criticalZones.map((cz) =>
      this.patrolData.securityZones.findIndex((z) => z.id === cz.id)
    );

    // Ensure critical zones are correct
    const criticalZonesCorrect = criticalZoneIndexes.every(
      (i) => correctPredictions[i]
    );

    // Require most zones to be correct and all critical zones
    const overallCorrect =
      correctPredictions.filter((p) => p).length >=
        Math.ceil(correctPredictions.length * 0.7) && criticalZonesCorrect;

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Submitting...";

    this.submitSolution(this.playerPredictions)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent =
            "Prediction incorrect. Guard patrol times not accurately predicted!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Submit Predictions";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent =
          "Error submitting predictions. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Submit Predictions";
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

export default PatrolPatternPuzzle;
