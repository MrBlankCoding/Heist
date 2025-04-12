// gameUIManager.js - Handles all UI updates and DOM interactions

import playerStateManager from "./playerStateManager.js";
import websocketManager from "./websocketManager.js";
import puzzleLoader from "./puzzleLoader.js";
// Puzzle controllers are now loaded dynamically via puzzleLoader.js

class GameUIManager {
  constructor() {
    this.elements = {
      gameArea: document.getElementById("game-area"),
      timer: document.getElementById("timer"),
      alertLevel: document.getElementById("alert-level"),
      stageNumber: document.getElementById("current-stage"),
      stageName: document.getElementById("stage-title"),
      stageProgress: document.getElementById("stage-progress"),
      teamStatus: document.getElementById("team-status"),
      puzzleContent: document.getElementById("puzzle-content"),
      roleInstruction: document.getElementById("role-instruction"),
      usePowerButton: document.getElementById("use-power"),
      extendTimerButton: document.getElementById("extend-timer"),
      gameOverModal: document.getElementById("game-over-modal"),
      gameResult: document.getElementById("game-result"),
      gameResultMessage: document.getElementById("game-result-message"),
      playAgainButton: document.getElementById("play-again"),
      returnHomeButton: document.getElementById("return-home"),
      timerVoteModal: document.getElementById("timer-vote-modal"),
      voteCount: document.getElementById("vote-count"),
      voteProgress: document.getElementById("vote-progress"),
      votePlayerList: document.getElementById("vote-player-list"),
      voteYesButton: document.getElementById("vote-yes"),
      voteNoButton: document.getElementById("vote-no"),
      voteTimer: document.getElementById("vote-timer"),
    };

    this._validateElements();

    this.currentTimer = 300;
    this.currentAlertLevel = 0;
    this.currentStage = 1;
    this.voteTimerInterval = null;
    this.cooldownInterval = null;

    document.addEventListener("DOMContentLoaded", () => {
      this._setupEventListeners();
      this._preloadSoundEffects();
    });

    playerStateManager.on("puzzleCompletionUpdated", () => {
      this.updateTeamStatus();
    });
  }

  _validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.error(
        `Missing required DOM elements: ${missingElements.join(", ")}`
      );
    }
  }

  updateTimer(seconds) {
    if (!this.elements?.timer || this.currentTimer === seconds) return;

    const previousTimer = this.currentTimer;
    this.currentTimer = seconds;

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedTime = `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;

    this.elements.timer.textContent = formattedTime;

    this.elements.timer.classList.remove(
      "text-red-500",
      "text-yellow-500",
      "animate-pulse"
    );

    if (seconds <= 30) {
      this.elements.timer.classList.add("text-red-500", "animate-pulse");
    } else if (seconds <= 60) {
      this.elements.timer.classList.add("text-yellow-500");
    }

    if (previousTimer !== seconds) {
      this.elements.timer.classList.add("timer-update");
      setTimeout(() => {
        this.elements.timer?.classList.remove("timer-update");
      }, 500);
    }
  }

  updateAlertLevel(level) {
    if (!this.elements?.alertLevel || this.currentAlertLevel === level) return;

    this.currentAlertLevel = level;

    let alertText = "LOW";
    let alertClass = "bg-green-900 text-green-200";

    if (level >= 3 && level < 5) {
      alertText = "MEDIUM";
      alertClass = "bg-yellow-900 text-yellow-200";
    } else if (level >= 5) {
      alertText = "HIGH";
      alertClass = "bg-red-900 text-red-200";
    }

    this.elements.alertLevel.textContent = `Alert: ${alertText}`;
    this.elements.alertLevel.className = `ml-4 px-3 py-1 rounded-md ${alertClass}`;
  }

  updateStageInfo() {
    if (
      !this.elements?.stageNumber ||
      !this.elements?.stageName ||
      !this.elements?.stageProgress
    )
      return;

    const stageInfo = playerStateManager.getCurrentStageInfo();
    if (!stageInfo || this.currentStage === stageInfo.number) return;

    this.currentStage = stageInfo.number;

    this.elements.stageNumber.textContent = `STAGE ${stageInfo.number}`;
    this.elements.stageName.textContent = stageInfo.name;

    const progressPercent = ((stageInfo.number - 1) / 5) * 100;
    this.elements.stageProgress.style.width = `${progressPercent}%`;
  }

  updateTeamStatus() {
    if (!this.elements?.teamStatus) return;

    const players = playerStateManager.getAllPlayers();
    if (!players) return;

    const currentPlayerId = playerStateManager.gameState.playerId;
    const fragment = document.createDocumentFragment();

    const stageCompletion =
      playerStateManager.getCurrentStagePuzzleCompletion();
    const currentStage = playerStateManager.gameState.stage;

    const titleEl = document.createElement("div");
    titleEl.className = "mb-3 border-b border-gray-700 pb-2";
    titleEl.innerHTML = `
      <h4 class="font-bold text-blue-400 mb-1">Stage ${currentStage} Progress</h4>
      <p class="text-xs text-gray-400">Players must complete their puzzle to advance</p>
    `;
    fragment.appendChild(titleEl);

    Object.values(players).forEach((player) => {
      if (!player) return;

      const roleInfo = playerStateManager.getRoleInfo(player.role);
      const roleColor = roleInfo ? roleInfo.color : "gray";
      const isCurrentPlayer = player.id === currentPlayerId;
      const statusClass = player.connected ? "text-green-400" : "text-red-400";

      const hasCompletedPuzzle = stageCompletion[player.id] || false;
      const completionClass = hasCompletedPuzzle
        ? "text-green-500"
        : "text-yellow-500";
      const completionIcon = hasCompletedPuzzle
        ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

      const playerEl = document.createElement("div");
      playerEl.className =
        "mb-2 flex justify-between items-center p-2 rounded bg-gray-800 bg-opacity-50";
      playerEl.innerHTML = `
        <div class="flex items-center">
          <span class="text-${roleColor}-400 mr-2">●</span>
          <div class="flex flex-col">
            <span class="font-semibold ${
              isCurrentPlayer ? "text-blue-300" : ""
            }">${this._escapeHtml(player.name || "Unknown")}${
        isCurrentPlayer ? " (You)" : ""
      }</span>
            <span class="text-xs text-${roleColor}-300">${this._escapeHtml(
        player.role || ""
      )}</span>
          </div>
        </div>
        <div class="flex items-center">
          <span class="mr-2 ${statusClass} text-xs">
            ${player.connected ? "Connected" : "Disconnected"}
          </span>
          <span class="${completionClass} ml-2" title="${
        hasCompletedPuzzle ? "Puzzle completed" : "Puzzle in progress"
      }">
            ${completionIcon}
          </span>
        </div>
      `;
      fragment.appendChild(playerEl);
    });

    this.elements.teamStatus.innerHTML = "";
    this.elements.teamStatus.appendChild(fragment);
  }

  setupPuzzleUI(puzzle, getActivePuzzleController) {
    if (!this.elements?.puzzleContent)
      return Promise.reject(new Error("Puzzle content element not found"));

    this.elements.puzzleContent.innerHTML = "";

    // Show loading indicator while we load the controller
    const loadingElement = document.createElement("div");
    loadingElement.className = "text-center py-8";
    loadingElement.innerHTML = `
      <div class="loader mx-auto mb-4"></div>
      <p class="text-gray-300">Loading puzzle...</p>
    `;
    this.elements.puzzleContent.appendChild(loadingElement);

    const role = playerStateManager.gameState.playerRole;
    if (!role) {
      console.error("No role assigned");
      this.elements.puzzleContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-red-500">Error: No role assigned</p>
          <p class="text-gray-400 mt-2">Please refresh the page</p>
        </div>
      `;
      return Promise.reject(new Error("No role assigned"));
    }

    try {
      // Use puzzleLoader to create the controller instead of direct instantiation
      return puzzleLoader
        .createPuzzleController(
          role,
          puzzle,
          this.elements.puzzleContent,
          (solution) => playerStateManager.submitPuzzleSolution(solution),
          websocketManager
        )
        .then((puzzleController) => {
          // Clear loading indicator
          this.elements.puzzleContent.innerHTML = "";
          // Initialize the controller
          puzzleController.initialize();
          // Return the controller so it can be stored
          return puzzleController;
        })
        .catch((error) => {
          console.error(
            `Error creating puzzle controller for role ${role}:`,
            error
          );
          this.elements.puzzleContent.innerHTML = `
          <div class="text-center py-8">
            <p class="text-red-500">Error loading puzzle</p>
            <p class="text-gray-400 mt-2">${error.message}</p>
            <p class="text-gray-400 mt-2">Please refresh the page</p>
          </div>
        `;
          throw error; // Rethrow the error to be caught by the caller
        });
    } catch (error) {
      console.error(`Error in setupPuzzleUI:`, error);
      this.elements.puzzleContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-red-500">Error setting up puzzle</p>
          <p class="text-gray-400 mt-2">${error.message}</p>
          <p class="text-gray-400 mt-2">Please refresh the page</p>
        </div>
      `;
      return Promise.reject(error);
    }
  }

  updateExtendTimerButtonAfterVote() {
    if (!this.elements.extendTimerButton) return;

    this.elements.extendTimerButton.classList.add("opacity-50");
    this.elements.extendTimerButton.textContent = "Vote Cast: Extend Timer";
    this.elements.extendTimerButton.disabled = true;
  }

  resetExtendTimerButton() {
    if (!this.elements.extendTimerButton) return;

    this.elements.extendTimerButton.classList.remove("opacity-50");
    this.elements.extendTimerButton.textContent = "Vote: Extend Timer";
    this.elements.extendTimerButton.disabled = false;
  }

  setPowerButtonCooldown(cooldownDuration = 60) {
    if (!this.elements.usePowerButton) return;

    this.elements.usePowerButton.disabled = true;
    this.elements.usePowerButton.classList.add("opacity-50");

    const originalText = this.elements.usePowerButton.textContent;
    this.elements.usePowerButton.dataset.originalText = originalText;

    this._startCooldownTimer(cooldownDuration);
  }

  resetPowerButtonCooldown() {
    if (!this.elements.usePowerButton) return;

    this.elements.usePowerButton.disabled = false;
    this.elements.usePowerButton.classList.remove("opacity-50");

    if (this.elements.usePowerButton.dataset.originalText) {
      this.elements.usePowerButton.textContent =
        this.elements.usePowerButton.dataset.originalText;
      delete this.elements.usePowerButton.dataset.originalText;
    }

    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  _startCooldownTimer(duration) {
    if (!this.elements.usePowerButton) return;

    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    let timeLeft = duration;
    this.elements.usePowerButton.textContent = `Power Cooling Down (${timeLeft}s)`;

    this.cooldownInterval = setInterval(() => {
      timeLeft--;
      this.elements.usePowerButton.textContent = `Power Cooling Down (${timeLeft}s)`;

      if (timeLeft <= 0) {
        this.resetPowerButtonCooldown();
      }
    }, 1000);
  }

  showGameOverModal(result, message) {
    if (
      !this.elements.gameOverModal ||
      !this.elements.gameResult ||
      !this.elements.gameResultMessage
    )
      return;

    const isSuccess = result === "success";
    this.elements.gameResult.textContent = isSuccess
      ? "HEIST SUCCESSFUL"
      : "HEIST FAILED";
    this.elements.gameResultMessage.textContent =
      message ||
      (isSuccess
        ? "You've successfully completed the heist and escaped with the loot!"
        : "The heist has failed.");

    this._replaceButtonWithClone(this.elements.playAgainButton, () => {
      this._handlePlayAgain();
    });

    this._replaceButtonWithClone(this.elements.returnHomeButton, () => {
      this._handleReturnHome();
    });

    this.elements.gameOverModal.classList.remove("hidden");
    this.elements.gameOverModal.classList.add("animate-fadeIn");
  }

  _replaceButtonWithClone(button, clickHandler) {
    if (!button) return;

    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    newButton.addEventListener("click", clickHandler);

    return newButton;
  }

  _handlePlayAgain() {
    this.hideGameOverModal();
    playerStateManager.clearPersistedState();

    if (gameStartScreen) {
      if (
        playerStateManager.gameState.players &&
        typeof playerStateManager.gameState.players === "object"
      ) {
        Object.values(playerStateManager.gameState.players).forEach(
          (player) => {
            if (player) {
              player.role = null;
            }
          }
        );
      }

      playerStateManager.gameState.playerRole = null;
      playerStateManager.gameState.stage = 1;
      playerStateManager.gameState.status =
        playerStateManager.GAME_STATUS.WAITING;
      playerStateManager.gameState.timer = 300;
      playerStateManager.gameState.alertLevel = 0;

      this.elements.gameArea.classList.add("hidden");
      gameStartScreen.showLobby();

      websocketManager
        .send({
          type: "reset_game",
          player_id: playerStateManager.gameState.playerId,
        })
        .catch((error) => {
          console.error("Error resetting game:", error);
        });
    } else {
      console.error("gameStartScreen not found, can't reset game");
      window.location.reload();
    }
  }

  _handleReturnHome() {
    playerStateManager.clearPersistedState();
    websocketManager.disconnect("User exited game");
    window.location.href = "/";
  }

  hideGameOverModal() {
    if (!this.elements.gameOverModal) return;

    this.elements.gameOverModal.classList.add("animate-fadeOut");

    setTimeout(() => {
      this.elements.gameOverModal.classList.add("hidden");
      this.elements.gameOverModal.classList.remove(
        "animate-fadeIn",
        "animate-fadeOut"
      );
    }, 300);
  }

  playSound(type) {
    const soundMap = {
      success: "success.mp3",
      failure: "failure.mp3",
      alert: "alert.mp3",
      powerUsed: "power.mp3",
      timerExtended: "timer_extended.mp3",
    };

    const soundFile = soundMap[type];
    if (!soundFile) {
      console.warn(`Unknown sound type: ${type}`);
      return;
    }

    try {
      const audio = new Audio(`/static/sounds/${soundFile}`);
      audio.play().catch((error) => {
        console.warn(`Failed to play sound ${type}:`, error);
      });
    } catch (error) {
      console.warn(`Error playing sound ${type}:`, error);
    }
  }

  _escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  showTimerVoteModal(voteTimeLimit = 20, onVoteYes, onVoteNo) {
    if (!this.elements.timerVoteModal) return;

    if (this.elements.voteCount) {
      this.elements.voteCount.textContent = "0/0";
    }

    if (this.elements.voteProgress) {
      this.elements.voteProgress.style.width = "0%";
    }

    if (this.elements.votePlayerList) {
      this.elements.votePlayerList.innerHTML = "";
    }

    this._setupVoteButton(
      this.elements.voteYesButton,
      this.elements.voteNoButton,
      onVoteYes
    );
    this._setupVoteButton(
      this.elements.voteNoButton,
      this.elements.voteYesButton,
      onVoteNo
    );

    this._startVoteTimer(voteTimeLimit);

    this.elements.timerVoteModal.classList.remove("hidden");
    this.elements.timerVoteModal.classList.add("animate-fadeIn");

    this.playSound("alert");
  }

  _setupVoteButton(button, oppositeButton, onClickCallback) {
    if (!button) return;

    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    newButton.addEventListener("click", () => {
      newButton.disabled = true;
      newButton.classList.add("opacity-50");

      if (oppositeButton) {
        oppositeButton.disabled = true;
        oppositeButton.classList.add("opacity-50");
      }

      if (onClickCallback) onClickCallback();
    });

    return newButton;
  }

  updateTimerVote(voteData) {
    if (!this.elements.timerVoteModal) return;

    if (!voteData.players || typeof voteData.players !== "object") {
      console.error(
        "Invalid vote data - players object is missing or invalid",
        voteData
      );
      return;
    }

    const totalPlayers = Object.keys(voteData.players).length;
    const votesCount = voteData.votes.length;
    const yesVotes = voteData.yesVotes || [];
    const noVotes = voteData.noVotes || [];

    if (this.elements.voteCount) {
      this.elements.voteCount.textContent = `${votesCount}/${totalPlayers}`;
    }

    if (this.elements.voteProgress) {
      const percentage = Math.min(100, (votesCount / totalPlayers) * 100);
      this.elements.voteProgress.style.width = `${percentage}%`;
    }

    if (this.elements.votePlayerList) {
      this.elements.votePlayerList.innerHTML = "";

      Object.entries(voteData.players).forEach(([playerId, player]) => {
        const isCurrentPlayer =
          playerId === playerStateManager.gameState.playerId;

        let voteIcon = '<span class="text-gray-500">•••</span>';
        if (yesVotes.includes(playerId)) {
          voteIcon = '<span class="text-green-400">✓</span>';
        } else if (noVotes.includes(playerId)) {
          voteIcon = '<span class="text-red-400">✗</span>';
        }

        const playerEl = document.createElement("div");
        playerEl.className = "flex items-center justify-between";

        const roleInfo = playerStateManager.getRoleInfo(player.role);
        const roleColor = roleInfo ? roleInfo.color : "gray";

        playerEl.innerHTML = `
          <div class="flex items-center">
            <span class="text-${roleColor}-400 mr-1.5">●</span>
            <span class="${
              isCurrentPlayer ? "font-bold" : ""
            }">${this._escapeHtml(player.name)}</span>
          </div>
          <div>
            ${voteIcon}
          </div>
        `;

        this.elements.votePlayerList.appendChild(playerEl);
      });
    }
  }

  hideTimerVoteModal() {
    if (!this.elements.timerVoteModal) return;

    if (this.voteTimerInterval) {
      clearInterval(this.voteTimerInterval);
      this.voteTimerInterval = null;
    }

    this.elements.timerVoteModal.classList.add("animate-fadeOut");

    setTimeout(() => {
      this.elements.timerVoteModal.classList.add("hidden");
      this.elements.timerVoteModal.classList.remove(
        "animate-fadeIn",
        "animate-fadeOut"
      );

      if (this.elements.voteYesButton) {
        this.elements.voteYesButton.disabled = false;
        this.elements.voteYesButton.classList.remove("opacity-50");
      }

      if (this.elements.voteNoButton) {
        this.elements.voteNoButton.disabled = false;
        this.elements.voteNoButton.classList.remove("opacity-50");
      }
    }, 300);
  }

  _startVoteTimer(duration) {
    if (!this.elements.voteTimer) return;

    if (this.voteTimerInterval) {
      clearInterval(this.voteTimerInterval);
    }

    let timeLeft = duration;
    this.elements.voteTimer.textContent = `Vote ends in ${timeLeft}s`;

    this.voteTimerInterval = setInterval(() => {
      timeLeft--;

      if (timeLeft <= 0) {
        clearInterval(this.voteTimerInterval);
        this.voteTimerInterval = null;
      } else {
        this.elements.voteTimer.textContent = `Vote ends in ${timeLeft}s`;
      }
    }, 1000);
  }
}

export default GameUIManager;
