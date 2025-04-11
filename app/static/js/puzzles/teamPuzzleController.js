// teamPuzzleController.js - Controls collaborative team puzzles

class TeamPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 3; // Team puzzles start at stage 3

    // Team puzzle specific properties
    this.playerRole = null;
    this.requiredRoles = [];
    this.teamActions = {};
    this.selectedAction = null;

    // DOM elements will be created during initialization
    this.teamPuzzleContainer = null;
    this.actionSelectContainer = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Get player role and required roles
    this.playerRole = this.puzzleData.playerRole || null;
    this.requiredRoles = this.puzzleData.requiredRoles || [];

    // Clear container
    this.containerElement.innerHTML = "";

    // Create header
    const header = document.createElement("h3");
    header.className = "text-xl font-bold text-blue-400 mb-4";
    header.textContent = `Team Mission: ${this._getPuzzleTitle()}`;
    this.containerElement.appendChild(header);

    // Create instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300";
    instruction.textContent = this._getInstructions();
    this.containerElement.appendChild(instruction);

    // Create message area
    this.messageElement = document.createElement("div");
    this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    this.containerElement.appendChild(this.messageElement);

    // Create game area
    const gameArea = document.createElement("div");
    gameArea.className = "flex flex-col items-center mb-6";
    this.containerElement.appendChild(gameArea);

    // Determine which puzzle to render based on stage/type
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "team_puzzle_3") {
      this._setupSecurityBypassPuzzle(gameArea);
    } else if (puzzleType === "team_puzzle_4") {
      this._setupVaultAccessPuzzle(gameArea);
    } else if (puzzleType === "team_puzzle_5") {
      this._setupFinalEscapePuzzle(gameArea);
    } else {
      // Fallback to basic team puzzle
      this._setupSecurityBypassPuzzle(gameArea);
    }

    // Create submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className = "heist-button mx-auto block";
    this.submitButton.textContent = "Execute Team Action";
    this.submitButton.addEventListener("click", () => this._handleSubmit());
    this.containerElement.appendChild(this.submitButton);
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent = "Team mission accomplished successfully!";
    this.messageElement.className = "mb-4 text-green-400 text-center";

    // Disable team puzzle
    if (this.teamPuzzleContainer) {
      this.teamPuzzleContainer.classList.add(
        "opacity-50",
        "pointer-events-none"
      );
    }

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

    // Add effects based on event type
    if (eventType === "system_check") {
      // For system check, temporarily disable the team puzzle
      if (this.teamPuzzleContainer) {
        this.teamPuzzleContainer.classList.add(
          "opacity-50",
          "pointer-events-none"
        );
      }
      this.submitButton.disabled = true;

      // Re-enable after duration
      setTimeout(() => {
        if (this.teamPuzzleContainer) {
          this.teamPuzzleContainer.classList.remove(
            "opacity-50",
            "pointer-events-none"
          );
        }
        this.submitButton.disabled = false;
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, duration * 1000);
    } else {
      // For other events, just show a warning
      setTimeout(() => {
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center hidden";
      }, duration * 1000);
    }
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    // Clear references
    this.teamPuzzleContainer = null;
    this.actionSelectContainer = null;
    this.messageElement = null;
    this.submitButton = null;
  }

  /**
   * Private: Setup Security Bypass puzzle (Stage 3)
   * @param {HTMLElement} container - Container element
   */
  _setupSecurityBypassPuzzle(container) {
    // Create team roles display
    this._createTeamDisplay(container);

    // Generate role-specific actions
    this._generateRoleActions();

    // Create action selection area
    this._createActionSelection(container);
  }

  /**
   * Create a visual display of team roles and statuses
   * @param {HTMLElement} container - Container element
   */
  _createTeamDisplay(container) {
    // Create team display container
    this.teamPuzzleContainer = document.createElement("div");
    this.teamPuzzleContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-3xl mb-6";

    // Create team roles header
    const teamHeader = document.createElement("div");
    teamHeader.className = "text-blue-400 font-semibold mb-4";
    teamHeader.textContent = "Team Coordination Required:";
    this.teamPuzzleContainer.appendChild(teamHeader);

    // Create roles grid
    const rolesGrid = document.createElement("div");
    rolesGrid.className = "grid grid-cols-2 gap-4 mb-4";

    // Define role colors and icons
    const roleConfig = {
      Hacker: { color: "blue", icon: "💻", description: "Network access" },
      "Safe Cracker": {
        color: "yellow",
        icon: "🔓",
        description: "Lock manipulation",
      },
      Demolitions: {
        color: "red",
        icon: "💥",
        description: "Structural access",
      },
      Lookout: {
        color: "green",
        icon: "👁️",
        description: "Security monitoring",
      },
    };

    // Create a card for each required role
    this.requiredRoles.forEach((role) => {
      const config = roleConfig[role] || {
        color: "gray",
        icon: "❓",
        description: "Unknown role",
      };

      const roleCard = document.createElement("div");
      roleCard.className = `bg-gray-800 rounded-lg p-3 border-l-4 border-${config.color}-500`;

      roleCard.innerHTML = `
        <div class="flex items-center">
          <div class="text-2xl mr-3">${config.icon}</div>
          <div>
            <div class="font-bold text-${config.color}-400">${role}</div>
            <div class="text-sm text-gray-400">${config.description}</div>
          </div>
        </div>
      `;

      // Highlight current player's role
      if (role === this.playerRole) {
        roleCard.classList.add("bg-gray-700");
        roleCard.innerHTML += `<div class="text-xs text-${config.color}-400 mt-2 font-bold">YOUR ROLE</div>`;
      }

      rolesGrid.appendChild(roleCard);
    });

    this.teamPuzzleContainer.appendChild(rolesGrid);

    // Add mission description
    const missionDesc = document.createElement("div");
    missionDesc.className = "bg-gray-800 p-4 rounded-lg text-sm text-gray-300";
    missionDesc.innerHTML = `
      <p class="mb-2"><span class="text-blue-400 font-bold">Mission Objective:</span> ${this._getMissionObjective()}</p>
      <p><span class="text-blue-400 font-bold">Team Approach:</span> Each team member must execute their specialized action in coordination.</p>
    `;

    this.teamPuzzleContainer.appendChild(missionDesc);
    container.appendChild(this.teamPuzzleContainer);
  }

  /**
   * Generate role-specific actions
   */
  _generateRoleActions() {
    // Define actions for each role based on stage
    const stageActions = {
      3: {
        Hacker: [
          {
            id: "hack-cameras",
            name: "Disable Security Cameras",
            correct: true,
          },
          { id: "hack-alarms", name: "Disable Alarm System", correct: false },
          { id: "hack-doors", name: "Lock Security Doors", correct: false },
        ],
        "Safe Cracker": [
          { id: "unlock-server", name: "Access Server Room", correct: true },
          { id: "unlock-vault", name: "Open Main Vault", correct: false },
          {
            id: "unlock-terminal",
            name: "Access Security Terminal",
            correct: false,
          },
        ],
        Demolitions: [
          {
            id: "plant-distraction",
            name: "Create Distraction",
            correct: true,
          },
          { id: "breach-wall", name: "Breach External Wall", correct: false },
          { id: "disable-power", name: "Cut Power Lines", correct: false },
        ],
        Lookout: [
          {
            id: "monitor-guards",
            name: "Track Guard Positions",
            correct: true,
          },
          { id: "scan-cameras", name: "Check Camera Feeds", correct: false },
          { id: "signal-team", name: "Signal All-Clear", correct: false },
        ],
      },
      4: {
        // Stage 4 actions would be defined here
      },
      5: {
        // Stage 5 actions would be defined here
      },
    };

    // Get actions for current stage
    const currentStageActions =
      stageActions[this.currentStage] || stageActions[3];
    this.teamActions = currentStageActions[this.playerRole] || [];
  }

  /**
   * Create action selection interface
   * @param {HTMLElement} container - Container element
   */
  _createActionSelection(container) {
    // Create action selection container
    this.actionSelectContainer = document.createElement("div");
    this.actionSelectContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-3xl";

    // Create action selection header
    const actionHeader = document.createElement("div");
    actionHeader.className = "text-blue-400 font-semibold mb-4";
    actionHeader.textContent = `${this.playerRole} Actions:`;
    this.actionSelectContainer.appendChild(actionHeader);

    // Create action options
    const actionsContainer = document.createElement("div");
    actionsContainer.className = "space-y-3";

    // Add action options
    this.teamActions.forEach((action) => {
      const actionElement = document.createElement("div");
      actionElement.className =
        "bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-all border-2 border-transparent";
      actionElement.dataset.actionId = action.id;

      actionElement.innerHTML = `
        <div class="font-bold text-white">${action.name}</div>
      `;

      // Add click event
      actionElement.addEventListener("click", () => {
        // Clear previous selection
        actionsContainer
          .querySelectorAll("div[data-action-id]")
          .forEach((el) => {
            el.classList.remove("border-blue-500");
          });

        // Set new selection
        actionElement.classList.add("border-blue-500");
        this.selectedAction = action.id;
      });

      actionsContainer.appendChild(actionElement);
    });

    this.actionSelectContainer.appendChild(actionsContainer);
    container.appendChild(this.actionSelectContainer);
  }

  /**
   * Private: Handle submit button click
   */
  _handleSubmit() {
    // Check if an action is selected
    if (!this.selectedAction) {
      this.messageElement.textContent = "Please select an action first!";
      this.messageElement.className = "mb-4 text-red-400 text-center";
      return;
    }

    // Submit solution
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Executing...";

    this.submitSolution(this.selectedAction)
      .then((success) => {
        if (success) {
          this.showSuccess();
        } else {
          this.messageElement.textContent =
            "Action failed. Try a different approach!";
          this.messageElement.className = "mb-4 text-red-400 text-center";
          this.submitButton.disabled = false;
          this.submitButton.textContent = "Execute Team Action";
        }
      })
      .catch((error) => {
        console.error("Error submitting solution:", error);
        this.messageElement.textContent = "Error executing action. Try again!";
        this.messageElement.className = "mb-4 text-red-400 text-center";
        this.submitButton.disabled = false;
        this.submitButton.textContent = "Execute Team Action";
      });
  }

  /**
   * Private: Get puzzle title based on stage
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    switch (this.currentStage) {
      case 3:
        return "Security System Bypass";
      case 4:
        return "Vault Access Coordination";
      case 5:
        return "Final Escape";
      default:
        return "Team Coordination";
    }
  }

  /**
   * Private: Get puzzle instructions based on stage
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    switch (this.currentStage) {
      case 3:
        return "Work together with your team to bypass the security system. Each team member must select the correct action for their role.";
      case 4:
        return "Coordinate with your team to access the main vault. Timing and sequence are critical.";
      case 5:
        return "Execute the final escape plan. All team members must perform their assigned tasks to ensure a successful getaway.";
      default:
        return "Coordinate with your team to complete this mission.";
    }
  }

  /**
   * Private: Get mission objective based on stage
   * @returns {string} - Mission objective
   */
  _getMissionObjective() {
    switch (this.currentStage) {
      case 3:
        return "Bypass the laser security system by coordinating specialized skills from multiple team members.";
      case 4:
        return "Access the main vault by performing synchronized actions with precise timing.";
      case 5:
        return "Make your escape with the loot by executing a carefully planned extraction strategy.";
      default:
        return "Complete the team mission by coordinating multiple specialized skills.";
    }
  }

  /**
   * Private: Get random event message
   * @param {string} eventType - Type of random event
   * @returns {string} - Event message
   */
  _getRandomEventMessage(eventType) {
    switch (eventType) {
      case "security_patrol":
        return "Alert: Security patrol approaching team position!";
      case "camera_sweep":
        return "Warning: Camera systems activating sweep mode!";
      case "system_check":
        return "Critical: Security system performing integrity check!";
      default:
        return "Security alert detected!";
    }
  }

  /**
   * Private: Setup Vault Access puzzle (Stage 4)
   * Would be implemented for stage 4
   */
  _setupVaultAccessPuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-blue-400";
    message.textContent =
      "Vault access coordination puzzle will be available in Stage 4";
    container.appendChild(message);
  }

  /**
   * Private: Setup Final Escape puzzle (Stage 5)
   * Would be implemented for stage 5
   */
  _setupFinalEscapePuzzle(container) {
    const message = document.createElement("div");
    message.className = "text-center text-blue-400";
    message.textContent = "Final escape puzzle will be available in Stage 5";
    container.appendChild(message);
  }
}

export default TeamPuzzleController;
