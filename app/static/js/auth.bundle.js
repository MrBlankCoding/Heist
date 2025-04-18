// auth.bundle.js - Combines authentication related scripts

// Join game functionality
export function initJoinGame() {
  document.addEventListener("DOMContentLoaded", () => {
    const joinForm = document.getElementById("joinGameForm");
    const gameJoined = document.getElementById("gameJoined");
    const enterGameBtn = document.getElementById("enterGame");

    // No need to clear localStorage anymore
    let playerData = {};

    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const playerName = document.getElementById("playerName").value;
      const roomCode = document.getElementById("roomCode").value.toUpperCase();

      try {
        // No need to clear localStorage anymore
        const response = await fetch(
          "/api/rooms/join?" +
            new URLSearchParams({
              room_code: roomCode,
              player_name: playerName,
            }),
          {
            method: "POST",
          }
        );

        const data = await response.json();

        if (data.error) {
          alert(data.error);
          return;
        }

        // Store player data in memory (will only be used for redirect)
        playerData = {
          room_code: data.room_code,
          player_id: data.player_id,
          player_name: playerName,
        };

        // Show game joined confirmation
        joinForm.classList.add("hidden");
        gameJoined.classList.remove("hidden");

        // No longer saving to localStorage - server maintains state
      } catch (error) {
        console.error("Error joining game:", error);
        alert("Failed to join game. Please try again.");
      }
    });

    enterGameBtn.addEventListener("click", () => {
      // Redirect to the game page with queryParams
      const params = new URLSearchParams({
        player_id: playerData.player_id,
      });
      window.location.href = `/game/${playerData.room_code}?${params}`;
    });
  });
}

// Create game functionality
export function initCreateGame() {
  document.addEventListener("DOMContentLoaded", () => {
    const createForm = document.getElementById("createGameForm");
    const gameCreated = document.getElementById("gameCreated");
    const roomCodeDisplay = document.getElementById("roomCode");
    const enterGameBtn = document.getElementById("enterGame");

    // No need to clear localStorage anymore
    let playerData = {};

    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const hostName = document.getElementById("hostName").value;

      try {
        // No need to clear localStorage anymore
        const response = await fetch(
          "/api/rooms/create?" +
            new URLSearchParams({
              host_name: hostName,
            }),
          {
            method: "POST",
          }
        );

        const data = await response.json();

        if (data.error) {
          alert(data.error);
          return;
        }

        // Store player data in memory (will only be used for the redirect)
        playerData = {
          room_code: data.room_code,
          player_id: data.player_id,
          player_name: hostName,
        };

        // Show room code
        roomCodeDisplay.textContent = data.room_code;
        createForm.classList.add("hidden");
        gameCreated.classList.remove("hidden");

        // No longer saving to localStorage - server maintains state
      } catch (error) {
        console.error("Error creating game:", error);
        alert("Failed to create game. Please try again.");
      }
    });

    enterGameBtn.addEventListener("click", () => {
      // Redirect to the game page with queryParams
      const params = new URLSearchParams({
        player_id: playerData.player_id,
      });
      window.location.href = `/game/${playerData.room_code}?${params}`;
    });
  });
}
