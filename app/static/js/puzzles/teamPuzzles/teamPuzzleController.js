// teamPuzzleController.js - Controls collaborative team puzzles

import PowerGridPuzzle from "../teamPuzzles/powerGridPuzzle.js";
import CodeRelayPuzzle from "../teamPuzzles/codeRelayPuzzle.js";
import PressurePlateMaze from "../teamPuzzles/pressurePlateMaze.js";
import SignalFrequencyPuzzle from "../teamPuzzles/signalFrequencyPuzzle.js";
import DataChainPuzzle from "../teamPuzzles/dataChainPuzzle.js";

class TeamPuzzleController {
  constructor(
    containerElement,
    puzzleData,
    submitSolutionCallback,
    websocketManager
  ) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.websocketManager = websocketManager;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 3; // Team puzzles start at stage 3

    // Team puzzle specific properties
    this.playerRole = puzzleData.playerRole || null;
    this.requiredRoles = puzzleData.requiredRoles || [];
    this.activePuzzle = null; // Will hold the active puzzle instance

    // DOM elements will be created during initialization
    this.teamPuzzleContainer = null;
    this.messageElement = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
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

    // Initialize the appropriate puzzle based on type or stage
    if (puzzleType === "team_puzzle_power_grid" || this._isPowerGridStage()) {
      this._initializePowerGridPuzzle(gameArea);
    } else if (
      puzzleType === "team_puzzle_code_relay" ||
      this._isCodeRelayStage()
    ) {
      this._initializeCodeRelayPuzzle(gameArea);
    } else if (
      puzzleType === "team_puzzle_pressure_plate" ||
      this._isPressurePlateStage()
    ) {
      this._initializePressurePlatePuzzle(gameArea);
    } else if (
      puzzleType === "team_puzzle_signal_frequency" ||
      this._isSignalFrequencyStage()
    ) {
      this._initializeSignalFrequencyPuzzle(gameArea);
    } else if (
      puzzleType === "team_puzzle_data_chain" ||
      this._isDataChainStage()
    ) {
      this._initializeDataChainPuzzle(gameArea);
    } else {
      // Fallback to a specific puzzle based on stage
      this._initializeFallbackPuzzle(gameArea);
    }
  }

  /**
   * Private: Initialize Power Grid Puzzle
   * @param {HTMLElement} container - Container element
   */
  _initializePowerGridPuzzle(container) {
    this.activePuzzle = new PowerGridPuzzle(
      container,
      this.playerRole,
      this.requiredRoles,
      (success) => this._handlePuzzleCompletion(success),
      (updateData) => this.broadcastUpdate(updateData)
    );
    this.activePuzzle.initialize();
  }

  /**
   * Private: Initialize Code Relay Puzzle
   * @param {HTMLElement} container - Container element
   */
  _initializeCodeRelayPuzzle(container) {
    this.activePuzzle = new CodeRelayPuzzle(
      container,
      this.playerRole,
      this.requiredRoles,
      (success) => this._handlePuzzleCompletion(success),
      (updateData) => this.broadcastUpdate(updateData)
    );
    this.activePuzzle.initialize();
  }

  /**
   * Private: Initialize Pressure Plate Maze Puzzle
   * @param {HTMLElement} container - Container element
   */
  _initializePressurePlatePuzzle(container) {
    this.activePuzzle = new PressurePlateMaze(
      container,
      this.playerRole,
      this.requiredRoles,
      (success) => this._handlePuzzleCompletion(success),
      (updateData) => this.broadcastUpdate(updateData)
    );
    this.activePuzzle.initialize();
  }

  /**
   * Private: Initialize Signal Frequency Puzzle
   * @param {HTMLElement} container - Container element
   */
  _initializeSignalFrequencyPuzzle(container) {
    this.activePuzzle = new SignalFrequencyPuzzle(
      container,
      this.playerRole,
      this.requiredRoles,
      (success) => this._handlePuzzleCompletion(success),
      (updateData) => this.broadcastUpdate(updateData)
    );
    this.activePuzzle.initialize();
  }

  /**
   * Private: Initialize Data Chain Puzzle
   * @param {HTMLElement} container - Container element
   */
  _initializeDataChainPuzzle(container) {
    this.activePuzzle = new DataChainPuzzle(
      container,
      this.playerRole,
      this.requiredRoles,
      (success) => this._handlePuzzleCompletion(success),
      (updateData) => this.broadcastUpdate(updateData)
    );
    this.activePuzzle.initialize();
  }

  /**
   * Private: Initialize a fallback puzzle based on stage
   * @param {HTMLElement} container - Container element
   */
  _initializeFallbackPuzzle(container) {
    // Pick a puzzle based on the stage
    if (this.currentStage === 3) {
      this._initializePowerGridPuzzle(container);
    } else if (this.currentStage === 4) {
      this._initializeCodeRelayPuzzle(container);
    } else if (this.currentStage === 5) {
      this._initializePressurePlatePuzzle(container);
    } else {
      // Default to power grid puzzle
      this._initializePowerGridPuzzle(container);
    }
  }

  /**
   * Private: Handle puzzle completion
   * @param {boolean} success - Whether the puzzle was completed successfully
   */
  _handlePuzzleCompletion(success) {
    if (success) {
      this.showSuccess();

      // Call submit solution with success
      if (this.submitSolution) {
        // Check if this puzzle completes the stage (special team puzzle)
        const completesStage = this.puzzleData.completes_stage || false;
        this.submitSolution({ success: true, completesStage: completesStage });
      }
    }
  }

  /**
   * Display success message and visuals
   */
  showSuccess() {
    this.isCompleted = true;

    // Update UI to show success
    this.messageElement.textContent = "Team mission accomplished successfully!";
    this.messageElement.className = "mb-4 text-green-400 text-center";
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

    // Pass the event to the active puzzle
    if (
      this.activePuzzle &&
      typeof this.activePuzzle.handleRandomEvent === "function"
    ) {
      this.activePuzzle.handleRandomEvent(eventType);
    }

    // Hide message after duration
    setTimeout(() => {
      if (this.isCompleted) return;
      this.messageElement.className = "mb-4 text-yellow-400 text-center hidden";
    }, duration * 1000);
  }

  /**
   * Cleanup event listeners and references
   */
  cleanup() {
    // Clean up active puzzle
    if (this.activePuzzle && typeof this.activePuzzle.cleanup === "function") {
      this.activePuzzle.cleanup();
    }

    // Clear references
    this.activePuzzle = null;
    this.teamPuzzleContainer = null;
    this.messageElement = null;
  }

  /**
   * Private: Helper methods to determine puzzle type based on stage
   */
  _isPowerGridStage() {
    return this.currentStage === 3 && !this.puzzleData.type;
  }

  _isCodeRelayStage() {
    return this.currentStage === 4 && !this.puzzleData.type;
  }

  _isPressurePlateStage() {
    return (
      this.currentStage === 5 && this.puzzleData.subType === "pressure_plate"
    );
  }

  _isSignalFrequencyStage() {
    return (
      this.currentStage === 5 && this.puzzleData.subType === "signal_frequency"
    );
  }

  _isDataChainStage() {
    return this.currentStage === 5 && this.puzzleData.subType === "data_chain";
  }

  /**
   * Private: Get puzzle title based on stage or type
   * @returns {string} - Puzzle title
   */
  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "team_puzzle_power_grid" || this._isPowerGridStage()) {
      return "Power Grid Restoration";
    } else if (
      puzzleType === "team_puzzle_code_relay" ||
      this._isCodeRelayStage()
    ) {
      return "Vault Code Relay";
    } else if (
      puzzleType === "team_puzzle_pressure_plate" ||
      this._isPressurePlateStage()
    ) {
      return "Laser Grid Bypass";
    } else if (
      puzzleType === "team_puzzle_signal_frequency" ||
      this._isSignalFrequencyStage()
    ) {
      return "Signal Frequency Calibration";
    } else if (
      puzzleType === "team_puzzle_data_chain" ||
      this._isDataChainStage()
    ) {
      return "Data Chain Decoder";
    } else {
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
  }

  /**
   * Private: Get puzzle instructions based on stage or type
   * @returns {string} - Puzzle instructions
   */
  _getInstructions() {
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "team_puzzle_power_grid" || this._isPowerGridStage()) {
      return "Work together with your team to restore power to the security system. Each team member can only see part of the grid.";
    } else if (
      puzzleType === "team_puzzle_code_relay" ||
      this._isCodeRelayStage()
    ) {
      return "Listen for your part of the security code and share it with your team to assemble the complete code.";
    } else if (
      puzzleType === "team_puzzle_pressure_plate" ||
      this._isPressurePlateStage()
    ) {
      return "Navigate through the pressure plate maze by following the Lookout's instructions to deactivate the laser grid.";
    } else if (
      puzzleType === "team_puzzle_signal_frequency" ||
      this._isSignalFrequencyStage()
    ) {
      return "Adjust your dial to match the target frequency. Each team member controls a different part of the signal.";
    } else if (
      puzzleType === "team_puzzle_data_chain" ||
      this._isDataChainStage()
    ) {
      return "Decode your part of the data chain and pass the result to the next team member to unlock the final security system.";
    } else {
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
      case "power_surge":
        return "Warning: Power surge detected in security systems!";
      default:
        return "Security alert detected!";
    }
  }

  /**
   * Broadcast team puzzle update to all other players
   * @param {Object} updateData - Data to broadcast
   */
  broadcastUpdate(updateData) {
    if (!this.websocketManager) return;

    // Add puzzle type to update data
    updateData.puzzle_type = this._getPuzzleType();

    // Send via websocket
    this.websocketManager
      .send({
        type: "team_puzzle_update",
        room_code: this.puzzleData.room_code || "",
        update_data: updateData,
      })
      .catch((error) => {
        console.error("Error broadcasting team puzzle update:", error);
      });
  }

  /**
   * Handle team puzzle update from other players
   * @param {Object} updateData - Update data received
   * @param {string} senderId - ID of the player who sent the update
   */
  handleUpdate(updateData, senderId) {
    if (this.isCompleted) return;

    // Pass update to active puzzle if it exists and has a handleRemoteUpdate method
    if (
      this.activePuzzle &&
      typeof this.activePuzzle.handleRemoteUpdate === "function"
    ) {
      this.activePuzzle.handleRemoteUpdate(updateData, senderId);
    }
  }

  /**
   * Get the puzzle type string for the active puzzle
   * @returns {string} - Puzzle type
   */
  _getPuzzleType() {
    const puzzleType = this.puzzleData.type;

    if (puzzleType === "team_puzzle_power_grid" || this._isPowerGridStage()) {
      return "power_grid";
    } else if (
      puzzleType === "team_puzzle_code_relay" ||
      this._isCodeRelayStage()
    ) {
      return "code_relay";
    } else if (
      puzzleType === "team_puzzle_pressure_plate" ||
      this._isPressurePlateStage()
    ) {
      return "pressure_plate";
    } else if (
      puzzleType === "team_puzzle_signal_frequency" ||
      this._isSignalFrequencyStage()
    ) {
      return "signal_frequency";
    } else if (
      puzzleType === "team_puzzle_data_chain" ||
      this._isDataChainStage()
    ) {
      return "data_chain";
    } else {
      // Default based on stage
      switch (this.currentStage) {
        case 3:
          return "power_grid";
        case 4:
          return "code_relay";
        case 5:
          return "pressure_plate";
        default:
          return "power_grid";
      }
    }
  }
}

export default TeamPuzzleController;
