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

    // State
    this.selectedRole = null;
    this.roleCards = document.querySelectorAll(".role-card");
    this.playerElements = {};
    this.pollIntervalId = null;

    // Initialize
    this._setupEventListeners();
  }

  /**
   * Initialize the start screen
   * @param {Object} options - Initialization options
   */
  initialize(options = {}) {
    // Set up role selection
    this.roleCards.forEach((card) => {
      card.addEventListener("click", () => this._handleRoleSelection(card));
    });

    // Set up start game button
    this.startGameButton.addEventListener("click", () =>
      this._handleStartGame()
    );

    // Register for player state events
    playerStateManager.on("playerConnected", (player) => {
      // Make sure player has an id property if it's missing
      if (player && !player.id && player.player_id) {
        player.id = player.player_id;
      }

      if (player && player.id) {
        this._renderPlayer(player);
      } else {
        console.error("Received invalid player data:", player);
      }
    });

    playerStateManager.on("playerDisconnected", (playerId) => {
      this._updatePlayerConnection(playerId, false);
    });

    playerStateManager.on("playerRoleSelected", (data) => {
      console.log("EVENT: playerRoleSelected received", data);

      // If we have full player data, use it
      if (data.player) {
        console.log("Rendering player with full data:", data.player);
        this._renderPlayer(data.player);
      } else {
        // Otherwise use the playerId and role
        console.log(
          "Updating player role with limited data:",
          data.playerId,
          data.role
        );
        this._updatePlayerRole(data.playerId, data.role);
      }

      // Force a full refresh to ensure all role cards are updated
      this._refreshAllPlayers();
    });

    playerStateManager.on("gameStateUpdated", () => {
      this._refreshAllPlayers();
    });

    playerStateManager.on("gameStarted", () => this._showGameArea());

    // Hide game area initially
    this.gameAreaElement.classList.add("hidden");

    // Enable the UI
    this._refreshStartButton();

    // Initial refresh
    this._refreshAllPlayers();

    // Set up polling for state updates (every 2 seconds)
    this._startPolling();
  }

  /**
   * Show the lobby
   */
  showLobby() {
    this.lobbyElement.classList.remove("hidden");
    this.gameAreaElement.classList.add("hidden");
    this._refreshAllPlayers();
    this._startPolling();
  }

  /**
   * Hide the lobby
   */
  hideLobby() {
    this.lobbyElement.classList.add("hidden");
    this._stopPolling();
  }

  /**
   * Private: Set up event listeners
   */
  _setupEventListeners() {
    // Handle WebSocket reconnection
    websocketManager.on("onReconnect", () => {
      // Re-render player list on reconnection
      this._refreshAllPlayers();
    });
  }

  /**
   * Private: Handle role selection
   * @param {HTMLElement} card - The clicked role card
   */
  _handleRoleSelection(card) {
    const role = card.dataset.role;
    console.log("Role selection clicked:", role);

    // Don't process if game has started
    if (playerStateManager.gameState.status !== "waiting") {
      console.log("Game already started, ignoring role selection");
      return;
    }

    // Check if card is disabled
    if (card.classList.contains("cursor-not-allowed")) {
      console.log("Role card is disabled, ignoring selection");
      this._showErrorMessage("This role has already been taken!");
      return;
    }

    // Double-check if role is already taken by checking the game state directly
    const takenRoles = new Set();
    Object.values(playerStateManager.gameState.players).forEach((player) => {
      if (player.role && player.id !== playerStateManager.gameState.playerId) {
        takenRoles.add(player.role);
      }
    });

    if (takenRoles.has(role)) {
      console.log("Role already taken (checked from game state):", role);
      this._showErrorMessage("This role has already been taken!");
      // Also update UI to reflect this
      card.classList.add("opacity-50", "cursor-not-allowed");
      card.style.pointerEvents = "none";
      return;
    }

    console.log("Selecting role:", role);

    // Update visual selection
    this.roleCards.forEach((c) => {
      c.classList.remove("selected", "opacity-50", "cursor-not-allowed");
      c.style.pointerEvents = "auto";
    });
    card.classList.add("selected");

    // Update local state
    this.selectedRole = role;

    // Immediately update the UI to show the role as pending
    const currentPlayerId = playerStateManager.gameState.playerId;
    console.log("Current player ID:", currentPlayerId);

    // Immediately update the game state (optimistically)
    if (
      currentPlayerId &&
      playerStateManager.gameState.players[currentPlayerId]
    ) {
      console.log("Optimistically updating player role in game state");
      playerStateManager.gameState.players[currentPlayerId].role = role;
      playerStateManager.gameState.playerRole = role; // Also update the direct playerRole property
    }

    if (currentPlayerId && this.playerElements[currentPlayerId]) {
      const playerEl = this.playerElements[currentPlayerId];
      const roleInfo = playerStateManager.getRoleInfo(role);
      const roleColor = roleInfo ? roleInfo.color : "gray";
      console.log("Updating UI for local player, role:", role);

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
    } else {
      console.warn("Could not find player element for immediate UI update");
    }

    // Send selection to server
    console.log("Sending role selection to server:", role);
    playerStateManager
      .selectRole(role)
      .then(() => {
        console.log(`Role selected successfully: ${role}`);

        // Disable all role cards that aren't this one
        this.roleCards.forEach((c) => {
          if (c.dataset.role === role) {
            c.classList.add("selected", "opacity-50", "cursor-not-allowed");
            c.style.pointerEvents = "none";
          } else {
            c.classList.remove("selected");
          }
        });

        // Do a full refresh to update all UI elements
        this._refreshAllPlayers();
      })
      .catch((error) => {
        console.error("Error selecting role:", error);

        // Reset selection on error
        card.classList.remove("selected");
        this.selectedRole = null;

        // Also reset the game state if we updated it optimistically
        if (
          currentPlayerId &&
          playerStateManager.gameState.players[currentPlayerId]
        ) {
          playerStateManager.gameState.players[currentPlayerId].role = null;
          playerStateManager.gameState.playerRole = null; // Also reset the direct playerRole property
        }

        // Reset the UI back to "Selecting role..."
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

        // Show error message
        this._showErrorMessage(error.message);

        // Refresh to get the latest state
        this._refreshAllPlayers();
      });

    // Update start button state
    this._refreshStartButton();
  }

  /**
   * Private: Handle start game button click
   */
  _handleStartGame() {
    if (!this.startGameButton.disabled) {
      playerStateManager
        .startGame()
        .then(() => {
          console.log("Game started");
          this._showGameArea();
        })
        .catch((error) => {
          console.error("Error starting game:", error);
          this._showErrorMessage(error.message);
        });
    }
  }

  /**
   * Private: Show the game area and hide the lobby
   */
  _showGameArea() {
    this.lobbyElement.classList.add("hidden");
    this.gameAreaElement.classList.remove("hidden");
  }

  /**
   * Private: Render a player in the player list
   * @param {Object} player - Player object
   */
  _renderPlayer(player) {
    // Ensure we have a valid player ID
    if (!player || !player.id) {
      console.error("Invalid player data:", player);
      return;
    }

    const playerId = player.id;
    let playerEl;

    // Check if player element already exists
    if (this.playerElements[playerId]) {
      // Use existing element
      playerEl = this.playerElements[playerId];
    } else {
      // Create new element only if it doesn't exist
      playerEl = document.createElement("div");
      playerEl.id = `player-${playerId}`;
      playerEl.className = "bg-gray-700 rounded-lg p-3 flex flex-col";
      this.playerListElement.appendChild(playerEl);
      this.playerElements[playerId] = playerEl;
    }

    // Get role info
    const roleInfo = player.role
      ? playerStateManager.getRoleInfo(player.role)
      : null;
    const roleColor = roleInfo ? roleInfo.color : "gray";
    const isCurrentPlayer = playerId === playerStateManager.gameState.playerId;
    const connectionStatus = player.connected
      ? "text-green-400"
      : "text-red-400";
    const roleSymbol = player.role ? "●" : "○";
    const roleText = player.role ? player.role : "Selecting role...";
    const roleClass = player.role
      ? `text-${roleColor}-300`
      : "text-gray-400 italic";

    playerEl.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <span class="text-${roleColor}-400 mr-2">${roleSymbol}</span>
          <h4 class="font-bold ${isCurrentPlayer ? "text-blue-300" : ""}">
            ${this._escapeHtml(player.name)}${isCurrentPlayer ? " (You)" : ""}${
      player.is_host ? " 👑" : ""
    }
          </h4>
        </div>
        <div class="${connectionStatus}">
          ${player.connected ? "✓" : "✗"}
        </div>
      </div>
      <div class="mt-1 text-sm ${roleClass}">${roleText}</div>
    `;
  }

  /**
   * Private: Update player connection status
   * @param {string} playerId - Player ID
   * @param {boolean} connected - Connection status
   */
  _updatePlayerConnection(playerId, connected) {
    if (this.playerElements[playerId]) {
      const playerEl = this.playerElements[playerId];
      const statusElement = playerEl.querySelector('div[class^="text-"]');

      if (statusElement) {
        statusElement.className = connected ? "text-green-400" : "text-red-400";
        statusElement.textContent = connected ? "✓" : "✗";
      }
    }
  }

  /**
   * Private: Update player role
   * @param {string} playerId - Player ID
   * @param {string} role - Role name
   */
  _updatePlayerRole(playerId, role) {
    console.log("_updatePlayerRole called:", playerId, role);
    console.log(
      "Current players:",
      Object.keys(playerStateManager.gameState.players)
    );

    // Ensure player exists in game state
    if (
      playerStateManager.gameState.players &&
      playerId in playerStateManager.gameState.players
    ) {
      const player = playerStateManager.gameState.players[playerId];
      console.log("Found player to update:", player);
      player.role = role;

      // Update the player's UI element
      if (this.playerElements[playerId]) {
        console.log("Updating UI for player:", playerId);
        this._renderPlayer(player);
      } else {
        console.warn("No player element found for:", playerId);
      }

      // Update role cards if it's the current player
      if (playerId === playerStateManager.gameState.playerId) {
        console.log("Updating role cards for current player");
        this.selectedRole = role;

        this.roleCards.forEach((card) => {
          // Reset all cards first
          card.classList.remove("selected", "opacity-50", "cursor-not-allowed");
          card.style.pointerEvents = "auto";

          // Select and disable the chosen role
          if (card.dataset.role === role) {
            card.classList.add("selected", "opacity-50", "cursor-not-allowed");
            card.style.pointerEvents = "none";
          }
        });
      }

      this._refreshStartButton();
    } else {
      console.warn(
        `Player ${playerId} not found in game state for role update. Players:`,
        playerStateManager.gameState.players
      );
    }
  }

  /**
   * Private: Refresh all players in the list
   */
  _refreshAllPlayers() {
    console.log("Refreshing all players");

    // Get a list of all taken roles
    const takenRoles = new Set();
    Object.values(playerStateManager.gameState.players).forEach((player) => {
      if (player.role) {
        console.log(
          `Found taken role: ${player.role} by player ${
            player.name || player.id
          }`
        );
        takenRoles.add(player.role);
      }
    });
    console.log("All taken roles:", Array.from(takenRoles));

    // Clear existing elements
    this.playerListElement.innerHTML = "";
    this.playerElements = {};

    // Re-render all players
    Object.values(playerStateManager.gameState.players).forEach((player) => {
      // Make sure player has id property
      if (player && !player.id && player.player_id) {
        player.id = player.player_id;
      } else if (!player.id) {
        // Try to get id from object key
        Object.entries(playerStateManager.gameState.players).forEach(
          ([id, p]) => {
            if (p === player) {
              player.id = id;
            }
          }
        );
      }

      // Only render if we have an id
      if (player.id) {
        this._renderPlayer(player);
      }
    });

    // Update role cards based on taken roles
    if (this.roleCards && this.roleCards.length) {
      const currentPlayerRole = playerStateManager.gameState.playerRole;
      this.roleCards.forEach((card) => {
        const role = card.dataset.role;

        // Reset card state first
        card.classList.remove("selected", "opacity-50", "cursor-not-allowed");
        card.style.pointerEvents = "auto";

        // If this role is taken by anyone (including the current player)
        if (takenRoles.has(role)) {
          console.log(`Disabling role card: ${role} (taken)`);
          card.classList.add("opacity-50", "cursor-not-allowed");
          card.style.pointerEvents = "none";

          // If it's the current player's role, also mark it as selected
          if (role === currentPlayerRole) {
            card.classList.add("selected");
          }
        }
      });
    }

    // Refresh start button state
    this._refreshStartButton();
  }

  /**
   * Private: Refresh start button state (enabled/disabled)
   */
  _refreshStartButton() {
    const isHost = playerStateManager.isHost();
    const hasRole = !!playerStateManager.gameState.playerRole;
    const players = Object.values(playerStateManager.gameState.players);
    const allPlayersHaveRoles = players.every((player) => !!player.role);
    const hasMinimumPlayers = players.length >= 2;

    // Always show the button, but control its disabled state and text
    this.startGameButton.classList.remove("hidden");

    // Add debug output to help identify issues
    console.log("Start button check:", {
      isHost,
      hasRole,
      players: players.map((p) => ({ name: p.name, role: p.role })),
      allPlayersHaveRoles,
      hasMinimumPlayers,
      playerRole: playerStateManager.gameState.playerRole,
    });

    if (isHost) {
      // Update button text based on conditions
      if (!hasMinimumPlayers) {
        this.startGameButton.textContent = `Need ${
          2 - players.length
        } more player${players.length === 0 ? "s" : ""}`;
        this.startGameButton.disabled = true;
      } else if (!hasRole) {
        this.startGameButton.textContent = "Select a role first";
        this.startGameButton.disabled = true;
      } else if (!allPlayersHaveRoles) {
        const playersWithoutRoles = players.filter((p) => !p.role).length;
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

  /**
   * Private: Show error message
   * @param {string} message - Error message
   */
  _showErrorMessage(message) {
    // Create a temporary error message
    const errorEl = document.createElement("div");
    errorEl.className =
      "bg-red-900 text-white px-4 py-2 rounded-lg fixed top-4 right-4 animate-fadeIn z-50";
    errorEl.textContent = message;
    document.body.appendChild(errorEl);

    // Remove after 3 seconds
    setTimeout(() => {
      errorEl.classList.add("animate-fadeOut");
      setTimeout(() => {
        document.body.removeChild(errorEl);
      }, 500); // Match with CSS animation duration
    }, 3000);
  }

  /**
   * Private: Escape HTML for security
   * @param {string} html - HTML content
   * @returns {string} Escaped HTML
   */
  _escapeHtml(html) {
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Private: Update role card availability in the UI
   * Updates all role cards' states based on which roles are taken
   */
  _updateRoleCardAvailability() {
    if (!this.roleCards || !this.roleCards.length) return;

    // Get all taken roles (except current player's if they're changing)
    const takenRoles = new Set();
    Object.values(playerStateManager.gameState.players).forEach((player) => {
      // If this is not the current player and they have a role, mark it as taken
      if (player.id !== playerStateManager.gameState.playerId && player.role) {
        takenRoles.add(player.role);
      }
    });

    // Get current player's role
    const currentPlayerRole = playerStateManager.gameState.playerRole;

    // Update each role card
    this.roleCards.forEach((card) => {
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

  /**
   * Start polling for updates
   * @private
   */
  _startPolling() {
    // Don't use polling - we'll use WebSocket events instead
    console.log("Polling disabled - using WebSocket events instead");
  }

  /**
   * Stop polling for updates
   * @private
   */
  _stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
      console.log("Stopped polling for updates");
    }
  }
}

// Create singleton instance
const gameStartScreen = new GameStartScreen();
export default gameStartScreen;
