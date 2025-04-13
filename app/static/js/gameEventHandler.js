// gameEventHandler.js - Handles all game events and interactions

import playerStateManager from "./playerStateManager.js";
import gameStartScreen from "./gameStartScreen.js";
import websocketManager from "./websocketManager.js";
import puzzleLoader from "./puzzleLoader.js";

class GameEventHandler {
  constructor(
    uiManager,
    notificationSystem,
    chatManager,
    setActivePuzzleController,
    getActivePuzzleController,
    setPowerCooldown,
    resetPowerCooldown,
    setTimerExtendVoted
  ) {
    this.uiManager = uiManager;
    this.notificationSystem = notificationSystem;
    this.chatManager = chatManager;
    this.setActivePuzzleController = setActivePuzzleController;
    this.getActivePuzzleController = getActivePuzzleController;
    this.setPowerCooldown = setPowerCooldown;
    this.resetPowerCooldown = resetPowerCooldown;
    this.setTimerExtendVoted = setTimerExtendVoted;
    this.activeRandomEvents = [];
    this._isCheckingForMissingPuzzle = false;
    this._initializingPuzzle = false;

    // Listen for puzzle needed events
    playerStateManager.on("puzzlesNeeded", (data) => {
      console.log("Puzzles needed event received:", data);
      if (!this._initializingPuzzle && !this._isCheckingForMissingPuzzle) {
        const role = data.role;
        const stage = data.stage || 1;

        if (role) {
          const puzzleType = this._getPuzzleTypeForStage(role, stage);
          console.log(
            `Creating puzzle from puzzlesNeeded event: role=${role}, stage=${stage}, type=${puzzleType}`
          );

          const puzzle = {
            type: puzzleType,
            difficulty: stage,
            data: {},
          };

          this.handlePuzzleReceived(puzzle);
        }
      } else {
        console.log(
          "Skipping puzzlesNeeded event - already handling puzzle initialization"
        );
      }
    });
  }

  handleGameStateUpdated(data) {
    if (!this.uiManager) return;

    try {
      if (typeof this.uiManager.updateTimer === "function") {
        this.uiManager.updateTimer(data.timer);
      }

      if (typeof this.uiManager.updateAlertLevel === "function") {
        this.uiManager.updateAlertLevel(data.alertLevel);
      }

      if (typeof this.uiManager.updateStageInfo === "function") {
        this.uiManager.updateStageInfo();
      }

      if (typeof this.uiManager.updateTeamStatus === "function") {
        this.uiManager.updateTeamStatus();
      }

      if (data.status === "in_progress") {
        this._ensureGameAreaVisible();
      }
    } catch (error) {
      console.error("Error updating UI:", error);
    }
  }

  _ensureGameAreaVisible() {
    const gameArea = document.getElementById("game-area");
    const lobby = document.getElementById("lobby");

    if (gameArea) {
      gameArea.classList.remove("hidden");
    }

    if (lobby) {
      lobby.classList.add("hidden");
    }

    try {
      if (typeof gameStartScreen !== "undefined" && gameStartScreen.hideLobby) {
        gameStartScreen.hideLobby();
      }
    } catch (error) {
      console.error("Error calling gameStartScreen.hideLobby():", error);
    }

    this._updateRoleInstruction();

    // Only check for missing puzzle if not already handling one
    if (!this._initializingPuzzle && !this._isCheckingForMissingPuzzle) {
      this._checkForMissingPuzzle();
    } else {
      console.log(
        "Skipping check for missing puzzle - already handling puzzle initialization"
      );
    }
  }

  _checkForMissingPuzzle() {
    // Prevent recursive calls
    if (this._isCheckingForMissingPuzzle) {
      console.log(
        "Already checking for missing puzzle, preventing recursive loop"
      );
      return;
    }

    if (
      playerStateManager.gameState.status !==
      playerStateManager.GAME_STATUS.IN_PROGRESS
    ) {
      return;
    }

    const puzzleContent = this.uiManager.elements.puzzleContent;
    if (
      !puzzleContent ||
      !puzzleContent.children.length ||
      puzzleContent.textContent.includes("Waiting for puzzle assignment")
    ) {
      // Set protection flag
      this._isCheckingForMissingPuzzle = true;

      try {
        // Generate a puzzle for current stage
        const playerRole = playerStateManager.gameState.playerRole;
        const currentStage = playerStateManager.gameState.stage || 1;

        console.log(`_checkForMissingPuzzle: Current stage is ${currentStage}`);

        const puzzleType = this._getPuzzleTypeForStage(
          playerRole,
          currentStage
        );
        console.log(
          `Creating puzzle for role ${playerRole}, stage ${currentStage}, type ${puzzleType}`
        );

        // Create a basic puzzle object
        const puzzle = {
          type: puzzleType,
          difficulty: currentStage,
          data: {}, // Controller will generate the detailed data
        };

        // Handle the puzzle
        this.handlePuzzleReceived(puzzle);
      } finally {
        // Clear the flag after a delay to prevent rapid rechecking
        setTimeout(() => {
          this._isCheckingForMissingPuzzle = false;
        }, 1000);
      }
    }
  }

  _updateRoleInstruction() {
    if (!this.uiManager?.elements?.roleInstruction) return;

    const playerRole = playerStateManager.gameState.playerRole;
    if (playerRole) {
      const roleInfo = playerStateManager.getRoleInfo(playerRole);
      if (roleInfo) {
        this.uiManager.elements.roleInstruction.textContent = `${playerRole} - ${roleInfo.description}`;
        this.uiManager.elements.roleInstruction.classList.remove(
          "text-gray-400",
          "italic"
        );
      }
    }
  }

  handleTimerUpdated(timer) {
    this.uiManager.updateTimer(timer);
  }

  handleAlertLevelChanged(level) {
    this.uiManager.updateAlertLevel(level);
  }

  handlePuzzleReceived(puzzle) {
    try {
      console.log("Handling puzzle received:", puzzle);

      // Check if we already have an active puzzle controller that should be kept
      const currentController = this.getActivePuzzleController();
      if (currentController) {
        if (!currentController.isCompleted) {
          const puzzleStage =
            puzzle.difficulty || playerStateManager.gameState.stage;
          const currentStage = playerStateManager.gameState.stage;

          if (
            puzzleStage === currentStage &&
            currentController.messageElement !== null
          ) {
            console.log(
              "Found existing active controller for current stage, keeping it"
            );
            return;
          }
          console.log(
            `Replacing controller: stage changed (${currentStage} vs ${puzzleStage}) or controller is invalid`
          );
        }
      }

      // Prevent multiple initializations
      if (this._initializingPuzzle) {
        console.log("Already initializing a puzzle, preventing multiple init");
        return;
      }
      this._initializingPuzzle = true;

      // Ensure game area is visible
      const gameArea = document.getElementById("game-area");
      if (gameArea && gameArea.classList.contains("hidden")) {
        gameArea.classList.remove("hidden");
      }

      // Clean up any existing puzzle
      this._cleanupCurrentPuzzle();

      // Verify puzzle content element exists
      if (!this.uiManager.elements.puzzleContent) {
        console.error("Puzzle content element not found");
        this._initializingPuzzle = false;

        // Try to recover by finding or creating the element
        const puzzleContent = document.getElementById("puzzle-content");
        if (!puzzleContent && gameArea) {
          console.log("Creating missing puzzle-content element");
          const newPuzzleContent = document.createElement("div");
          newPuzzleContent.id = "puzzle-content";
          newPuzzleContent.className = "p-4";
          gameArea.appendChild(newPuzzleContent);

          if (this.uiManager) {
            this.uiManager.elements.puzzleContent = newPuzzleContent;
          } else {
            console.error(
              "UI manager not available to update puzzle content reference"
            );
            return;
          }
        } else if (!puzzleContent) {
          console.error("Cannot find or create puzzle content element");
          return;
        }
      }

      const playerRole = playerStateManager.gameState.playerRole;
      if (!playerRole) {
        console.error("Player role not defined");
        this._showErrorInPuzzleContent(
          "Error: Player role not defined",
          "Please try refreshing the page"
        );
        this._initializingPuzzle = false;
        return;
      }

      try {
        // Show loading state
        const puzzleLoadingElement = document.getElementById("puzzle-loading");
        const puzzleContentElement = document.getElementById("puzzle-content");

        if (puzzleLoadingElement) {
          puzzleLoadingElement.classList.remove("hidden");
        }

        if (puzzleContentElement) {
          puzzleContentElement.classList.add("hidden");
          this.uiManager.elements.puzzleContent.innerHTML = "";
        }

        // Extract the appropriate puzzle based on current stage
        puzzle = this._extractCurrentStagePuzzle(puzzle);
        console.log("Extracted puzzle for controller:", puzzle);

        if (!puzzle || (!puzzle.type && !puzzle.data)) {
          this._initializingPuzzle = false;
          throw new Error("Invalid puzzle data received");
        }

        // Ensure puzzle has necessary fields
        puzzle.data = puzzle.data || {};
        puzzle.difficulty =
          puzzle.difficulty || playerStateManager.gameState.stage || 1;

        // Create and initialize the puzzle controller
        this._createPuzzleController(puzzle, playerRole)
          .then((puzzleController) => {
            if (puzzleController) {
              console.log("Initializing puzzle controller");
              this.setActivePuzzleController(puzzleController);

              try {
                puzzleController.initialize();

                // Show the puzzle content and hide loading
                if (puzzleLoadingElement) {
                  puzzleLoadingElement.classList.add("hidden");
                }
                if (puzzleContentElement) {
                  puzzleContentElement.classList.remove("hidden");
                }
                console.log("Puzzle initialized successfully");
              } catch (initError) {
                console.error("Error initializing puzzle:", initError);
                this._cleanupCurrentPuzzle();

                // Try to recover
                setTimeout(() => {
                  this._showErrorInPuzzleContent(
                    "Error initializing puzzle",
                    "Attempting to recover..."
                  );
                  this._checkForMissingPuzzle();
                }, 1000);
              }
            } else {
              console.error("Failed to create puzzle controller");
              this._showErrorInPuzzleContent(
                "Error creating puzzle",
                "Please try refreshing the page"
              );
            }
            this._initializingPuzzle = false;
          })
          .catch((error) => {
            console.error("Error creating puzzle controller:", error);
            this._showErrorInPuzzleContent(
              "Error loading puzzle",
              error.message
            );
            this._initializingPuzzle = false;

            // Recovery attempt
            setTimeout(() => {
              console.log("Attempting puzzle recovery");
              this._checkForMissingPuzzle();
            }, 3000);
          });
      } catch (error) {
        console.error("Error processing puzzle:", error, error.stack);
        this._showErrorInPuzzleContent("Error loading puzzle", error.message);
        this._initializingPuzzle = false;

        // Recovery attempt
        setTimeout(() => {
          console.log("Attempting puzzle recovery");
          this._checkForMissingPuzzle();
        }, 3000);
      }
    } catch (outerError) {
      console.error(
        "Critical error in puzzle handling:",
        outerError,
        outerError.stack
      );
      this._showErrorInPuzzleContent(
        "Error processing puzzle",
        outerError.message
      );
      this._initializingPuzzle = false;
    }
  }

  _cleanupCurrentPuzzle() {
    const currentController = this.getActivePuzzleController();
    if (currentController) {
      try {
        console.log("Cleaning up previous puzzle controller");
        if (typeof currentController.cleanup === "function") {
          currentController.cleanup();
        } else {
          console.warn("Puzzle controller doesn't have cleanup method");

          // Manually clean up controller properties
          if (
            currentController.activePuzzle &&
            typeof currentController.activePuzzle.cleanup === "function"
          ) {
            currentController.activePuzzle.cleanup();
          }

          // Clear UI references
          currentController.messageElement = null;
          currentController.submitButton = null;
          currentController.activePuzzle = null;
        }

        // Always null out the controller when done
        this.setActivePuzzleController(null);
      } catch (error) {
        console.error("Error cleaning up previous puzzle:", error);
        this.setActivePuzzleController(null);
      }
    }

    // Create a fresh puzzle content element to avoid any lingering event handlers
    if (this.uiManager.elements.puzzleContent) {
      console.log("Refreshing puzzle content element");
      const freshElement = document.createElement("div");
      freshElement.id = this.uiManager.elements.puzzleContent.id;
      freshElement.className = this.uiManager.elements.puzzleContent.className;

      if (this.uiManager.elements.puzzleContent.parentNode) {
        this.uiManager.elements.puzzleContent.parentNode.replaceChild(
          freshElement,
          this.uiManager.elements.puzzleContent
        );
        this.uiManager.elements.puzzleContent = freshElement;
      }
    }
  }

  _extractCurrentStagePuzzle(puzzle) {
    console.log("Extracting puzzle for current stage. Puzzle data:", puzzle);
    const currentStage = playerStateManager.gameState.stage;
    console.log("Current stage:", currentStage);

    // Direct puzzle object (modern format)
    if (puzzle.type && !puzzle.role) {
      console.log("Puzzle is already in direct format, no extraction needed");
      return puzzle;
    }

    // Handle legacy format with role property and stage_X properties
    if (puzzle.role) {
      const stagePuzzleKey = `stage_${currentStage}`;
      if (puzzle[stagePuzzleKey]) {
        console.log("Found stage puzzle in legacy format");
        return puzzle[stagePuzzleKey];
      }
      console.error("Available puzzle keys:", Object.keys(puzzle));
      throw new Error(
        `No puzzle found for stage ${currentStage} in role puzzles`
      );
    }

    // Team puzzles don't need stage-specific extraction
    if (puzzle.type && puzzle.type.includes("team_puzzle")) {
      console.log("Team puzzle detected, using as is");
      return puzzle;
    }

    console.error("Unexpected puzzle format:", puzzle);
    return puzzle; // Return as is if we don't understand the format
  }

  _createPuzzleController(puzzle, playerRole) {
    try {
      return puzzleLoader.createPuzzleController(
        playerRole,
        puzzle,
        this.uiManager.elements.puzzleContent,
        (solution) => playerStateManager.submitPuzzleSolution(solution),
        websocketManager
      );
    } catch (error) {
      console.error("Error creating puzzle controller:", error);
      throw error;
    }
  }

  _showErrorInPuzzleContent(title, message) {
    const puzzleLoadingElement = document.getElementById("puzzle-loading");
    const puzzleContentElement = document.getElementById("puzzle-content");

    // Hide loading indicator
    if (puzzleLoadingElement) {
      puzzleLoadingElement.classList.add("hidden");
    }

    // Create error message HTML
    const errorHTML = `
      <div class="text-center p-4">
        <p class="text-red-400 mb-2">${title}</p>
        <p class="text-sm text-gray-400">${message}</p>
        <p class="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
      </div>
    `;

    // Show puzzle content with error message
    if (puzzleContentElement) {
      puzzleContentElement.classList.remove("hidden");
      puzzleContentElement.innerHTML = errorHTML;
    } else if (this.uiManager?.elements?.puzzleContent) {
      // Fallback to using the UI manager's reference
      this.uiManager.elements.puzzleContent.innerHTML = errorHTML;
    } else {
      console.error(
        "Cannot display error, puzzle content element not found:",
        title,
        message
      );
    }
  }

  handlePuzzleCompleted(data) {
    const player = playerStateManager.getPlayer(data.playerId);
    const currentStage = playerStateManager.gameState.stage;

    this.chatManager.addSystemMessage(
      `${player.name} (${data.role}) completed their task!`
    );

    const allCompleted = playerStateManager.updatePlayerPuzzleCompletion(
      data.playerId,
      currentStage
    );
    this.uiManager.updateTeamStatus();

    // Handle the player's own puzzle completion
    if (data.playerId === playerStateManager.gameState.playerId) {
      const puzzleController = this.getActivePuzzleController();
      if (!puzzleController) return;

      // Get puzzle info if available
      const puzzleInfo =
        data.puzzle_info ||
        (typeof puzzleController.getPuzzleInfo === "function"
          ? puzzleController.getPuzzleInfo()
          : null);

      // Determine if we should auto-advance
      const shouldAutoAdvance = puzzleInfo ? puzzleInfo.autoAdvance : true;
      const isLastStage = currentStage >= 5;

      // Log the state to help diagnose the issue
      console.log(
        `Puzzle completion: stage=${currentStage}, shouldAutoAdvance=${shouldAutoAdvance}, isLastStage=${isLastStage}`
      );

      if (shouldAutoAdvance) {
        if (isLastStage) {
          // Final stage - show success then completion screen
          puzzleController.showSuccess(false, () => {
            console.log("Final stage success callback triggered");
            this._showFinalPuzzleCompletionScreen();
          });
        } else {
          // Auto-advance to next stage
          puzzleController.showSuccess(true, () => {
            console.log(
              `Auto-advance callback triggered for stage ${currentStage + 1}`
            );
            this._handlePlayerAutoAdvance(currentStage + 1);
          });
        }
      } else {
        // Just show success without advancing
        puzzleController.showSuccess(false);
      }
    }

    // If host and all players completed stage, move to next stage
    if (allCompleted && playerStateManager.isHost()) {
      websocketManager.send({
        action: "complete_stage",
        data: {
          roomCode: playerStateManager.gameState.roomCode,
          playerId: playerStateManager.gameState.playerId,
          currentStage: currentStage,
        },
      });
    }
  }

  /**
   * Handle player auto-advancement to next puzzle
   * @param {number} nextStage - The stage to advance to
   */
  _handlePlayerAutoAdvance(nextStage) {
    console.log(`_handlePlayerAutoAdvance called for stage ${nextStage}`);

    // Clean up current puzzle
    this._cleanupCurrentPuzzle();

    // Get player information
    const playerRole = playerStateManager.gameState.playerRole;
    const puzzleType = this._getPuzzleTypeForStage(playerRole, nextStage);

    console.log(
      `Auto-advancing to next puzzle: ${puzzleType} (Stage ${nextStage})`
    );

    // Create a new puzzle object
    const nextPuzzle = {
      type: puzzleType,
      difficulty: nextStage,
      data: {}, // The controller will generate the specific data
    };

    // Show a notification
    this.notificationSystem.showAlert(
      `Advancing to Stage ${nextStage} puzzle...`,
      "info"
    );

    // Update stage in playerStateManager
    playerStateManager.gameState.stage = nextStage;
    this.uiManager.updateStageInfo();

    // Play sound effect for advancement
    this._playSound("../static/sounds/puzzle-complete.mp3", 0.3);

    // Load the new puzzle with a slight delay to ensure proper transition
    setTimeout(() => {
      this.handlePuzzleReceived(nextPuzzle);
    }, 300);
  }

  _playSound(src, volume = 0.3) {
    try {
      const sound = new Audio(src);
      sound.volume = volume;
      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  /**
   * Show the final puzzle completion screen
   */
  _showFinalPuzzleCompletionScreen() {
    this._cleanupCurrentPuzzle();

    // Create a completion message in the puzzle area
    const puzzleContent = this.uiManager.elements.puzzleContent;
    if (puzzleContent) {
      puzzleContent.innerHTML = `
        <div class="text-center py-12">
          <div class="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-green-400 mb-4">All Puzzles Completed!</h2>
          <p class="text-xl text-gray-300 mb-6">Great job! You've completed all your tasks.</p>
          <p class="text-gray-400">Wait for your teammates to finish their tasks to complete the heist.</p>
        </div>
      `;
    }

    // Play success sound
    this._playSound("../static/sounds/stage-complete.mp3", 0.3);

    // Show notification
    this.notificationSystem.showAlert(
      "All your puzzles completed! Wait for your team to finish.",
      "success",
      10000 // Show for 10 seconds
    );
  }

  handleStageCompleted(nextStage) {
    console.log(
      `Stage completed! Moving from stage ${playerStateManager.gameState.stage} to ${nextStage}`
    );

    // Check if player already advanced to this stage via auto-advance
    if (playerStateManager.gameState.stage >= nextStage) {
      console.log(
        `Player is already at stage ${playerStateManager.gameState.stage}, not loading new puzzle`
      );
      return;
    }

    // Get the current controller to check auto-advance setting
    const currentController = this.getActivePuzzleController();
    const shouldAutoAdvance =
      currentController && typeof currentController.getPuzzleInfo === "function"
        ? currentController.getPuzzleInfo().autoAdvance
        : true;

    // Update stage in playerStateManager immediately to ensure consistency
    playerStateManager.gameState.stage = nextStage;

    // Show notifications and update UI
    this.notificationSystem.showAlert(
      `Stage ${nextStage - 1} Complete! Moving to Stage ${nextStage}...`,
      "success"
    );

    this.uiManager.updateStageInfo();
    this.chatManager.addSystemMessage(
      `Stage ${nextStage - 1} completed! Starting Stage ${nextStage}: ${
        playerStateManager.getCurrentStageInfo().name
      }`
    );

    // Play success sound
    this._playSound("../static/sounds/stage-complete.mp3", 0.3);

    // Create new puzzle only if auto-advance is disabled or no controller exists
    if (!shouldAutoAdvance || !currentController) {
      this._handleNextStagePuzzle(nextStage);
    } else {
      console.log(
        "Auto-advance is enabled; leaving it to the completion handler"
      );
    }
  }

  _handleNextStagePuzzle(nextStage) {
    // Update UI elements
    const puzzleLoadingElement = document.getElementById("puzzle-loading");
    const puzzleContentElement = document.getElementById("puzzle-content");

    // Show loading and hide content
    if (puzzleLoadingElement) {
      // Update loading text
      const loadingText = puzzleLoadingElement.querySelector("p");
      if (loadingText) {
        loadingText.textContent = `Loading Stage ${nextStage} puzzle...`;
      }
      puzzleLoadingElement.classList.remove("hidden");
    }

    if (puzzleContentElement) {
      puzzleContentElement.classList.add("hidden");
    }

    // Get puzzle information for next stage
    const playerRole = playerStateManager.gameState.playerRole;
    const puzzleType = this._getPuzzleTypeForStage(playerRole, nextStage);

    console.log(
      `Creating puzzle for next stage: role=${playerRole}, stage=${nextStage}, type=${puzzleType}`
    );

    // Generate puzzle object for next stage
    const puzzle = {
      type: puzzleType,
      difficulty: nextStage,
      data: {}, // The controller will generate the specific data
    };

    // Ensure stage is updated in the player state manager
    setTimeout(() => {
      playerStateManager.gameState.stage = nextStage;
      this.handlePuzzleReceived(puzzle);
    }, 500);
  }

  _getPuzzleTypeForStage(role, stage) {
    console.log(
      `_getPuzzleTypeForStage called with role=${role}, stage=${stage}`
    );

    const puzzleTypes = {
      Hacker: [
        "circuit",
        "password_crack",
        "firewall_bypass",
        "encryption_key",
        "system_override",
      ],
      "Safe Cracker": [
        "lock_combination",
        "pattern_recognition",
        "multi_lock",
        "audio_sequence",
        "timed_lock",
      ],
      Demolitions: [
        "wire_cutting",
        "time_bomb",
        "circuit_board",
        "explosive_sequence",
        "final_detonation",
      ],
      Lookout: [
        "surveillance",
        "patrol_pattern",
        "security_system",
        "alarm",
        "escape_route",
      ],
    };

    if (!puzzleTypes[role] || !puzzleTypes[role][stage - 1]) {
      console.error(`No puzzle type found for ${role} stage ${stage}`);

      // Default puzzles map to first stage puzzle of each role
      const defaultPuzzles = {
        Hacker: "circuit",
        "Safe Cracker": "lock_combination",
        Demolitions: "wire_cutting",
        Lookout: "surveillance",
      };

      return defaultPuzzles[role] || "circuit";
    }

    const puzzleType = puzzleTypes[role][stage - 1];
    console.log(
      `Selected puzzle type for ${role} stage ${stage}: ${puzzleType}`
    );
    return puzzleType;
  }

  handleGameCompleted() {
    this.uiManager.showGameOverModal("success");
    this.uiManager.playSound("success");
    playerStateManager.gameState.status =
      playerStateManager.GAME_STATUS.COMPLETED;
  }

  handleGameOver(result, customMessage, data) {
    let resultMessage = "Your heist has failed.";

    switch (result) {
      case "time_expired":
        resultMessage = "You ran out of time. The authorities have arrived.";
        break;
      case "alarm_triggered":
        resultMessage =
          "Security alarm triggered! Guards have flooded the building.";
        break;
      case "team_caught":
        resultMessage = "Your team has been caught by security.";
        break;
      case "insufficient_players":
        resultMessage =
          customMessage ||
          "Not enough players to continue the heist. Game ended.";

        if (data?.remaining_players?.length > 0) {
          const playersList = data.remaining_players.join(", ");
          resultMessage += ` Remaining player${
            data.remaining_players.length === 1 ? "" : "s"
          }: ${playersList}`;
        }
        break;
    }

    this.uiManager.showGameOverModal(result, resultMessage);
    this.uiManager.playSound("failure");
    playerStateManager.gameState.status = playerStateManager.GAME_STATUS.FAILED;
  }

  handleUsePower() {
    playerStateManager
      .useRolePower()
      .then(() => {
        const roleInfo = playerStateManager.getRoleInfo(
          playerStateManager.gameState.playerRole
        );
        this.notificationSystem.showAlert(
          `${roleInfo.power} activated!`,
          "success"
        );

        this.setPowerCooldown();
        this.uiManager.setPowerButtonCooldown();

        setTimeout(() => {
          this.resetPowerCooldown();
          this.uiManager.resetPowerButtonCooldown();
        }, 60000);
      })
      .catch((error) => {
        this.notificationSystem.showAlert(error.message, "error");
      });
  }

  handlePowerUsedByOthers(data) {
    this.uiManager.playSound("powerUsed");

    this.notificationSystem.showAlert(
      `${data.playerName} (${data.role}) used: ${data.powerDescription}`,
      "info",
      7000
    );

    this.chatManager.addSystemMessage(
      `${data.playerName} activated: ${data.powerDescription}`,
      false,
      { type: "power", role: data.role }
    );
  }

  handleExtendTimer() {
    playerStateManager
      .initiateTimerExtensionVote()
      .then(() => {
        this.notificationSystem.showAlert(
          "Timer extension vote initiated",
          "info"
        );
      })
      .catch((error) => {
        this.notificationSystem.showAlert(
          error.message || "Failed to initiate timer extension vote",
          "error"
        );
      });
  }

  handleTimerVoteInitiated(data) {
    this.uiManager.showTimerVoteModal(
      data.voteTimeLimit,
      () => this._registerTimerVote(true),
      () => this._registerTimerVote(false)
    );

    this._updateTimerVoteUI(data);

    const initiatorName = data.initiatorName || "A player";
    this.chatManager.addSystemMessage(
      `${initiatorName} initiated a vote to extend the timer`,
      false,
      { type: "vote" }
    );
  }

  _registerTimerVote(voteValue) {
    playerStateManager.voteExtendTimer(voteValue).catch((error) => {
      this.notificationSystem.showAlert(
        error.message || "Failed to register vote",
        "error"
      );
    });
  }

  _updateTimerVoteUI(data) {
    const totalPlayers = Object.keys(data.players || {}).length;

    this.uiManager.updateTimerVote({
      votes: data.votes || [],
      yesVotes: data.yesVotes || [],
      noVotes: data.noVotes || [],
      players: data.players || {},
      required: Math.ceil(totalPlayers / 2),
      totalPlayers,
    });
  }

  handleTimerVoteUpdated(data) {
    this._updateTimerVoteUI(data);
    this.uiManager.playSound("info");

    if (
      data.playerId &&
      data.playerId !== playerStateManager.gameState.playerId
    ) {
      const player = playerStateManager.getPlayer(data.playerId);
      if (player) {
        const voteText = data.vote ? "voted YES" : "voted NO";
        this.chatManager.addSystemMessage(
          `${player.name} ${voteText} on timer extension`,
          false,
          { type: "vote" }
        );
      }
    }
  }

  handleTimerVoteCompleted(data) {
    this.uiManager.hideTimerVoteModal();

    const resultMessage = data.success
      ? "Timer extended successfully! Alert level increased."
      : data.message || "Vote failed. Timer not extended.";

    this.notificationSystem.showAlert(
      resultMessage,
      data.success ? "success" : "warning"
    );

    if (data.success) {
      this.uiManager.playSound("timerExtended");
    }

    this.chatManager.addSystemMessage(
      data.success
        ? "Vote passed! Timer extended by 60 seconds. Alert level increased!"
        : data.message || "Vote failed. Timer not extended.",
      false,
      { type: "vote" }
    );
  }

  handleRandomEvent(data) {
    const eventNames = {
      security_patrol: "Security Patrol",
      camera_sweep: "Camera Sweep",
      system_check: "System Check",
    };

    const eventDisplayName = eventNames[data.event] || data.event;

    this.notificationSystem.showAlert(
      `${eventDisplayName} in progress! (${data.duration}s)`,
      "warning"
    );
    this.activeRandomEvents.push(data.event);
    this.chatManager.addSystemMessage(
      `${eventDisplayName} detected! Proceed with caution.`
    );

    const puzzleController = this.getActivePuzzleController();
    if (puzzleController) {
      puzzleController.handleRandomEvent(data.event, data.duration);
    }

    setTimeout(() => {
      this.activeRandomEvents = this.activeRandomEvents.filter(
        (e) => e !== data.event
      );
      this.chatManager.addSystemMessage(`${eventDisplayName} has ended.`);
    }, data.duration * 1000);
  }

  handleTimerExtended(data) {
    this.notificationSystem.showAlert(
      `Timer extended! Alert level increased to ${data.alertLevel}`,
      "success"
    );

    this.uiManager.resetExtendTimerButton();
    this.setTimerExtendVoted(false);
  }

  handleGameReset(data) {
    playerStateManager.resetGameState();

    if (this.uiManager) {
      this.uiManager.resetUI();
    }

    this.notificationSystem.showNotification(
      "Game has been reset. Returning to lobby."
    );

    setTimeout(() => {
      window.location.href = "/lobby";
    }, 3000);
  }

  handlePlayerWaiting(data) {
    this._cleanupCurrentPuzzle();
    this.setActivePuzzleController(null);

    const puzzleContent = this.uiManager.elements.puzzleContent;
    if (!puzzleContent) return;

    puzzleContent.innerHTML = "";

    // Get stage and puzzle info
    const stageInfo = playerStateManager.getCurrentStageInfo();
    const stageName = stageInfo
      ? stageInfo.name
      : `Stage ${data.current_stage}`;
    const isTeamPuzzle = data.team_puzzle === true;
    const puzzleType = isTeamPuzzle ? "Team Task" : "Personal Task";

    // Calculate progress percentages
    const stageCompletionData =
      playerStateManager.gameState.stagePuzzleCompletion[data.current_stage] ||
      {};
    const connectedPlayers = Object.values(
      playerStateManager.gameState.players
    ).filter((p) => p.connected);
    const completedCount = Object.keys(stageCompletionData).length;
    const totalPlayers = connectedPlayers.length;
    const progressPercent = Math.round((completedCount / totalPlayers) * 100);

    // Create and append waiting UI
    puzzleContent.appendChild(
      this._createWaitingUI(
        puzzleType,
        stageName,
        data.message || "Waiting for other players to finish their puzzles...",
        completedCount,
        totalPlayers,
        progressPercent
      )
    );

    // Show notification and play sound
    this.notificationSystem.showNotification(
      `${puzzleType} completed! Waiting for other players.`,
      "success"
    );

    this.uiManager.playSound("success");
  }

  _createWaitingUI(
    puzzleType,
    stageName,
    message,
    completedCount,
    totalPlayers,
    progressPercent
  ) {
    const waitingContainer = document.createElement("div");
    waitingContainer.className =
      "waiting-container flex flex-col items-center justify-center p-8 h-full";
    waitingContainer.style.minHeight = "300px";

    // Build container contents
    waitingContainer.innerHTML = `
      <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="#10B981" 
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4 animate-pulse">
        <path d="M20 6L9 17L4 12"></path>
      </svg>
      
      <h2 class="text-2xl font-bold mb-2 text-emerald-500 animate-bounce">${puzzleType} Completed!</h2>
      <h3 class="text-xl font-semibold mb-4 text-yellow-400">${stageName}</h3>
      <p class="text-lg mb-6 text-center max-w-md">${message}</p>
      
      <div class="w-64 mb-6 bg-gray-700 rounded-full h-4 overflow-hidden">
        <div class="h-full bg-gradient-to-r from-yellow-400 to-emerald-500 transition-all duration-500" 
             style="width: ${progressPercent}%"></div>
      </div>
      
      <p class="text-sm text-gray-300 mb-4">${completedCount} of ${totalPlayers} players ready (${progressPercent}%)</p>
      
      <div class="mt-4">
        <div class="animate-spin rounded-full h-16 w-16 border-4 border-t-yellow-400 border-r-emerald-500 
                    border-b-blue-500 border-l-purple-500"></div>
      </div>
    `;

    return waitingContainer;
  }
}

export default GameEventHandler;
