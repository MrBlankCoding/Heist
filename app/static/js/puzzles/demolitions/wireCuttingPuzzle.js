// Wire Cutting Puzzle - Security Bypass puzzle for the Demolitions role

class WireCuttingPuzzle {
  constructor(container, puzzleData, callbacks) {
    this.container = container;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isCompleted = false;
    this.wires = [];
    this.cutWires = [];
    this.timer = null;
    this.countdownValue = 30 + (puzzleData.difficulty || 1) * 5;

    // DOM elements
    this.wireContainer = null;
    this.countdownElement = null;
    this.messageElement = null;
  }

  initialize() {
    // Use puzzle data if available, otherwise generate random
    if (this.puzzleData.data && this.puzzleData.data.wires) {
      this.wires = this.puzzleData.data.wires;
    } else {
      // Generate random wire configuration with different difficulty levels
      const wireCount = 3 + Math.min(this.puzzleData.difficulty || 1, 3);
      this.generateWires(wireCount);
    }

    // Create wire container
    this.wireContainer = document.createElement("div");
    this.wireContainer.className = "bg-gray-900 rounded-lg p-6 w-full max-w-md";

    // Add countdown
    this.countdownElement = this.callbacks.getCountdownElement();

    // Display the puzzle instructions based on wires
    const clueContainer = document.createElement("div");
    clueContainer.className =
      "mb-4 p-3 bg-gray-800 rounded border border-red-600";

    // Generate wire cutting rules based on colors
    const clue = this.generateWireCuttingClue();
    clueContainer.innerHTML = `
      <div class="text-sm text-gray-300 mb-2">Security System Manual - Section 4.2:</div>
      <div class="text-yellow-400">${clue}</div>
    `;
    this.wireContainer.appendChild(clueContainer);

    // Create wires
    const wiresDisplay = document.createElement("div");
    wiresDisplay.className = "flex flex-col space-y-4";

    this.wires.forEach((wire) => {
      const wireElement = document.createElement("div");
      wireElement.id = wire.id;
      wireElement.className = `wire wire-${wire.color} h-8 rounded-full w-full flex items-center pl-4 pr-4 cursor-pointer transition-all`;
      wireElement.style.backgroundColor = this.getWireColor(wire.color);
      wireElement.innerHTML = `<span class="text-black font-bold text-xs">${wire.color.toUpperCase()} WIRE</span>`;

      // Add wire details based on difficulty
      if (this.puzzleData.difficulty > 1) {
        wireElement.innerHTML += `<span class="ml-auto text-black font-bold text-xs">${
          wire.label || ""
        }</span>`;
      }

      // Add click event for cutting
      wireElement.addEventListener("click", () => {
        this.cutWire(wire.id);

        // Apply cut wire style
        wireElement.className = `wire wire-${wire.color} h-8 rounded-full w-full flex items-center pl-4 pr-4 opacity-50`;
        wireElement.style.textDecoration = "line-through";

        // Add cut animation
        const cutMark = document.createElement("div");
        cutMark.className =
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6";
        cutMark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>`;

        wireElement.style.position = "relative";
        wireElement.appendChild(cutMark);
      });

      wiresDisplay.appendChild(wireElement);
    });

    this.wireContainer.appendChild(wiresDisplay);
    this.container.appendChild(this.wireContainer);

    // Start countdown timer via callback
    this.callbacks.startCountdown(this.onTimeUp.bind(this));
  }

  onTimeUp() {
    // Show failure message
    this.callbacks.showMessage("Time's up! System armed.", "error");

    // Disable further interaction
    this.wireContainer.classList.add("opacity-75", "pointer-events-none");
    this.callbacks.disableSubmit();
  }

  generateWires(count) {
    const colors = [
      "red",
      "blue",
      "green",
      "yellow",
      "white",
      "black",
      "orange",
      "purple",
    ];
    const usedColors = [];
    const labels = ["A1", "B2", "C3", "D4", "E5", "F6", "G7", "H8"];

    // Shuffle colors and labels
    const shuffledColors = [...colors].sort(() => 0.5 - Math.random());
    const shuffledLabels = [...labels].sort(() => 0.5 - Math.random());

    // Choose a correct wire
    const correctIndex = Math.floor(Math.random() * count);

    this.wires = [];
    for (let i = 0; i < count; i++) {
      const color = shuffledColors[i];
      usedColors.push(color);

      this.wires.push({
        color,
        id: `wire-${i}`,
        correct: i === correctIndex,
        label: this.puzzleData.difficulty > 1 ? shuffledLabels[i] : null,
      });
    }
  }

  cutWire(wireId) {
    // Check if already cut
    if (this.cutWires.includes(wireId)) {
      return;
    }

    // Add to cut wires
    this.cutWires.push(wireId);

    // Find the wire data
    const wire = this.wires.find((w) => w.id === wireId);

    // Check if correct wire was cut
    if (wire.correct) {
      this.isCompleted = true;
      this.callbacks.showSuccess();
    } else {
      // Wrong wire - show failure message
      this.callbacks.showMessage("Wrong wire! System armed.", "error");

      // Disable further interaction
      this.wireContainer.classList.add("opacity-75", "pointer-events-none");
      this.callbacks.disableSubmit();
    }
  }

  generateWireCuttingClue() {
    // Find the correct wire
    const correctWire = this.wires.find((wire) => wire.correct);

    // Format varies based on difficulty
    if (this.puzzleData.difficulty >= 3) {
      // Harder clues for higher difficulty
      const clues = [
        `If there is a ${this.getOtherColor(
          correctWire.color
        )} wire AND a ${this.getAnotherColor(
          correctWire.color,
          this.getOtherColor(correctWire.color)
        )} wire, cut the ${correctWire.color} wire.`,
        `Cut the ${correctWire.color} wire if its position is ${
          this.wires.findIndex((w) => w.id === correctWire.id) + 1
        } from the top.`,
        `If the ${this.getOtherColor(correctWire.color)} wire is above the ${
          correctWire.color
        } wire, but below the ${this.getAnotherColor(
          correctWire.color,
          this.getOtherColor(correctWire.color)
        )} wire, cut the ${correctWire.color} wire.`,
        `Cut the wire labeled "${
          correctWire.label
        }" only if there are more than ${this.wires.length - 1} wires.`,
        `If the sum of the positions of the ${this.getOtherColor(
          correctWire.color
        )} wire and the ${correctWire.color} wire is odd, cut the ${
          correctWire.color
        } wire.`,
      ];

      // Choose a random clue
      return clues[Math.floor(Math.random() * clues.length)];
    } else {
      // Simpler clues for lower difficulty
      const clues = [
        `If there is a ${this.getOtherColor(correctWire.color)} wire, cut the ${
          correctWire.color
        } wire.`,
        `The ${correctWire.color} wire must be cut if there are exactly ${this.wires.length} wires.`,
        `If the ${this.getOtherColor(correctWire.color)} wire is above the ${
          correctWire.color
        } wire, cut the ${correctWire.color} wire.`,
        `Cut the ${correctWire.color} wire if no other wires have been cut.`,
        `If there are more than ${this.wires.length - 2} wires, the ${
          correctWire.color
        } wire should be cut.`,
      ];

      // Choose a random clue
      return clues[Math.floor(Math.random() * clues.length)];
    }
  }

  getOtherColor(color) {
    const otherWires = this.wires.filter((wire) => wire.color !== color);
    if (otherWires.length === 0) return color;
    return otherWires[Math.floor(Math.random() * otherWires.length)].color;
  }

  getAnotherColor(color1, color2) {
    const otherWires = this.wires.filter(
      (wire) => wire.color !== color1 && wire.color !== color2
    );
    if (otherWires.length === 0) return color1;
    return otherWires[Math.floor(Math.random() * otherWires.length)].color;
  }

  getWireColor(color) {
    const colorMap = {
      red: "#f87171",
      blue: "#60a5fa",
      green: "#4ade80",
      yellow: "#fbbf24",
      white: "#e5e7eb",
      black: "#1f2937",
      orange: "#fb923c",
      purple: "#a78bfa",
    };

    return colorMap[color] || "#6b7280";
  }

  handleRandomEvent(eventType, duration) {
    if (this.isCompleted) return;

    // Special effects for events
    if (eventType === "camera_sweep") {
      // For camera sweep, temporarily disable the puzzle
      this.wireContainer.classList.add("opacity-50", "pointer-events-none");

      // Re-enable after duration
      setTimeout(() => {
        if (!this.isCompleted) {
          this.wireContainer.classList.remove(
            "opacity-50",
            "pointer-events-none"
          );
        }
      }, duration * 1000);
    }
  }

  reset() {
    // Reset puzzle state
    this.cutWires = [];
    this.isCompleted = false;
  }

  cleanup() {
    // Clear any event listeners
    if (this.wireContainer) {
      // Remove the container itself to clean up all event listeners
      this.wireContainer.remove();
    }

    this.wireContainer = null;
  }

  getSubmissionData() {
    return this.cutWires;
  }
}

export default WireCuttingPuzzle;
