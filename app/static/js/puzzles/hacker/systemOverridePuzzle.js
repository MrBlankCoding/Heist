// systemOverridePuzzle.js - Stage 5 Hacker puzzle - System override challenge

class SystemOverridePuzzle {
  constructor(containerElement, puzzleData) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.terminals = [];
    this.numTerminals = 5; // Default
    this.activeAlarms = [];
    this.sequencesCompleted = 0;
    this.timeElapsed = 0;
    this.timer = null;
    this.isActive = true;
    this.commandHistory = [];

    // DOM elements
    this.systemElement = null;
    this.terminalsContainer = null;
    this.timerElement = null;
    this.progressElement = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Get puzzle data
    const { num_terminals } = this.puzzleData.data;
    this.numTerminals = num_terminals || 5;

    // Create the terminals
    this._initializeTerminals();

    // Create UI
    this._createSystemUI();

    // Start timer
    this._startTimer();

    // Start alarm system
    this._startAlarmSystem();
  }

  /**
   * Initialize the terminal data
   */
  _initializeTerminals() {
    this.terminals = [];

    // Create terminal data
    for (let i = 0; i < this.numTerminals; i++) {
      // Command sequences for each terminal
      const commands = this._generateCommands(3 + Math.floor(i / 2)); // Increasing difficulty

      this.terminals.push({
        id: i,
        name: `TERM-${String.fromCharCode(65 + i)}`, // A, B, C, etc.
        status: "locked",
        commandSequence: commands,
        currentCommand: 0,
        isUnderAttack: false,
      });
    }
  }

  /**
   * Create the system override UI
   */
  _createSystemUI() {
    // Create main container
    this.systemElement = document.createElement("div");
    this.systemElement.className =
      "bg-gray-900 border-2 border-red-500 rounded-lg p-4 w-full max-w-4xl text-gray-100 relative";

    // Add header
    const header = document.createElement("div");
    header.className =
      "flex justify-between items-center border-b border-red-500 pb-2 mb-4";

    const title = document.createElement("h3");
    title.className = "text-red-400 font-bold";
    title.textContent = "MAINFRAME SECURITY OVERRIDE";

    // Add status with timer
    this.timerElement = document.createElement("div");
    this.timerElement.className = "text-red-400 font-mono";
    this.timerElement.textContent = "00:00";

    header.appendChild(title);
    header.appendChild(this.timerElement);

    this.systemElement.appendChild(header);

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-sm text-gray-300";
    instructions.innerHTML = `
      <p class="text-yellow-400">WARNING: Security system breach detected! Multiple override attempts in progress.</p>
      <p class="mt-2">Execute command sequences in all terminals to gain control of the mainframe.</p>
      <p class="mt-1 text-gray-400">Watch for security countermeasures. Respond quickly to system alarms.</p>
    `;

    this.systemElement.appendChild(instructions);

    // Add progress bar
    this.progressElement = document.createElement("div");
    this.progressElement.className =
      "w-full bg-gray-800 rounded-full h-2.5 mb-4";

    const progressBar = document.createElement("div");
    progressBar.className =
      "bg-red-600 h-2.5 rounded-full w-0 transition-all duration-300";
    progressBar.style.width = "0%";

    this.progressElement.appendChild(progressBar);
    this.systemElement.appendChild(this.progressElement);

    // Create terminals container
    this.terminalsContainer = document.createElement("div");
    this.terminalsContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

    // Add terminals
    this.terminals.forEach((terminal) => {
      const terminalElement = this._createTerminalElement(terminal);
      this.terminalsContainer.appendChild(terminalElement);
    });

    this.systemElement.appendChild(this.terminalsContainer);

    // Add alarm indicators container
    const alarmContainer = document.createElement("div");
    alarmContainer.className = "absolute top-4 right-4 flex space-x-2";
    alarmContainer.id = "alarm-indicators";
    this.systemElement.appendChild(alarmContainer);

    // Append to container
    this.containerElement.appendChild(this.systemElement);
  }

  /**
   * Create a terminal element
   * @param {Object} terminal - Terminal data
   * @returns {HTMLElement} - Terminal element
   */
  _createTerminalElement(terminal) {
    const element = document.createElement("div");
    element.className = "bg-gray-800 rounded-lg p-3 terminal-element";
    element.dataset.terminal = terminal.id;

    // Add header
    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-2";

    const name = document.createElement("div");
    name.className = "text-blue-400 font-mono font-bold";
    name.textContent = terminal.name;

    const status = document.createElement("div");
    status.className = "text-xs px-2 py-1 rounded bg-red-900 text-red-300";
    status.textContent = "LOCKED";
    status.dataset.status = terminal.id;

    header.appendChild(name);
    header.appendChild(status);

    element.appendChild(header);

    // Add terminal window
    const terminalWindow = document.createElement("div");
    terminalWindow.className =
      "bg-black rounded p-2 font-mono text-xs h-36 overflow-y-auto terminal-window";
    terminalWindow.dataset.window = terminal.id;

    // Initial text
    terminalWindow.innerHTML = `
      <div class="text-gray-400">Terminal ${terminal.name} initialized.</div>
      <div class="text-gray-400">Security level: ${terminal.id + 1}/5</div>
      <div class="text-yellow-400">Execute command sequence to override...</div>
    `;

    element.appendChild(terminalWindow);

    // Add command input area
    const inputArea = document.createElement("div");
    inputArea.className = "mt-2";

    const inputGroup = document.createElement("div");
    inputGroup.className = "flex";

    const prompt = document.createElement("div");
    prompt.className =
      "bg-gray-900 px-2 py-1 text-green-400 font-mono text-sm flex items-center";
    prompt.textContent = ">";

    const input = document.createElement("input");
    input.className =
      "bg-gray-900 px-2 py-1 text-green-400 font-mono text-sm flex-grow focus:outline-none focus:ring-1 focus:ring-blue-500";
    input.type = "text";
    input.placeholder = "Enter command...";
    input.dataset.input = terminal.id;

    // Add command input event listener
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const command = input.value.trim();
        if (command) {
          this._processCommand(terminal.id, command);
          input.value = "";
        }
      }
    });

    inputGroup.appendChild(prompt);
    inputGroup.appendChild(input);

    inputArea.appendChild(inputGroup);

    // Add hint for current command
    const hintArea = document.createElement("div");
    hintArea.className = "mt-1 text-xs text-gray-500 font-mono";
    hintArea.dataset.hint = terminal.id;

    if (terminal.commandSequence.length > 0) {
      hintArea.textContent = `Next command: ${this._obscureCommand(
        terminal.commandSequence[0]
      )}`;
    }

    inputArea.appendChild(hintArea);

    element.appendChild(inputArea);

    return element;
  }

  /**
   * Process a command entered by the user
   * @param {number} terminalId - Terminal ID
   * @param {string} command - Command entered
   */
  _processCommand(terminalId, command) {
    const terminal = this.terminals[terminalId];
    if (!terminal) return;

    // Get terminal elements
    const terminalWindow = this.terminalsContainer.querySelector(
      `[data-window="${terminalId}"]`
    );
    const hintArea = this.terminalsContainer.querySelector(
      `[data-hint="${terminalId}"]`
    );

    // Add command to terminal window
    if (terminalWindow) {
      terminalWindow.innerHTML += `<div><span class="text-blue-400">> </span><span class="text-green-400">${command}</span></div>`;
      terminalWindow.scrollTop = terminalWindow.scrollHeight;
    }

    // Check if command matches expected command
    const expectedCommand = terminal.commandSequence[terminal.currentCommand];

    if (command.toLowerCase() === expectedCommand.toLowerCase()) {
      // Correct command
      terminal.currentCommand++;

      if (terminalWindow) {
        terminalWindow.innerHTML += `<div class="text-green-400">Command accepted. Security level ${terminal.currentCommand}/${terminal.commandSequence.length} bypassed.</div>`;
        terminalWindow.scrollTop = terminalWindow.scrollHeight;
      }

      // Check if all commands for this terminal are completed
      if (terminal.currentCommand >= terminal.commandSequence.length) {
        this._terminalCompleted(terminalId);
      } else {
        // Update hint for next command
        if (hintArea) {
          hintArea.textContent = `Next command: ${this._obscureCommand(
            terminal.commandSequence[terminal.currentCommand]
          )}`;
        }
      }
    } else {
      // Incorrect command
      if (terminalWindow) {
        terminalWindow.innerHTML += `<div class="text-red-400">Command rejected. Security violation logged.</div>`;
        terminalWindow.scrollTop = terminalWindow.scrollHeight;
      }

      // Trigger an alarm as penalty
      this._triggerRandomAlarm();
    }
  }

  /**
   * Handle completion of a terminal
   * @param {number} terminalId - Terminal ID
   */
  _terminalCompleted(terminalId) {
    const terminal = this.terminals[terminalId];
    if (!terminal) return;

    // Update terminal status
    terminal.status = "unlocked";

    // Update terminal UI
    const statusElement = this.terminalsContainer.querySelector(
      `[data-status="${terminalId}"]`
    );
    const terminalWindow = this.terminalsContainer.querySelector(
      `[data-window="${terminalId}"]`
    );
    const hintArea = this.terminalsContainer.querySelector(
      `[data-hint="${terminalId}"]`
    );
    const inputElement = this.terminalsContainer.querySelector(
      `[data-input="${terminalId}"]`
    );

    if (statusElement) {
      statusElement.className =
        "text-xs px-2 py-1 rounded bg-green-900 text-green-300";
      statusElement.textContent = "UNLOCKED";
    }

    if (terminalWindow) {
      terminalWindow.innerHTML += `<div class="text-green-400 font-bold">Terminal override complete! System access granted.</div>`;
      terminalWindow.scrollTop = terminalWindow.scrollHeight;
    }

    if (hintArea) {
      hintArea.textContent = "Terminal security bypassed successfully.";
    }

    if (inputElement) {
      inputElement.disabled = true;
      inputElement.placeholder = "Terminal unlocked";
    }

    // Increment completed count
    this.sequencesCompleted++;

    // Update progress bar
    const progressPercentage =
      (this.sequencesCompleted / this.numTerminals) * 100;
    const progressBar = this.progressElement.querySelector("div");
    if (progressBar) {
      progressBar.style.width = `${progressPercentage}%`;

      // Change color when progress is good
      if (progressPercentage > 60) {
        progressBar.className =
          "bg-green-600 h-2.5 rounded-full transition-all duration-300";
      } else if (progressPercentage > 30) {
        progressBar.className =
          "bg-yellow-600 h-2.5 rounded-full transition-all duration-300";
      }
    }

    // Check if all terminals are completed
    if (this.sequencesCompleted >= this.numTerminals) {
      this._puzzleComplete();
    }
  }

  /**
   * Generate a sequence of commands for a terminal
   * @param {number} length - Number of commands to generate
   * @returns {Array} - Array of command strings
   */
  _generateCommands(length) {
    const commandOptions = [
      "access mainframe",
      "bypass firewall",
      "crack encryption",
      "decrypt files",
      "disable security",
      "enable override",
      "execute protocol",
      "force entry",
      "grant access",
      "hack system",
      "inject code",
      "kill process",
      "locate files",
      "modify security",
      "navigate directory",
      "override protocol",
      "ping server",
      "query database",
      "reset system",
      "scan network",
      "terminate connection",
      "upload virus",
      "verify access",
      "wipe logs",
      "extract data",
    ];

    // Use seed from puzzle data if available for consistent generation
    const seed = (this.puzzleData.data.seed || 42) + length;
    const rand = this._seededRandom(seed);

    const commands = [];
    const usedIndices = new Set();

    for (let i = 0; i < length; i++) {
      let index;
      // Ensure no repeat commands
      do {
        index = Math.floor(rand() * commandOptions.length);
      } while (usedIndices.has(index));

      usedIndices.add(index);
      commands.push(commandOptions[index]);
    }

    return commands;
  }

  /**
   * Obscure a command for the hint (show only some characters)
   * @param {string} command - Command to obscure
   * @returns {string} - Obscured command
   */
  _obscureCommand(command) {
    if (!command) return "";

    // Show the first character, some middle characters as underscores, and the last character
    let obscured = command[0];

    for (let i = 1; i < command.length - 1; i++) {
      if (command[i] === " ") {
        obscured += " ";
      } else {
        // Show about 30% of characters
        obscured += Math.random() < 0.3 ? command[i] : "_";
      }
    }

    obscured += command[command.length - 1];

    return obscured;
  }

  /**
   * Start the timer
   */
  _startTimer() {
    this.timer = setInterval(() => {
      if (!this.isActive) return;

      this.timeElapsed++;
      this._updateTimer();
    }, 1000);
  }

  /**
   * Update the timer display
   */
  _updateTimer() {
    const minutes = Math.floor(this.timeElapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (this.timeElapsed % 60).toString().padStart(2, "0");

    if (this.timerElement) {
      this.timerElement.textContent = `${minutes}:${seconds}`;
    }
  }

  /**
   * Start the alarm system
   */
  _startAlarmSystem() {
    // Trigger random alarms periodically
    const alarmInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(alarmInterval);
        return;
      }

      // Don't trigger too many alarms
      if (this.activeAlarms.length < 3 && Math.random() < 0.3) {
        this._triggerRandomAlarm();
      }
    }, 8000); // Trigger chance every 8 seconds
  }

  /**
   * Trigger a random alarm
   */
  _triggerRandomAlarm() {
    const alarmTypes = [
      { id: "firewall", name: "FIREWALL BREACH", color: "red", duration: 12 },
      {
        id: "intrusion",
        name: "INTRUSION DETECTED",
        color: "yellow",
        duration: 10,
      },
      {
        id: "encryption",
        name: "ENCRYPTION ALERT",
        color: "purple",
        duration: 8,
      },
    ];

    // Select random alarm type
    const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];

    // Check if this alarm is already active
    if (this.activeAlarms.some((alarm) => alarm.id === alarmType.id)) {
      return;
    }

    // Add alarm to active alarms
    const alarmId = `${alarmType.id}-${Date.now()}`;
    this.activeAlarms.push({
      id: alarmId,
      type: alarmType.id,
      timeLeft: alarmType.duration,
    });

    // Create alarm indicator
    const alarmContainer = document.getElementById("alarm-indicators");
    if (alarmContainer) {
      const alarmElement = document.createElement("div");
      alarmElement.className = `px-2 py-1 rounded text-xs font-bold animate-pulse bg-${alarmType.color}-900 text-${alarmType.color}-300`;
      alarmElement.textContent = alarmType.name;
      alarmElement.dataset.alarm = alarmId;

      alarmContainer.appendChild(alarmElement);
    }

    // Apply alarm effect to terminals
    this._applyAlarmEffect(alarmType.id);

    // Start countdown
    const countdownInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(countdownInterval);
        return;
      }

      // Find alarm in active alarms
      const alarmIndex = this.activeAlarms.findIndex(
        (alarm) => alarm.id === alarmId
      );
      if (alarmIndex === -1) {
        clearInterval(countdownInterval);
        return;
      }

      // Decrease time left
      this.activeAlarms[alarmIndex].timeLeft--;

      // Check if alarm is expired
      if (this.activeAlarms[alarmIndex].timeLeft <= 0) {
        // Remove alarm
        this.activeAlarms.splice(alarmIndex, 1);

        // Remove alarm indicator
        const alarmElement = document.querySelector(
          `[data-alarm="${alarmId}"]`
        );
        if (alarmElement && alarmElement.parentNode) {
          alarmElement.parentNode.removeChild(alarmElement);
        }

        // Remove alarm effect
        this._removeAlarmEffect(alarmType.id);

        clearInterval(countdownInterval);
      }
    }, 1000);
  }

  /**
   * Apply alarm effect to terminals
   * @param {string} alarmType - Type of alarm
   */
  _applyAlarmEffect(alarmType) {
    // Different effects based on alarm type
    switch (alarmType) {
      case "firewall":
        // Make one random terminal temporarily unavailable
        const randomTerminal = Math.floor(Math.random() * this.numTerminals);
        const terminalElement = this.terminalsContainer.querySelector(
          `[data-terminal="${randomTerminal}"]`
        );

        if (terminalElement) {
          terminalElement.classList.add("opacity-50");
          const inputElement = terminalElement.querySelector("input");
          if (inputElement) {
            inputElement.disabled = true;
            inputElement.dataset.previousPlaceholder = inputElement.placeholder;
            inputElement.placeholder = "TERMINAL LOCKED - FIREWALL BREACH";
          }

          // Store info about affected terminal
          this.terminals[randomTerminal].isUnderAttack = true;
        }
        break;

      case "intrusion":
        // Scramble hints
        const hintElements =
          this.terminalsContainer.querySelectorAll("[data-hint]");
        hintElements.forEach((element) => {
          element.dataset.previousText = element.textContent;

          // Only scramble if it contains a command hint
          if (element.textContent.includes("Next command:")) {
            element.textContent = "Next command: [SCRAMBLED BY INTRUSION]";
            element.className = "mt-1 text-xs text-red-500 font-mono";
          }
        });
        break;

      case "encryption":
        // Add noise to terminal windows
        const terminalWindows =
          this.terminalsContainer.querySelectorAll(".terminal-window");
        terminalWindows.forEach((window) => {
          // Add encryption noise
          window.innerHTML += `<div class="text-purple-400">*** ENCRYPTION ALERT: Terminal communication intercepted ***</div>`;
          window.scrollTop = window.scrollHeight;
        });
        break;
    }
  }

  /**
   * Remove alarm effect from terminals
   * @param {string} alarmType - Type of alarm
   */
  _removeAlarmEffect(alarmType) {
    switch (alarmType) {
      case "firewall":
        // Re-enable affected terminals
        for (let i = 0; i < this.numTerminals; i++) {
          if (this.terminals[i].isUnderAttack) {
            const terminalElement = this.terminalsContainer.querySelector(
              `[data-terminal="${i}"]`
            );

            if (terminalElement) {
              terminalElement.classList.remove("opacity-50");
              const inputElement = terminalElement.querySelector("input");

              if (inputElement) {
                inputElement.disabled = false;
                inputElement.placeholder =
                  inputElement.dataset.previousPlaceholder ||
                  "Enter command...";
              }
            }

            this.terminals[i].isUnderAttack = false;
          }
        }
        break;

      case "intrusion":
        // Restore hints
        const hintElements =
          this.terminalsContainer.querySelectorAll("[data-hint]");
        hintElements.forEach((element) => {
          if (element.dataset.previousText) {
            element.textContent = element.dataset.previousText;
            element.className = "mt-1 text-xs text-gray-500 font-mono";
            delete element.dataset.previousText;
          }
        });
        break;

      case "encryption":
        // No direct cleanup needed for encryption alert
        break;
    }
  }

  /**
   * Handle puzzle completion
   */
  _puzzleComplete() {
    // Stop timer
    clearInterval(this.timer);
    this.isActive = false;

    // Show completion message
    const completionMessage = document.createElement("div");
    completionMessage.className =
      "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 p-8 rounded-lg text-center z-50 border-2 border-green-500";

    completionMessage.innerHTML = `
      <div class="text-green-400 font-bold text-2xl mb-4">SYSTEM OVERRIDE COMPLETE</div>
      <div class="text-white mb-4">All security terminals bypassed successfully.</div>
      <div class="text-gray-400">Completion time: ${this._formatTime(
        this.timeElapsed
      )}</div>
    `;

    this.systemElement.appendChild(completionMessage);

    // Update progress bar to full
    const progressBar = this.progressElement.querySelector("div");
    if (progressBar) {
      progressBar.style.width = "100%";
      progressBar.className =
        "bg-green-600 h-2.5 rounded-full transition-all duration-300";
    }
  }

  /**
   * Format time in seconds to MM:SS
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  _formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  /**
   * Create a seeded random number generator
   * @param {number} seed - Random seed
   * @returns {Function} - Seeded random function
   */
  _seededRandom(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Get current solution
   * @returns {Object} - Object with completed terminals
   */
  getSolution() {
    return {
      completedTerminals: this.sequencesCompleted,
      totalTerminals: this.numTerminals,
      timeElapsed: this.timeElapsed,
    };
  }

  /**
   * Validate solution
   * @returns {boolean} - Whether all terminals are completed
   */
  validateSolution() {
    return this.sequencesCompleted >= this.numTerminals;
  }

  /**
   * Get error message
   * @returns {string} - Error message
   */
  getErrorMessage() {
    const remaining = this.numTerminals - this.sequencesCompleted;
    return `You still need to override ${remaining} more terminal${
      remaining === 1 ? "" : "s"
    }.`;
  }

  /**
   * Disable puzzle
   */
  disable() {
    this.isActive = false;
    if (this.systemElement) {
      this.systemElement.classList.add("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Enable puzzle
   */
  enable() {
    this.isActive = true;
    if (this.systemElement) {
      this.systemElement.classList.remove("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop timer
    clearInterval(this.timer);
    this.isActive = false;
  }
}

export default SystemOverridePuzzle;
