// joinGame.js - Handles the join game page functionality

document.addEventListener("DOMContentLoaded", () => {
  const joinForm = document.getElementById("joinGameForm");
  const roomCodeInput = document.getElementById("roomCode");
  const playerNameInput = document.getElementById("playerName");

  // Clear any potentially stale game state when loading the join page
  localStorage.removeItem("heistGameState");

  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const roomCode = roomCodeInput.value.toUpperCase();
    const playerName = playerNameInput.value;

    try {
      // Clear any existing game state before joining a new game
      localStorage.removeItem("heistGameState");

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

      // Store player data
      const playerData = {
        room_code: data.room_code,
        player_id: data.player_id,
      };

      // Save to local storage
      localStorage.setItem("heistPlayer", JSON.stringify(playerData));

      // Redirect to game page
      window.location.href = `/game/${data.room_code}`;
    } catch (error) {
      console.error("Error joining game:", error);
      alert("Failed to join game. Please try again.");
    }
  });
});
