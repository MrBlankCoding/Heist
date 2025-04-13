// EscapeSequencePuzzle.js - Team Puzzle 5: Final Escape Sequence
// Difficulty: 5/5 - Most challenging team puzzle requiring perfect coordination

class EscapeSequencePuzzle {
  constructor(containerElement, puzzleData, callbacks, playerRole) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.playerRole = playerRole;
    this.isComplete = false;

    // Timer for the simultaneous actions
    this.actionTimer = null;
    this.timerInterval = null;
    this.alarmInterval = null;

    // Team state tracking
    this.teamState = {
      escapePhase: 1,
      playerReady: {
        Hacker: false,
        "Safe Cracker": false,
        Demolitions: false,
        Lookout: false,
      },
      actions: {
        Hacker: [],
        "Safe Cracker": [],
        Demolitions: [],
        Lookout: [],
      },
      currentCountdown: 15,
      escapeStatus: "in_progress",
      alarmActive: false,
    };

    // Phase requirements - each phase requires specific actions from each role
    this.phaseRequirements = this._generatePhaseRequirements();

    // Role colors
    this.roleColors = {
      Hacker: { bg: "bg-cyan-600", text: "text-cyan-100" },
      "Safe Cracker": { bg: "bg-yellow-600", text: "text-yellow-100" },
      Demolitions: { bg: "bg-red-600", text: "text-red-100" },
      Lookout: { bg: "bg-green-600", text: "text-green-100" },
    };

    // DOM elements
    this.phaseDisplay = null;
    this.countdownDisplay = null;
    this.teamStatusDisplay = null;
    this.controlsElement = null;
    this.actionButtons = [];
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this._createUI();
    this._startAlarmEffect();

    this.callbacks.showMessage(
      "The alarm is triggered! Execute the escape sequence with precise timing.",
      "warning"
    );
  }

  /**
   * Create the UI for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "escape-sequence-puzzle flex flex-col space-y-4";

    // Header with alarm indicator
    const alarmHeader = document.createElement("div");
    alarmHeader.className =
      "p-3 bg-red-900 rounded-lg text-white text-center animate-pulse";
    alarmHeader.innerHTML = `
      <div class="flex items-center justify-center mb-2">
        <svg class="w-8 h-8 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="text-xl font-bold">SECURITY ALERT</span>
      </div>
      <p>All team members must coordinate their actions to escape!</p>
    `;
    puzzleContainer.appendChild(alarmHeader);

    // Phase display
    const phaseContainer = document.createElement("div");
    phaseContainer.className = "p-4 bg-gray-800 rounded-lg";

    this.phaseDisplay = document.createElement("div");
    this.phaseDisplay.className = "text-center mb-4";
    this.phaseDisplay.innerHTML = `
      <div class="text-white text-sm">Current Escape Phase:</div>
      <div class="text-3xl font-bold text-white">Phase ${this.teamState.escapePhase} of 3</div>
    `;

    // Countdown display
    this.countdownDisplay = document.createElement("div");
    this.countdownDisplay.className =
      "rounded-full w-24 h-24 bg-gray-900 flex items-center justify-center mx-auto my-2";
    this.countdownDisplay.innerHTML = `
      <div class="text-3xl font-mono text-white">${this.teamState.currentCountdown}</div>
    `;

    phaseContainer.appendChild(this.phaseDisplay);
    phaseContainer.appendChild(this.countdownDisplay);

    // Phase requirements
    const currentPhaseReqs =
      this.phaseRequirements[this.teamState.escapePhase - 1];
    const reqsDisplay = document.createElement("div");
    reqsDisplay.className = "grid grid-cols-2 gap-2 mt-4";

    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];
    roles.forEach((role) => {
      const roleReq = document.createElement("div");
      roleReq.className = `p-2 rounded ${this.roleColors[role].bg} text-white`;

      roleReq.innerHTML = `
        <div class="font-bold">${role}</div>
        <div class="text-sm">${currentPhaseReqs[role].description}</div>
      `;

      reqsDisplay.appendChild(roleReq);
    });

    phaseContainer.appendChild(reqsDisplay);
    puzzleContainer.appendChild(phaseContainer);

    // Team status
    this.teamStatusDisplay = document.createElement("div");
    this.teamStatusDisplay.className =
      "grid grid-cols-4 gap-2 p-3 bg-gray-900 rounded-lg";

    roles.forEach((role) => {
      const statusElement = document.createElement("div");
      statusElement.className = "flex flex-col items-center";

      const indicator = document.createElement("div");
      indicator.className = `w-4 h-4 rounded-full border border-white mb-1 ${
        this.teamState.playerReady[role]
          ? this.roleColors[role].bg
          : "bg-gray-800"
      }`;

      const label = document.createElement("div");
      label.className = "text-xs text-white";
      label.textContent = role.substring(0, 1);

      statusElement.appendChild(indicator);
      statusElement.appendChild(label);

      this.teamStatusDisplay.appendChild(statusElement);
    });

    puzzleContainer.appendChild(this.teamStatusDisplay);

    // Player controls
    this.controlsElement = document.createElement("div");
    this.controlsElement.className = `p-4 ${
      this.roleColors[this.playerRole].bg
    } bg-opacity-20 rounded-lg`;

    // Role indicator
    const roleIndicator = document.createElement("div");
    roleIndicator.className = `mb-3 p-2 rounded ${
      this.roleColors[this.playerRole].bg
    } text-center font-bold text-white`;
    roleIndicator.textContent = `Your Role: ${this.playerRole}`;
    this.controlsElement.appendChild(roleIndicator);

    // Task description
    const taskDesc = document.createElement("div");
    taskDesc.className = "p-3 bg-gray-900 rounded text-white mb-3";
    taskDesc.innerHTML = `
      <div class="font-bold mb-1">Your Task:</div>
      <div>${currentPhaseReqs[this.playerRole].description}</div>
    `;
    this.controlsElement.appendChild(taskDesc);

    // Action buttons
    const actionsContainer = document.createElement("div");
    actionsContainer.className = "grid grid-cols-2 gap-2";

    const playerActions = this._getActionsForPlayer(
      this.playerRole,
      this.teamState.escapePhase
    );

    playerActions.forEach((action) => {
      const actionButton = document.createElement("button");
      actionButton.className =
        "p-3 bg-gray-700 hover:bg-gray-600 text-white rounded";
      actionButton.textContent = action;
      actionButton.dataset.action = action;

      actionButton.addEventListener("click", () => {
        this._performAction(action);
      });

      this.actionButtons.push(actionButton);
      actionsContainer.appendChild(actionButton);
    });

    this.controlsElement.appendChild(actionsContainer);

    // Ready button
    const readyButton = document.createElement("button");
    readyButton.className =
      "mt-4 w-full p-2 bg-green-700 hover:bg-green-600 text-white rounded";
    readyButton.textContent = "Mark Ready";
    readyButton.addEventListener("click", () => this._toggleReady());

    this.controlsElement.appendChild(readyButton);
    this.readyButton = readyButton;

    puzzleContainer.appendChild(this.controlsElement);

    this.containerElement.appendChild(puzzleContainer);

    // Start phase countdown
    this._startPhaseCountdown();
  }

  /**
   * Generate phase requirements for each role
   * @returns {Array} - Phase requirements
   */
  _generatePhaseRequirements() {
    return [
      // Phase 1
      {
        Hacker: {
          description: "Disable the security cameras",
          requiredActions: ["Access security system", "Disable camera feed"],
        },
        "Safe Cracker": {
          description: "Unlock the emergency exit",
          requiredActions: ["Check exit status", "Enter override code"],
        },
        Demolitions: {
          description: "Prepare smoke screen for cover",
          requiredActions: ["Prepare smoke device", "Set timer"],
        },
        Lookout: {
          description: "Monitor guard positions",
          requiredActions: ["Check guard schedule", "Mark safe path"],
        },
      },
      // Phase 2
      {
        Hacker: {
          description: "Block security communications",
          requiredActions: ["Jam radio signals", "Loop security feed"],
        },
        "Safe Cracker": {
          description: "Unlock secondary barriers",
          requiredActions: ["Decode security pattern", "Open emergency doors"],
        },
        Demolitions: {
          description: "Create diversion",
          requiredActions: ["Plant diversion device", "Trigger diversion"],
        },
        Lookout: {
          description: "Redirect security personnel",
          requiredActions: ["Sound false alarm", "Mark escape route"],
        },
      },
      // Phase 3
      {
        Hacker: {
          description: "Override final security system",
          requiredActions: ["Enter bypass code", "Enable ghost protocol"],
        },
        "Safe Cracker": {
          description: "Secure escape vehicle",
          requiredActions: [
            "Hotwire vehicle",
            "Prepare for immediate departure",
          ],
        },
        Demolitions: {
          description: "Clear escape path",
          requiredActions: ["Remove obstacles", "Secure exit route"],
        },
        Lookout: {
          description: "Confirm all-clear for escape",
          requiredActions: ["Verify escape path", "Give final clearance"],
        },
      },
    ];
  }

  /**
   * Get actions for a specific player and phase
   * @param {string} role - Player role
   * @param {number} phase - Current escape phase
   * @returns {Array} - Available actions
   */
  _getActionsForPlayer(role, phase) {
    const phaseRequirements = this.phaseRequirements[phase - 1];
    return phaseRequirements[role].requiredActions;
  }

  /**
   * Perform an action
   * @param {string} action - Action to perform
   */
  _performAction(action) {
    // Add action to player actions if not already there
    if (!this.teamState.actions[this.playerRole].includes(action)) {
      this.teamState.actions[this.playerRole].push(action);

      // Highlight selected action button
      this.actionButtons.forEach((button) => {
        if (button.dataset.action === action) {
          button.classList.remove("bg-gray-700");
          button.classList.add("bg-green-700");
        }
      });

      // Check if all required actions are done for this player
      const requiredActions =
        this.phaseRequirements[this.teamState.escapePhase - 1][this.playerRole]
          .requiredActions;

      if (
        requiredActions.every((a) =>
          this.teamState.actions[this.playerRole].includes(a)
        )
      ) {
        this.callbacks.showMessage(
          "You completed your tasks for this phase!",
          "success"
        );
      }

      // Send update to team
      this._sendTeamUpdate();
    }
  }

  /**
   * Toggle player ready status
   */
  _toggleReady() {
    // Check if player has completed all required actions for this phase
    const requiredActions =
      this.phaseRequirements[this.teamState.escapePhase - 1][this.playerRole]
        .requiredActions;
    const completedAllActions = requiredActions.every((a) =>
      this.teamState.actions[this.playerRole].includes(a)
    );

    if (!completedAllActions) {
      this.callbacks.showMessage(
        "You must complete all your tasks first!",
        "error"
      );
      return;
    }

    // Toggle ready status
    this.teamState.playerReady[this.playerRole] =
      !this.teamState.playerReady[this.playerRole];

    // Update button text
    if (this.readyButton) {
      this.readyButton.textContent = this.teamState.playerReady[this.playerRole]
        ? "Cancel Ready"
        : "Mark Ready";

      if (this.teamState.playerReady[this.playerRole]) {
        this.readyButton.classList.remove("bg-green-700", "hover:bg-green-600");
        this.readyButton.classList.add("bg-red-700", "hover:bg-red-600");
      } else {
        this.readyButton.classList.remove("bg-red-700", "hover:bg-red-600");
        this.readyButton.classList.add("bg-green-700", "hover:bg-green-600");
      }
    }

    // Update team status display
    this._updateTeamStatusDisplay();

    // Send update to team
    this._sendTeamUpdate();

    // Check if all players are ready to proceed
    this._checkAllPlayersReady();
  }

  /**
   * Check if all players are ready to proceed to next phase
   */
  _checkAllPlayersReady() {
    const allReady = Object.values(this.teamState.playerReady).every(
      (ready) => ready
    );

    if (allReady) {
      // Stop the countdown and proceed to next phase
      this._advanceToNextPhase();
    }
  }

  /**
   * Advance to the next escape phase
   */
  _advanceToNextPhase() {
    // Stop countdown
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Check if this was the final phase
    if (this.teamState.escapePhase === 3) {
      this._completeEscape();
      return;
    }

    // Advance to next phase
    this.teamState.escapePhase++;

    // Reset player status
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];
    roles.forEach((role) => {
      this.teamState.playerReady[role] = false;
      this.teamState.actions[role] = [];
    });

    // Reset countdown
    this.teamState.currentCountdown = 20 - this.teamState.escapePhase * 2; // Less time each phase

    // Update UI
    this._updatePhaseDisplay();
    this._updateTeamStatusDisplay();

    // Update action buttons
    this._updateActionButtons();

    // Reset ready button
    if (this.readyButton) {
      this.readyButton.textContent = "Mark Ready";
      this.readyButton.classList.remove("bg-red-700", "hover:bg-red-600");
      this.readyButton.classList.add("bg-green-700", "hover:bg-green-600");
    }

    // Start countdown for new phase
    this._startPhaseCountdown();

    // Send update to team
    this._sendTeamUpdate();

    this.callbacks.showMessage(
      `Advanced to Escape Phase ${this.teamState.escapePhase}!`,
      "success"
    );
  }

  /**
   * Complete the escape sequence
   */
  _completeEscape() {
    this.teamState.escapeStatus = "escaped";
    this.isComplete = true;

    // Stop alarm effect
    this._stopAlarmEffect();

    // Update UI
    this._updatePhaseDisplay();

    // Show success message
    this.callbacks.showMessage(
      "Escape sequence complete! You made it out safely!",
      "success"
    );

    // Send update to team
    this._sendTeamUpdate();

    // Disable controls
    this._disableControls();
  }

  /**
   * Start the phase countdown
   */
  _startPhaseCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.teamState.currentCountdown--;

      // Update countdown display
      this._updateCountdownDisplay();

      // Check if time is up
      if (this.teamState.currentCountdown <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        // Time's up - mission failed
        this._failEscape("Time's up! Security forces have captured your team.");
      }

      // Send update at certain intervals to keep everyone in sync
      if (this.teamState.currentCountdown % 5 === 0) {
        this._sendTeamUpdate();
      }
    }, 1000);
  }

  /**
   * Start alarm visual/audio effect
   */
  _startAlarmEffect() {
    this.teamState.alarmActive = true;

    // Create flashing effect by toggling classes
    this.alarmInterval = setInterval(() => {
      if (this.containerElement) {
        this.containerElement.classList.toggle("bg-red-900");
        this.containerElement.classList.toggle("bg-opacity-10");
      }
    }, 500);
  }

  /**
   * Stop alarm effect
   */
  _stopAlarmEffect() {
    this.teamState.alarmActive = false;

    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }

    // Remove alarm classes
    if (this.containerElement) {
      this.containerElement.classList.remove("bg-red-900", "bg-opacity-10");
    }
  }

  /**
   * Update the phase display
   */
  _updatePhaseDisplay() {
    if (!this.phaseDisplay) return;

    if (this.teamState.escapeStatus === "escaped") {
      this.phaseDisplay.innerHTML = `
        <div class="text-white text-sm">Escape Status:</div>
        <div class="text-3xl font-bold text-green-400">MISSION SUCCESSFUL</div>
      `;
    } else if (this.teamState.escapeStatus === "failed") {
      this.phaseDisplay.innerHTML = `
        <div class="text-white text-sm">Escape Status:</div>
        <div class="text-3xl font-bold text-red-400">MISSION FAILED</div>
      `;
    } else {
      this.phaseDisplay.innerHTML = `
        <div class="text-white text-sm">Current Escape Phase:</div>
        <div class="text-3xl font-bold text-white">Phase ${this.teamState.escapePhase} of 3</div>
      `;
    }
  }

  /**
   * Update the countdown display
   */
  _updateCountdownDisplay() {
    if (!this.countdownDisplay) return;

    // Update the countdown text
    this.countdownDisplay.innerHTML = `
      <div class="text-3xl font-mono ${
        this.teamState.currentCountdown <= 5
          ? "text-red-500 animate-pulse"
          : "text-white"
      }">${this.teamState.currentCountdown}</div>
    `;
  }

  /**
   * Update team status display
   */
  _updateTeamStatusDisplay() {
    const indicators = this.teamStatusDisplay.querySelectorAll(".rounded-full");
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];

    roles.forEach((role, index) => {
      if (indicators[index]) {
        if (this.teamState.playerReady[role]) {
          indicators[
            index
          ].className = `w-4 h-4 rounded-full border border-white mb-1 ${this.roleColors[role].bg}`;
        } else {
          indicators[index].className =
            "w-4 h-4 rounded-full border border-white mb-1 bg-gray-800";
        }
      }
    });
  }

  /**
   * Update action buttons for current phase
   */
  _updateActionButtons() {
    // Clear current action buttons
    const actionsContainer = this.controlsElement.querySelector(".grid");
    if (actionsContainer) {
      actionsContainer.innerHTML = "";
      this.actionButtons = [];

      // Add new action buttons for current phase
      const playerActions = this._getActionsForPlayer(
        this.playerRole,
        this.teamState.escapePhase
      );

      playerActions.forEach((action) => {
        const actionButton = document.createElement("button");
        actionButton.className =
          "p-3 bg-gray-700 hover:bg-gray-600 text-white rounded";
        actionButton.textContent = action;
        actionButton.dataset.action = action;

        actionButton.addEventListener("click", () => {
          this._performAction(action);
        });

        this.actionButtons.push(actionButton);
        actionsContainer.appendChild(actionButton);
      });
    }

    // Update task description
    const taskDesc = this.controlsElement.querySelector("div.p-3.bg-gray-900");
    if (taskDesc) {
      const currentPhaseReqs =
        this.phaseRequirements[this.teamState.escapePhase - 1];
      taskDesc.innerHTML = `
        <div class="font-bold mb-1">Your Task:</div>
        <div>${currentPhaseReqs[this.playerRole].description}</div>
      `;
    }
  }

  /**
   * Disable all controls
   */
  _disableControls() {
    // Disable action buttons
    this.actionButtons.forEach((button) => {
      button.disabled = true;
      button.classList.add("opacity-50", "cursor-not-allowed");
    });

    // Disable ready button
    if (this.readyButton) {
      this.readyButton.disabled = true;
      this.readyButton.classList.add("opacity-50", "cursor-not-allowed");
    }
  }

  /**
   * Fail the escape attempt
   * @param {string} message - Failure message
   */
  _failEscape(message) {
    this.teamState.escapeStatus = "failed";
    this.isComplete = true;

    // Update UI
    this._updatePhaseDisplay();

    // Disable controls
    this._disableControls();

    // Show message
    this.callbacks.showMessage(message, "error");

    // Send update to team
    this._sendTeamUpdate();
  }

  /**
   * Send team update
   */
  _sendTeamUpdate() {
    if (this.callbacks.sendTeamUpdate) {
      this.callbacks.sendTeamUpdate(this.teamState);
    }
  }

  /**
   * Handle team update from other players
   * @param {Object} updateData - Update data
   */
  handleTeamUpdate(updateData) {
    const previousPhase = this.teamState.escapePhase;
    const previousStatus = this.teamState.escapeStatus;

    // Update our local state with the received data
    Object.assign(this.teamState, updateData);

    // Check if phase changed
    if (previousPhase !== this.teamState.escapePhase) {
      this._updatePhaseDisplay();
      this._updateActionButtons();
    }

    // Check if status changed
    if (previousStatus !== this.teamState.escapeStatus) {
      if (this.teamState.escapeStatus === "escaped") {
        this.isComplete = true;
        this._stopAlarmEffect();
        this._disableControls();
      } else if (this.teamState.escapeStatus === "failed") {
        this.isComplete = true;
        this._disableControls();
      }

      this._updatePhaseDisplay();
    }

    // Update displays
    this._updateCountdownDisplay();
    this._updateTeamStatusDisplay();

    // Update ready button state
    if (this.readyButton) {
      const isReady = this.teamState.playerReady[this.playerRole];
      this.readyButton.textContent = isReady ? "Cancel Ready" : "Mark Ready";

      if (isReady) {
        this.readyButton.classList.remove("bg-green-700", "hover:bg-green-600");
        this.readyButton.classList.add("bg-red-700", "hover:bg-red-600");
      } else {
        this.readyButton.classList.remove("bg-red-700", "hover:bg-red-600");
        this.readyButton.classList.add("bg-green-700", "hover:bg-green-600");
      }
    }

    // Update action buttons based on current actions
    this.actionButtons.forEach((button) => {
      const action = button.dataset.action;
      if (this.teamState.actions[this.playerRole].includes(action)) {
        button.classList.remove("bg-gray-700");
        button.classList.add("bg-green-700");
      }
    });
  }

  /**
   * Get the current solution
   * @returns {Object} - Solution object
   */
  getSolution() {
    return {
      escapeSuccessful: this.teamState.escapeStatus === "escaped",
      currentPhase: this.teamState.escapePhase,
      playerActions: this.teamState.actions,
    };
  }

  /**
   * Validate the solution
   * @param {Object} solution - Solution to validate
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution(solution) {
    return solution && solution.escapeSuccessful === true;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "The escape sequence failed. All team members must coordinate their actions perfectly.";
  }

  /**
   * Clean up event listeners and references
   */
  cleanup() {
    // Clear intervals
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }

    // Remove any alarm effects
    if (this.containerElement) {
      this.containerElement.classList.remove("bg-red-900", "bg-opacity-10");
    }
  }
}

export default EscapeSequencePuzzle;
