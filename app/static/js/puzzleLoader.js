// puzzleLoader.js - Dynamically loads puzzle modules for a specific role

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

    // Path mapping for each role's controller
    const controllerPaths = {
      Hacker: "./puzzles/hacker/hackerPuzzleController.js",
      "Safe Cracker": "./puzzles/safeCracker/SafeCrackerPuzzleController.js",
      Demolitions: "./puzzles/demolitions/demolitionsPuzzleController.js",
      Lookout: "./puzzles/lookout/lookoutPuzzleController.js",
      Team: "./puzzles/teamPuzzles/teamPuzzleController.js",
    };

    const path = controllerPaths[role];

    if (!path) {
      return Promise.reject(new Error(`Unknown role: ${role}`));
    }

    // Create and store the promise
    this.loadPromises[role] = new Promise(async (resolve, reject) => {
      try {
        // Use dynamic import to load the module
        const module = await import(path);
        this.loadedControllers[role] = module.default;
        console.log(`Successfully loaded controller for ${role}`);
        resolve(module.default);
      } catch (error) {
        console.error(`Failed to load controller for ${role}:`, error);
        delete this.loadPromises[role];
        reject(error);
      }
    });

    return this.loadPromises[role];
  }

  /**
   * Load team puzzle controller
   * @returns {Promise} - Promise resolving to the team puzzle controller class
   */
  async loadTeamPuzzleController() {
    return this.loadPuzzleController("Team");
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
        const TeamPuzzleController = await this.loadTeamPuzzleController();

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

      // For role-specific puzzles
      const ControllerClass = await this.loadPuzzleController(role);

      return new ControllerClass(
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
