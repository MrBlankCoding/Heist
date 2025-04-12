// Handle join form submission
document.addEventListener("DOMContentLoaded", () => {
  const joinForm = document.getElementById("join-form");

  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const roomCode = document.getElementById("room-code").value.trim();
    const playerName = document.getElementById("player-name").value.trim();

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_code: roomCode,
          player_name: playerName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store player data in session storage
        sessionStorage.setItem("player_id", data.player_id);
        sessionStorage.setItem("player_name", data.player_name);
        sessionStorage.setItem("session_id", data.session_id);

        // Redirect to game page
        window.location.href = `/game/${roomCode}?player_id=${data.player_id}`;
      } else {
        // Show error message
        alert(data.error || "Failed to join game room");
      }
    } catch (error) {
      console.error("Error joining game:", error);
      alert("Failed to join game room. Please try again.");
    }
  });
});
