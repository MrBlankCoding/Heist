// AlarmBypassPuzzle.js - Team Puzzle 1: Alarm Bypass
// Difficulty: 1/5 - Introductory team puzzle

class AlarmBypassPuzzle {
  constructor(containerElement, puzzleData, callbacks, playerRole) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.playerRole = playerRole;
    this.isComplete = false;

    // Team state tracking
    this.teamState = {
      hackerComplete: false,
      lookoutComplete: false,
      safeCrackerComplete: false,
      demolitionsComplete: false,
      securityCodes: {},
      alarmStatus: "active",
    };

    // Role-specific elements
    this.roleElements = {};

    // DOM elements
    this.mainDisplay = null;
    this.teamStatusElement = null;
    this.controlPanel = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this._createUI();
    this._initializeRoleContent();
    this._updateTeamStatusDisplay();

    this.callbacks.showMessage(
      "Work with your team to bypass the alarm system. Each role has a different task.",
      "info"
    );
  }

  /**
   * Create the UI for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className = "alarm-bypass-puzzle flex flex-col space-y-6";

    // Main display area - top section
    this.mainDisplay = document.createElement("div");
    this.mainDisplay.className =
      "main-display p-4 bg-gray-900 rounded-lg border border-gray-700 text-center";

    const alarmIcon = document.createElement("div");
    alarmIcon.className = "mb-4 text-center";
    alarmIcon.innerHTML = `
      <svg class="h-16 w-16 mx-auto text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="text-xl font-bold text-white mt-2">Security Alarm System</div>
      <div class="text-red-500 font-bold mt-1">ACTIVE</div>
    `;
    this.mainDisplay.appendChild(alarmIcon);

    puzzleContainer.appendChild(this.mainDisplay);

    // Team status display - middle section
    this.teamStatusElement = document.createElement("div");
    this.teamStatusElement.className =
      "team-status p-4 bg-gray-800 rounded-lg grid grid-cols-2 gap-4";

    const roles = ["Hacker", "Lookout", "Safe Cracker", "Demolitions"];
    roles.forEach((role) => {
      const statusElement = document.createElement("div");
      statusElement.className = "p-2 rounded-md text-center";

      // Set color based on role
      if (role === "Hacker") {
        statusElement.classList.add("bg-cyan-900", "text-cyan-100");
      } else if (role === "Safe Cracker") {
        statusElement.classList.add("bg-yellow-900", "text-yellow-100");
      } else if (role === "Demolitions") {
        statusElement.classList.add("bg-red-900", "text-red-100");
      } else if (role === "Lookout") {
        statusElement.classList.add("bg-green-900", "text-green-100");
      }

      statusElement.innerHTML = `
        <div class="font-bold">${role}</div>
        <div class="status-indicator text-sm mt-1">Waiting...</div>
      `;

      this.teamStatusElement.appendChild(statusElement);
    });

    puzzleContainer.appendChild(this.teamStatusElement);

    // Role-specific control panel - bottom section
    this.controlPanel = document.createElement("div");
    this.controlPanel.className = "control-panel p-4 bg-gray-800 rounded-lg";

    // Role title
    const roleTitle = document.createElement("div");
    roleTitle.className = "font-bold text-center mb-4";

    // Set color based on role
    if (this.playerRole === "Hacker") {
      roleTitle.className += " text-cyan-400";
    } else if (this.playerRole === "Safe Cracker") {
      roleTitle.className += " text-yellow-400";
    } else if (this.playerRole === "Demolitions") {
      roleTitle.className += " text-red-400";
    } else if (this.playerRole === "Lookout") {
      roleTitle.className += " text-green-400";
    }

    roleTitle.textContent = `Your Role: ${this.playerRole}`;
    this.controlPanel.appendChild(roleTitle);

    // Role controls container - will be filled per role
    const roleControls = document.createElement("div");
    roleControls.className = "role-controls";
    this.controlPanel.appendChild(roleControls);
    this.roleElements.controls = roleControls;

    puzzleContainer.appendChild(this.controlPanel);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Initialize role-specific content
   */
  _initializeRoleContent() {
    switch (this.playerRole) {
      case "Hacker":
        this._initializeHackerContent();
        break;
      case "Lookout":
        this._initializeLookoutContent();
        break;
      case "Safe Cracker":
        this._initializeSafeCrackerContent();
        break;
      case "Demolitions":
        this._initializeDemolitionsContent();
        break;
      default:
        console.error("Unknown role:", this.playerRole);
    }
  }

  /**
   * Initialize Hacker role content - Find the security override code
   */
  _initializeHackerContent() {
    const controls = this.roleElements.controls;
    controls.innerHTML = "";

    const task = document.createElement("div");
    task.className = "mb-4 text-white";
    task.innerHTML = `
      <p class="mb-2">Your Task: Bypass the security system by identifying the correct override code from the server logs.</p>
      <p class="text-sm text-gray-400">Find the pattern in the binary sequences to determine the correct security code.</p>
    `;
    controls.appendChild(task);

    // Create binary sequence puzzle
    const binaryContainer = document.createElement("div");
    binaryContainer.className = "grid grid-cols-4 gap-2 mb-4";

    // Generate binary log entries
    const correctSequence = Math.floor(Math.random() * 4); // 0-3
    const correctCode = this._generateSecurityCode();

    for (let i = 0; i < 4; i++) {
      const binarySequence = document.createElement("div");
      binarySequence.className =
        "p-2 bg-gray-900 rounded font-mono text-xs cursor-pointer hover:bg-gray-700";

      // Generate binary pattern (only one is valid)
      if (i === correctSequence) {
        binarySequence.dataset.code = correctCode;
        binarySequence.textContent = `01${correctCode.substring(
          0,
          2
        )}101${correctCode.substring(2, 4)}01`;
      } else {
        const invalidCode = this._generateSecurityCode();
        binarySequence.dataset.code = invalidCode;
        binarySequence.textContent = `10${invalidCode.substring(
          0,
          2
        )}010${invalidCode.substring(2, 4)}10`;
      }

      binarySequence.addEventListener("click", () => {
        // Mark all as unselected
        binaryContainer.querySelectorAll("div").forEach((el) => {
          el.classList.remove("bg-cyan-800", "border-cyan-500", "border-2");
          el.classList.add("bg-gray-900");
        });

        // Mark selected
        binarySequence.classList.remove("bg-gray-900");
        binarySequence.classList.add(
          "bg-cyan-800",
          "border-cyan-500",
          "border-2"
        );

        this.teamState.securityCodes.hacker = binarySequence.dataset.code;

        // Send update to team
        this._updateTeamState("hackerComplete", true);
      });

      binaryContainer.appendChild(binarySequence);
    }

    controls.appendChild(binaryContainer);

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.className =
      "w-full p-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded";
    submitBtn.textContent = "Submit Security Code";
    submitBtn.addEventListener("click", () => {
      if (this.teamState.securityCodes.hacker === correctCode) {
        this._markTaskComplete("Hacker");
        this.callbacks.showMessage(
          "Correct security code identified and submitted!",
          "success"
        );
      } else {
        this.callbacks.showMessage(
          "Invalid security code. Try again!",
          "error"
        );
        this.callbacks.reduceTime(5);
      }
    });

    controls.appendChild(submitBtn);
  }

  /**
   * Initialize Lookout role content - Monitor security cameras
   */
  _initializeLookoutContent() {
    const controls = this.roleElements.controls;
    controls.innerHTML = "";

    const task = document.createElement("div");
    task.className = "mb-4 text-white";
    task.innerHTML = `
      <p class="mb-2">Your Task: Monitor security cameras and identify the correct guard patrol pattern.</p>
      <p class="text-sm text-gray-400">Watch the camera feeds and identify when guards will be away from the alarm panel.</p>
    `;
    controls.appendChild(task);

    // Create camera feeds
    const camerasContainer = document.createElement("div");
    camerasContainer.className = "grid grid-cols-2 gap-2 mb-4";

    // Camera views
    const cameraViews = [
      "Main Entrance",
      "Hallway",
      "Guard Room",
      "Security Desk",
    ];

    // The correct camera with the pattern
    const correctCamera = Math.floor(Math.random() * 4); // 0-3
    const correctPattern = ["A", "C", "A", "D", "B"][
      Math.floor(Math.random() * 5)
    ];

    for (let i = 0; i < 4; i++) {
      const camera = document.createElement("div");
      camera.className =
        "p-2 bg-gray-900 rounded flex flex-col items-center cursor-pointer hover:bg-gray-700";

      const cameraTitle = document.createElement("div");
      cameraTitle.className = "text-sm font-bold mb-1 text-green-400";
      cameraTitle.textContent = `Camera ${i + 1}: ${cameraViews[i]}`;

      const cameraFeed = document.createElement("div");
      cameraFeed.className =
        "w-full h-20 bg-black flex items-center justify-center";

      const patternIndicator = document.createElement("div");
      patternIndicator.className = "text-green-500 font-mono";

      if (i === correctCamera) {
        camera.dataset.pattern = correctPattern;
        patternIndicator.textContent = `Pattern: ${correctPattern}`;
      } else {
        const randomPattern = ["X", "Y", "Z"][Math.floor(Math.random() * 3)];
        camera.dataset.pattern = randomPattern;
        patternIndicator.textContent = `Pattern: ${randomPattern}`;
      }

      cameraFeed.appendChild(patternIndicator);
      camera.appendChild(cameraTitle);
      camera.appendChild(cameraFeed);

      camera.addEventListener("click", () => {
        // Mark all as unselected
        camerasContainer.querySelectorAll(".camera-feed").forEach((el) => {
          el.classList.remove("border-green-500", "border-2");
        });

        // Mark selected
        cameraFeed.classList.add("camera-feed", "border-green-500", "border-2");

        this.teamState.securityCodes.lookout = camera.dataset.pattern;

        // Send update to team
        this._updateTeamState("lookoutComplete", true);
      });

      camerasContainer.appendChild(camera);
    }

    controls.appendChild(camerasContainer);

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.className =
      "w-full p-2 bg-green-700 hover:bg-green-600 text-white rounded";
    submitBtn.textContent = "Submit Patrol Pattern";
    submitBtn.addEventListener("click", () => {
      if (this.teamState.securityCodes.lookout === correctPattern) {
        this._markTaskComplete("Lookout");
        this.callbacks.showMessage(
          "Correct patrol pattern identified and submitted!",
          "success"
        );
      } else {
        this.callbacks.showMessage(
          "Invalid patrol pattern. Try again!",
          "error"
        );
        this.callbacks.reduceTime(5);
      }
    });

    controls.appendChild(submitBtn);
  }

  /**
   * Initialize Safe Cracker role content - Find the alarm panel code
   */
  _initializeSafeCrackerContent() {
    const controls = this.roleElements.controls;
    controls.innerHTML = "";

    const task = document.createElement("div");
    task.className = "mb-4 text-white";
    task.innerHTML = `
      <p class="mb-2">Your Task: Identify the correct numeric code for the alarm panel.</p>
      <p class="text-sm text-gray-400">Use your safe cracking skills to find the correct combination.</p>
    `;
    controls.appendChild(task);

    // Create safe dial
    const safeContainer = document.createElement("div");
    safeContainer.className = "flex flex-col items-center mb-4";

    const dialDisplay = document.createElement("div");
    dialDisplay.className =
      "w-48 h-48 rounded-full bg-gray-900 border-4 border-yellow-700 flex items-center justify-center mb-4 relative";

    const dial = document.createElement("div");
    dial.className = "w-full h-full rounded-full relative";

    // Create dial markings
    for (let i = 0; i < 10; i++) {
      const marking = document.createElement("div");
      marking.className = "absolute w-1 h-4 bg-yellow-400";
      marking.style.top = "5px";
      marking.style.left = "calc(50% - 0.5px)";
      marking.style.transformOrigin = "bottom center";
      marking.style.transform = `rotate(${i * 36}deg)`;

      const number = document.createElement("div");
      number.className = "absolute text-yellow-400 font-bold";
      number.style.top = "15px";
      number.style.left = "50%";
      number.style.transform = `translate(-50%, -50%) rotate(${i * 36}deg)`;
      number.textContent = i.toString();

      dial.appendChild(marking);
      dial.appendChild(number);
    }

    // Add indicator
    const indicator = document.createElement("div");
    indicator.className = "absolute top-0 w-2 h-6 bg-yellow-500";
    indicator.style.left = "calc(50% - 1px)";

    dialDisplay.appendChild(dial);
    dialDisplay.appendChild(indicator);

    // Current combination display
    const currentCode = document.createElement("div");
    currentCode.className =
      "text-center font-mono text-xl text-yellow-400 mb-2";
    currentCode.textContent = "----";

    safeContainer.appendChild(dialDisplay);
    safeContainer.appendChild(currentCode);

    // Controls for the dial
    const dialControls = document.createElement("div");
    dialControls.className = "grid grid-cols-5 gap-2";

    const correctCombination = this._generateNumericCode(4);
    let currentCombination = "";

    for (let i = 0; i < 10; i++) {
      const numberBtn = document.createElement("button");
      numberBtn.className =
        "p-2 bg-yellow-800 hover:bg-yellow-700 text-white rounded";
      numberBtn.textContent = i.toString();

      numberBtn.addEventListener("click", () => {
        if (currentCombination.length < 4) {
          currentCombination += i.toString();
          currentCode.textContent = currentCombination.padEnd(4, "-");

          // Rotate dial
          dial.style.transform = `rotate(${-i * 36}deg)`;

          if (currentCombination.length === 4) {
            this.teamState.securityCodes.safeCracker = currentCombination;

            // Send update to team
            this._updateTeamState("safeCrackerComplete", true);
          }
        }
      });

      dialControls.appendChild(numberBtn);
    }

    // Add reset button
    const resetBtn = document.createElement("button");
    resetBtn.className =
      "col-span-5 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded mt-2";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => {
      currentCombination = "";
      currentCode.textContent = "----";
      dial.style.transform = "rotate(0deg)";
    });

    dialControls.appendChild(resetBtn);
    safeContainer.appendChild(dialControls);
    controls.appendChild(safeContainer);

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.className =
      "w-full p-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded mt-4";
    submitBtn.textContent = "Submit Combination";
    submitBtn.addEventListener("click", () => {
      if (currentCombination === correctCombination) {
        this._markTaskComplete("Safe Cracker");
        this.callbacks.showMessage(
          "Correct combination identified and submitted!",
          "success"
        );
      } else {
        this.callbacks.showMessage("Invalid combination. Try again!", "error");
        this.callbacks.reduceTime(5);
        currentCombination = "";
        currentCode.textContent = "----";
        dial.style.transform = "rotate(0deg)";
      }
    });

    controls.appendChild(submitBtn);

    // Hint section
    const hintElement = document.createElement("div");
    hintElement.className =
      "mt-4 p-2 bg-gray-900 rounded text-xs text-gray-400";
    hintElement.innerHTML = `<span class="text-yellow-400 font-bold">Hint:</span> The code is ${
      correctCombination[0]
    }x${correctCombination[2]}x where x are digits that add up to ${
      parseInt(correctCombination[1]) + parseInt(correctCombination[3])
    }.`;
    controls.appendChild(hintElement);
  }

  /**
   * Initialize Demolitions role content - Cut the correct wires
   */
  _initializeDemolitionsContent() {
    const controls = this.roleElements.controls;
    controls.innerHTML = "";

    const task = document.createElement("div");
    task.className = "mb-4 text-white";
    task.innerHTML = `
      <p class="mb-2">Your Task: Cut the correct alarm wires in the right sequence.</p>
      <p class="text-sm text-gray-400">You need to disable the alarm circuit without triggering the backup system.</p>
    `;
    controls.appendChild(task);

    // Create wires display
    const wiresContainer = document.createElement("div");
    wiresContainer.className = "flex flex-col items-center space-y-3 mb-4";

    const wireColors = ["red", "blue", "green", "yellow", "white"];
    const correctSequence = [...wireColors]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    let cutWires = [];

    wireColors.forEach((color) => {
      const wire = document.createElement("div");
      wire.className = `wire w-full h-6 rounded-full cursor-pointer`;
      wire.style.backgroundColor = color;
      wire.dataset.color = color;
      wire.dataset.cut = "false";

      wire.addEventListener("click", () => {
        if (wire.dataset.cut === "true") return;

        // Visual effect of cutting
        wire.style.background = `linear-gradient(90deg, ${color} 49%, transparent 49%, transparent 51%, ${color} 51%)`;
        wire.dataset.cut = "true";

        // Add to cut sequence
        cutWires.push(color);

        // If we've cut 3 wires, consider the task done
        if (cutWires.length === 3) {
          const wireSequence = cutWires.join(",");
          this.teamState.securityCodes.demolitions = wireSequence;

          // Send update to team
          this._updateTeamState("demolitionsComplete", true);
        }
      });

      wiresContainer.appendChild(wire);
    });

    controls.appendChild(wiresContainer);

    // Sequence diagram
    const sequenceDiagram = document.createElement("div");
    sequenceDiagram.className =
      "p-3 bg-gray-900 rounded mb-4 font-mono text-xs text-white";
    sequenceDiagram.innerHTML = `
      <div class="text-red-400 font-bold mb-1">Alarm Circuit Diagram:</div>
      <div>Circuit A: ${correctSequence[0]} → Main Power</div>
      <div>Circuit B: ${correctSequence[1]} → Backup System</div>
      <div>Circuit C: ${correctSequence[2]} → Alert Notification</div>
    `;
    controls.appendChild(sequenceDiagram);

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.className =
      "w-full p-2 bg-red-700 hover:bg-red-600 text-white rounded";
    submitBtn.textContent = "Confirm Wire Sequence";
    submitBtn.addEventListener("click", () => {
      const correctWireSequence = correctSequence.join(",");

      if (cutWires.length !== 3) {
        this.callbacks.showMessage("You need to cut exactly 3 wires!", "error");
        return;
      }

      if (cutWires.join(",") === correctWireSequence) {
        this._markTaskComplete("Demolitions");
        this.callbacks.showMessage("Correct wire sequence cut!", "success");
      } else {
        this.callbacks.showMessage(
          "Wrong sequence! Alarm circuit still active.",
          "error"
        );
        this.callbacks.reduceTime(5);

        // Reset wires
        cutWires = [];
        wiresContainer.querySelectorAll(".wire").forEach((wire) => {
          wire.style.backgroundColor = wire.dataset.color;
          wire.style.background = "";
          wire.dataset.cut = "false";
        });
      }
    });

    controls.appendChild(submitBtn);
  }

  /**
   * Update team state and send to other players
   * @param {string} property - Property to update
   * @param {any} value - New value
   */
  _updateTeamState(property, value) {
    this.teamState[property] = value;

    // Update UI
    this._updateTeamStatusDisplay();

    // Send update to other team members
    if (this.callbacks.sendTeamUpdate) {
      this.callbacks.sendTeamUpdate(this.teamState);
    }

    // Check if all tasks are complete
    this._checkAllTasksComplete();
  }

  /**
   * Handle team update from other players
   * @param {Object} updateData - Update data
   */
  handleTeamUpdate(updateData) {
    // Update our local state with the received data
    Object.assign(this.teamState, updateData);

    // Update UI
    this._updateTeamStatusDisplay();

    // Check if all tasks are complete
    this._checkAllTasksComplete();
  }

  /**
   * Update team status display
   */
  _updateTeamStatusDisplay() {
    const statusElements =
      this.teamStatusElement.querySelectorAll(".status-indicator");

    // Update Hacker status
    if (statusElements[0]) {
      statusElements[0].textContent = this.teamState.hackerComplete
        ? "Complete ✓"
        : "In Progress...";
      statusElements[0].parentElement.classList.toggle(
        "bg-cyan-800",
        this.teamState.hackerComplete
      );
    }

    // Update Lookout status
    if (statusElements[1]) {
      statusElements[1].textContent = this.teamState.lookoutComplete
        ? "Complete ✓"
        : "In Progress...";
      statusElements[1].parentElement.classList.toggle(
        "bg-green-800",
        this.teamState.lookoutComplete
      );
    }

    // Update Safe Cracker status
    if (statusElements[2]) {
      statusElements[2].textContent = this.teamState.safeCrackerComplete
        ? "Complete ✓"
        : "In Progress...";
      statusElements[2].parentElement.classList.toggle(
        "bg-yellow-800",
        this.teamState.safeCrackerComplete
      );
    }

    // Update Demolitions status
    if (statusElements[3]) {
      statusElements[3].textContent = this.teamState.demolitionsComplete
        ? "Complete ✓"
        : "In Progress...";
      statusElements[3].parentElement.classList.toggle(
        "bg-red-800",
        this.teamState.demolitionsComplete
      );
    }

    // Update alarm status if all complete
    if (this.teamState.alarmStatus !== "active") {
      this._updateAlarmDisplay(this.teamState.alarmStatus);
    }
  }

  /**
   * Update the alarm display
   * @param {string} status - New status
   */
  _updateAlarmDisplay(status) {
    if (!this.mainDisplay) return;

    if (status === "disabled") {
      this.mainDisplay.innerHTML = `
        <svg class="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-xl font-bold text-white mt-2">Security Alarm System</div>
        <div class="text-green-500 font-bold mt-1">DISABLED</div>
      `;
    }
  }

  /**
   * Mark a specific role's task as complete
   * @param {string} role - Role name
   */
  _markTaskComplete(role) {
    const property = `${role.toLowerCase().replace(" ", "")}Complete`;
    this._updateTeamState(property, true);
  }

  /**
   * Check if all tasks are complete
   */
  _checkAllTasksComplete() {
    if (
      this.teamState.hackerComplete &&
      this.teamState.lookoutComplete &&
      this.teamState.safeCrackerComplete &&
      this.teamState.demolitionsComplete
    ) {
      // All tasks complete, disable the alarm
      if (this.teamState.alarmStatus === "active") {
        this.teamState.alarmStatus = "disabled";
        this._updateAlarmDisplay("disabled");
        this._updateTeamState("alarmStatus", "disabled");
        this.isComplete = true;

        // Show success message
        this.callbacks.showMessage(
          "Alarm system successfully bypassed! Great teamwork!",
          "success"
        );
      }
    }
  }

  /**
   * Generate a random security code
   * @returns {string} - Security code
   */
  _generateSecurityCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Generate a random numeric code
   * @param {number} length - Code length
   * @returns {string} - Numeric code
   */
  _generateNumericCode(length) {
    let code = "";
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  /**
   * Get the current solution
   * @returns {Object} - Solution object
   */
  getSolution() {
    return {
      alarmDisabled: this.teamState.alarmStatus === "disabled",
      hackerComplete: this.teamState.hackerComplete,
      lookoutComplete: this.teamState.lookoutComplete,
      safeCrackerComplete: this.teamState.safeCrackerComplete,
      demolitionsComplete: this.teamState.demolitionsComplete,
    };
  }

  /**
   * Validate the solution
   * @param {Object} solution - Solution to validate
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution(solution) {
    return solution && solution.alarmDisabled === true;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "The alarm system is still active. All team members need to complete their tasks.";
  }

  /**
   * Clean up event listeners and references
   */
  cleanup() {
    // Remove event listeners if needed
  }
}

export default AlarmBypassPuzzle;
