// Signal Frequency Puzzle - Team members must work together to adjust dials to match a target frequency pattern

class SignalFrequencyPuzzle {
  constructor(container, playerRole, allRoles, onCompleteCallback) {
    this.container = container;
    this.playerRole = playerRole;
    this.allRoles = allRoles;
    this.onComplete = onCompleteCallback;
    this.isCompleted = false;

    // Puzzle specific properties
    this.frequencyLength = 20; // Length of the frequency pattern
    this.targetPattern = []; // Target frequency pattern
    this.currentPattern = []; // Current frequency pattern (affected by all players)
    this.playerDial = {
      // This player's dial
      position: 50, // 0-100 dial position
      range: [0, 0], // Portion of frequency affected by this dial
      affectDirection: 1, // Direction of effect (1 or -1)
    };
    this.tolerance = 10; // Tolerance for pattern matching (0-100)
    this.matchPercentage = 0; // Current match percentage

    // DOM elements
    this.puzzleContainer = null;
    this.patternDisplay = null;
    this.dialElement = null;
    this.matchDisplay = null;
    this.messageElement = null;
  }

  initialize() {
    // Create puzzle container
    this.puzzleContainer = document.createElement("div");
    this.puzzleContainer.className =
      "bg-gray-900 rounded-lg p-6 w-full max-w-3xl";
    this.container.appendChild(this.puzzleContainer);

    // Add title
    const title = document.createElement("h4");
    title.className = "text-lg font-bold text-blue-400 mb-3";
    title.textContent = "Signal Frequency Calibration";
    this.puzzleContainer.appendChild(title);

    // Add instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300 text-sm";
    instruction.textContent =
      "Adjust your dial to match the target frequency pattern. Each team member controls a different part of the pattern.";
    this.puzzleContainer.appendChild(instruction);

    // Add message area
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center text-sm hidden";
    this.puzzleContainer.appendChild(this.messageElement);

    // Generate puzzle data
    this._generatePuzzleData();

    // Create puzzle interface
    this._createPuzzleInterface();

    // Start signal updates
    this._startSignalUpdates();
  }

  _generatePuzzleData() {
    // Generate target pattern - a combination of sine waves
    this.targetPattern = Array(this.frequencyLength).fill(0);

    // Create a different looking target pattern each time
    const baseFrequency = Math.random() + 0.5; // Between 0.5 and 1.5
    const amplitude = 50 + Math.random() * 30; // Between 50 and 80

    for (let i = 0; i < this.frequencyLength; i++) {
      // Use sine waves of different frequencies
      const val =
        Math.sin((i * baseFrequency * Math.PI) / (this.frequencyLength / 2)) *
        amplitude;
      this.targetPattern[i] = Math.floor(50 + val); // Center at 50
    }

    // Initialize current pattern
    this.currentPattern = Array(this.frequencyLength).fill(50);

    // Assign each role a portion of the frequency to control
    const segmentSize = Math.floor(this.frequencyLength / this.allRoles.length);

    for (let i = 0; i < this.allRoles.length; i++) {
      if (this.allRoles[i] === this.playerRole) {
        const start = i * segmentSize;
        const end =
          i === this.allRoles.length - 1
            ? this.frequencyLength - 1
            : (i + 1) * segmentSize - 1;

        this.playerDial.range = [start, end];

        // Randomize dial effect direction for additional challenge
        this.playerDial.affectDirection = Math.random() > 0.5 ? 1 : -1;
      }
    }
  }

  _createPuzzleInterface() {
    // Create frequency display
    const displayContainer = document.createElement("div");
    displayContainer.className =
      "bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700";

    // Create frequency visualization
    const frequencyContainer = document.createElement("div");
    frequencyContainer.className =
      "relative h-56 bg-black border border-gray-700 rounded-lg mb-4 overflow-hidden";

    // Add target pattern line
    const targetPatternSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    targetPatternSvg.setAttribute("width", "100%");
    targetPatternSvg.setAttribute("height", "100%");
    targetPatternSvg.setAttribute("viewBox", "0 0 100 100");
    targetPatternSvg.setAttribute("preserveAspectRatio", "none");
    targetPatternSvg.classList.add("absolute", "inset-0", "z-10");

    // Create path for target pattern
    const targetPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    targetPath.setAttribute("stroke", "rgba(74, 222, 128, 0.5)");
    targetPath.setAttribute("stroke-width", "2");
    targetPath.setAttribute("fill", "none");

    let targetPathD = "M0," + (100 - this.targetPattern[0]);
    for (let i = 1; i < this.targetPattern.length; i++) {
      const x = (i / (this.targetPattern.length - 1)) * 100;
      const y = 100 - this.targetPattern[i];
      targetPathD += " L" + x + "," + y;
    }

    targetPath.setAttribute("d", targetPathD);
    targetPatternSvg.appendChild(targetPath);
    frequencyContainer.appendChild(targetPatternSvg);

    // Add current pattern line
    const currentPatternSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    currentPatternSvg.setAttribute("width", "100%");
    currentPatternSvg.setAttribute("height", "100%");
    currentPatternSvg.setAttribute("viewBox", "0 0 100 100");
    currentPatternSvg.setAttribute("preserveAspectRatio", "none");
    currentPatternSvg.classList.add("absolute", "inset-0", "z-20");

    // Create path for current pattern
    const currentPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    currentPath.setAttribute("stroke", "#3B82F6");
    currentPath.setAttribute("stroke-width", "2");
    currentPath.setAttribute("fill", "none");

    let currentPathD = "M0," + (100 - this.currentPattern[0]);
    for (let i = 1; i < this.currentPattern.length; i++) {
      const x = (i / (this.currentPattern.length - 1)) * 100;
      const y = 100 - this.currentPattern[i];
      currentPathD += " L" + x + "," + y;
    }

    currentPath.setAttribute("d", currentPathD);
    currentPatternSvg.appendChild(currentPath);
    frequencyContainer.appendChild(currentPatternSvg);

    this.patternDisplay = { targetPath, currentPath };

    // Add highlight for player's section
    const highlightSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    highlightSvg.setAttribute("width", "100%");
    highlightSvg.setAttribute("height", "100%");
    highlightSvg.setAttribute("viewBox", "0 0 100 100");
    highlightSvg.setAttribute("preserveAspectRatio", "none");
    highlightSvg.classList.add("absolute", "inset-0", "z-5");

    // Create rectangle for player's section
    const highlight = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    const [start, end] = this.playerDial.range;
    const startX = (start / (this.frequencyLength - 1)) * 100;
    const width = ((end - start) / (this.frequencyLength - 1)) * 100;

    highlight.setAttribute("x", startX);
    highlight.setAttribute("y", "0");
    highlight.setAttribute("width", width);
    highlight.setAttribute("height", "100");
    highlight.setAttribute("fill", "rgba(59, 130, 246, 0.1)");
    highlight.setAttribute("stroke", "rgba(59, 130, 246, 0.5)");
    highlight.setAttribute("stroke-width", "1");

    highlightSvg.appendChild(highlight);
    frequencyContainer.appendChild(highlightSvg);

    displayContainer.appendChild(frequencyContainer);

    // Add grid lines
    const gridSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    gridSvg.setAttribute("width", "100%");
    gridSvg.setAttribute("height", "100%");
    gridSvg.setAttribute("viewBox", "0 0 100 100");
    gridSvg.setAttribute("preserveAspectRatio", "none");
    gridSvg.classList.add("absolute", "inset-0", "z-1");

    // Add horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = i * 20;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", "0");
      line.setAttribute("y1", y);
      line.setAttribute("x2", "100");
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "rgba(75, 85, 99, 0.3)");
      line.setAttribute("stroke-width", "1");
      gridSvg.appendChild(line);
    }

    // Add vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = i * 10;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", x);
      line.setAttribute("y1", "0");
      line.setAttribute("x2", x);
      line.setAttribute("y2", "100");
      line.setAttribute("stroke", "rgba(75, 85, 99, 0.3)");
      line.setAttribute("stroke-width", "1");
      gridSvg.appendChild(line);
    }

    frequencyContainer.appendChild(gridSvg);

    // Add match percentage display
    this.matchDisplay = document.createElement("div");
    this.matchDisplay.className = "text-center text-lg font-bold mb-2";
    this._updateMatchDisplay();
    displayContainer.appendChild(this.matchDisplay);

    this.puzzleContainer.appendChild(displayContainer);

    // Create dial control
    this._createDialControl();

    // Add role-specific help text
    const helpText = document.createElement("div");
    helpText.className =
      "text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700 mb-4";

    helpText.innerHTML = `
      <div class="font-bold text-blue-400 mb-1">Signal Calibration Info:</div>
      <ul class="list-disc pl-5 space-y-1 text-xs">
        <li>Your dial controls the <span class="text-blue-400">highlighted section</span> of the frequency pattern</li>
        <li>The green line is the target pattern you need to match</li>
        <li>The blue line is the current signal pattern</li>
        <li>Communicate with your team to coordinate dial adjustments</li>
        <li>Your dial may affect the pattern in a different way than your teammates' dials</li>
        <li>You must reach at least 90% match to complete the calibration</li>
      </ul>
    `;

    this.puzzleContainer.appendChild(helpText);

    // Add info about player's control
    const playerInfo = document.createElement("div");
    playerInfo.className = "text-sm text-yellow-400 text-center";
    playerInfo.textContent = `${this._getRoleSpecificInfo()}`;
    this.puzzleContainer.appendChild(playerInfo);
  }

  _getRoleSpecificInfo() {
    // Each role gets slightly different instructions about their dial
    switch (this.playerRole) {
      case "Hacker":
        return "Your dial affects the height of the signal. Turn clockwise to increase amplitude.";
      case "Safe Cracker":
        return this.playerDial.affectDirection === 1
          ? "Your dial controls signal peaks. Turn clockwise to increase peaks."
          : "Your dial controls signal peaks. Turn counter-clockwise to increase peaks.";
      case "Demolitions":
        return this.playerDial.affectDirection === 1
          ? "Your dial affects signal valleys. Turn clockwise to deepen valleys."
          : "Your dial affects signal valleys. Turn counter-clockwise to deepen valleys.";
      case "Lookout":
        return "Your dial affects overall pattern shape. Adjust based on team feedback.";
      default:
        return "Adjust your dial to match your portion of the target pattern.";
    }
  }

  _createDialControl() {
    const dialContainer = document.createElement("div");
    dialContainer.className =
      "bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700";

    // Create dial label
    const dialLabel = document.createElement("div");
    dialLabel.className = "text-center text-gray-300 mb-2 text-sm";
    dialLabel.textContent = "Your Signal Control Dial";
    dialContainer.appendChild(dialLabel);

    // Create dial visualization
    const dialVisual = document.createElement("div");
    dialVisual.className =
      "h-40 w-40 rounded-full bg-gray-900 border-4 border-gray-700 mx-auto mb-4 relative";

    // Add dial markings
    for (let i = 0; i < 10; i++) {
      const marking = document.createElement("div");
      const angle = i * 36 - 90; // -90 to make it start from the top
      const radians = angle * (Math.PI / 180);
      const x = Math.cos(radians) * 62;
      const y = Math.sin(radians) * 62;

      marking.className = "absolute w-1 h-4 bg-gray-600";
      marking.style.left = "calc(50% - 2px)";
      marking.style.top = "calc(50% - 8px)";
      marking.style.transform = `rotate(${angle}deg) translate(0, -58px)`;

      dialVisual.appendChild(marking);

      // Add number labels at certain positions
      if (i % 2 === 0) {
        const label = document.createElement("div");
        const labelAngle = angle;
        const labelRadians = labelAngle * (Math.PI / 180);
        const labelX = Math.cos(labelRadians) * 46;
        const labelY = Math.sin(labelRadians) * 46;

        label.className = "absolute text-xs text-gray-500";
        label.style.left = `calc(50% + ${labelX}px)`;
        label.style.top = `calc(50% + ${labelY}px)`;
        label.style.transform = "translate(-50%, -50%)";
        label.textContent = i * 10;

        dialVisual.appendChild(label);
      }
    }

    // Add dial pointer
    const pointer = document.createElement("div");
    pointer.className =
      "absolute left-1/2 w-1 bg-blue-500 origin-bottom rounded-t-sm";
    pointer.style.height = "55px";
    pointer.style.bottom = "50%";
    pointer.style.transform = `translateX(-50%) rotate(${
      this.playerDial.position * 3.6 - 90
    }deg)`;

    this.dialElement = {
      container: dialVisual,
      pointer: pointer,
    };

    dialVisual.appendChild(pointer);

    // Add center cap
    const centerCap = document.createElement("div");
    centerCap.className =
      "absolute left-1/2 top-1/2 w-4 h-4 rounded-full bg-blue-600 border-2 border-gray-700";
    centerCap.style.transform = "translate(-50%, -50%)";
    dialVisual.appendChild(centerCap);

    dialContainer.appendChild(dialVisual);

    // Add slider control
    const sliderContainer = document.createElement("div");
    sliderContainer.className = "px-4 mb-2";

    const sliderLabel = document.createElement("div");
    sliderLabel.className = "flex justify-between text-xs text-gray-500 mb-1";
    sliderLabel.innerHTML = "<span>0</span><span>50</span><span>100</span>";
    sliderContainer.appendChild(sliderLabel);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 100;
    slider.value = this.playerDial.position;
    slider.className = "w-full";

    // Add event listener to update dial position
    slider.addEventListener("input", (e) => {
      const newPosition = parseInt(e.target.value);
      this._updateDialPosition(newPosition);
    });

    sliderContainer.appendChild(slider);
    dialContainer.appendChild(sliderContainer);

    // Add fine adjustment buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "flex justify-center gap-4";

    const decreaseButton = document.createElement("button");
    decreaseButton.className =
      "px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded";
    decreaseButton.textContent = "- Decrease";
    decreaseButton.addEventListener("click", () => {
      const newPosition = Math.max(0, this.playerDial.position - 2);
      this._updateDialPosition(newPosition);
      slider.value = newPosition;
    });

    const increaseButton = document.createElement("button");
    increaseButton.className =
      "px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded";
    increaseButton.textContent = "Increase +";
    increaseButton.addEventListener("click", () => {
      const newPosition = Math.min(100, this.playerDial.position + 2);
      this._updateDialPosition(newPosition);
      slider.value = newPosition;
    });

    buttonContainer.appendChild(decreaseButton);
    buttonContainer.appendChild(increaseButton);
    dialContainer.appendChild(buttonContainer);

    this.puzzleContainer.appendChild(dialContainer);
  }

  _updateDialPosition(position) {
    this.playerDial.position = position;

    // Update dial pointer position
    if (this.dialElement && this.dialElement.pointer) {
      this.dialElement.pointer.style.transform = `translateX(-50%) rotate(${
        position * 3.6 - 90
      }deg)`;
    }

    // Update pattern based on dial position
    this._updatePattern();
  }

  _updatePattern() {
    // Update the current pattern based on dial position
    const [start, end] = this.playerDial.range;
    const direction = this.playerDial.affectDirection;
    const position = this.playerDial.position;

    // Different roles affect the pattern in different ways
    for (let i = start; i <= end; i++) {
      // Calculate how strongly this point is affected based on distance from center of range
      const rangeCenter = (start + end) / 2;
      const distanceFromCenter =
        1 - Math.abs(i - rangeCenter) / ((end - start) / 2);
      const strength = distanceFromCenter * 0.8 + 0.2; // Scale from 0.2 to 1.0

      // Determine effect based on role and dial direction
      let effect = 0;
      switch (this.playerRole) {
        case "Hacker":
          // Hacker affects amplitude - scales values away from 50
          effect = ((position - 50) / 50) * 40 * strength * direction;
          this.currentPattern[i] =
            50 + (this.currentPattern[i] - 50) * (1 + effect / 50);
          break;
        case "Safe Cracker":
          // Safe Cracker affects peaks - more effect on values > 50
          if (this.currentPattern[i] > 50) {
            effect = ((position - 50) / 50) * 30 * strength * direction;
            this.currentPattern[i] += effect;
          }
          break;
        case "Demolitions":
          // Demolitions affects valleys - more effect on values < 50
          if (this.currentPattern[i] < 50) {
            effect = ((position - 50) / 50) * 30 * strength * direction;
            this.currentPattern[i] -= effect;
          }
          break;
        case "Lookout":
          // Lookout affects overall shape - shifts values toward target
          const targetDiff = this.targetPattern[i] - this.currentPattern[i];
          effect = (position / 100) * targetDiff * strength * 0.5 * direction;
          this.currentPattern[i] += effect;
          break;
        default:
          // Default simple effect - just move toward position
          effect = ((position - 50) / 50) * 20 * strength * direction;
          this.currentPattern[i] += effect;
      }

      // Ensure the pattern stays within 0-100 range
      this.currentPattern[i] = Math.max(
        0,
        Math.min(100, this.currentPattern[i])
      );
    }

    // Update the displayed pattern
    this._updatePatternDisplay();

    // Calculate match percentage
    this._calculateMatchPercentage();

    // Check if puzzle is completed
    this._checkCompletion();
  }

  _updatePatternDisplay() {
    if (!this.patternDisplay || !this.patternDisplay.currentPath) return;

    // Update the SVG path for the current pattern
    let pathD = "M0," + (100 - this.currentPattern[0]);
    for (let i = 1; i < this.currentPattern.length; i++) {
      const x = (i / (this.currentPattern.length - 1)) * 100;
      const y = 100 - this.currentPattern[i];
      pathD += " L" + x + "," + y;
    }

    this.patternDisplay.currentPath.setAttribute("d", pathD);
  }

  _calculateMatchPercentage() {
    // Calculate how closely the current pattern matches the target
    let totalDifference = 0;
    const maxPossibleDifference = this.frequencyLength * 100; // Maximum possible difference

    for (let i = 0; i < this.frequencyLength; i++) {
      const diff = Math.abs(this.currentPattern[i] - this.targetPattern[i]);
      totalDifference += diff;
    }

    this.matchPercentage =
      100 - (totalDifference / maxPossibleDifference) * 100;
    this._updateMatchDisplay();
  }

  _updateMatchDisplay() {
    if (!this.matchDisplay) return;

    // Update the match percentage display
    const matchPercent = Math.round(this.matchPercentage);
    let color, icon;

    if (matchPercent >= 90) {
      color = "text-green-500";
      icon = "✓";
    } else if (matchPercent >= 70) {
      color = "text-yellow-500";
      icon = "⚠️";
    } else {
      color = "text-red-500";
      icon = "✗";
    }

    this.matchDisplay.className = `text-center text-lg font-bold mb-2 ${color}`;
    this.matchDisplay.textContent = `Signal Match: ${matchPercent}% ${icon}`;
  }

  _checkCompletion() {
    // Check if the match percentage is high enough to complete the puzzle
    if (this.matchPercentage >= 90 && !this.isCompleted) {
      this._handleSuccess();
    }
  }

  _handleSuccess() {
    this.isCompleted = true;

    // Update message
    this.messageElement.textContent =
      "Signal frequency successfully calibrated!";
    this.messageElement.className = "mb-4 text-green-400 text-center text-sm";

    // Visual feedback
    if (this.patternDisplay && this.patternDisplay.currentPath) {
      this.patternDisplay.currentPath.setAttribute("stroke", "#10B981");
      this.patternDisplay.currentPath.setAttribute("stroke-width", "3");
    }

    // Disable dial controls
    const dialControls = this.puzzleContainer.querySelectorAll("input, button");
    dialControls.forEach((control) => {
      control.disabled = true;
      if (control.tagName === "BUTTON") {
        control.classList.add("opacity-50", "cursor-not-allowed");
      }
    });

    // Show success message
    const successMessage = document.createElement("div");
    successMessage.className =
      "bg-green-900 text-green-300 p-3 rounded-lg text-center mb-4 animate-pulse";
    successMessage.textContent =
      "Signal frequency successfully calibrated! Access granted.";
    this.puzzleContainer.appendChild(successMessage);

    // Call completion callback
    if (this.onComplete) {
      this.onComplete(true);
    }
  }

  _startSignalUpdates() {
    // Simulate other players making adjustments and external noise
    this.updateInterval = setInterval(() => {
      if (this.isCompleted) {
        clearInterval(this.updateInterval);
        return;
      }

      // Randomly adjust parts of the pattern outside player's control
      // to simulate other players adjusting their dials
      for (let i = 0; i < this.frequencyLength; i++) {
        if (i < this.playerDial.range[0] || i > this.playerDial.range[1]) {
          // Add a small random adjustment
          const noise = (Math.random() - 0.5) * 2; // -1 to 1
          this.currentPattern[i] += noise;

          // Ensure the pattern stays within 0-100 range
          this.currentPattern[i] = Math.max(
            0,
            Math.min(100, this.currentPattern[i])
          );
        }
      }

      // Update the displayed pattern
      this._updatePatternDisplay();

      // Calculate match percentage
      this._calculateMatchPercentage();

      // Check if puzzle is completed
      this._checkCompletion();
    }, 500);
  }

  handleRandomEvent(eventType) {
    if (this.isCompleted) return;

    if (eventType === "system_check") {
      this.messageElement.textContent =
        "Security system interference detected! Signal disrupted.";
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

      // Add signal noise
      for (let i = 0; i < this.frequencyLength; i++) {
        const noise = (Math.random() - 0.5) * 20; // -10 to 10
        this.currentPattern[i] += noise;
        this.currentPattern[i] = Math.max(
          0,
          Math.min(100, this.currentPattern[i])
        );
      }

      // Update the displayed pattern
      this._updatePatternDisplay();

      // Calculate match percentage
      this._calculateMatchPercentage();

      // Hide message after a delay
      setTimeout(() => {
        if (this.isCompleted) return;
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center text-sm hidden";
      }, 3000);
    }
  }

  cleanup() {
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Remove DOM elements
    if (this.puzzleContainer && this.puzzleContainer.parentNode) {
      this.puzzleContainer.parentNode.removeChild(this.puzzleContainer);
    }

    this.patternDisplay = null;
    this.dialElement = null;
    this.matchDisplay = null;
    this.messageElement = null;
    this.puzzleContainer = null;
  }
}

export default SignalFrequencyPuzzle;
