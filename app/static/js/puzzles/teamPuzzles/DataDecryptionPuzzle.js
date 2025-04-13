// DataDecryptionPuzzle.js - Team Puzzle 4: Data Decryption Challenge
// Difficulty: 4/5 - Advanced puzzle requiring strategic information sharing

class DataDecryptionPuzzle {
  constructor(containerElement, puzzleData, callbacks, playerRole) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.playerRole = playerRole;
    this.isComplete = false;

    // Team state tracking
    this.teamState = {
      decryptionProgress: 0,
      playerKeys: {
        Hacker: this._generateKey("Hacker"),
        "Safe Cracker": this._generateKey("Safe Cracker"),
        Demolitions: this._generateKey("Demolitions"),
        Lookout: this._generateKey("Lookout"),
      },
      sharedKeys: {},
      decryptedSegments: {
        segment1: false,
        segment2: false,
        segment3: false,
        segment4: false,
      },
      decryptionStatus: "locked",
    };

    // Data segments that need specific key combinations to decrypt
    this.dataSegments = this._generateDataSegments();

    // Role colors
    this.roleColors = {
      Hacker: { bg: "bg-cyan-600", text: "text-cyan-100" },
      "Safe Cracker": { bg: "bg-yellow-600", text: "text-yellow-100" },
      Demolitions: { bg: "bg-red-600", text: "text-red-100" },
      Lookout: { bg: "bg-green-600", text: "text-green-100" },
    };

    // DOM elements
    this.dataDisplay = null;
    this.keysDisplay = null;
    this.controlsElement = null;
    this.teamStatusDisplay = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    this._createUI();
    this._renderDecryptionStatus();

    this.callbacks.showMessage(
      "Share your encryption keys with specific team members to decrypt all data segments.",
      "info"
    );
  }

  /**
   * Create the UI for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "data-decryption-puzzle flex flex-col space-y-4";

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "p-3 bg-gray-900 rounded text-white text-center";
    instructions.innerHTML = `
      <p>The vault contains encrypted data that requires all team members to share their encryption keys.</p>
      <p class="text-sm text-gray-400 mt-1">Each data segment needs a specific combination of encryption keys to decrypt.</p>
    `;
    puzzleContainer.appendChild(instructions);

    // Data display
    const dataDisplayContainer = document.createElement("div");
    dataDisplayContainer.className = "p-4 bg-gray-800 rounded-lg";

    this.dataDisplay = document.createElement("div");
    this.dataDisplay.className = "grid grid-cols-2 gap-4";

    // Create data segments
    for (let i = 1; i <= 4; i++) {
      const segment = document.createElement("div");
      segment.className =
        "data-segment p-3 bg-gray-900 rounded-lg flex flex-col items-center";
      segment.dataset.segment = `segment${i}`;

      const lockIcon = document.createElement("div");
      lockIcon.className = "mb-2";
      lockIcon.innerHTML = `
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      `;

      const segmentTitle = document.createElement("div");
      segmentTitle.className = "text-white font-bold";
      segmentTitle.textContent = `Data Segment ${i}`;

      const requiredKeys = document.createElement("div");
      requiredKeys.className = "required-keys mt-2 text-sm text-gray-400";

      // Display which keys are needed for this segment
      const keyCombo = this.dataSegments[`segment${i}`].requiredKeys;
      requiredKeys.innerHTML = `Required keys: ${keyCombo.join(" + ")}`;

      segment.appendChild(lockIcon);
      segment.appendChild(segmentTitle);
      segment.appendChild(requiredKeys);

      this.dataDisplay.appendChild(segment);
    }

    dataDisplayContainer.appendChild(this.dataDisplay);
    puzzleContainer.appendChild(dataDisplayContainer);

    // Team status
    this.teamStatusDisplay = document.createElement("div");
    this.teamStatusDisplay.className =
      "grid grid-cols-2 gap-2 p-3 bg-gray-900 rounded";

    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];
    for (const role of roles) {
      const statusElement = document.createElement("div");
      statusElement.className = `p-2 rounded ${this.roleColors[role].bg} ${this.roleColors[role].text}`;

      const keySharedWith = Object.keys(this.teamState.sharedKeys)
        .filter((key) => key.startsWith(role) || key.endsWith(role))
        .map((key) => {
          const [role1, role2] = key.split("-");
          return role1 === role ? role2 : role1;
        });

      statusElement.innerHTML = `
        <div class="font-bold">${role}</div>
        <div class="status-text text-sm">
          ${
            keySharedWith.length > 0
              ? `Shared with: ${keySharedWith.join(", ")}`
              : "No keys shared"
          }
        </div>
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

    // Player's key display
    const yourKey = document.createElement("div");
    yourKey.className = "p-3 bg-gray-900 rounded text-center mb-4";
    yourKey.innerHTML = `
      <div class="text-gray-400 text-sm">Your Encryption Key:</div>
      <div class="font-mono text-lg text-white mt-1">${
        this.teamState.playerKeys[this.playerRole]
      }</div>
    `;
    this.controlsElement.appendChild(yourKey);

    // Key sharing controls
    const keyShareControls = document.createElement("div");
    keyShareControls.className = "key-share-controls";

    const shareTitle = document.createElement("div");
    shareTitle.className = "text-white font-bold mb-2";
    shareTitle.textContent = "Share your key with:";
    keyShareControls.appendChild(shareTitle);

    // Create buttons to share with each team member
    roles
      .filter((role) => role !== this.playerRole)
      .forEach((role) => {
        const shareButton = document.createElement("button");
        shareButton.className = `mb-2 w-full p-2 ${this.roleColors[role].bg} text-white rounded`;

        // Check if key is already shared with this role
        const keyPair = [this.playerRole, role].sort().join("-");
        const isShared = this.teamState.sharedKeys[keyPair];

        shareButton.textContent = isShared
          ? `Key shared with ${role} ✓`
          : `Share key with ${role}`;

        if (isShared) {
          shareButton.classList.add("opacity-70");
        }

        shareButton.addEventListener("click", () => {
          if (!isShared) {
            this._shareKeyWith(role);
            shareButton.textContent = `Key shared with ${role} ✓`;
            shareButton.classList.add("opacity-70");
          }
        });

        keyShareControls.appendChild(shareButton);
      });

    this.controlsElement.appendChild(keyShareControls);

    // Decrypt button
    const decryptBtn = document.createElement("button");
    decryptBtn.className =
      "mt-4 w-full p-2 bg-gray-700 hover:bg-gray-600 text-white rounded";
    decryptBtn.textContent = "Attempt Decryption";
    decryptBtn.addEventListener("click", () => this._attemptDecryption());

    this.controlsElement.appendChild(decryptBtn);

    puzzleContainer.appendChild(this.controlsElement);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Generate a unique key for each role
   * @param {string} role - Player role
   * @returns {string} - Encryption key
   */
  _generateKey(role) {
    const keyChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = role.substring(0, 1); // First letter of role

    // Generate random characters for the rest of the key
    for (let i = 0; i < 5; i++) {
      key += keyChars.charAt(Math.floor(Math.random() * keyChars.length));
    }

    return key;
  }

  /**
   * Generate data segments with required key combinations
   * @returns {Object} - Data segments with required keys
   */
  _generateDataSegments() {
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];

    // Create segments that require different key combinations
    return {
      segment1: {
        requiredKeys: ["Hacker", "Safe Cracker"],
        decrypted: false,
      },
      segment2: {
        requiredKeys: ["Hacker", "Lookout"],
        decrypted: false,
      },
      segment3: {
        requiredKeys: ["Safe Cracker", "Demolitions"],
        decrypted: false,
      },
      segment4: {
        requiredKeys: ["Demolitions", "Lookout"],
        decrypted: false,
      },
    };
  }

  /**
   * Share key with another player
   * @param {string} targetRole - Role to share key with
   */
  _shareKeyWith(targetRole) {
    // Create a unique identifier for this key sharing (sorted roles to ensure consistency)
    const keyPair = [this.playerRole, targetRole].sort().join("-");

    // Record that the key is shared
    this.teamState.sharedKeys[keyPair] = true;

    // Update UI
    this._updateTeamStatusDisplay();

    // Send update to team
    this._sendTeamUpdate();

    this.callbacks.showMessage(
      `You shared your key with ${targetRole}!`,
      "success"
    );
  }

  /**
   * Attempt to decrypt all data segments
   */
  _attemptDecryption() {
    let newSegmentsDecrypted = false;

    // Check each segment
    for (const [segmentId, segment] of Object.entries(this.dataSegments)) {
      // Skip already decrypted segments
      if (this.teamState.decryptedSegments[segmentId]) continue;

      // Check if required key pair is shared
      const [role1, role2] = segment.requiredKeys;
      const keyPair = [role1, role2].sort().join("-");

      if (this.teamState.sharedKeys[keyPair]) {
        this.teamState.decryptedSegments[segmentId] = true;
        this.dataSegments[segmentId].decrypted = true;
        newSegmentsDecrypted = true;
      }
    }

    // If new segments were decrypted, update UI and team state
    if (newSegmentsDecrypted) {
      // Calculate overall progress
      const decryptedCount = Object.values(
        this.teamState.decryptedSegments
      ).filter(Boolean).length;

      this.teamState.decryptionProgress = (decryptedCount / 4) * 100;

      // Check if all segments are decrypted
      if (decryptedCount === 4) {
        this.teamState.decryptionStatus = "decrypted";
        this.isComplete = true;
      }

      // Update UI
      this._renderDecryptionStatus();

      // Send update to team
      this._sendTeamUpdate();

      this.callbacks.showMessage(
        `${decryptedCount} of 4 data segments decrypted.`,
        "success"
      );
    } else {
      this.callbacks.showMessage(
        "No new segments could be decrypted. Share more keys with your team!",
        "warning"
      );
    }
  }

  /**
   * Render decryption status
   */
  _renderDecryptionStatus() {
    if (!this.dataDisplay) return;

    // Update each data segment
    for (let i = 1; i <= 4; i++) {
      const segmentId = `segment${i}`;
      const segmentElement = this.dataDisplay.querySelector(
        `[data-segment="${segmentId}"]`
      );

      if (segmentElement) {
        if (this.teamState.decryptedSegments[segmentId]) {
          // Update to decrypted state
          segmentElement.className = `data-segment p-3 bg-green-900 rounded-lg flex flex-col items-center`;

          // Update lock icon to unlocked
          const lockIcon = segmentElement.querySelector("svg");
          if (lockIcon) {
            lockIcon.className = "w-8 h-8 text-green-400";
            lockIcon.innerHTML = `
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            `;
          }
        }
      }
    }

    // If all segments decrypted, show success message
    if (this.teamState.decryptionStatus === "decrypted") {
      this.callbacks.showMessage(
        "All data segments successfully decrypted! Access granted!",
        "success"
      );
    }
  }

  /**
   * Update team status display
   */
  _updateTeamStatusDisplay() {
    const statusElements =
      this.teamStatusDisplay.querySelectorAll(".status-text");
    const roles = ["Hacker", "Safe Cracker", "Demolitions", "Lookout"];

    roles.forEach((role, index) => {
      if (statusElements[index]) {
        const keySharedWith = Object.keys(this.teamState.sharedKeys)
          .filter((key) => key.includes(role))
          .map((key) => {
            const [role1, role2] = key.split("-");
            return role1 === role ? role2 : role1;
          });

        statusElements[index].innerHTML =
          keySharedWith.length > 0
            ? `Shared with: ${keySharedWith.join(", ")}`
            : "No keys shared";
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

    // Update dataSegments based on decryptedSegments
    for (const [segmentId, isDecrypted] of Object.entries(
      this.teamState.decryptedSegments
    )) {
      if (isDecrypted && this.dataSegments[segmentId]) {
        this.dataSegments[segmentId].decrypted = true;
      }
    }

    // Check completion status
    if (updateData.decryptionStatus === "decrypted") {
      this.isComplete = true;
    }

    // Update display
    this._renderDecryptionStatus();
    this._updateTeamStatusDisplay();
  }

  /**
   * Get the current solution
   * @returns {Object} - Solution object
   */
  getSolution() {
    return {
      allSegmentsDecrypted: this.teamState.decryptionStatus === "decrypted",
      decryptedSegments: this.teamState.decryptedSegments,
      sharedKeys: this.teamState.sharedKeys,
    };
  }

  /**
   * Validate the solution
   * @param {Object} solution - Solution to validate
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution(solution) {
    return solution && solution.allSegmentsDecrypted === true;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return "Data is still encrypted. All team members must share their encryption keys with the right partners.";
  }

  /**
   * Clean up event listeners and references
   */
  cleanup() {
    // No cleanup needed for this puzzle
  }
}

export default DataDecryptionPuzzle;
