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
    this.correctPattern = null;
    this.activeAnimations = []; // Track active animations for cleanup

    // DOM elements will be created during initialization
    this.surveillanceContainer = null;
    this.patternSelectContainer = null;
    this.messageElement = null;
    this.submitButton = null;

    // Handle cleanup on page unload/navigation
    this._boundCleanup = this.cleanup.bind(this);
    window.addEventListener("beforeunload", this._boundCleanup);
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    try {
      // Create main container with error boundary
      const gameArea = document.createElement("div");
      gameArea.className = "flex flex-col items-center mb-6";
      this.containerElement.appendChild(gameArea);

      // Create message area
      this.messageElement = document.createElement("div");
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
      gameArea.appendChild(this.messageElement);

      // Setup the surveillance puzzle components
      this._setupSurveillancePuzzle(gameArea);

      // Create submit button with feedback
      this.submitButton = document.createElement("button");
      this.submitButton.className =
        "heist-button mx-auto block mt-4 transition-all";
      this.submitButton.textContent = "Identify Pattern";
      this.submitButton.addEventListener("click", () => this._handleSubmit());
      gameArea.appendChild(this.submitButton);

      // Add help tooltip
      const helpTip = document.createElement("div");
      helpTip.className = "text-sm text-gray-400 text-center mt-2";
      helpTip.textContent =
        "Select a pattern that matches the guard movement in active cameras";
      gameArea.appendChild(helpTip);
    } catch (error) {
      console.error("Error initializing surveillance puzzle:", error);
      this._showErrorMessage("Failed to initialize puzzle. Please try again.");
    }
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

    try {
      // Stop all animations to save resources
      this._stopAllAnimations();

      // Update UI to show success - check if elements exist first
      if (this.messageElement) {
        this.messageElement.textContent =
          "Correct pattern identified! Security system mapped.";
        this.messageElement.className = "mb-4 text-green-400 text-center";
      }

      // Disable surveillance
      if (this.surveillanceContainer) {
        this.surveillanceContainer.classList.add(
          "opacity-50",
          "pointer-events-none",
          "transition-opacity"
        );
      }

      // Update button if it exists
      if (this.submitButton) {
        this.submitButton.disabled = true;
        this.submitButton.textContent = "Pattern Identified";
        this.submitButton.className =
          "heist-button mx-auto block opacity-50 transition-all";
      }

      // Highlight the correct pattern if it exists
      if (this.correctPattern && this.patternSelectContainer) {
        const patternElement = this.patternSelectContainer.querySelector(
          `[data-pattern="${this.correctPattern}"]`
        );
        if (patternElement) {
          patternElement.classList.add(
            "border-green-500",
            "shadow-lg",
            "shadow-green-500/30"
          );
        }
      }
    } catch (error) {
      console.error("Error showing success state:", error);
    }
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    try {
      // Show message about the random event
      if (this.messageElement) {
        this.messageElement.textContent =
          this._getRandomEventMessage(eventType);
        this.messageElement.className =
          "mb-4 text-red-400 text-center animate-pulse";
      }

      // Add visual distortion to surveillance feeds
      if (this.surveillanceContainer) {
        const feeds =
          this.surveillanceContainer.querySelectorAll(".camera-feed");
        feeds.forEach((feed) => {
          feed.classList.add("filter", "brightness-75", "hue-rotate-15");
        });
      }

      // For the Lookout role, make random events less disruptive
      setTimeout(() => {
        if (this.isCompleted) return;

        // Remove visual distortion
        if (this.surveillanceContainer) {
          const feeds =
            this.surveillanceContainer.querySelectorAll(".camera-feed");
          feeds.forEach((feed) => {
            feed.classList.remove("filter", "brightness-75", "hue-rotate-15");
          });
        }

        // Hide message if element exists
        if (this.messageElement) {
          this.messageElement.className =
            "mb-4 text-yellow-400 text-center hidden";
        }
      }, duration * 500); // Half the time of other roles
    } catch (error) {
      console.error("Error handling random event:", error);
    }
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    try {
      // Stop all animations
      this._stopAllAnimations();

      // Remove event listener
      window.removeEventListener("beforeunload", this._boundCleanup);

      // Clean up pattern selection
      if (this.patternSelectContainer) {
        const patternElements =
          this.patternSelectContainer.querySelectorAll("[data-pattern]");
        patternElements.forEach((el) => {
          el.removeEventListener("click", el.clickHandler);
          delete el.clickHandler;
        });
      }

      // Clean up submit button
      if (this.submitButton) {
        this.submitButton.removeEventListener("click", this._handleSubmit);
      }

      // Clear DOM references
      this.surveillanceContainer = null;
      this.patternSelectContainer = null;
      this.messageElement = null;
      this.submitButton = null;
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Setup surveillance puzzle
   * @param {HTMLElement} container - Container element
   */
  _setupSurveillancePuzzle(container) {
    try {
      // Generate camera data if not provided
      if (!this.puzzleData.data || !this.puzzleData.data.cameras) {
        this._generateRandomCameraData();
      } else {
        this.securityCameras = this.puzzleData.data.cameras;
      }

      // Create surveillance container
      this.surveillanceContainer = document.createElement("div");
      this.surveillanceContainer.className =
        "bg-gray-900 rounded-lg p-4 w-full max-w-4xl mb-6 shadow-lg";

      // Create grid for the security cameras
      const gridContainer = document.createElement("div");
      gridContainer.className = "grid grid-cols-2 md:grid-cols-4 gap-4";

      // Create cameras
      this.securityCameras.forEach((camera, index) => {
        const cameraElement = document.createElement("div");
        cameraElement.className =
          "flex flex-col items-center bg-gray-800 rounded-lg p-2 overflow-hidden transition-all hover:shadow-md";

        // Create camera feed
        const feedContainer = document.createElement("div");
        feedContainer.className =
          "w-full h-32 bg-gray-700 mb-2 rounded relative overflow-hidden camera-feed";

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
        } else {
          // Add static effect for offline cameras
          const staticEffect = document.createElement("div");
          staticEffect.className = "absolute inset-0 bg-noise opacity-20";
          feedContainer.appendChild(staticEffect);
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
        "bg-gray-900 rounded-lg p-4 w-full max-w-4xl shadow-lg";

      // Get pattern choices (including the correct one)
      const patternChoices = this._generatePatternChoices();

      // Create pattern selection header
      const patternHeader = document.createElement("div");
      patternHeader.className = "text-green-400 font-semibold mb-3";
      patternHeader.textContent = "Identify the security patrol pattern:";
      this.patternSelectContainer.appendChild(patternHeader);

      // Create pattern selection options
      const patternsGrid = document.createElement("div");
      patternsGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

      patternChoices.forEach((pattern) => {
        const patternElement = document.createElement("div");
        patternElement.className =
          "bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-all border-2 border-transparent transform hover:scale-102";
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

        // Store click handler to allow proper cleanup later
        const clickHandler = () => {
          // Clear previous selection
          patternsGrid.querySelectorAll("div[data-pattern]").forEach((el) => {
            el.classList.remove("border-green-500", "shadow-md");
          });

          // Set new selection
          patternElement.classList.add("border-green-500", "shadow-md");
          this.selectedPattern = pattern.id;
        };

        // Add click event and store reference for cleanup
        patternElement.addEventListener("click", clickHandler);
        patternElement.clickHandler = clickHandler;

        patternsGrid.appendChild(patternElement);
      });

      this.patternSelectContainer.appendChild(patternsGrid);
      container.appendChild(this.patternSelectContainer);
    } catch (error) {
      console.error("Error setting up surveillance puzzle:", error);
      this._showErrorMessage(
        "Failed to set up surveillance system. Please try again."
      );
    }
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
    this.correctPattern = correctPattern.id;

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
    guard.className =
      "absolute w-3 h-3 bg-red-500 rounded-full transform transition-all";

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

        if (!this.isCompleted) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animate();

      // Store animation ID for cleanup
      this.activeAnimations.push(animationFrameId);
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
    let animation = "";

    switch (pattern.id) {
      case "clockwise":
        pathD = `M 50,20 A 30,30 0 1,1 49,20`;
        animation =
          '<animateTransform attributeName="transform" type="rotate" from="0 50 40" to="360 50 40" dur="3s" repeatCount="indefinite" />';
        break;
      case "sequential":
        pathD = "M 20,20 L 80,20 L 80,60 L 20,60 Z";
        animation = `
          <circle cx="20" cy="20" r="3" fill="#22c55e">
            <animate attributeName="cx" values="20;80;80;20;20" dur="4s" repeatCount="indefinite" />
            <animate attributeName="cy" values="20;20;60;60;20" dur="4s" repeatCount="indefinite" />
          </circle>
        `;
        break;
      case "alternating":
        pathD = "M 20,40 L 80,40 M 20,35 L 20,45 M 80,35 L 80,45";
        animation = `
          <circle cx="20" cy="40" r="3" fill="#22c55e">
            <animate attributeName="cx" values="20;80;20" dur="2s" repeatCount="indefinite" />
          </circle>
        `;
        break;
      case "random":
        pathD = "M 20,20 L 40,60 L 60,30 L 80,50";
        animation = `
          <circle cx="20" cy="20" r="3" fill="#22c55e">
            <animate attributeName="cx" values="20;40;60;80;20" dur="4s" repeatCount="indefinite" />
            <animate attributeName="cy" values="20;60;30;50;20" dur="4s" repeatCount="indefinite" />
          </circle>
        `;
        break;
    }

    return `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="90" height="70" fill="none" stroke="#2d3748" stroke-width="2" rx="3" />
        <path d="${pathD}" stroke="#22c55e" stroke-width="2" fill="none" />
        ${animation}
      </svg>
    `;
  }

  /**
   * Handle submit button click
   */
  _handleSubmit() {
    try {
      // Check if a pattern is selected
      if (!this.selectedPattern) {
        this._showMessage("Please select a pattern first!", "error");
        return;
      }

      // Submit solution
      if (this.submitButton) {
        this.submitButton.disabled = true;
        this.submitButton.textContent = "Analyzing...";
        this.submitButton.classList.add("animate-pulse");
      }

      this.submitSolution(this.selectedPattern)
        .then((success) => {
          if (success) {
            this.showSuccess();
          } else {
            this._showMessage(
              "Incorrect pattern identified. Try again!",
              "error"
            );
            if (this.submitButton) {
              this.submitButton.disabled = false;
              this.submitButton.textContent = "Identify Pattern";
              this.submitButton.classList.remove("animate-pulse");
            }
          }
        })
        .catch((error) => {
          console.error("Error submitting solution:", error);
          this._showMessage("Error analyzing pattern. Try again!", "error");
          if (this.submitButton) {
            this.submitButton.disabled = false;
            this.submitButton.textContent = "Identify Pattern";
            this.submitButton.classList.remove("animate-pulse");
          }
        });
    } catch (error) {
      console.error("Error in submit handler:", error);
      this._showErrorMessage("An error occurred. Please try again.");
    }
  }

  /**
   * Show a message to the user
   * @param {string} message - Message to display
   * @param {string} type - Message type (error, success, info)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    let className = "mb-4 text-center ";

    switch (type) {
      case "error":
        className += "text-red-400";
        break;
      case "success":
        className += "text-green-400";
        break;
      default:
        className += "text-yellow-400";
    }

    this.messageElement.textContent = message;
    this.messageElement.className = className;
  }

  /**
   * Show an error message and log to console
   * @param {string} message - Error message
   */
  _showErrorMessage(message) {
    console.error(message);
    this._showMessage(message, "error");
  }

  /**
   * Stop all active animations to save resources
   */
  _stopAllAnimations() {
    this.activeAnimations.forEach((id) => {
      if (id) cancelAnimationFrame(id);
    });
    this.activeAnimations = [];
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
