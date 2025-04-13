// puzzleLoader.js - Dynamically loads puzzle modules for a specific role

import UniversalPuzzleController from "./puzzles/universalPuzzleController.js";
import TeamPuzzleController from "./puzzles/teamPuzzles/teamPuzzleController.js";

class PuzzleLoader {
  constructor() {
    this.loadedControllers = {};
    this.loadPromises = {};
  }

  /**
   * Load puzzle controller for a specific role
   * @param {string} role - Player role (Hacker, Safe Cracker, Demolitions, Lookout)
   * @returns {Promise} - Promise resolving to the puzzle controller class
   */
  async loadPuzzleController(role) {
    // If already loaded, return from cache
    if (this.loadedControllers[role]) {
      return this.loadedControllers[role];
    }

    // If already loading, return the existing promise
    if (this.loadPromises[role]) {
      return this.loadPromises[role];
    }

    console.log(`Loading puzzle controller for role: ${role}`);

    // For team puzzles, load the specific team controller
    if (role === "Team") {
      return this.loadTeamPuzzleController();
    }

    // For all other roles, use the universal controller
    this.loadedControllers[role] = UniversalPuzzleController;
    return UniversalPuzzleController;
  }

  /**
   * Load team puzzle controller
   * @returns {Promise} - Promise resolving to the team puzzle controller class
   */
  async loadTeamPuzzleController() {
    // Set the team controller directly
    this.loadedControllers["Team"] = TeamPuzzleController;
    return TeamPuzzleController;
  }

  /**
   * Create a puzzle controller instance for the given role and puzzle data
   * @param {string} role - Player role
   * @param {Object} puzzleData - Puzzle data
   * @param {HTMLElement} containerElement - Container element
   * @param {Function} submitSolutionCallback - Callback for submitting solutions
   * @param {Object} websocketManager - WebSocket manager for team puzzles
   * @returns {Promise} - Promise resolving to the controller instance
   */
  async createPuzzleController(
    role,
    puzzleData,
    containerElement,
    submitSolutionCallback,
    websocketManager
  ) {
    try {
      // Check if it's a team puzzle
      if (puzzleData.type && puzzleData.type.includes("team_puzzle")) {
        // For team puzzles, use the specific team controller

        // Add role and room code to puzzle data for team puzzles
        puzzleData.playerRole = role;
        puzzleData.room_code = puzzleData.room_code || null;

        return new TeamPuzzleController(
          containerElement,
          puzzleData,
          submitSolutionCallback,
          websocketManager
        );
      }

      // For all other puzzles, use the universal controller
      return new UniversalPuzzleController(
        containerElement,
        puzzleData,
        submitSolutionCallback
      );
    } catch (error) {
      console.error("Error creating puzzle controller:", error);
      throw error;
    }
  }
}

// Export a singleton instance
const puzzleLoader = new PuzzleLoader();
export default puzzleLoader;
