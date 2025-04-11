// SurveillancePuzzle.js - Lookout puzzle for security surveillance (type 1)

class SurveillancePuzzle {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;

    // Surveillance puzzle specific properties
    this.securityCameras = [];
    this.detectedPatterns = [];
    this.selectedPattern = null;

    // DOM elements will be created during initialization
    this.surveillanceContainer = null;
    this.patternSelectContainer = null;
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

    this._setupSurveillancePuzzle(gameArea);

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Identify Pattern";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Get puzzle title
   * @returns {string} - Puzzle title
   */
  getTitle() {
    return "Security Surveillance";
  }

  /**
   * Get puzzle instructions
   * @returns {string} - Puzzle instructions
   */
  getInstructions() {
    return "Monitor the security cameras and identify the correct patrol pattern of the guards. Select the matching pattern from the options below.";
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent =
      "Correct pattern identified! Security system mapped.";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable surveillance
    if (this.surveillanceContainer) {
      this.surveillanceContainer.classList.add(
        "opacity-50",
        "pointer-events-none"
      );
    }

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Pattern Identified";
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
    // Clear references
    this.surveillanceContainer = null;
    this.patternSelectContainer = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Setup surveillance puzzle
   * @param {HTMLElement} container - Container element
   */
  _setupSurveillancePuzzle(container) {
    // Generate camera data if not provided
    if (!this.puzzleData.data || !this.puzzleData.data.cameras) {
      this._generateRandomCameraData();
    } else {
      this.securityCameras = this.puzzleData.data.cameras;
    }

    // Create surveillance container
    this.surveillanceContainer = document.createElement("div");
    this.surveillanceContainer.className =
      "bg-gray-900 rounded-lg p-4 w-full max-w-4xl mb-6";

    // Create grid for the security cameras
    const gridContainer = document.createElement("div");
    gridContainer.className = "grid grid-cols-4 gap-4";

    // Create cameras
    this.securityCameras.forEach((camera, index) => {
      const cameraElement = document.createElement("div");
      cameraElement.className =
        "flex flex-col items-center bg-gray-800 rounded-lg p-2 overflow-hidden";

      // Create camera feed
      const feedContainer = document.createElement("div");
      feedContainer.className =
        "w-full h-32 bg-gray-700 mb-2 rounded relative overflow-hidden";

      // Add camera static or content
      feedContainer.innerHTML = `
        <div class="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center">
          <div class="text-xs text-gray-400">CAMERA ${index + 1}</div>
        </div>
        <div class="absolute top-1 right-1 w-2 h-2 rounded-full ${
          camera.active ? "bg-green-500 animate-pulse" : "bg-red-500"
        }"></div>
      `;

      // Add camera content based on state
      if (camera.active) {
        // Create camera feed with moving objects
        this._createCameraFeed(feedContainer, camera);
      }

      // Create camera controls
      const cameraControls = document.createElement("div");
      cameraControls.className = "flex justify-between w-full text-xs";
      cameraControls.innerHTML = `
        <span class="text-gray-400">ID: SEC${index + 1}</span>
        <span class="text-${camera.active ? "green" : "red"}-400">${
        camera.active ? "ACTIVE" : "OFFLINE"
      }</span>
      `;

      cameraElement.appendChild(feedContainer);
      cameraElement.appendChild(cameraControls);
      gridContainer.appendChild(cameraElement);
    });

    this.surveillanceContainer.appendChild(gridContainer);
    container.appendChild(this.surveillanceContainer);

    // Create pattern selection area
    this.patternSelectContainer = document.createElement("div");
    this.patternSelectContainer.className =
      "bg-gray-900 rounded-lg p-4 w-full max-w-4xl";

    // Get pattern choices (including the correct one)
    const patternChoices = this._generatePatternChoices();

    // Create pattern selection header
    const patternHeader = document.createElement("div");
    patternHeader.className = "text-green-400 font-semibold mb-3";
    patternHeader.textContent = "Identify the security patrol pattern:";
    this.patternSelectContainer.appendChild(patternHeader);

    // Create pattern selection options
    const patternsGrid = document.createElement("div");
    patternsGrid.className = "grid grid-cols-2 gap-4";

    patternChoices.forEach((pattern, index) => {
      const patternElement = document.createElement("div");
      patternElement.className =
        "bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-all border-2 border-transparent";
      patternElement.dataset.pattern = pattern.id;

      // Pattern visualization
      const visualization = document.createElement("div");
      visualization.className = "flex items-center justify-center h-24 mb-2";
      visualization.innerHTML = this._createPatternVisualization(pattern);

      // Pattern description
      const description = document.createElement("div");
      description.className = "text-gray-300 text-sm";
      description.textContent = pattern.description;

      patternElement.appendChild(visualization);
      patternElement.appendChild(description);

      // Add click event
      patternElement.addEventListener("click", () => {
        // Clear previous selection
        patternsGrid.querySelectorAll("div[data-pattern]").forEach((el) => {
          el.classList.remove("border-green-500");
        });

        // Set new selection
        patternElement.classList.add("border-green-500");
        this.selectedPattern = pattern.id;
      });

      patternsGrid.appendChild(patternElement);
    });

    this.patternSelectContainer.appendChild(patternsGrid);
    container.appendChild(this.patternSelectContainer);
  }

  /**
   * Generate random camera data
   */
  _generateRandomCameraData() {
    // Create 8 cameras (2 rows of 4)
    this.securityCameras = [];

    // Define pattern types
    const patternTypes = [
      { id: "clockwise", description: "Clockwise rotation patrol" },
      { id: "sequential", description: "Sequential room checks" },
      { id: "alternating", description: "Alternating positions" },
      { id: "random", description: "Random patrol locations" },
    ];

    // Pick a correct pattern
    const correctPatternIndex = Math.floor(Math.random() * patternTypes.length);
    const correctPattern = patternTypes[correctPatternIndex];

    // Store available patterns
    this.detectedPatterns = patternTypes;

    // Create cameras with some offline
    for (let i = 0; i < 8; i++) {
      // Make 70% of cameras active
      const isActive = Math.random() < 0.7;

      this.securityCameras.push({
        id: `cam-${i}`,
        name: `Security Camera ${i + 1}`,
        active: isActive,
        position: {
          x: Math.floor(i % 4),
          y: Math.floor(i / 4),
        },
        pattern: isActive ? correctPattern.id : null,
      });
    }
  }

  /**
   * Create camera feed with moving elements
   * @param {HTMLElement} container - Camera feed container
   * @param {Object} camera - Camera data
   */
  _createCameraFeed(container, camera) {
    const patternId = camera.pattern;

    // Add guard moving element based on pattern
    const guard = document.createElement("div");
    guard.className = "absolute w-3 h-3 bg-red-500 rounded-full";

    // Set initial position
    let x = 10;
    let y = 10;

    guard.style.left = `${x}px`;
    guard.style.top = `${y}px`;

    container.appendChild(guard);

    // Animate based on pattern
    if (patternId) {
      let animationFrameId;

      const animate = () => {
        if (patternId === "clockwise") {
          // Clockwise pattern
          const centerX = container.clientWidth / 2;
          const centerY = container.clientHeight / 2;
          const radius = Math.min(centerX, centerY) - 10;
          const time = Date.now() / 1000;

          x = centerX + Math.cos(time) * radius;
          y = centerY + Math.sin(time) * radius;
        } else if (patternId === "sequential") {
          // Sequential pattern
          const time = Date.now() / 1000;
          const position = Math.floor(time % 4);

          const positions = [
            { x: 10, y: 10 },
            { x: container.clientWidth - 10, y: 10 },
            { x: container.clientWidth - 10, y: container.clientHeight - 10 },
            { x: 10, y: container.clientHeight - 10 },
          ];

          x = positions[position].x;
          y = positions[position].y;
        } else if (patternId === "alternating") {
          // Alternating pattern
          const time = Date.now() / 1000;
          const isFirst = Math.floor(time % 2) === 0;

          x = isFirst ? 10 : container.clientWidth - 10;
          y = container.clientHeight / 2;
        } else {
          // Random movement
          const time = Date.now() / 1000;
          const seed = Math.floor(time / 2);

          // Pseudo-random but predictable movement
          const randomX = Math.sin(seed * 0.7) * 0.5 + 0.5;
          const randomY = Math.cos(seed * 0.9) * 0.5 + 0.5;

          x = randomX * (container.clientWidth - 20) + 10;
          y = randomY * (container.clientHeight - 20) + 10;
        }

        guard.style.left = `${x}px`;
        guard.style.top = `${y}px`;

        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      // Store animation ID for cleanup
      container.dataset.animationId = animationFrameId;
    }
  }

  /**
   * Generate pattern choices for the player to select from
   * @returns {Array} - Array of pattern objects
   */
  _generatePatternChoices() {
    // For simplicity, we'll return all detected patterns
    // In a full implementation, you would ensure the correct answer is included
    return this.detectedPatterns;
  }

  /**
   * Create SVG visualization of a pattern
   * @param {Object} pattern - Pattern data
   * @returns {string} - SVG HTML
   */
  _createPatternVisualization(pattern) {
    const svgWidth = 100;
    const svgHeight = 80;

    let pathD = "";

    switch (pattern.id) {
      case "clockwise":
        pathD = `M 50,20 A 30,30 0 1,1 49,20`;
        break;
      case "sequential":
        pathD = "M 20,20 L 80,20 L 80,60 L 20,60 Z";
        break;
      case "alternating":
        pathD = "M 20,40 L 80,40 M 20,35 L 20,45 M 80,35 L 80,45";
        break;
      case "random":
        pathD = "M 20,20 L 40,60 L 60,30 L 80,50";
        break;
    }

    return `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="90" height="70" fill="none" stroke="#2d3748" stroke-width="2" />
        <path d="${pathD}" stroke="#22c55e" stroke-width="2" fill="none" />
        <circle cx="20" cy="20" r="3" fill="#22c55e" />
        ${
          pattern.id === "clockwise"
            ? '<animateTransform attributeName="transform" type="rotate" from="0 50 40" to="360 50 40" dur="3s" repeatCount="indefinite" />'
            : ""
        }
      </svg>
    `;
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    // Check if a pattern is selected
    if (!this.selectedPattern) {
      this.messageElement.textContent = "Please select a pattern first!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Analyzing...";

    this.submitSolution(this.selectedPattern)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent =
            "Incorrect pattern identified. Try again!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Identify Pattern";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent = "Error analyzing pattern. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Identify Pattern";
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

export default SurveillancePuzzle;
