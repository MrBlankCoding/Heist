// createGame.js - Handles the create game page functionality

document.addEventListener("DOMContentLoaded", () => {
  const createForm = document.getElementById("createGameForm");
  const gameCreated = document.getElementById("gameCreated");
  const roomCodeDisplay = document.getElementById("roomCode");
  const enterGameBtn = document.getElementById("enterGame");

  // Clear any potentially stale game state when loading the create page
  localStorage.removeItem("heistGameState");

  let playerData = {};

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const hostName = document.getElementById("hostName").value;

    try {
      // Clear any existing game state before creating a new game
      localStorage.removeItem("heistGameState");

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

      // Store player data
      playerData = {
        room_code: data.room_code,
        player_id: data.player_id,
        player_name: hostName,
      };

      // Show room code
      roomCodeDisplay.textContent = data.room_code;
      createForm.classList.add("hidden");
      gameCreated.classList.remove("hidden");

      // Save to local storage
      localStorage.setItem("heistPlayer", JSON.stringify(playerData));
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Failed to create game. Please try again.");
    }
  });

  enterGameBtn.addEventListener("click", () => {
    window.location.href = `/game/${playerData.room_code}`;
  });
});
