// VaultLockPuzzle.js - Team Puzzle 3: Vault Lock Mechanism
// Difficulty: 3/5 - Requires complex coordination between team members

class VaultLockPuzzle {
  constructor(containerElement, puzzleData, callbacks, playerRole) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.playerRole = playerRole;
    this.isComplete = false;

    // Team state tracking
    this.teamState = {
      dialPositions: {
        Hacker: 0,
        "Safe Cracker": 0,
        Demolitions: 0,
        Lookout: 0,
      },
      lockSequence: this._generateLockSequence(),
      currentStep: 0,
      stepsCompleted: [],
      vaultStatus: "locked",
    };

    // Role colors
    this.roleColors = {
      Hacker: { bg: "bg-cyan-600", text: "text-cyan-100" },
      "Safe Cracker": { bg: "bg-yellow-600", text: "text-yellow-100" },
      Demolitions: { bg: "bg-red-600", text: "text-red-100" },
      Lookout: { bg: "bg-green-600", text: "text-green-100" },
    };

    // DOM elements
    this.lockDisplay = null;
    this.sequenceDisplay = null;
    this.controlsElement = null;
    this.teamStatusDisplay = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this._createUI();
    this._renderLockStatus();

    this.callbacks.showMessage(
      "Work together to unlock the vault. Each team member must set their dial to the correct position in sequence.",
      "info"
    );
  }

  /**
   * Create the UI for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className = "vault-lock-puzzle flex flex-col space-y-4";

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "p-3 bg-gray-900 rounded text-white text-center";
    instructions.innerHTML = `
      <p>The vault has a sophisticated lock that requires all team members to work together.</p>
      <p class="text-sm text-gray-400 mt-1">Each player must set their dial to the correct position when it's their turn in the sequence.</p>
    `;
    puzzleContainer.appendChild(instructions);

    // Vault lock display
    const lockDisplayContainer = document.createElement("div");
    lockDisplayContainer.className = "p-4 bg-gray-800 rounded-lg";

    this.lockDisplay = document.createElement("div");
    this.lockDisplay.className =
      "flex justify-center items-center h-32 bg-gray-900 rounded-lg";
    this.lockDisplay.innerHTML = `
      <div class="text-center">
        <svg class="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div class="text-xl font-bold text-white mt-2">VAULT LOCKED</div>
      </div>
    `;
    lockDisplayContainer.appendChild(this.lockDisplay);

    // Sequence display
    this.sequenceDisplay = document.createElement("div");
    this.sequenceDisplay.className = "grid grid-cols-4 gap-2 mt-4";

    // Create sequence steps
    const roles = ["Safe Cracker", "Hacker", "Demolitions", "Lookout"];
    const sequence = this.teamState.lockSequence;

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      const role = step.role;
      const number = step.position;

      const stepElement = document.createElement("div");
      stepElement.className = `p-2 rounded text-center ${
        i === this.teamState.currentStep ? "ring-2 ring-white" : ""
      }`;
      stepElement.classList.add(this.roleColors[role].bg);

      stepElement.innerHTML = `
        <div class="font-bold">${i + 1}. ${role}</div>
        <div class="text-2xl font-mono">${number}</div>
      `;

      this.sequenceDisplay.appendChild(stepElement);
    }

    lockDisplayContainer.appendChild(this.sequenceDisplay);
    puzzleContainer.appendChild(lockDisplayContainer);

    // Team status
    this.teamStatusDisplay = document.createElement("div");
    this.teamStatusDisplay.className =
      "grid grid-cols-2 gap-2 p-3 bg-gray-900 rounded";

    for (const role of roles) {
      const statusElement = document.createElement("div");
      statusElement.className = `p-2 rounded ${this.roleColors[role].bg} ${this.roleColors[role].text}`;
      statusElement.innerHTML = `
        <div class="font-bold">${role}</div>
        <div class="status-text">Dial: <span class="dial-value">0</span></div>
      `;

      this.teamStatusDisplay.appendChild(statusElement);
    }

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

    // Dial controls
    const dialControls = document.createElement("div");
    dialControls.className = "flex items-center justify-center space-x-4";

    // Decrement button
    const decrementBtn = document.createElement("button");
    decrementBtn.className =
      "h-12 w-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl";
    decrementBtn.textContent = "-";
    decrementBtn.addEventListener("click", () => this._adjustDial(-1));

    // Dial display
    const dialDisplay = document.createElement("div");
    dialDisplay.className =
      "h-24 w-24 rounded-full bg-gray-800 border-4 border-gray-600 flex items-center justify-center text-white text-4xl font-mono";
    dialDisplay.id = "player-dial";
    dialDisplay.textContent = "0";

    // Increment button
    const incrementBtn = document.createElement("button");
    incrementBtn.className =
      "h-12 w-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl";
    incrementBtn.textContent = "+";
    incrementBtn.addEventListener("click", () => this._adjustDial(1));

    dialControls.appendChild(decrementBtn);
    dialControls.appendChild(dialDisplay);
    dialControls.appendChild(incrementBtn);

    this.controlsElement.appendChild(dialControls);

    // Submit button
    const submitBtn = document.createElement("button");
    submitBtn.className =
      "mt-4 w-full p-2 bg-gray-700 hover:bg-gray-600 text-white rounded";
    submitBtn.textContent = "Set Dial Position";
    submitBtn.addEventListener("click", () => this._submitDialPosition());

    this.controlsElement.appendChild(submitBtn);
    puzzleContainer.appendChild(this.controlsElement);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Generate the lock sequence
   * @returns {Array} Lock sequence
   */
  _generateLockSequence() {
    const roles = ["Safe Cracker", "Hacker", "Demolitions", "Lookout"];
    // Shuffle roles to create a random sequence
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

    // Create lock sequence
    const sequence = shuffledRoles.map((role) => ({
      role,
      position: Math.floor(Math.random() * 10), // Random dial position 0-9
    }));

    return sequence;
  }

  /**
   * Adjust the dial value
   * @param {number} amount - Amount to adjust
   */
  _adjustDial(amount) {
    const currentValue = this.teamState.dialPositions[this.playerRole];
    let newValue = (currentValue + amount) % 10;

    // Handle negative values
    if (newValue < 0) newValue = 9;

    this.teamState.dialPositions[this.playerRole] = newValue;

    // Update UI
    const dialDisplay = document.getElementById("player-dial");
    if (dialDisplay) {
      dialDisplay.textContent = newValue;
    }

    // Send update to team
    this._sendTeamUpdate();
  }

  /**
   * Submit the current dial position
   */
  _submitDialPosition() {
    const currentStep = this.teamState.currentStep;
    const sequence = this.teamState.lockSequence;

    // Check if it's this player's turn
    if (
      currentStep < sequence.length &&
      sequence[currentStep].role === this.playerRole
    ) {
      // Check if dial position is correct
      if (
        this.teamState.dialPositions[this.playerRole] ===
        sequence[currentStep].position
      ) {
        // Correct position
        this.teamState.stepsCompleted.push({
          role: this.playerRole,
          position: this.teamState.dialPositions[this.playerRole],
        });

        this.teamState.currentStep++;

        // Check if all steps are completed
        if (this.teamState.currentStep >= sequence.length) {
          this.teamState.vaultStatus = "unlocked";
          this.isComplete = true;
        }

        // Send update to team
        this._sendTeamUpdate();

        // Update UI
        this._renderLockStatus();

        this.callbacks.showMessage("Correct dial position!", "success");
      } else {
        // Incorrect position
        this.callbacks.showMessage(
          "Incorrect dial position. Try again!",
          "error"
        );
        this.callbacks.reduceTime(5);
      }
    } else {
      // Not this player's turn
      this.callbacks.showMessage(
        `It's not your turn! Waiting for ${sequence[currentStep].role}`,
        "error"
      );
    }
  }

  /**
   * Render lock status
   */
  _renderLockStatus() {
    // Update sequence display
    if (this.sequenceDisplay) {
      this.sequenceDisplay.innerHTML = "";

      const sequence = this.teamState.lockSequence;

      for (let i = 0; i < sequence.length; i++) {
        const step = sequence[i];
        const role = step.role;

        const stepElement = document.createElement("div");
        stepElement.className = `p-2 rounded text-center`;
        stepElement.classList.add(this.roleColors[role].bg);

        // Highlight current step
        if (i === this.teamState.currentStep) {
          stepElement.classList.add("ring-2", "ring-white");
        }

        // Show completed steps differently
        if (i < this.teamState.currentStep) {
          stepElement.innerHTML = `
            <div class="font-bold">${i + 1}. ${role}</div>
            <div class="text-2xl font-mono">${step.position} ✓</div>
          `;
        } else {
          // Show number only for this player's step or completed steps
          const showNumber =
            role === this.playerRole || i < this.teamState.currentStep;
          stepElement.innerHTML = `
            <div class="font-bold">${i + 1}. ${role}</div>
            <div class="text-2xl font-mono">${
              showNumber ? step.position : "?"
            }</div>
          `;
        }

        this.sequenceDisplay.appendChild(stepElement);
      }
    }

    // Update lock display
    if (this.lockDisplay) {
      if (this.teamState.vaultStatus === "unlocked") {
        this.lockDisplay.innerHTML = `
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <div class="text-xl font-bold text-green-500 mt-2">VAULT UNLOCKED</div>
          </div>
        `;

        // Show success message
        this.callbacks.showMessage(
          "Vault successfully unlocked! Great teamwork!",
          "success"
        );
      }
    }

    // Update team status display
    this._updateTeamStatusDisplay();
  }

  /**
   * Update team status display
   */
  _updateTeamStatusDisplay() {
    const statusElements =
      this.teamStatusDisplay.querySelectorAll(".dial-value");
    const roles = ["Safe Cracker", "Hacker", "Demolitions", "Lookout"];

    roles.forEach((role, index) => {
      if (statusElements[index]) {
        statusElements[index].textContent = this.teamState.dialPositions[role];
      }
    });
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
    // Update our local state with the received data
    Object.assign(this.teamState, updateData);

    // Check completion status
    if (updateData.vaultStatus === "unlocked") {
      this.isComplete = true;
    }

    // Update display
    this._renderLockStatus();
  }

  /**
   * Get the current solution
   * @returns {Object} - Solution object
   */
  getSolution() {
    return {
      vaultUnlocked: this.teamState.vaultStatus === "unlocked",
      stepsCompleted: this.teamState.stepsCompleted,
    };
  }

  /**
   * Validate the solution
   * @param {Object} solution - Solution to validate
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution(solution) {
    return solution && solution.vaultUnlocked === true;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "The vault is still locked. All team members must set the correct dial positions in sequence.";
  }

  /**
   * Clean up event listeners and references
   */
  cleanup() {
    // No cleanup needed for this puzzle
  }
}

export default VaultLockPuzzle;
