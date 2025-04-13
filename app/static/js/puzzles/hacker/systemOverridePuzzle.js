// System Override Puzzle - Level 5
// A multi-stage hacking challenge to override a security system

class SystemOverridePuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle difficulty settings
    this.difficulty = puzzleData.difficulty || 5;

    // Puzzle state
    this.currentStage = 0;
    this.maxStages = 3;
    this.stageCompleted = Array(this.maxStages).fill(false);
    this.isComplete = false;

    // Security layers - change based on difficulty
    this.securityLayers = [
      { name: "Firewall", code: this._generateSecurityCode() },
      { name: "Authentication", code: this._generateSecurityCode() },
      { name: "Kernel Access", code: this._generateSecurityCode() },
    ];

    // DOM elements
    this.consoleOutput = null;
    this.consoleInput = null;
    this.systemStatus = null;
    this.progressBars = [];

    // For current stage logic
    this.commandHistory = [];
    this.currentCommandIndex = -1;
    this.validCommands = [
      "help",
      "scan",
      "status",
      "bypass",
      "crack",
      "exit",
      "clear",
      "override",
    ];

    // For code matrix
    this.codeMatrix = [];
    this.matrixSize = Math.min(4 + Math.floor(this.difficulty / 2), 8);
    this.selectedCells = [];
  }

  initialize() {
    this._createGameArea();
    this._attachEventListeners();
    this._showWelcomeMessage();
    this._generateCodeMatrix();
  }

  _createGameArea() {
    // Create main container
    const gameContainer = document.createElement("div");
    gameContainer.className = "bg-gray-900 p-4 rounded-lg";

    // Header with status
    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-4";

    const title = document.createElement("div");
    title.className = "text-red-500 text-lg font-mono";
    title.textContent = "SYSTEM OVERRIDE TERMINAL";
    header.appendChild(title);

    this.systemStatus = document.createElement("div");
    this.systemStatus.className =
      "bg-gray-800 text-red-400 px-3 py-1 rounded font-mono text-sm flex items-center";
    const statusDot = document.createElement("span");
    statusDot.className =
      "inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse";
    this.systemStatus.appendChild(statusDot);
    this.systemStatus.appendChild(document.createTextNode("LOCKED"));
    header.appendChild(this.systemStatus);

    gameContainer.appendChild(header);

    // Progress bars for security layers
    const progressContainer = document.createElement("div");
    progressContainer.className = "mb-4 grid grid-cols-3 gap-2";

    this.securityLayers.forEach((layer, index) => {
      const layerContainer = document.createElement("div");
      layerContainer.className = "flex flex-col";

      const layerLabel = document.createElement("div");
      layerLabel.className = "text-xs text-gray-400 mb-1 font-mono";
      layerLabel.textContent = layer.name;
      layerContainer.appendChild(layerLabel);

      const progressBar = document.createElement("div");
      progressBar.className = "h-2 bg-gray-700 rounded overflow-hidden";
      layerContainer.appendChild(progressBar);

      const progressFill = document.createElement("div");
      progressFill.className =
        "h-full bg-red-600 w-0 transition-all duration-500";
      progressBar.appendChild(progressFill);

      progressContainer.appendChild(layerContainer);
      this.progressBars.push(progressFill);
    });

    gameContainer.appendChild(progressContainer);

    // Console output
    this.consoleOutput = document.createElement("div");
    this.consoleOutput.className =
      "bg-black p-3 rounded h-64 mb-4 text-green-300 font-mono text-sm overflow-y-auto whitespace-pre-line";
    gameContainer.appendChild(this.consoleOutput);

    // Console input
    const inputContainer = document.createElement("div");
    inputContainer.className = "flex items-center bg-gray-800 p-2 rounded";

    const inputPrefix = document.createElement("span");
    inputPrefix.className = "text-green-400 mr-2 font-mono";
    inputPrefix.textContent = ">";
    inputContainer.appendChild(inputPrefix);

    this.consoleInput = document.createElement("input");
    this.consoleInput.type = "text";
    this.consoleInput.className =
      "bg-gray-800 text-green-300 flex-grow px-2 py-1 outline-none font-mono";
    this.consoleInput.placeholder = "Type commands here...";
    inputContainer.appendChild(this.consoleInput);

    gameContainer.appendChild(inputContainer);

    this.containerElement.appendChild(gameContainer);
  }

  _attachEventListeners() {
    // Command input handling
    this.consoleInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        this._processCommand();
      } else if (e.key === "ArrowUp") {
        this._navigateCommandHistory(-1);
      } else if (e.key === "ArrowDown") {
        this._navigateCommandHistory(1);
      }
    });
  }

  _showWelcomeMessage() {
    this._appendToConsole("=== SYSTEM OVERRIDE TERMINAL v2.3 ===", "system");
    this._appendToConsole("UNAUTHORIZED ACCESS DETECTED", "error");
    this._appendToConsole(
      "Security protocols active. Proceed with caution.",
      "system"
    );
    this._appendToConsole("Type 'help' for available commands.", "system");
    this._appendToConsole("");
  }

  _processCommand() {
    const command = this.consoleInput.value.trim().toLowerCase();

    // Skip empty commands
    if (!command) return;

    // Add to history
    this._appendToConsole(`> ${command}`, "input");
    this.commandHistory.unshift(command);
    this.currentCommandIndex = -1;

    // Limit history size
    if (this.commandHistory.length > 10) {
      this.commandHistory.pop();
    }

    // Process command
    if (this.validCommands.includes(command.split(" ")[0])) {
      this._executeCommand(command);
    } else {
      this._appendToConsole(
        "Unknown command. Type 'help' for available commands.",
        "error"
      );
    }

    // Clear input
    this.consoleInput.value = "";
  }

  _executeCommand(command) {
    const cmd = command.split(" ")[0];
    const args = command.split(" ").slice(1);

    switch (cmd) {
      case "help":
        this._showHelp();
        break;
      case "scan":
        this._scanSystem();
        break;
      case "status":
        this._showStatus();
        break;
      case "bypass":
        this._bypassSecurity(args);
        break;
      case "crack":
        this._crackPassword(args);
        break;
      case "override":
        this._overrideSystem();
        break;
      case "exit":
        this._appendToConsole(
          "Cannot exit system. Override required.",
          "error"
        );
        break;
      case "clear":
        this._clearConsole();
        break;
      default:
        this._appendToConsole("Command not implemented.", "error");
    }
  }

  _showHelp() {
    this._appendToConsole("AVAILABLE COMMANDS:", "help");
    this._appendToConsole("  help     - Display this help message", "help");
    this._appendToConsole(
      "  scan     - Scan for security vulnerabilities",
      "help"
    );
    this._appendToConsole("  status   - Show current system status", "help");
    this._appendToConsole(
      "  bypass   - Attempt to bypass a security layer (bypass [code])",
      "help"
    );
    this._appendToConsole("  crack    - Run password cracker", "help");
    this._appendToConsole("  override - Execute system override", "help");
    this._appendToConsole("  clear    - Clear terminal output", "help");
    this._appendToConsole("  exit     - Exit terminal (disabled)", "help");
  }

  _scanSystem() {
    this._appendToConsole("Scanning system for vulnerabilities...", "system");

    // Simulate scanning delay
    setTimeout(() => {
      this._appendToConsole(
        "Scan complete. Security layers detected:",
        "success"
      );

      this.securityLayers.forEach((layer, index) => {
        const status = this.stageCompleted[index] ? "BYPASSED" : "ACTIVE";
        const statusClass = this.stageCompleted[index] ? "success" : "error";

        if (!this.stageCompleted[index]) {
          this._appendToConsole(
            `  [${index + 1}] ${layer.name}: ${status}`,
            statusClass
          );

          if (index === this.currentStage) {
            // Give a hint for the current stage
            if (index === 0) {
              // Firewall stage - show matrix
              this._showCodeMatrix();
            } else if (index === 1) {
              // Authentication stage
              this._appendToConsole(
                `  Authentication requires security code.`,
                "system"
              );
              this._appendToConsole(
                `  Hint: Code format is ${layer.code.length} characters`,
                "hint"
              );
            } else if (index === 2) {
              // Kernel stage
              this._appendToConsole(
                `  Kernel security uses binary pattern.`,
                "system"
              );
              this._showBinaryPattern();
            }
          }
        } else {
          this._appendToConsole(
            `  [${index + 1}] ${layer.name}: ${status}`,
            statusClass
          );
        }
      });

      this._appendToConsole(
        `Current target: ${this.securityLayers[this.currentStage].name}`,
        "system"
      );
    }, 1000);
  }

  _showStatus() {
    this._appendToConsole("SYSTEM STATUS:", "system");
    this._appendToConsole(
      `  Override Progress: ${this._calculateOverallProgress()}%`,
      "system"
    );

    for (let i = 0; i < this.maxStages; i++) {
      const layer = this.securityLayers[i];
      const status = this.stageCompleted[i] ? "BYPASSED" : "LOCKED";
      const statusClass = this.stageCompleted[i] ? "success" : "error";

      this._appendToConsole(`  ${layer.name}: ${status}`, statusClass);
    }

    if (this.isComplete) {
      this._appendToConsole(
        "System override successful. Full access granted.",
        "success"
      );
    } else {
      this._appendToConsole(
        `Next target: ${this.securityLayers[this.currentStage].name}`,
        "system"
      );
    }
  }

  _bypassSecurity(args) {
    if (this.isComplete) {
      this._appendToConsole(
        "System already overridden. No need for bypass.",
        "error"
      );
      return;
    }

    const currentLayer = this.securityLayers[this.currentStage];

    if (!args.length) {
      this._appendToConsole(
        `Attempting to bypass ${currentLayer.name}...`,
        "system"
      );
      this._appendToConsole(
        "Security code required. Use 'bypass [code]'",
        "error"
      );
      return;
    }

    const code = args[0];

    this._appendToConsole(
      `Attempting to bypass ${currentLayer.name} with code: ${code}...`,
      "system"
    );

    // Simulate processing delay
    setTimeout(() => {
      if (code === currentLayer.code) {
        // Correct code
        this._appendToConsole(
          `Bypass successful! ${currentLayer.name} security disabled.`,
          "success"
        );
        this._playSound("success");

        // Update progress
        this.stageCompleted[this.currentStage] = true;
        this._updateProgressBar(this.currentStage, 100);

        // Move to next stage
        this.currentStage++;

        if (this.currentStage >= this.maxStages) {
          // All stages complete
          this._completeOverride();
        } else {
          // Advance to next stage
          this._appendToConsole(
            `Proceeding to ${
              this.securityLayers[this.currentStage].name
            } layer...`,
            "system"
          );
        }
      } else {
        // Wrong code
        this._appendToConsole(
          "Bypass failed. Incorrect security code.",
          "error"
        );
        this._playSound("error");

        // Reduce timer as penalty
        if (this.callbacks && this.callbacks.reduceTime) {
          this.callbacks.reduceTime(5);
        }

        // Give a hint based on similarity
        const similarity = this._calculateSimilarity(code, currentLayer.code);
        if (similarity > 0.5) {
          this._appendToConsole(
            "Code partially correct. Security leak detected.",
            "hint"
          );
        }
      }
    }, 1500);
  }

  _crackPassword() {
    if (this.isComplete) {
      this._appendToConsole(
        "System already overridden. No need for password cracking.",
        "error"
      );
      return;
    }

    const currentLayer = this.securityLayers[this.currentStage];

    this._appendToConsole(
      `Attempting to crack ${currentLayer.name} security...`,
      "system"
    );

    // Give a hint based on the current stage
    if (this.currentStage === 0) {
      // Firewall stage - show the code matrix
      this._appendToConsole(
        "Security pattern detected in code matrix:",
        "hint"
      );
      this._showCodeMatrix();
    } else if (this.currentStage === 1) {
      // Authentication stage - provide a partial code
      const partialCode = currentLayer.code.substring(0, 2) + "****";
      this._appendToConsole(`Partial code recovered: ${partialCode}`, "hint");
    } else if (this.currentStage === 2) {
      // Kernel stage - show binary pattern
      this._appendToConsole("Binary pattern identified:", "hint");
      this._showBinaryPattern();
    }

    // Reduce timer for using crack (easier path)
    if (this.callbacks && this.callbacks.reduceTime) {
      this.callbacks.reduceTime(3);
    }
  }

  _overrideSystem() {
    if (this.isComplete) {
      this._appendToConsole("System already overridden.", "success");
      return;
    }

    // Check if all security layers are bypassed
    const allBypassed = this.stageCompleted.every((stage) => stage);

    if (allBypassed) {
      this._appendToConsole("Initiating full system override...", "system");

      // Simulate processing delay
      setTimeout(() => {
        this._completeOverride();
      }, 2000);
    } else {
      this._appendToConsole(
        "Cannot override. Security layers still active.",
        "error"
      );
      this._appendToConsole(
        `Bypass all ${this.maxStages} security layers first.`,
        "error"
      );

      // Show current progress
      const completedCount = this.stageCompleted.filter(
        (stage) => stage
      ).length;
      this._appendToConsole(
        `Progress: ${completedCount}/${this.maxStages} layers bypassed.`,
        "system"
      );
    }
  }

  _completeOverride() {
    this.isComplete = true;

    // Update UI
    this._appendToConsole("SYSTEM OVERRIDE SUCCESSFUL", "success");
    this._appendToConsole("All security layers neutralized.", "success");
    this._appendToConsole(
      "Full system access granted to unauthorized user.",
      "success"
    );

    // Update status indicator
    if (this.systemStatus) {
      this.systemStatus.className =
        "bg-green-800 text-green-400 px-3 py-1 rounded font-mono text-sm flex items-center";
      const statusDot = this.systemStatus.querySelector("span");
      if (statusDot) {
        statusDot.className =
          "inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse";
      }
      this.systemStatus.lastChild.textContent = "OVERRIDDEN";
    }

    // Update all progress bars
    this.progressBars.forEach((bar) => {
      bar.className = "h-full bg-green-600 w-full transition-all duration-500";
    });

    // Trigger success callback
    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }

    // Play success sound
    this._playSound("success");
  }

  _clearConsole() {
    if (this.consoleOutput) {
      this.consoleOutput.innerHTML = "";
      this._showWelcomeMessage();
    }
  }

  _navigateCommandHistory(direction) {
    if (!this.commandHistory.length) return;

    this.currentCommandIndex += direction;

    if (this.currentCommandIndex < 0) {
      this.currentCommandIndex = 0;
    } else if (this.currentCommandIndex >= this.commandHistory.length) {
      this.currentCommandIndex = this.commandHistory.length - 1;
    }

    this.consoleInput.value = this.commandHistory[this.currentCommandIndex];
  }

  _appendToConsole(text, type = "normal") {
    if (!this.consoleOutput) return;

    const entry = document.createElement("div");
    entry.className = "mb-1";

    // Apply styling based on type
    switch (type) {
      case "error":
        entry.className += " text-red-400";
        break;
      case "success":
        entry.className += " text-green-500";
        break;
      case "system":
        entry.className += " text-cyan-400";
        break;
      case "input":
        entry.className += " text-white";
        break;
      case "help":
        entry.className += " text-yellow-300";
        break;
      case "hint":
        entry.className += " text-purple-400";
        break;
      default:
        // Normal text
        break;
    }

    entry.textContent = text;
    this.consoleOutput.appendChild(entry);

    // Auto-scroll to bottom
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  _updateProgressBar(index, percent) {
    if (index >= 0 && index < this.progressBars.length) {
      this.progressBars[index].style.width = `${percent}%`;

      // Change color based on completion
      if (percent >= 100) {
        this.progressBars[index].className =
          "h-full bg-green-600 w-full transition-all duration-500";
      } else if (percent > 0) {
        this.progressBars[index].className =
          "h-full bg-yellow-600 transition-all duration-500";
        this.progressBars[index].style.width = `${percent}%`;
      }
    }
  }

  _calculateOverallProgress() {
    const completedStages = this.stageCompleted.filter((stage) => stage).length;
    return Math.round((completedStages / this.maxStages) * 100);
  }

  _calculateSimilarity(a, b) {
    let matches = 0;
    const minLength = Math.min(a.length, b.length);

    for (let i = 0; i < minLength; i++) {
      if (a[i] === b[i]) matches++;
    }

    return matches / minLength;
  }

  _generateSecurityCode() {
    const codeTypes = [
      // Hex code
      () => {
        let code = "";
        for (let i = 0; i < 4; i++) {
          code += Math.floor(Math.random() * 16)
            .toString(16)
            .toUpperCase();
        }
        return code;
      },
      // Alphanumeric
      () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      },
      // Binary pattern
      () => {
        let code = "";
        for (let i = 0; i < 8; i++) {
          code += Math.floor(Math.random() * 2);
        }
        return code;
      },
    ];

    // Use different code types for different stages
    const typeIndex = this.difficulty % codeTypes.length;
    return codeTypes[typeIndex]();
  }

  _generateCodeMatrix() {
    this.codeMatrix = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    // Generate random matrix
    for (let i = 0; i < this.matrixSize; i++) {
      const row = [];
      for (let j = 0; j < this.matrixSize; j++) {
        row.push(chars.charAt(Math.floor(Math.random() * chars.length)));
      }
      this.codeMatrix.push(row);
    }

    // Choose a pattern type for the security code
    // For simplicity, insert the code in the first row
    const code = this.securityLayers[0].code;

    // Place code in the matrix
    for (let i = 0; i < code.length; i++) {
      this.codeMatrix[0][i] = code[i];
    }
  }

  _showCodeMatrix() {
    // Show a small portion of the matrix as a hint
    const matrixSize = Math.min(4, this.matrixSize);

    this._appendToConsole("CODE MATRIX SEGMENT:", "hint");

    let matrixText = "";
    for (let i = 0; i < matrixSize; i++) {
      let rowText = "  ";
      for (let j = 0; j < matrixSize; j++) {
        rowText += this.codeMatrix[i][j] + " ";
      }
      matrixText += rowText + "\n";
    }

    this._appendToConsole(matrixText, "hint");
    this._appendToConsole("First row contains the security code.", "hint");
  }

  _showBinaryPattern() {
    const code = this.securityLayers[2].code;
    let patternHint = "";

    // Show a pattern representation
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "1") {
        patternHint += "■ ";
      } else {
        patternHint += "□ ";
      }
    }

    this._appendToConsole(`Pattern: ${patternHint}`, "hint");
    this._appendToConsole(
      "Convert to 1s and 0s for the security code.",
      "hint"
    );
  }

  _playSound(type) {
    try {
      let sound;
      switch (type) {
        case "success":
          sound = new Audio("../static/sounds/system-unlock.mp3");
          sound.volume = 0.3;
          break;
        case "error":
          sound = new Audio("../static/sounds/system-error.mp3");
          sound.volume = 0.2;
          break;
        case "typing":
          sound = new Audio("../static/sounds/typing.mp3");
          sound.volume = 0.1;
          break;
        default:
          return;
      }

      sound.play().catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  // Methods required by UniversalPuzzleController
  getSolution() {
    return {
      securityCodes: this.securityLayers.map((layer) => layer.code),
      completed: this.isComplete,
      progress: this._calculateOverallProgress(),
    };
  }

  validateSolution() {
    return this.isComplete;
  }

  getErrorMessage() {
    const completedCount = this.stageCompleted.filter((stage) => stage).length;
    if (completedCount === 0) {
      return "No security layers bypassed yet. Use 'scan' to identify vulnerabilities.";
    } else {
      return `${completedCount}/${this.maxStages} security layers bypassed. Continue hacking!`;
    }
  }

  showSuccess() {
    // Success visuals already handled in _completeOverride

    // Add some extra visual flair
    this._appendToConsole("\n=== ACCESS GRANTED ===", "success");
    this._appendToConsole("All security protocols disabled", "success");
    this._appendToConsole("System override complete", "success");
  }

  cleanup() {
    // Remove event listeners
    if (this.consoleInput) {
      this.consoleInput.removeEventListener("keyup", this._processCommand);
    }
  }

  handleRandomEvent(eventType, duration) {
    if (eventType === "security_patrol") {
      this._appendToConsole("\n[!] SECURITY COUNTERMEASURES DETECTED", "error");
      this._appendToConsole("[!] Terminal functionality limited", "error");

      // Temporarily disable input
      if (this.consoleInput) {
        this.consoleInput.disabled = true;

        // Re-enable after duration
        setTimeout(() => {
          this.consoleInput.disabled = false;
          this._appendToConsole(
            "[!] Security scan complete. Terminal restored.",
            "system"
          );
        }, duration * 1000);
      }
    }
  }
}

export default SystemOverridePuzzle;
