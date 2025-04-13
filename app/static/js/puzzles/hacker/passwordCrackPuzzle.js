// Password Crack Puzzle - Level 2
// A puzzle where players need to find a password by using provided clues and hints

class PasswordCrackPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle state
    this.attempts = 0;
    this.maxAttempts = 5;
    this.solved = false;
    this.currentInput = "";
    this.revealedHints = 0;

    // Password generation
    this.difficulty = puzzleData.difficulty || 2;
    this.passwordLength = Math.min(8, 4 + this.difficulty);
    this.password = this._generatePassword();
    this.passwordHints = this._generateHints();

    // DOM elements
    this.passwordInput = null;
    this.terminalOutput = null;
    this.attemptsDisplay = null;
    this.hintButton = null;
  }

  initialize() {
    this._createGameArea();
    this._attachEventListeners();
    this._showInitialOutput();
  }

  _createGameArea() {
    // Create container
    const gameContainer = document.createElement("div");
    gameContainer.className =
      "bg-gray-900 p-4 rounded-lg border border-green-500 font-mono text-sm";

    // Terminal header
    const terminalHeader = document.createElement("div");
    terminalHeader.className =
      "flex justify-between items-center mb-2 bg-gray-800 p-2 rounded";

    const terminalTitle = document.createElement("div");
    terminalTitle.className = "text-green-400";
    terminalTitle.textContent = "SecurOS v3.4.2 - PASSWORD RECOVERY";
    terminalHeader.appendChild(terminalTitle);

    // Attempts counter
    this.attemptsDisplay = document.createElement("div");
    this.attemptsDisplay.className =
      "bg-gray-700 px-2 py-1 rounded text-yellow-300";
    this.attemptsDisplay.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;
    terminalHeader.appendChild(this.attemptsDisplay);

    gameContainer.appendChild(terminalHeader);

    // Terminal output
    this.terminalOutput = document.createElement("div");
    this.terminalOutput.className =
      "bg-black p-3 rounded h-64 overflow-y-auto mb-4 text-green-300 whitespace-pre-line";
    gameContainer.appendChild(this.terminalOutput);

    // Input area
    const inputContainer = document.createElement("div");
    inputContainer.className = "flex items-center gap-2";

    const inputPrefix = document.createElement("span");
    inputPrefix.className = "text-green-400";
    inputPrefix.textContent = "root@system:~# ";
    inputContainer.appendChild(inputPrefix);

    this.passwordInput = document.createElement("input");
    this.passwordInput.type = "text";
    this.passwordInput.className =
      "bg-gray-800 text-green-300 flex-grow px-2 py-1 rounded border border-gray-700 focus:border-green-500 focus:outline-none";
    this.passwordInput.placeholder = "Enter password...";
    this.passwordInput.maxLength = this.passwordLength + 2; // Add some buffer
    inputContainer.appendChild(this.passwordInput);

    const submitButton = document.createElement("button");
    submitButton.className =
      "bg-green-700 hover:bg-green-600 text-white px-4 py-1 rounded";
    submitButton.textContent = "Try";
    submitButton.dataset.action = "submit";
    inputContainer.appendChild(submitButton);

    gameContainer.appendChild(inputContainer);

    // Hint button
    const actionContainer = document.createElement("div");
    actionContainer.className = "flex justify-between mt-4";

    this.hintButton = document.createElement("button");
    this.hintButton.className =
      "bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm";
    this.hintButton.textContent = "Request Hint";
    this.hintButton.dataset.action = "hint";
    actionContainer.appendChild(this.hintButton);

    // Brute force button (appears later)
    this.bruteForceButton = document.createElement("button");
    this.bruteForceButton.className =
      "bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm hidden";
    this.bruteForceButton.textContent = "Run Brute Force";
    this.bruteForceButton.dataset.action = "bruteforce";
    actionContainer.appendChild(this.bruteForceButton);

    gameContainer.appendChild(actionContainer);

    this.containerElement.appendChild(gameContainer);
  }

  _attachEventListeners() {
    // Attach event listeners to buttons
    this.containerElement.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") {
        const action = e.target.dataset.action;

        if (action === "submit") {
          this._checkPassword();
        } else if (action === "hint") {
          this._showHint();
        } else if (action === "bruteforce") {
          this._runBruteForce();
        }
      }
    });

    // Submit on Enter key
    this.passwordInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        this._checkPassword();
      }
    });
  }

  _generatePassword() {
    // Base strategies for password generation
    const strategies = [
      // Basic digits
      () =>
        Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0"),

      // Common words with digits
      () => {
        const words = [
          "admin",
          "secure",
          "system",
          "access",
          "server",
          "network",
        ];
        const word = words[Math.floor(Math.random() * words.length)];
        const number = Math.floor(Math.random() * 100);
        return `${word}${number}`;
      },

      // Mix of letters and symbols
      () => {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789!@#$";
        let password = "";
        for (let i = 0; i < this.passwordLength; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      },
    ];

    // Choose strategy based on difficulty
    const strategyIndex = Math.min(this.difficulty - 1, strategies.length - 1);
    return strategies[strategyIndex]();
  }

  _generateHints() {
    const hints = [];
    const password = this.password;

    // Generate hints based on the password
    hints.push(`Password length: ${password.length} characters`);

    if (/\d/.test(password)) {
      hints.push(`Password contains at least one number`);

      const sum = password
        .match(/\d/g)
        .reduce((sum, digit) => sum + parseInt(digit), 0);
      hints.push(`Sum of all digits in the password: ${sum}`);
    }

    if (/[a-zA-Z]/.test(password)) {
      hints.push(`Password contains at least one letter`);

      const firstLetter = password.match(/[a-zA-Z]/)[0];
      hints.push(`First letter in the password: "${firstLetter}"`);
    }

    if (/[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?]/.test(password)) {
      hints.push(`Password contains at least one special character`);
    }

    // Add more specific hints for higher difficulties
    if (this.difficulty >= 3) {
      hints.push(
        `Password contains characters from positions ${
          Math.floor(Math.random() * 3) + 1
        }-${Math.min(password.length, 5)} of the system master key`
      );

      // Create a hint with the first and last character
      hints.push(
        `First character: "${password[0]}", Last character: "${
          password[password.length - 1]
        }"`
      );
    }

    // Shuffle the hints
    return this._shuffleArray(hints);
  }

  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  _showInitialOutput() {
    const initialText = `
> SECURITY BREACH DETECTED
> INITIATING EMERGENCY RECOVERY PROTOCOL
> ADMIN PASSWORD REQUIRED TO PROCEED

Analyzing security log files...
Found partial credentials in memory dump
Decryption algorithm initialized

Use 'Request Hint' to reveal recovered password fragments
You have ${this.maxAttempts} attempts before security lockout
`;

    this._appendToTerminal(initialText);
  }

  _appendToTerminal(text, type = "normal") {
    if (!this.terminalOutput) return;

    const entry = document.createElement("div");
    entry.className = "mb-1";

    // Apply styling based on type
    switch (type) {
      case "error":
        entry.className += " text-red-400";
        break;
      case "success":
        entry.className += " text-green-400";
        break;
      case "warning":
        entry.className += " text-yellow-300";
        break;
      case "hint":
        entry.className += " text-blue-300";
        break;
      default:
        // Normal text
        break;
    }

    entry.textContent = text;
    this.terminalOutput.appendChild(entry);

    // Auto-scroll to bottom
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  _checkPassword() {
    if (this.solved) return;

    const input = this.passwordInput.value.trim();

    // Increment attempts
    this.attempts++;
    this.attemptsDisplay.textContent = `Attempts: ${this.attempts}/${this.maxAttempts}`;

    if (input === this.password) {
      // Correct password
      this._appendToTerminal("> ACCESS GRANTED", "success");
      this._appendToTerminal(`Authentication successful!`, "success");
      this._appendToTerminal(`Welcome back, Administrator.`, "success");

      this.solved = true;

      // Show success
      if (this.callbacks && this.callbacks.showSuccess) {
        this.callbacks.showSuccess();
      }

      // Disable input
      this.passwordInput.disabled = true;
      this.hintButton.disabled = true;

      // Play success sound
      this._playSound("success");
    } else {
      // Incorrect password
      this._appendToTerminal(
        `> ACCESS DENIED: "${input}" is incorrect`,
        "error"
      );

      // Play error sound
      this._playSound("error");

      // Check character matches for feedback
      let matches = 0;
      for (let i = 0; i < Math.min(input.length, this.password.length); i++) {
        if (input[i] === this.password[i]) {
          matches++;
        }
      }

      if (input.length > 0) {
        // Give feedback based on closeness
        if (matches > 0) {
          this._appendToTerminal(
            `Analysis: ${matches} character(s) in correct positions`,
            "hint"
          );
        } else if (this.password.includes(input[0])) {
          this._appendToTerminal(
            `Analysis: Some characters exist in the password but in wrong positions`,
            "hint"
          );
        }
      }

      // Show brute force option after half the attempts
      if (
        this.attempts >= Math.floor(this.maxAttempts / 2) &&
        this.bruteForceButton.classList.contains("hidden")
      ) {
        this._appendToTerminal(
          `> NOTICE: Brute force module now available`,
          "warning"
        );
        this.bruteForceButton.classList.remove("hidden");
      }

      // Check if out of attempts
      if (this.attempts >= this.maxAttempts) {
        this._appendToTerminal(
          `> SYSTEM LOCKOUT: Maximum attempts reached`,
          "error"
        );
        this._appendToTerminal(
          `> SECURITY PROTOCOL: System will shutdown in T-minus 30 seconds`,
          "error"
        );

        // Disable further attempts
        this.passwordInput.disabled = true;
        this.hintButton.disabled = true;

        // Show security message
        if (this.callbacks && this.callbacks.showMessage) {
          this.callbacks.showMessage(
            "Maximum attempts reached. Puzzle failed.",
            "error"
          );
        }

        // Reduce time
        if (this.callbacks && this.callbacks.reduceTime) {
          this.callbacks.reduceTime(10);
        }
      }
    }

    // Clear input
    this.passwordInput.value = "";
    this.passwordInput.focus();
  }

  _showHint() {
    if (this.revealedHints >= this.passwordHints.length) {
      this._appendToTerminal(
        "> ERROR: No more password hints available",
        "error"
      );
      return;
    }

    // Get next hint
    const hint = this.passwordHints[this.revealedHints];
    this.revealedHints++;

    // Display hint
    this._appendToTerminal(
      `> HINT ${this.revealedHints}/${this.passwordHints.length}: ${hint}`,
      "hint"
    );

    // Disable hint button if all hints are shown
    if (this.revealedHints >= this.passwordHints.length) {
      this.hintButton.disabled = true;
      this.hintButton.classList.add("opacity-50");
    }

    // Play hint sound
    this._playSound("hint");
  }

  _runBruteForce() {
    if (this.solved) return;

    this._appendToTerminal("> INITIATING BRUTE FORCE ATTACK", "warning");
    this._appendToTerminal(
      "> WARNING: This process will take time and may trigger alarms",
      "warning"
    );

    // Disable the button to prevent multiple clicks
    this.bruteForceButton.disabled = true;
    this.bruteForceButton.classList.add("opacity-50");

    // Show animation of trying different passwords
    let count = 0;
    const bruteForceAnimation = setInterval(() => {
      count++;
      const randomAttempt = this._generateRandomPassword();
      this._appendToTerminal(`Trying: ${randomAttempt}`, "normal");

      // Auto-scroll
      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;

      // After some attempts, show success
      if (count >= 5) {
        clearInterval(bruteForceAnimation);
        this._appendToTerminal(
          `Found matching password: ${this.password}`,
          "success"
        );
        this._appendToTerminal("> ACCESS GRANTED", "success");

        this.solved = true;

        // Show success
        if (this.callbacks && this.callbacks.showSuccess) {
          this.callbacks.showSuccess();
        }

        // Disable input
        this.passwordInput.disabled = true;
        this.hintButton.disabled = true;

        // Play success sound
        this._playSound("success");
      }
    }, 600);

    // Reduce time as penalty for using brute force
    if (this.callbacks && this.callbacks.reduceTime) {
      this.callbacks.reduceTime(15);
    }
  }

  _generateRandomPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < this.passwordLength; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  _playSound(type) {
    try {
      let sound;
      switch (type) {
        case "success":
          sound = new Audio("../static/sounds/access-granted.mp3");
          sound.volume = 0.3;
          break;
        case "error":
          sound = new Audio("../static/sounds/access-denied.mp3");
          sound.volume = 0.2;
          break;
        case "hint":
          sound = new Audio("../static/sounds/hint.mp3");
          sound.volume = 0.2;
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
      password: this.password,
      solved: this.solved,
      attempts: this.attempts,
    };
  }

  validateSolution() {
    return this.solved;
  }

  getErrorMessage() {
    if (this.attempts >= this.maxAttempts) {
      return "Maximum attempts reached. System locked.";
    }
    return "The password is incorrect. Try using hints for more information.";
  }

  showSuccess() {
    // Terminal already shows success message
    // Add additional visual confirmation
    this.terminalOutput.classList.add("border-2", "border-green-500");

    if (this.passwordInput) {
      this.passwordInput.value = this.password;
    }
  }

  cleanup() {
    // Remove event listeners
    if (this.containerElement) {
      this.containerElement.removeEventListener("click", this._checkPassword);
    }

    if (this.passwordInput) {
      this.passwordInput.removeEventListener("keyup", this._checkPassword);
    }
  }

  handleRandomEvent(eventType, duration) {
    if (eventType === "security_patrol") {
      this._appendToTerminal(
        "> WARNING: Security scan in progress. System access restricted.",
        "warning"
      );

      // Temporarily disable input
      if (this.passwordInput && !this.solved) {
        this.passwordInput.disabled = true;

        // Re-enable after duration
        setTimeout(() => {
          this.passwordInput.disabled = false;
          this._appendToTerminal(
            "> Security scan complete. Access restored.",
            "normal"
          );
        }, duration * 1000);
      }
    }
  }
}

export default PasswordCrackPuzzle;
