// gameEventHandler.js - Handles all game events and interactions

import playerStateManager from "./playerStateManager.js";
import gameStartScreen from "./gameStartScreen.js";
import websocketManager from "./websocketManager.js";
import {
  HackerPuzzleController,
  SafeCrackerPuzzleController,
  DemolitionsPuzzleController,
  LookoutPuzzleController,
  TeamPuzzleController,
} from "./main.bundle.js";

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
    this._checkForMissingPuzzle();
  }

  _checkForMissingPuzzle() {
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
        websocketManager
          .send({
            type: "request_puzzle",
            player_id: playerStateManager.gameState.playerId,
          })
          .catch((error) => console.error("Error requesting puzzle:", error));
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
      this._cleanupCurrentPuzzle();

      if (!this.uiManager.elements.puzzleContent) {
        console.error("Puzzle content element not found");
        return;
      }

      const playerRole = playerStateManager.gameState.playerRole;
      if (!playerRole) {
        this._showErrorInPuzzleContent(
          "Error: Player role not defined",
          "Please try refreshing the page"
        );
        return;
      }

      this._ensureGameAreaVisible();

      try {
        puzzle = this._extractCurrentStagePuzzle(puzzle);
        const puzzleController = this._createPuzzleController(
          puzzle,
          playerRole
        );

        if (puzzleController) {
          puzzleController.initialize();
          this.setActivePuzzleController(puzzleController);
        } else {
          this._showErrorInPuzzleContent(
            "Error creating puzzle",
            "Please try refreshing the page"
          );
        }
      } catch (error) {
        this._showErrorInPuzzleContent("Error loading puzzle", error.message);
      }
    } catch (outerError) {
      this._showErrorInPuzzleContent(
        "Error processing puzzle",
        outerError.message
      );
    }
  }

  _cleanupCurrentPuzzle() {
    const currentController = this.getActivePuzzleController();
    if (currentController) {
      try {
        currentController.cleanup();
      } catch (error) {
        console.error("Error cleaning up previous puzzle:", error);
      }
    }
  }

  _extractCurrentStagePuzzle(puzzle) {
    if (
      puzzle.role &&
      (puzzle.stage_1 ||
        puzzle.stage_2 ||
        puzzle.stage_3 ||
        puzzle.stage_4 ||
        puzzle.stage_5)
    ) {
      const currentStage = playerStateManager.gameState.stage;
      const stagePuzzleKey = `stage_${currentStage}`;

      if (puzzle[stagePuzzleKey]) {
        return puzzle[stagePuzzleKey];
      } else {
        throw new Error(
          `No puzzle found for stage ${currentStage} in role puzzles`
        );
      }
    }
    return puzzle;
  }

  _createPuzzleController(puzzle, playerRole) {
    if (puzzle.type && puzzle.type.includes("team_puzzle")) {
      puzzle.playerRole = playerRole;
      puzzle.room_code = playerStateManager.gameState.roomCode;

      return new TeamPuzzleController(
        this.uiManager.elements.puzzleContent,
        puzzle,
        (solution) => playerStateManager.submitPuzzleSolution(solution),
        websocketManager
      );
    }

    const controllerMap = {
      Hacker: HackerPuzzleController,
      "Safe Cracker": SafeCrackerPuzzleController,
      Demolitions: DemolitionsPuzzleController,
      Lookout: LookoutPuzzleController,
    };

    const ControllerClass = controllerMap[playerRole];
    if (!ControllerClass) {
      throw new Error(`Unknown role: ${playerRole}`);
    }

    return new ControllerClass(
      this.uiManager.elements.puzzleContent,
      puzzle,
      (solution) => playerStateManager.submitPuzzleSolution(solution)
    );
  }

  _showErrorInPuzzleContent(title, message) {
    if (!this.uiManager.elements.puzzleContent) return;

    this.uiManager.elements.puzzleContent.innerHTML = `
      <div class="text-center p-4">
        <p class="text-red-400 mb-2">${title}</p>
        <p class="text-sm text-gray-400">${message}</p>
        <p class="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
      </div>
    `;
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
    const puzzles = playerStateManager.gameState.puzzles;
    const playerId = playerStateManager.gameState.playerId;
    const loadingHtml = `
      <div class="text-center p-4">
        <p class="text-gray-200">Loading Stage ${nextStage} puzzle...</p>
        <div class="mt-2 loader mx-auto"></div>
      </div>
    `;

    if (puzzles?.[playerId]?.role) {
      const rolePuzzles = puzzles[playerId];
      const nextStagePuzzleKey = `stage_${nextStage}`;

      if (rolePuzzles[nextStagePuzzleKey]) {
        this.handlePuzzleReceived(rolePuzzles[nextStagePuzzleKey]);
      } else {
        this.uiManager.elements.puzzleContent.innerHTML = loadingHtml;
      }
    } else {
      this.uiManager.elements.puzzleContent.innerHTML = loadingHtml;

      setTimeout(() => {
        if (
          this.uiManager.elements.puzzleContent?.textContent.includes("Loading")
        ) {
          playerStateManager.fetchPuzzlesForRole().catch((error) => {
            console.error("Error fetching role puzzles:", error);
          });
        }
      }, 3000);
    }
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
