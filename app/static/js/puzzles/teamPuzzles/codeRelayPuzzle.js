// Code Relay Puzzle - Team members must work together to share code segments
// Each player only hears part of a security code and must communicate to assemble the full code

class CodeRelayPuzzle {
  constructor(container, playerRole, allRoles, onCompleteCallback) {
    this.container = container;
    this.playerRole = playerRole;
    this.allRoles = allRoles;
    this.onComplete = onCompleteCallback;
    this.isCompleted = false;

    // Puzzle specific properties
    this.fullCode = ""; // Will be generated
    this.codeLength = 12; // 12-digit code
    this.playerCodeSegment = ""; // The part of the code this player sees
    this.playerInput = ""; // What the player has entered
    this.codeLooping = false; // Is the code currently looping
    this.loopInterval = null; // Interval for code loop
    this.loopCount = 0; // Number of times the code has looped
    this.maxLoops = 3; // Maximum number of loops before penalty

    // DOM elements
    this.puzzleContainer = null;
    this.codeDisplay = null;
    this.inputDisplay = null;
    this.loopIndicator = null;
    this.messageElement = null;
    this.submitButton = null;
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
    title.textContent = "Vault Code Relay";
    this.puzzleContainer.appendChild(title);

    // Add instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300 text-sm";
    instruction.textContent =
      "Listen for your code segment and share it with your team. Enter the full assembled code to proceed.";
    this.puzzleContainer.appendChild(instruction);

    // Add message area
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mb-4 text-yellow-400 text-center text-sm hidden";
    this.puzzleContainer.appendChild(this.messageElement);

    // Generate the full code and assign segments to roles
    this._generateSecurityCode();

    // Create main puzzle interface
    this._createPuzzleInterface();

    // Begin the code loop
    this._startCodeLoop();
  }

  _generateSecurityCode() {
    // Generate a random 12-digit code
    let code = "";
    for (let i = 0; i < this.codeLength; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    this.fullCode = code;

    // Divide the code among the roles
    const segmentLength = Math.floor(this.codeLength / this.allRoles.length);
    const roleSegments = {};

    for (let i = 0; i < this.allRoles.length; i++) {
      const role = this.allRoles[i];
      const start = i * segmentLength;
      const end =
        i === this.allRoles.length - 1
          ? this.codeLength
          : (i + 1) * segmentLength;
      roleSegments[role] = this.fullCode.substring(start, end);
    }

    // Assign this player's segment
    this.playerCodeSegment = roleSegments[this.playerRole] || "";

    // Add some noise to make it challenging
    this.playerCodeSegment = this._addNoiseToSegment(this.playerCodeSegment);
  }

  _addNoiseToSegment(segment) {
    // For the Hacker role, the code appears normally
    if (this.playerRole === "Hacker") {
      return segment;
    }

    // For other roles, add some challenge based on their role
    let modifiedSegment = segment;

    if (this.playerRole === "Safe Cracker") {
      // Safe Cracker sees the digits in a different order (reversed)
      modifiedSegment = segment.split("").reverse().join("");
    } else if (this.playerRole === "Demolitions") {
      // Demolitions sees some digits as letters (based on keypad layout)
      const substitutions = {
        1: "A",
        2: "2",
        3: "C",
        4: "4",
        5: "E",
        6: "6",
        7: "S",
        8: "8",
        9: "G",
        0: "O",
      };
      modifiedSegment = segment
        .split("")
        .map((digit) =>
          Math.random() < 0.5 ? substitutions[digit] || digit : digit
        )
        .join("");
    } else if (this.playerRole === "Lookout") {
      // Lookout sees the digits with symbols interspersed
      const symbols = ["*", "#", "$", "@", "&", "!"];
      let result = "";
      for (let i = 0; i < segment.length; i++) {
        result += segment[i];
        if (Math.random() < 0.3) {
          result += symbols[Math.floor(Math.random() * symbols.length)];
        }
      }
      modifiedSegment = result;
    }

    return modifiedSegment;
  }

  _createPuzzleInterface() {
    // Create vault display
    const vaultDisplay = document.createElement("div");
    vaultDisplay.className =
      "bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700";

    // Create code segment display
    const segmentContainer = document.createElement("div");
    segmentContainer.className = "mb-5";

    const segmentLabel = document.createElement("div");
    segmentLabel.className = "text-sm text-gray-400 mb-1";
    segmentLabel.textContent = "Your code segment:";
    segmentContainer.appendChild(segmentLabel);

    this.codeDisplay = document.createElement("div");
    this.codeDisplay.className =
      "font-mono text-2xl bg-black p-3 rounded border border-gray-700 text-center tracking-wider relative overflow-hidden";
    this.codeDisplay.textContent = "? ? ? ?";
    segmentContainer.appendChild(this.codeDisplay);

    // Add loop indicator
    this.loopIndicator = document.createElement("div");
    this.loopIndicator.className = "text-xs text-gray-500 mt-1 text-right";
    this.loopIndicator.textContent = "Loop: 0/" + this.maxLoops;
    segmentContainer.appendChild(this.loopIndicator);

    vaultDisplay.appendChild(segmentContainer);

    // Create input area
    const inputContainer = document.createElement("div");
    inputContainer.className = "mb-4";

    const inputLabel = document.createElement("div");
    inputLabel.className = "text-sm text-gray-400 mb-1";
    inputLabel.textContent = "Enter full vault code:";
    inputContainer.appendChild(inputLabel);

    // Create code input
    this.inputDisplay = document.createElement("input");
    this.inputDisplay.type = "text";
    this.inputDisplay.maxLength = this.codeLength;
    this.inputDisplay.className =
      "font-mono text-xl bg-black text-green-500 p-3 rounded border border-gray-700 text-center tracking-wider w-full";
    this.inputDisplay.placeholder = "_ _ _ _ _ _ _ _ _ _ _ _";

    // Add input event listener
    this.inputDisplay.addEventListener("input", (e) => {
      // Only allow digits
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
      this.playerInput = e.target.value;

      // Format with spaces every 3 digits
      if (e.target.value.length > 0) {
        const formatted = e.target.value.match(/.{1,3}/g).join(" ");
        e.target.value = formatted;
      }
    });

    inputContainer.appendChild(this.inputDisplay);
    vaultDisplay.appendChild(inputContainer);

    // Add reminder text
    const reminderText = document.createElement("div");
    reminderText.className = "text-sm text-yellow-400 mb-4";
    reminderText.textContent =
      "Remember: Each team member has a different segment of the code!";
    vaultDisplay.appendChild(reminderText);

    this.puzzleContainer.appendChild(vaultDisplay);

    // Add help text explaining the challenge
    const helpContainer = document.createElement("div");
    helpContainer.className =
      "bg-gray-800 p-3 rounded-lg border border-gray-700 mb-4 text-sm text-gray-300";

    const roleSpecificHelp = this._getRoleSpecificHelp();

    helpContainer.innerHTML = `
      <div class="font-bold text-blue-400 mb-2">Role-Specific Information:</div>
      <p class="mb-2">${roleSpecificHelp}</p>
      <div class="font-bold text-blue-400 mt-3 mb-1">Tips:</div>
      <ul class="list-disc pl-5 text-xs space-y-1">
        <li>The code will only loop ${this.maxLoops} times before resetting</li>
        <li>Write down your segment as soon as you see it</li>
        <li>Communicate clearly with your team to assemble the full code</li>
        <li>The full code is ${this.codeLength} digits long</li>
      </ul>
    `;

    this.puzzleContainer.appendChild(helpContainer);

    // Add submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className =
      "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mx-auto block";
    this.submitButton.textContent = "Submit Code";
    this.submitButton.addEventListener("click", () => this._checkCode());
    this.puzzleContainer.appendChild(this.submitButton);
  }

  _getRoleSpecificHelp() {
    switch (this.playerRole) {
      case "Hacker":
        return "As the Hacker, your code segment appears normally.";
      case "Safe Cracker":
        return "As the Safe Cracker, your code segment appears reversed. You need to read it from right to left.";
      case "Demolitions":
        return "As the Demolitions expert, some of your digits appear as letters (A=1, E=5, S=7, O=0, etc).";
      case "Lookout":
        return "As the Lookout, your code segment appears with symbols mixed in. Ignore the symbols.";
      default:
        return "Pay close attention to your code segment when it appears.";
    }
  }

  _startCodeLoop() {
    this.codeLooping = true;
    this.loopCount = 0;

    // Create the loop animation
    const runLoop = () => {
      if (this.isCompleted) return;

      this.loopCount++;
      this.loopIndicator.textContent = `Loop: ${this.loopCount}/${this.maxLoops}`;

      // Show "Listening..." animation
      this.codeDisplay.textContent = "Listening...";
      this.codeDisplay.style.color = "#6B7280";

      // After a delay, show the player's segment
      setTimeout(() => {
        if (this.isCompleted) return;

        // Show the player's segment
        this.codeDisplay.textContent = this.playerCodeSegment;
        this.codeDisplay.style.color = "#10B981";

        // Add a scanning effect
        this.codeDisplay.style.textShadow = "0 0 5px rgba(16, 185, 129, 0.8)";

        // After showing the segment, hide it again
        setTimeout(() => {
          if (this.isCompleted) return;

          this.codeDisplay.textContent = "* * * *";
          this.codeDisplay.style.color = "#6B7280";
          this.codeDisplay.style.textShadow = "none";

          // If reached max loops, reset with new code
          if (this.loopCount >= this.maxLoops) {
            this._resetCodeLoop();
          }
        }, 3000);
      }, 2000); // Wait 2 seconds before showing
    };

    // Run immediately and then set interval
    runLoop();
    this.loopInterval = setInterval(runLoop, 8000); // 8 seconds per loop (2s waiting + 3s showing + 3s between loops)
  }

  _resetCodeLoop() {
    // Show reset message
    this.messageElement.textContent =
      "Code sequence reset! New code being generated...";
    this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

    // Clear previous interval
    clearInterval(this.loopInterval);

    // Generate new code
    setTimeout(() => {
      if (this.isCompleted) return;

      this._generateSecurityCode();
      this.loopCount = 0;
      this.messageElement.className =
        "mb-4 text-yellow-400 text-center text-sm hidden";

      // Restart loop
      this._startCodeLoop();
    }, 3000);
  }

  _checkCode() {
    // Remove any non-digit characters
    const submittedCode = this.playerInput.replace(/\D/g, "");

    // Check if code is complete
    if (submittedCode.length !== this.codeLength) {
      this.messageElement.textContent = `Invalid code length. The code must be ${this.codeLength} digits.`;
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";
      return;
    }

    // Check if code is correct
    if (submittedCode === this.fullCode) {
      // Success!
      this._handleSuccess();
    } else {
      // Failure - show which parts are wrong
      this._handleFailure(submittedCode);
    }
  }

  _handleSuccess() {
    // Stop the code loop
    clearInterval(this.loopInterval);
    this.codeLooping = false;
    this.isCompleted = true;

    // Update message
    this.messageElement.textContent = "Vault code accepted! Access granted.";
    this.messageElement.className = "mb-4 text-green-400 text-center text-sm";

    // Visual success feedback
    this.inputDisplay.className =
      "font-mono text-xl bg-green-900 text-green-300 p-3 rounded border border-green-500 text-center tracking-wider w-full";
    this.inputDisplay.disabled = true;

    this.codeDisplay.textContent = this.fullCode;
    this.codeDisplay.style.color = "#34D399";
    this.codeDisplay.className += " bg-green-900 border-green-500";

    // Create success animation
    const unlockAnimation = document.createElement("div");
    unlockAnimation.className = "text-center mt-4 mb-2";
    unlockAnimation.innerHTML =
      '<div class="inline-block w-16 h-16 text-green-400 animate-pulse">🔓</div>';
    this.puzzleContainer.insertBefore(unlockAnimation, this.submitButton);

    // Update button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Vault Unlocked";
    this.submitButton.className =
      "bg-green-600 text-white px-4 py-2 rounded mx-auto block opacity-50 cursor-not-allowed";

    // Call completion callback
    if (this.onComplete) {
      this.onComplete(true);
    }
  }

  _handleFailure(submittedCode) {
    this.messageElement.textContent = "Incorrect code! Try again.";
    this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

    // Visual feedback showing which digits are correct
    let feedbackHtml = "";
    for (let i = 0; i < this.codeLength; i++) {
      const isCorrect = submittedCode[i] === this.fullCode[i];
      const digitClass = isCorrect ? "text-green-500" : "text-red-500";
      feedbackHtml += `<span class="${digitClass}">${submittedCode[i]}</span>`;

      if ((i + 1) % 3 === 0 && i < this.codeLength - 1) {
        feedbackHtml += " ";
      }
    }

    // Create a temporary feedback element
    const feedbackElement = document.createElement("div");
    feedbackElement.className =
      "font-mono text-xl bg-gray-900 p-2 rounded border border-gray-700 text-center tracking-wider mb-3";
    feedbackElement.innerHTML = feedbackHtml;

    // Insert before the input
    this.inputDisplay.parentNode.insertBefore(
      feedbackElement,
      this.inputDisplay
    );

    // Remove feedback after a delay
    setTimeout(() => {
      if (feedbackElement.parentNode) {
        feedbackElement.parentNode.removeChild(feedbackElement);
      }
    }, 3000);
  }

  handleRandomEvent(eventType) {
    if (this.isCompleted) return;

    if (eventType === "system_check") {
      // Security system check disrupts the code broadcast
      this.messageElement.textContent =
        "Security system check in progress! Code broadcast interrupted.";
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

      // Temporarily stop the code loop
      clearInterval(this.loopInterval);
      this.codeDisplay.textContent = "INTERRUPTED";
      this.codeDisplay.style.color = "#EF4444";

      // Resume after a delay
      setTimeout(() => {
        if (this.isCompleted) return;

        this.messageElement.className =
          "mb-4 text-yellow-400 text-center text-sm hidden";
        this._startCodeLoop();
      }, 5000);
    }
  }

  cleanup() {
    // Clear interval
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    // Remove DOM elements
    if (this.puzzleContainer && this.puzzleContainer.parentNode) {
      this.puzzleContainer.parentNode.removeChild(this.puzzleContainer);
    }

    this.puzzleContainer = null;
    this.codeDisplay = null;
    this.inputDisplay = null;
    this.loopIndicator = null;
    this.messageElement = null;
    this.submitButton = null;
  }
}

export default CodeRelayPuzzle;
