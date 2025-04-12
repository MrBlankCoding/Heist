// gameStartScreen.js - Handles the game start screen UI and interactions

import websocketManager from "./websocketManager.js";
import playerStateManager from "./playerStateManager.js";

class GameStartScreen {
  constructor() {
    // Element references
    this.lobbyElement = document.getElementById("lobby");
    this.playerListElement = document.getElementById("player-list");
    this.roleSelectionElement = document.getElementById("role-selection");
    this.startGameButton = document.getElementById("start-game");
    this.gameAreaElement = document.getElementById("game-area");

    // Tab elements
    this.tabButtons = document.querySelectorAll(".tab-button");
    this.tabContents = document.querySelectorAll(".tab-content");

    // State
    this.selectedRole = null;
    this.roleCards = document.querySelectorAll(".role-card");
    this.playerElements = {};
    this.activeTab = "agent-selection"; // Default active tab

    // Initialize
    this._setupEventListeners();
  }

  initialize() {
    // Set up role selection
    this.roleCards.forEach((card) => {
      card.addEventListener("click", () => this._handleRoleSelection(card));
    });

    // Set up tab switching
    this._initTabSwitching();

    // Set up start game button
    this.startGameButton.addEventListener("click", () =>
      this._handleStartGame()
    );

    // Register for player state events
    this._registerPlayerStateEvents();

    // Hide game area initially
    this.gameAreaElement.classList.add("hidden");

    // Enable the UI
    this._refreshStartButton();

    // Initial refresh
    this._refreshAllPlayers();
  }

  showLobby() {
    this.lobbyElement.classList.remove("hidden");
    this.gameAreaElement.classList.add("hidden");
    this._refreshAllPlayers();
  }

  hideLobby() {
    this.lobbyElement.classList.add("hidden");
  }

  _registerPlayerStateEvents() {
    playerStateManager.on("playerConnected", (player) => {
      if (!player) return;

      // Ensure player has an id property
      if (!player.id && player.player_id) {
        player.id = player.player_id;
      }

      if (player.id) {
        this._renderPlayer(player);
      }
    });

    playerStateManager.on("playerDisconnected", (playerId) => {
      this._updatePlayerConnection(playerId, false);
    });

    playerStateManager.on("playerLeft", (playerInfo) => {
      const playerElement = document.getElementById(`player-${playerInfo.id}`);
      if (playerElement) {
        playerElement.classList.add("animate-fadeOut");
        setTimeout(() => playerElement.remove(), 300);
      }

      this._updateRoleCardAvailability();
      this._refreshStartButton();
    });

    playerStateManager.on("playerRoleSelected", (data) => {
      if (data.player) {
        this._renderPlayer(data.player);
      } else if (data.playerId && data.role) {
        this._updatePlayerRole(data.playerId, data.role);
      }
      this._refreshAllPlayers();
    });

    playerStateManager.on("gameStateUpdated", () => this._refreshAllPlayers());
    playerStateManager.on("gameStarted", () => this._showGameArea());
  }

  _setupEventListeners() {
    websocketManager.on("onReconnect", () => this._refreshAllPlayers());
  }

  _initTabSwitching() {
    if (!this.tabButtons || this.tabButtons.length === 0) return;

    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab;
        if (tabId) this._switchTab(tabId);
      });
    });
  }

  _switchTab(tabId) {
    if (tabId === this.activeTab) return;

    // Update active tab state
    this.activeTab = tabId;

    // Update tab button styling
    this.tabButtons.forEach((button) => {
      const buttonTabId = button.dataset.tab;
      if (buttonTabId === tabId) {
        // Active tab styling
        button.classList.add(
          "active",
          "bg-blue-900/50",
          "text-blue-300",
          "border-blue-700/50"
        );
        button.classList.remove(
          "bg-gray-800/50",
          "text-gray-400",
          "border-gray-700/50"
        );
      } else {
        // Inactive tab styling
        button.classList.remove(
          "active",
          "bg-blue-900/50",
          "text-blue-300",
          "border-blue-700/50"
        );
        button.classList.add(
          "bg-gray-800/50",
          "text-gray-400",
          "border-gray-700/50"
        );
      }
    });

    // Show the selected tab content and hide others
    this.tabContents.forEach((content) => {
      if (content.id === tabId) {
        content.classList.remove("hidden");
        content.classList.add("active");
      } else {
        content.classList.add("hidden");
        content.classList.remove("active");
      }
    });
  }

  _handleRoleSelection(card) {
    const role = card.dataset.role;

    if (card.classList.contains("cursor-not-allowed")) {
      this._showErrorMessage("This role has already been taken!");
      return;
    }

    // Check if role is already taken
    const takenRoles = this._getTakenRoles();
    if (takenRoles.has(role)) {
      this._showErrorMessage("This role has already been taken!");
      card.classList.add("opacity-50", "cursor-not-allowed");
      card.style.pointerEvents = "none";
      return;
    }

    // Update visual selection
    this.roleCards.forEach((c) => {
      c.classList.remove("selected", "opacity-50", "cursor-not-allowed");
      c.style.pointerEvents = "auto";
    });
    card.classList.add("selected");

    // Update local state
    this.selectedRole = role;

    // Update UI optimistically
    this._updateUIForRoleSelection(role);

    // Send selection to server
    playerStateManager
      .selectRole(role)
      .then(() => {
        // Disable all role cards except selected one
        this.roleCards.forEach((c) => {
          if (c.dataset.role === role) {
            c.classList.add("selected", "opacity-50", "cursor-not-allowed");
            c.style.pointerEvents = "none";
          } else {
            c.classList.remove("selected");
          }
        });

        this._refreshAllPlayers();
      })
      .catch((error) => {
        console.error("Error selecting role:", error);

        // Reset selection on error
        card.classList.remove("selected");
        this.selectedRole = null;

        // Reset game state
        this._resetPlayerRole();

        // Show error message
        this._showErrorMessage(error.message);

        this._refreshAllPlayers();
      });

    this._refreshStartButton();
  }

  _updateUIForRoleSelection(role) {
    const currentPlayerId = playerStateManager.gameState.playerId;

    // Update the game state optimistically
    if (
      currentPlayerId &&
      playerStateManager.gameState.players[currentPlayerId]
    ) {
      playerStateManager.gameState.players[currentPlayerId].role = role;
      playerStateManager.gameState.playerRole = role;
    }

    if (currentPlayerId && this.playerElements[currentPlayerId]) {
      const playerEl = this.playerElements[currentPlayerId];
      const roleInfo = playerStateManager.getRoleInfo(role);
      const roleColor = roleInfo ? roleInfo.color : "gray";

      // Update the role circle and text
      const roleCircle = playerEl.querySelector(
        ".flex.items-center span:first-child"
      );
      if (roleCircle) {
        roleCircle.className = `text-${roleColor}-400 mr-2`;
        roleCircle.textContent = "●"; // Filled circle for selected role
      }

      // Update the role text
      const roleTextEl = playerEl.querySelector(".mt-1");
      if (roleTextEl) {
        roleTextEl.className = `mt-1 text-sm text-${roleColor}-300`;
        roleTextEl.textContent = role;
      }
    }
  }

  _resetPlayerRole() {
    const currentPlayerId = playerStateManager.gameState.playerId;

    // Reset the game state
    if (
      currentPlayerId &&
      playerStateManager.gameState.players[currentPlayerId]
    ) {
      playerStateManager.gameState.players[currentPlayerId].role = null;
      playerStateManager.gameState.playerRole = null;
    }

    // Reset the UI
    if (currentPlayerId && this.playerElements[currentPlayerId]) {
      const playerEl = this.playerElements[currentPlayerId];

      // Reset the role circle
      const roleCircle = playerEl.querySelector(
        ".flex.items-center span:first-child"
      );
      if (roleCircle) {
        roleCircle.className = "text-gray-400 mr-2";
        roleCircle.textContent = "○"; // Empty circle for no role
      }

      // Reset the role text
      const roleTextEl = playerEl.querySelector(".mt-1");
      if (roleTextEl) {
        roleTextEl.className = "mt-1 text-sm text-gray-400 italic";
        roleTextEl.textContent = "Selecting role...";
      }
    }
  }

  _handleStartGame() {
    if (!playerStateManager.isHost()) {
      this._showErrorMessage("Only the host can start the game");
      return;
    }

    playerStateManager.startGame().catch((error) => {
      this._showErrorMessage(error.message);
      console.error("Error starting game:", error);
    });
  }

  _showGameArea() {
    this.lobbyElement.classList.add("hidden");
    this.gameAreaElement.classList.remove("hidden");
  }

  _renderPlayer(player) {
    if (!player || !player.id || !this.playerListElement) return;

    // Check if this player element already exists
    if (this.playerElements[player.id]) {
      // Update existing player element
      const playerElement = this.playerElements[player.id];
      playerElement.innerHTML = this._generatePlayerHTML(player);
      return;
    }

    // Create new player element
    const playerElement = document.createElement("div");
    playerElement.className = "border-b border-gray-700 last:border-0";
    playerElement.innerHTML = this._generatePlayerHTML(player);

    // Store reference and append to player list
    this.playerElements[player.id] = playerElement;
    this.playerListElement.appendChild(playerElement);
  }

  _generatePlayerHTML(player) {
    const playerName = player.name
      ? this._escapeHtml(player.name)
      : `Player ${player.id.slice(0, 4)}`;
    const connectionStatus = player.connected !== false;
    const isCurrentPlayer = player.id === playerStateManager.gameState.playerId;

    // Role label with appropriate color
    let roleLabel = "";
    if (player.role) {
      const roleInfo = playerStateManager.getRoleInfo(player.role);
      const roleColor = roleInfo ? roleInfo.color : "gray";
      roleLabel = `<span class="text-${roleColor}-400">● ${player.role}</span>`;
    } else {
      roleLabel = '<span class="text-gray-400">● No role</span>';
    }

    return `
      <div class="flex items-center justify-between py-1">
        <div>
          ${isCurrentPlayer ? "<strong>" : ""}
          ${playerName}
          ${
            player.is_host
              ? '<span class="ml-1 text-purple-300">(Host)</span>'
              : ""
          }
          ${isCurrentPlayer ? "</strong>" : ""}
        </div>
        <div>
          ${roleLabel}
          ${
            !connectionStatus
              ? '<span class="ml-2 text-red-400">(Disconnected)</span>'
              : ""
          }
        </div>
      </div>
    `;
  }

  _updatePlayerConnection(playerId, connected) {
    if (!this.playerElements[playerId]) return;

    const playerEl = this.playerElements[playerId];
    const statusElement = playerEl.querySelector('div[class^="text-"]');

    if (statusElement) {
      statusElement.className = connected ? "text-green-400" : "text-red-400";
      statusElement.textContent = connected ? "✓" : "✗";
    }
  }

  _updatePlayerRole(playerId, role) {
    const player = playerStateManager.getPlayer(playerId);
    if (!player) return;

    const playerElement = document.getElementById(`player-${playerId}`);
    if (!playerElement) return;

    const roleElement = playerElement.querySelector(".player-role");
    if (roleElement) {
      roleElement.textContent = role || "No role selected";
      roleElement.className = `player-role ${
        role
          ? "text-" + this._getRoleColor(role) + "-400"
          : "text-gray-400 italic"
      }`;
    }

    // Update role cards (only for current player)
    if (playerId === playerStateManager.gameState.playerId) {
      this._updateRoleCardAvailability();
    }
  }

  _refreshAllPlayers() {
    if (!this.playerListElement) return;

    // Clear existing elements
    this.playerListElement.innerHTML = "";
    this.playerElements = {};

    // Re-render all players
    if (
      playerStateManager?.gameState?.players &&
      typeof playerStateManager.gameState.players === "object"
    ) {
      Object.values(playerStateManager.gameState.players).forEach((player) => {
        if (!player) return;

        // Ensure player has id property
        if (!player.id && player.player_id) {
          player.id = player.player_id;
        } else if (!player.id) {
          // Try to get id from object key
          try {
            Object.entries(playerStateManager.gameState.players).forEach(
              ([id, p]) => {
                if (p === player) {
                  player.id = id;
                }
              }
            );
          } catch (err) {
            console.error("Error finding player ID:", err);
          }
        }

        if (player.id) {
          this._renderPlayer(player);
        }
      });
    }

    this._updateRoleCardAvailability();
    this._refreshStartButton();
  }

  _refreshStartButton() {
    if (!this.startGameButton || !playerStateManager?.gameState) {
      this.startGameButton.disabled = true;
      this.startGameButton.textContent = "Connection error";
      return;
    }

    const isHost = playerStateManager.isHost();
    const hasRole = !!playerStateManager.gameState.playerRole;
    const players = this._getValidPlayers();

    const allPlayersHaveRoles =
      players.length > 0 && players.every((player) => player && !!player.role);
    const hasMinimumPlayers = players.length >= 2;

    this.startGameButton.classList.remove("hidden");

    if (isHost) {
      if (!hasMinimumPlayers) {
        this.startGameButton.textContent = `Need ${
          2 - players.length
        } more player${players.length === 0 ? "s" : ""}`;
        this.startGameButton.disabled = true;
      } else if (!hasRole) {
        this.startGameButton.textContent = "Select a role first";
        this.startGameButton.disabled = true;
      } else if (!allPlayersHaveRoles) {
        const playersWithoutRoles = players.filter((p) => p && !p.role).length;
        this.startGameButton.textContent = `Waiting for ${playersWithoutRoles} player${
          playersWithoutRoles === 1 ? "" : "s"
        } to select roles`;
        this.startGameButton.disabled = true;
      } else {
        this.startGameButton.textContent = "Start Heist";
        this.startGameButton.disabled = false;
      }
    } else {
      this.startGameButton.textContent = "Waiting for host to start...";
      this.startGameButton.disabled = true;
    }
  }

  _getValidPlayers() {
    let players = [];
    try {
      if (
        playerStateManager?.gameState?.players &&
        typeof playerStateManager.gameState.players === "object"
      ) {
        players = Object.values(playerStateManager.gameState.players);
      }
    } catch (err) {
      console.error("Error accessing players:", err);
    }
    return players;
  }

  _getTakenRoles() {
    const takenRoles = new Set();
    const players = this._getValidPlayers();
    const currentPlayerId = playerStateManager.gameState.playerId;

    players.forEach((player) => {
      if (player && player.role && player.id !== currentPlayerId) {
        takenRoles.add(player.role);
      }
    });

    return takenRoles;
  }

  _showErrorMessage(message) {
    const errorEl = document.createElement("div");
    errorEl.className =
      "bg-red-900 text-white px-4 py-2 rounded-lg fixed top-4 right-4 animate-fadeIn z-50";
    errorEl.textContent = message;
    document.body.appendChild(errorEl);

    setTimeout(() => {
      errorEl.classList.add("animate-fadeOut");
      setTimeout(() => {
        document.body.removeChild(errorEl);
      }, 500);
    }, 3000);
  }

  _escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  _updateRoleCardAvailability() {
    if (!this.roleCards || !this.roleCards.length) return;

    const takenRoles = this._getTakenRoles();
    const currentPlayerRole = playerStateManager?.gameState?.playerRole;

    this.roleCards.forEach((card) => {
      if (!card?.dataset?.role) return;

      const role = card.dataset.role;

      // Reset card state first
      card.classList.remove("selected", "opacity-50", "cursor-not-allowed");
      card.style.pointerEvents = "auto";

      // If this role is the current player's role
      if (role === currentPlayerRole) {
        card.classList.add("selected", "opacity-50", "cursor-not-allowed");
        card.style.pointerEvents = "none";
      }
      // If this role is taken by someone else
      else if (takenRoles.has(role)) {
        card.classList.add("opacity-50", "cursor-not-allowed");
        card.style.pointerEvents = "none";
      }
    });
  }
}

// Create singleton instance
const gameStartScreen = new GameStartScreen();
export default gameStartScreen;
