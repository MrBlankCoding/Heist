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

  /**
   * Initialize the start screen
   * @param {Object} options - Initialization options
   */
  initialize(options = {}) {
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

    playerStateManager.on("playerLeft", (playerInfo) => {
      // Remove the player element completely from UI
      const playerElement = document.getElementById(`player-${playerInfo.id}`);
      if (playerElement) {
        // Add fade-out animation
        playerElement.classList.add("animate-fadeOut");

        // Remove after animation completes
        setTimeout(() => {
          playerElement.remove();
        }, 300);
      }

      // Update role card availability
      this._updateRoleCardAvailability();

      // Refresh start button state
      this._refreshStartButton();
    });

    playerStateManager.on("playerRoleSelected", (data) => {
      // If we have full player data, use it
      if (data.player) {
        this._renderPlayer(data.player);
      } else {
        // Otherwise use the playerId and role
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
  }

  /**
   * Show the lobby
   */
  showLobby() {
    this.lobbyElement.classList.remove("hidden");
    this.gameAreaElement.classList.add("hidden");
    this._refreshAllPlayers();
  }

  /**
   * Hide the lobby
   */
  hideLobby() {
    this.lobbyElement.classList.add("hidden");
  }

  /**
   * Initialize tab switching functionality
   * @private
   */
  _initTabSwitching() {
    // Check if tab buttons exist
    if (!this.tabButtons || this.tabButtons.length === 0) {
      console.warn("Tab buttons not found for initialization");
      return;
    }

    // Add click event listeners to all tab buttons
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.dataset.tab;
        if (tabId) {
          this._switchTab(tabId);
        }
      });
    });
  }

  /**
   * Switch to the specified tab
   * @param {string} tabId - The ID of the tab to switch to
   * @private
   */
  _switchTab(tabId) {
    if (tabId === this.activeTab) return; // Already on this tab

    console.log(`Switching to tab: ${tabId}`);

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
    // Check if player is host
    if (!playerStateManager.isHost()) {
      this._showErrorMessage("Only the host can start the game");
      return;
    }

    // Start the game
    playerStateManager
      .startGame()
      .then(() => {
        // Game started via server event handler
      })
      .catch((error) => {
        this._showErrorMessage(error.message);
        console.error("Error starting game:", error);
      });
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
    // Validate player data
    if (!player || !player.id) {
      console.warn("Invalid player data in _renderPlayer:", player);
      return;
    }

    if (!this.playerListElement) {
      console.warn("Player list element not found in _renderPlayer");
      return;
    }

    // Check if this player element already exists
    if (this.playerElements[player.id]) {
      // Update existing player element
      const playerElement = this.playerElements[player.id];

      // Generate safe values, defaulting to placeholder values if missing
      const playerName = player.name
        ? this._escapeHtml(player.name)
        : `Player ${player.id.slice(0, 4)}`;
      const playerRole = player.role || "No role";
      const connectionStatus = player.connected !== false; // Default to true if undefined

      // Create role label with color based on role
      let roleLabel = "";
      if (player.role) {
        const roleInfo = playerStateManager.getRoleInfo(player.role);
        const roleColor = roleInfo ? roleInfo.color : "gray";
        roleLabel = `<span class="text-${roleColor}-400">● ${player.role}</span>`;
      } else {
        roleLabel = '<span class="text-gray-400">● No role</span>';
      }

      // Update player element content
      playerElement.innerHTML = `
        <div class="flex items-center justify-between py-1">
          <div>
            ${
              player.id === playerStateManager.gameState.playerId
                ? "<strong>"
                : ""
            }
            ${playerName}
            ${
              player.is_host
                ? '<span class="ml-1 text-purple-300">(Host)</span>'
                : ""
            }
            ${
              player.id === playerStateManager.gameState.playerId
                ? "</strong>"
                : ""
            }
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

      return; // Early return as we've updated the existing element
    }

    // Create new player element
    const playerElement = document.createElement("div");
    playerElement.className = "border-b border-gray-700 last:border-0";

    // Generate safe values, defaulting to placeholders if missing
    const playerName = player.name
      ? this._escapeHtml(player.name)
      : `Player ${player.id.slice(0, 4)}`;
    const connectionStatus = player.connected !== false; // Default to true if undefined

    // Create role label
    let roleLabel = "";
    if (player.role) {
      const roleInfo = playerStateManager.getRoleInfo(player.role);
      const roleColor = roleInfo ? roleInfo.color : "gray";
      roleLabel = `<span class="text-${roleColor}-400">● ${player.role}</span>`;
    } else {
      roleLabel = '<span class="text-gray-400">● No role</span>';
    }

    // Set player element content
    playerElement.innerHTML = `
      <div class="flex items-center justify-between py-1">
        <div>
          ${
            player.id === playerStateManager.gameState.playerId
              ? "<strong>"
              : ""
          }
          ${playerName}
          ${
            player.is_host
              ? '<span class="ml-1 text-purple-300">(Host)</span>'
              : ""
          }
          ${
            player.id === playerStateManager.gameState.playerId
              ? "</strong>"
              : ""
          }
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

    // Store reference and append to player list
    this.playerElements[player.id] = playerElement;
    this.playerListElement.appendChild(playerElement);
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
   * Private: Update player's role in the UI
   * @param {string} playerId - The player ID
   * @param {string|null} role - The role to set (or null to clear)
   * @private
   */
  _updatePlayerRole(playerId, role) {
    // Get the player object
    const player = playerStateManager.getPlayer(playerId);
    if (!player) {
      return; // Player not found
    }

    // Find the player element in the DOM
    const playerElement = document.getElementById(`player-${playerId}`);
    if (!playerElement) {
      console.warn("No player element found for:", playerId);
      return;
    }

    // Update the role in the player element
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
      this._updateRoleCards();
    }
  }

  /**
   * Update role cards based on selected and taken roles
   * @private
   */
  _updateRoleCards() {
    // Get all role cards
    const roleCards = document.querySelectorAll(".role-card");

    // Get taken roles (roles selected by other players)
    const takenRoles = new Set();
    const players = playerStateManager.getAllPlayers();
    Object.values(players).forEach((player) => {
      if (player.role && player.id !== playerStateManager.gameState.playerId) {
        takenRoles.add(player.role);
      }
    });

    // Update each role card's state
    roleCards.forEach((card) => {
      const role = card.getAttribute("data-role");
      if (!role) return;

      // Reset the card's state
      card.classList.remove("selected", "disabled");

      // Mark the card as selected if it's the current player's role
      if (role === playerStateManager.gameState.playerRole) {
        card.classList.add("selected");
      }

      // Mark the card as disabled if taken by another player
      if (takenRoles.has(role)) {
        card.classList.add("disabled");
      }
    });
  }

  /**
   * Private: Refresh all players in the list
   */
  _refreshAllPlayers() {
    console.log("Refreshing all players");

    // Exit early if UI elements aren't available
    if (!this.playerListElement) {
      console.warn("Player list element not found");
      return;
    }

    // Get a list of all taken roles
    const takenRoles = new Set();

    // Add safety check
    if (
      playerStateManager.gameState.players &&
      typeof playerStateManager.gameState.players === "object"
    ) {
      Object.values(playerStateManager.gameState.players).forEach((player) => {
        if (player && player.role) {
          console.log(
            `Found taken role: ${player.role} by player ${
              player.name || player.id || "unknown"
            }`
          );
          takenRoles.add(player.role);
        }
      });
    } else {
      console.warn("Invalid players object in _refreshAllPlayers");
    }

    console.log("All taken roles:", Array.from(takenRoles));

    // Clear existing elements
    this.playerListElement.innerHTML = "";
    this.playerElements = {};

    // Re-render all players
    // Add safety check
    if (
      playerStateManager.gameState.players &&
      typeof playerStateManager.gameState.players === "object"
    ) {
      try {
        Object.values(playerStateManager.gameState.players).forEach(
          (player) => {
            if (!player) {
              console.warn("Found null/undefined player in players list");
              return; // Skip this player
            }

            // Make sure player has id property
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

            // Only render if we have an id
            if (player.id) {
              this._renderPlayer(player);
            } else {
              console.warn("Skipping player without ID:", player);
            }
          }
        );
      } catch (err) {
        console.error("Error rendering players:", err);
      }
    } else {
      console.warn("No valid players object available for rendering");
    }

    // Update role cards based on taken roles
    this._updateRoleCardAvailability();

    // Refresh start button state
    this._refreshStartButton();
  }

  /**
   * Private: Refresh start button state (enabled/disabled)
   */
  _refreshStartButton() {
    // Exit early if we're missing key elements
    if (!this.startGameButton) {
      console.warn("Start game button not found in _refreshStartButton");
      return;
    }

    // Double-check playerStateManager is properly initialized
    if (!playerStateManager || !playerStateManager.gameState) {
      console.error("PlayerStateManager not properly initialized");
      this.startGameButton.disabled = true;
      this.startGameButton.textContent = "Connection error";
      return;
    }

    const isHost = playerStateManager.isHost();
    const hasRole = !!playerStateManager.gameState.playerRole;

    // Add comprehensive safety check for players object
    let players = [];
    try {
      if (
        playerStateManager.gameState.players &&
        typeof playerStateManager.gameState.players === "object"
      ) {
        players = Object.values(playerStateManager.gameState.players);
      } else {
        console.warn(
          "Invalid players object in _refreshStartButton:",
          playerStateManager.gameState.players
        );
      }
    } catch (err) {
      console.error("Error accessing players in _refreshStartButton:", err);
    }

    // More safety checks on players array
    const allPlayersHaveRoles =
      Array.isArray(players) &&
      players.length > 0 &&
      players.every((player) => player && !!player.role);
    const hasMinimumPlayers = players.length >= 2;

    // Always show the button, but control its disabled state and text
    this.startGameButton.classList.remove("hidden");

    // Add debug output to help identify issues
    console.log("Start button check:", {
      isHost,
      hasRole,
      playersCount: players.length,
      players: Array.isArray(players)
        ? players.map((p) => p && { name: p.name, role: p.role })
        : [],
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
    if (!this.roleCards || !this.roleCards.length) {
      console.warn("Role cards not found in _updateRoleCardAvailability");
      return;
    }

    // Get a list of all taken roles
    const takenRoles = new Set();

    // Add safety check for players object
    try {
      if (
        playerStateManager &&
        playerStateManager.gameState &&
        playerStateManager.gameState.players &&
        typeof playerStateManager.gameState.players === "object"
      ) {
        Object.values(playerStateManager.gameState.players).forEach(
          (player) => {
            if (player && player.role) {
              takenRoles.add(player.role);
            }
          }
        );
      } else {
        console.warn("Invalid players object in _updateRoleCardAvailability");
      }
    } catch (err) {
      console.error(
        "Error processing players in _updateRoleCardAvailability:",
        err
      );
    }

    // Get current player's role with safety check
    const currentPlayerRole =
      playerStateManager && playerStateManager.gameState
        ? playerStateManager.gameState.playerRole
        : null;

    // Update each role card
    this.roleCards.forEach((card) => {
      if (!card || !card.dataset || !card.dataset.role) {
        return; // Skip invalid cards
      }

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
   * Handle the playerRoleSelected event
   * @param {Object} data - The player role selected event data
   * @private
   */
  _handlePlayerRoleSelected(data) {
    // Skip if no data or missing playerId
    if (!data || !data.playerId) {
      return;
    }

    // Get player object
    const player = data.player || playerStateManager.getPlayer(data.playerId);
    if (!player) {
      console.error("Received invalid player data:", player);
      return;
    }

    // Update player UI
    this._renderPlayer(player);

    // Update role cards
    this._updateRoleCards();
  }

  /**
   * Initialize role selection by adding click handlers to role cards
   * @private
   */
  _initRoleSelection() {
    const roleCards = document.querySelectorAll(".role-card");
    roleCards.forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();

        // Get role from data attribute
        const role = card.getAttribute("data-role");
        if (!role) return;

        // Check if game already started
        if (playerStateManager.gameState.status === "in_progress") {
          this._showRoleSelectionError("Game has already started");
          return;
        }

        // Check if role card is disabled
        if (card.classList.contains("disabled")) {
          this._showRoleSelectionError("This role is not available");
          return;
        }

        // Check if role is already taken by another player
        const takenRoles = new Set();
        const players = playerStateManager.getAllPlayers();
        Object.values(players).forEach((player) => {
          if (
            player.role &&
            player.id !== playerStateManager.gameState.playerId
          ) {
            takenRoles.add(player.role);
          }
        });

        if (takenRoles.has(role)) {
          this._showRoleSelectionError("This role is already taken");
          return;
        }

        // All checks passed, select role
        this._selectRole(role);
      });
    });
  }

  /**
   * Select a role for the current player
   * @param {string} role - The role to select
   * @private
   */
  _selectRole(role) {
    // Check for valid player ID
    const currentPlayerId = playerStateManager.gameState.playerId;
    if (!currentPlayerId) {
      this._showRoleSelectionError("Player ID not found");
      return;
    }

    // Optimistically update UI
    this._updatePlayerRole(currentPlayerId, role);

    // Send role selection to server
    playerStateManager
      .selectRole(role)
      .then(() => {
        // Role selection successful
        // UI already updated optimistically
      })
      .catch((error) => {
        // Role selection failed, revert UI
        this._updatePlayerRole(currentPlayerId, null);
        this._showRoleSelectionError(error.message || "Failed to select role");
        console.error("Error selecting role:", error);
      });
  }

  /**
   * Start the game when the start button is clicked
   * @private
   */
  _startGame() {
    playerStateManager
      .startGame()
      .then(() => {
        // Game started successfully
        this.startButton.disabled = true;
        this.hideLobby();
      })
      .catch((error) => {
        this._showStartGameError(error.message);
        console.error("Error starting game:", error);
      });
  }
}

// Create singleton instance
const gameStartScreen = new GameStartScreen();
export default gameStartScreen;
