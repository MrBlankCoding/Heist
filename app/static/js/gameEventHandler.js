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
    // Add a flag to prevent recursive calls
    if (this._isCheckingForMissingPuzzle) {
      console.log(
        "Already checking for missing puzzle, preventing recursive loop"
      );
      return;
    }

    if (
      playerStateManager.gameState.status ===
      playerStateManager.GAME_STATUS.IN_PROGRESS
    ) {
      const puzzleContent = this.uiManager.elements.puzzleContent;
      if (
        puzzleContent &&
        (!puzzleContent.children.length ||
          puzzleContent.textContent.includes("Waiting for puzzle assignment"))
      ) {
        // Set the flag to prevent recursive calls
        this._isCheckingForMissingPuzzle = true;

        try {
          // Generate a puzzle for current stage directly
          const playerRole = playerStateManager.gameState.playerRole;
          const currentStage = playerStateManager.gameState.stage || 1;
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
            data: {}, // The controller will generate the detailed data
          };

          // Handle the puzzle
          this.handlePuzzleReceived(puzzle);
        } finally {
          // Clear the flag when done
          setTimeout(() => {
            this._isCheckingForMissingPuzzle = false;
          }, 1000);
        }
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

      // First check if we already have an active puzzle controller
      const currentController = this.getActivePuzzleController();
      if (currentController && currentController.isCompleted !== true) {
        console.log(
          "Found existing active puzzle controller, not initializing new one"
        );
        return;
      }

      // Add a flag to prevent multiple simultaneous initialization
      if (this._initializingPuzzle) {
        console.log("Already initializing a puzzle, preventing multiple init");
        return;
      }
      this._initializingPuzzle = true;

      // Make sure game area is visible first
      const gameArea = document.getElementById("game-area");
      if (gameArea && gameArea.classList.contains("hidden")) {
        console.log(
          "Game area was hidden, making visible before puzzle initialization"
        );
        gameArea.classList.remove("hidden");
      }

      // Clean up any existing puzzle
      this._cleanupCurrentPuzzle();

      if (!this.uiManager.elements.puzzleContent) {
        console.error("Puzzle content element not found");
        this._initializingPuzzle = false;

        // Try to find or create the puzzle content element
        const puzzleContent = document.getElementById("puzzle-content");
        if (!puzzleContent && gameArea) {
          console.log("Creating missing puzzle-content element");
          const newPuzzleContent = document.createElement("div");
          newPuzzleContent.id = "puzzle-content";
          newPuzzleContent.className = "p-4";
          gameArea.appendChild(newPuzzleContent);

          // Update UI manager reference
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
        console.log("Raw puzzle before extraction:", puzzle);

        // Show loading state while we process
        const puzzleLoadingElement = document.getElementById("puzzle-loading");
        const puzzleContentElement = document.getElementById("puzzle-content");

        if (puzzleLoadingElement) {
          puzzleLoadingElement.classList.remove("hidden");
        }

        if (puzzleContentElement) {
          puzzleContentElement.classList.add("hidden");
          // Prepare the content element for the new puzzle
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

        // Create the appropriate puzzle controller
        console.log("Creating puzzle controller for role:", playerRole);

        // Create the controller using puzzleLoader (async)
        this._createPuzzleController(puzzle, playerRole)
          .then((puzzleController) => {
            if (puzzleController) {
              console.log("Initializing puzzle controller");

              // Set the controller first before initialization to ensure references are correct
              this.setActivePuzzleController(puzzleController);

              // Then initialize it
              puzzleController.initialize();

              // Show the puzzle content and hide the loading indicator
              if (puzzleLoadingElement) {
                puzzleLoadingElement.classList.add("hidden");
              }

              if (puzzleContentElement) {
                puzzleContentElement.classList.remove("hidden");
              }

              console.log("Puzzle initialized successfully");
              this._initializingPuzzle = false;
            } else {
              console.error("Failed to create puzzle controller");
              this._showErrorInPuzzleContent(
                "Error creating puzzle",
                "Please try refreshing the page"
              );
              this._initializingPuzzle = false;
            }
          })
          .catch((error) => {
            console.error("Error creating puzzle controller:", error);
            this._showErrorInPuzzleContent(
              "Error loading puzzle",
              error.message
            );
            this._initializingPuzzle = false;

            // Try to recover by requesting the next stage after a delay
            setTimeout(() => {
              console.log("Attempting puzzle recovery");
              this._checkForMissingPuzzle();
            }, 3000);
          });
      } catch (error) {
        console.error("Error processing puzzle:", error, error.stack);
        this._showErrorInPuzzleContent("Error loading puzzle", error.message);
        this._initializingPuzzle = false;

        // Try to recover
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
        }

        // Ensure we properly null it out
        this.setActivePuzzleController(null);
      } catch (error) {
        console.error("Error cleaning up previous puzzle:", error);
      }
    }

    // Also clear the content element if it exists
    if (this.uiManager.elements.puzzleContent) {
      console.log("Clearing puzzle content element");
      // Instead of setting innerHTML directly, create a fresh element
      const freshElement = document.createElement("div");
      freshElement.id = this.uiManager.elements.puzzleContent.id;
      freshElement.className = this.uiManager.elements.puzzleContent.className;

      // Replace the existing element
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

    // Handle case where puzzle is directly the stage puzzle (no need to extract)
    if (puzzle.type && !puzzle.role) {
      console.log(
        "Puzzle appears to be a direct puzzle object, no extraction needed"
      );
      return puzzle;
    }

    // Handle old format with role property and stage_X properties
    if (puzzle.role) {
      const stagePuzzleKey = `stage_${currentStage}`;
      console.log("Looking for puzzle with key:", stagePuzzleKey);

      if (puzzle[stagePuzzleKey]) {
        console.log("Found stage puzzle, returning it");
        return puzzle[stagePuzzleKey];
      } else {
        // Log all available keys to help debug
        console.error("Available puzzle keys:", Object.keys(puzzle));
        throw new Error(
          `No puzzle found for stage ${currentStage} in role puzzles`
        );
      }
    }

    // Handle team puzzle which might not have a stage key
    if (puzzle.type && puzzle.type.includes("team_puzzle")) {
      console.log("Team puzzle detected, returning as is");
      return puzzle;
    }

    // If we get here, we don't know how to extract this puzzle
    console.error("Unexpected puzzle format:", puzzle);
    return puzzle; // Return as is and hope for the best
  }

  _createPuzzleController(puzzle, playerRole) {
    try {
      // Let the puzzleLoader create the appropriate controller
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

    // Show puzzle content with error message
    if (puzzleContentElement) {
      puzzleContentElement.classList.remove("hidden");
      puzzleContentElement.innerHTML = `
        <div class="text-center p-4">
          <p class="text-red-400 mb-2">${title}</p>
          <p class="text-sm text-gray-400">${message}</p>
          <p class="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
        </div>
      `;
    } else if (this.uiManager && this.uiManager.elements.puzzleContent) {
      // Fallback to using the UI manager's reference
      this.uiManager.elements.puzzleContent.innerHTML = `
        <div class="text-center p-4">
          <p class="text-red-400 mb-2">${title}</p>
          <p class="text-sm text-gray-400">${message}</p>
          <p class="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
        </div>
      `;
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

    if (
      data.playerId === playerStateManager.gameState.playerId &&
      this.getActivePuzzleController()
    ) {
      this.getActivePuzzleController().showSuccess();
    }

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

  handleStageCompleted(nextStage) {
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

    try {
      const successSound = new Audio("../static/sounds/stage-complete.mp3");
      successSound.volume = 0.3;
      successSound
        .play()
        .catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play stage complete sound:", e);
    }

    this._handleNextStagePuzzle(nextStage);
  }

  _handleNextStagePuzzle(nextStage) {
    const puzzleLoadingElement = document.getElementById("puzzle-loading");
    const puzzleContentElement = document.getElementById("puzzle-content");

    // Show loading and hide content
    if (puzzleLoadingElement) {
      // Update loading text if possible
      const loadingText = puzzleLoadingElement.querySelector("p");
      if (loadingText) {
        loadingText.textContent = `Loading Stage ${nextStage} puzzle...`;
      }

      puzzleLoadingElement.classList.remove("hidden");
    }

    if (puzzleContentElement) {
      puzzleContentElement.classList.add("hidden");
    }

    // Generate a new puzzle for this stage directly
    const playerRole = playerStateManager.gameState.playerRole;
    const puzzleType = this._getPuzzleTypeForStage(playerRole, nextStage);

    console.log(
      `Creating puzzle for next stage: role=${playerRole}, stage=${nextStage}, type=${puzzleType}`
    );

    // Generate a basic puzzle object with the required type and stage
    const puzzle = {
      type: puzzleType,
      difficulty: nextStage,
      data: {}, // The frontend controller will generate the specific data
    };

    // Handle the puzzle with our new approach - slight delay to ensure UI updates
    setTimeout(() => {
      this.handlePuzzleReceived(puzzle);
    }, 500);
  }

  _getPuzzleTypeForStage(role, stage) {
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
      // Return a default type based on role as fallback
      return role === "Hacker"
        ? "circuit"
        : role === "Safe Cracker"
        ? "lock_combination"
        : role === "Demolitions"
        ? "wire_cutting"
        : role === "Lookout"
        ? "surveillance"
        : "circuit";
    }

    return puzzleTypes[role][stage - 1];
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

    const stageInfo = playerStateManager.getCurrentStageInfo();
    const stageName = stageInfo
      ? stageInfo.name
      : `Stage ${data.current_stage}`;
    const isTeamPuzzle = data.team_puzzle === true;
    const puzzleType = isTeamPuzzle ? "Team Task" : "Personal Task";

    const stageCompletionData =
      playerStateManager.gameState.stagePuzzleCompletion[data.current_stage] ||
      {};
    const connectedPlayers = Object.values(
      playerStateManager.gameState.players
    ).filter((p) => p.connected);
    const completedCount = Object.keys(stageCompletionData).length;
    const totalPlayers = connectedPlayers.length;
    const progressPercent = Math.round((completedCount / totalPlayers) * 100);

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

    // Success icon
    const successIcon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    successIcon.setAttribute("viewBox", "0 0 24 24");
    successIcon.setAttribute("width", "80");
    successIcon.setAttribute("height", "80");
    successIcon.setAttribute("fill", "none");
    successIcon.setAttribute("stroke", "#10B981");
    successIcon.setAttribute("stroke-width", "2");
    successIcon.setAttribute("stroke-linecap", "round");
    successIcon.setAttribute("stroke-linejoin", "round");
    successIcon.setAttribute("class", "mb-4 animate-pulse");

    const checkPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    checkPath.setAttribute("d", "M20 6L9 17L4 12");
    successIcon.appendChild(checkPath);

    // Title
    const waitingTitle = document.createElement("h2");
    waitingTitle.className =
      "text-2xl font-bold mb-2 text-emerald-500 animate-bounce";
    waitingTitle.textContent = `${puzzleType} Completed!`;

    // Subtitle
    const waitingSubtitle = document.createElement("h3");
    waitingSubtitle.className = "text-xl font-semibold mb-4 text-yellow-400";
    waitingSubtitle.textContent = stageName;

    // Message
    const waitingMessage = document.createElement("p");
    waitingMessage.className = "text-lg mb-6 text-center max-w-md";
    waitingMessage.textContent = message;

    // Progress bar
    const progressContainer = document.createElement("div");
    progressContainer.className =
      "w-64 mb-6 bg-gray-700 rounded-full h-4 overflow-hidden";

    const progressBar = document.createElement("div");
    progressBar.className =
      "h-full bg-gradient-to-r from-yellow-400 to-emerald-500 transition-all duration-500";
    progressBar.style.width = `${progressPercent}%`;
    progressContainer.appendChild(progressBar);

    // Progress text
    const progressText = document.createElement("p");
    progressText.className = "text-sm text-gray-300 mb-4";
    progressText.textContent = `${completedCount} of ${totalPlayers} players ready (${progressPercent}%)`;

    // Spinner
    const spinnerContainer = document.createElement("div");
    spinnerContainer.className = "mt-4";

    const spinner = document.createElement("div");
    spinner.className =
      "animate-spin rounded-full h-16 w-16 border-4 border-t-yellow-400 border-r-emerald-500 border-b-blue-500 border-l-purple-500";
    spinnerContainer.appendChild(spinner);

    // Assemble the UI
    waitingContainer.appendChild(successIcon);
    waitingContainer.appendChild(waitingTitle);
    waitingContainer.appendChild(waitingSubtitle);
    waitingContainer.appendChild(waitingMessage);
    waitingContainer.appendChild(progressContainer);
    waitingContainer.appendChild(progressText);
    waitingContainer.appendChild(spinnerContainer);

    return waitingContainer;
  }
}

export default GameEventHandler;
