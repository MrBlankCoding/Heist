// Data Chain Puzzle - Team members must decode a string of data by passing information
// through a chain of decoding steps that require coordination

class DataChainPuzzle {
  constructor(container, playerRole, allRoles, onCompleteCallback) {
    this.container = container;
    this.playerRole = playerRole;
    this.allRoles = allRoles;
    this.onComplete = onCompleteCallback;
    this.isCompleted = false;

    // Puzzle specific properties
    this.encodedMessage = ""; // Will be generated
    this.decodedSteps = {}; // Track decoding progress for each role
    this.finalCode = ""; // Final decoded message (solution)
    this.playerInput = ""; // What the player has entered
    this.roleSequence = ["Lookout", "Hacker", "Demolitions", "Safe Cracker"]; // Order of decoding
    this.playerStepIndex = 0; // Index of this player's step in the chain

    // DOM elements
    this.puzzleContainer = null;
    this.messageElement = null;
    this.codeDisplay = null;
    this.inputElement = null;
    this.outputElement = null;
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
    title.textContent = "Data Chain Decoder";
    this.puzzleContainer.appendChild(title);

    // Add instruction
    const instruction = document.createElement("p");
    instruction.className = "mb-4 text-gray-300 text-sm";
    instruction.textContent =
      "Decode your part of the data chain and pass the result to the next team member.";
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
  }

  _generatePuzzleData() {
    // Generate a random final code (6-digit numeric code)
    this.finalCode = "";
    for (let i = 0; i < 6; i++) {
      this.finalCode += Math.floor(Math.random() * 10).toString();
    }

    // Determine player's position in the decoding chain
    this.playerStepIndex = this.roleSequence.indexOf(this.playerRole);

    // Encode the final code through multiple steps (in reverse)
    let currentEncoding = this.finalCode;
    const encodingSteps = {};

    // Safe Cracker (final step) - receives numbers
    encodingSteps["Safe Cracker"] = currentEncoding;

    // Demolitions (step 3) - converts letters to numbers using a substitution cipher
    currentEncoding = this._encodeNumbersToLetters(currentEncoding);
    encodingSteps["Demolitions"] = currentEncoding;

    // Hacker (step 2) - converts symbols to letters using a specific pattern
    currentEncoding = this._encodeLettersToSymbols(currentEncoding);
    encodingSteps["Hacker"] = currentEncoding;

    // Lookout (first step) - receives color sequence that maps to symbols
    currentEncoding = this._encodeSymbolsToColors(currentEncoding);
    encodingSteps["Lookout"] = currentEncoding;

    // Set encoded message for the player
    this.encodedMessage = encodingSteps[this.playerRole] || "";
  }

  _encodeNumbersToLetters(numbers) {
    // Convert numbers to letters (1=A, 2=B, etc.)
    const letterMapping = {
      0: "Z",
      1: "A",
      2: "B",
      3: "C",
      4: "D",
      5: "E",
      6: "F",
      7: "G",
      8: "H",
      9: "I",
    };

    let result = "";
    for (let i = 0; i < numbers.length; i++) {
      result += letterMapping[numbers[i]] || numbers[i];
    }
    return result;
  }

  _encodeLettersToSymbols(letters) {
    // Convert letters to symbols
    const symbolMapping = {
      A: "!",
      B: "@",
      C: "#",
      D: "$",
      E: "%",
      F: "^",
      G: "&",
      H: "*",
      I: "(",
      Z: ")",
    };

    let result = "";
    for (let i = 0; i < letters.length; i++) {
      result += symbolMapping[letters[i]] || letters[i];
    }
    return result;
  }

  _encodeSymbolsToColors(symbols) {
    // Convert symbols to color names
    const colorMapping = {
      "!": "RED",
      "@": "BLUE",
      "#": "GREEN",
      $: "YELLOW",
      "%": "PURPLE",
      "^": "ORANGE",
      "&": "PINK",
      "*": "BLACK",
      "(": "WHITE",
      ")": "CYAN",
    };

    let result = [];
    for (let i = 0; i < symbols.length; i++) {
      result.push(colorMapping[symbols[i]] || symbols[i]);
    }
    return result.join(" ");
  }

  _createPuzzleInterface() {
    // Create role sequence display
    const roleSequenceContainer = document.createElement("div");
    roleSequenceContainer.className =
      "bg-gray-800 p-3 rounded-lg mb-5 border border-gray-700";

    // Create a visual representation of the decoding chain
    const sequenceDisplay = document.createElement("div");
    sequenceDisplay.className = "flex items-center justify-center gap-1 mb-3";

    this.roleSequence.forEach((role, index) => {
      // Create role box
      const roleBox = document.createElement("div");
      roleBox.className = "text-center p-2 rounded border";

      // Highlight current player's role
      if (role === this.playerRole) {
        roleBox.className += " bg-blue-900 border-blue-500 text-white";
      } else if (index < this.playerStepIndex) {
        roleBox.className += " bg-gray-700 border-gray-600 text-gray-400";
      } else {
        roleBox.className += " bg-gray-800 border-gray-700 text-gray-300";
      }

      // Add role icon and name
      roleBox.innerHTML = `<div class="text-lg">${this._getRoleEmoji(
        role
      )}</div>
                           <div class="text-xs mt-1">${role}</div>`;

      sequenceDisplay.appendChild(roleBox);

      // Add arrow if not the last role
      if (index < this.roleSequence.length - 1) {
        const arrow = document.createElement("div");
        arrow.className = "text-gray-500 text-lg";
        arrow.textContent = "→";
        sequenceDisplay.appendChild(arrow);
      }
    });

    roleSequenceContainer.appendChild(sequenceDisplay);

    // Add sequence explanation
    const sequenceExplanation = document.createElement("div");
    sequenceExplanation.className = "text-xs text-gray-400 text-center";
    sequenceExplanation.textContent =
      "Decoding chain order: Each role must complete their step and pass results to the next team member";
    roleSequenceContainer.appendChild(sequenceExplanation);

    this.puzzleContainer.appendChild(roleSequenceContainer);

    // Create main puzzle interface
    const puzzleInterface = document.createElement("div");
    puzzleInterface.className =
      "bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700";

    // Add role-specific instructions
    const roleInstructions = document.createElement("div");
    roleInstructions.className = "text-yellow-400 mb-4 text-sm text-center";
    roleInstructions.textContent = this._getRoleInstructions();
    puzzleInterface.appendChild(roleInstructions);

    // Create encrypted data display
    const dataSection = document.createElement("div");
    dataSection.className = "mb-4";

    const dataLabel = document.createElement("div");
    dataLabel.className = "text-sm text-gray-400 mb-1";
    dataLabel.textContent = this._getInputLabel();
    dataSection.appendChild(dataLabel);

    this.codeDisplay = document.createElement("div");
    this.codeDisplay.className =
      "font-mono text-lg bg-black p-3 rounded border border-gray-700 text-center tracking-wider";
    this.codeDisplay.textContent = this.encodedMessage;

    // For Lookout, add colors instead of text
    if (this.playerRole === "Lookout") {
      this.codeDisplay.innerHTML = "";
      const colors = this.encodedMessage.split(" ");
      colors.forEach((color) => {
        const colorBox = document.createElement("span");
        colorBox.className =
          "inline-block w-8 h-8 mx-1 border border-gray-700 rounded";
        colorBox.style.backgroundColor = this._getColorCode(color);
        colorBox.title = color;
        this.codeDisplay.appendChild(colorBox);
      });
    }

    dataSection.appendChild(this.codeDisplay);
    puzzleInterface.appendChild(dataSection);

    // Create decoding tools
    const toolsSection = document.createElement("div");
    toolsSection.className = "mb-4";

    const toolsLabel = document.createElement("div");
    toolsLabel.className = "text-sm text-gray-400 mb-1";
    toolsLabel.textContent = "Your Decoding Tools:";
    toolsSection.appendChild(toolsLabel);

    // Add role-specific decoding help
    const decodingHelp = document.createElement("div");
    decodingHelp.className =
      "bg-gray-900 p-3 rounded mb-3 text-xs text-gray-300 overflow-auto max-h-32";
    decodingHelp.innerHTML = this._getDecodingHelp();
    toolsSection.appendChild(decodingHelp);

    puzzleInterface.appendChild(toolsSection);

    // Create input section
    const inputSection = document.createElement("div");
    inputSection.className = "mb-4";

    const inputLabel = document.createElement("div");
    inputLabel.className = "text-sm text-gray-400 mb-1";
    inputLabel.textContent = this._getOutputLabel();
    inputSection.appendChild(inputLabel);

    // Create input field
    this.inputElement = document.createElement("input");
    this.inputElement.type = "text";
    this.inputElement.className =
      "font-mono text-lg bg-black text-green-500 p-3 rounded border border-gray-700 text-center tracking-wider w-full";
    this.inputElement.placeholder = this._getInputPlaceholder();

    this.inputElement.addEventListener("input", (e) => {
      this.playerInput = e.target.value;

      // Format the input for Safe Cracker to only accept numbers
      if (this.playerRole === "Safe Cracker") {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
        if (e.target.value.length > 6) {
          e.target.value = e.target.value.substring(0, 6);
        }
        this.playerInput = e.target.value;
      }
    });

    inputSection.appendChild(this.inputElement);
    puzzleInterface.appendChild(inputSection);

    // Create output preview
    this.outputElement = document.createElement("div");
    this.outputElement.className =
      "font-mono text-sm text-gray-400 mt-2 text-center hidden";
    puzzleInterface.appendChild(this.outputElement);

    // Add submit button
    this.submitButton = document.createElement("button");
    this.submitButton.className =
      "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mx-auto block";
    this.submitButton.textContent = "Submit Decoded Data";
    this.submitButton.addEventListener("click", () => this._checkSolution());
    puzzleInterface.appendChild(this.submitButton);

    this.puzzleContainer.appendChild(puzzleInterface);

    // Add team communication reminder
    const reminder = document.createElement("div");
    reminder.className = "text-sm text-yellow-400 text-center mt-3";
    reminder.textContent =
      "Remember: Communication is key! Share your decoded output with the next team member in the chain.";
    this.puzzleContainer.appendChild(reminder);
  }

  _getColorCode(colorName) {
    const colorMap = {
      RED: "#ff0000",
      BLUE: "#0000ff",
      GREEN: "#00ff00",
      YELLOW: "#ffff00",
      PURPLE: "#800080",
      ORANGE: "#ffa500",
      PINK: "#ffc0cb",
      BLACK: "#000000",
      WHITE: "#ffffff",
      CYAN: "#00ffff",
    };

    return colorMap[colorName] || "#888888";
  }

  _getRoleEmoji(role) {
    switch (role) {
      case "Hacker":
        return "💻";
      case "Safe Cracker":
        return "🔓";
      case "Demolitions":
        return "💥";
      case "Lookout":
        return "👁️";
      default:
        return "👤";
    }
  }

  _getRoleInstructions() {
    switch (this.playerRole) {
      case "Lookout":
        return "You see a sequence of colors. Convert them to symbols using the color code chart.";
      case "Hacker":
        return "You received symbols from the Lookout. Convert them to letters using the symbol decoder.";
      case "Demolitions":
        return "You received letters from the Hacker. Convert them to numbers using the letter-number mapping.";
      case "Safe Cracker":
        return "You received numbers from the Demolitions expert. Enter them in the vault keypad to complete the mission.";
      default:
        return "Decode your part of the data chain and pass it to the next person.";
    }
  }

  _getInputLabel() {
    switch (this.playerRole) {
      case "Lookout":
        return "Color Sequence:";
      case "Hacker":
        return "Encrypted Symbols:";
      case "Demolitions":
        return "Encoded Letters:";
      case "Safe Cracker":
        return "Security Code:";
      default:
        return "Input Data:";
    }
  }

  _getOutputLabel() {
    switch (this.playerRole) {
      case "Lookout":
        return "Enter Symbol Sequence:";
      case "Hacker":
        return "Enter Letter Sequence:";
      case "Demolitions":
        return "Enter Number Sequence:";
      case "Safe Cracker":
        return "Enter Final Access Code:";
      default:
        return "Your Output:";
    }
  }

  _getInputPlaceholder() {
    switch (this.playerRole) {
      case "Lookout":
        return "! @ # $ % ^";
      case "Hacker":
        return "A B C D E F";
      case "Demolitions":
        return "123456";
      case "Safe Cracker":
        return "123456";
      default:
        return "Enter decoded data";
    }
  }

  _getDecodingHelp() {
    switch (this.playerRole) {
      case "Lookout":
        return `
          <div class="grid grid-cols-5 gap-1">
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #ff0000;"></div>
              <span>RED = !</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #0000ff;"></div>
              <span>BLUE = @</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #00ff00;"></div>
              <span>GREEN = #</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #ffff00;"></div>
              <span>YELLOW = $</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #800080;"></div>
              <span>PURPLE = %</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #ffa500;"></div>
              <span>ORANGE = ^</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #ffc0cb;"></div>
              <span>PINK = &</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #000000;"></div>
              <span>BLACK = *</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #ffffff; border: 1px solid #ccc;"></div>
              <span>WHITE = (</span>
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded mr-1" style="background-color: #00ffff;"></div>
              <span>CYAN = )</span>
            </div>
          </div>
        `;
      case "Hacker":
        return `
          <div class="grid grid-cols-5 gap-1">
            <div>! = A</div>
            <div>@ = B</div>
            <div># = C</div>
            <div>$ = D</div>
            <div>% = E</div>
            <div>^ = F</div>
            <div>& = G</div>
            <div>* = H</div>
            <div>( = I</div>
            <div>) = Z</div>
          </div>
          <div class="mt-2 text-yellow-400">Enter letters without spaces.</div>
        `;
      case "Demolitions":
        return `
          <div class="grid grid-cols-5 gap-1">
            <div>A = 1</div>
            <div>B = 2</div>
            <div>C = 3</div>
            <div>D = 4</div>
            <div>E = 5</div>
            <div>F = 6</div>
            <div>G = 7</div>
            <div>H = 8</div>
            <div>I = 9</div>
            <div>Z = 0</div>
          </div>
          <div class="mt-2 text-yellow-400">Convert each letter to its corresponding number.</div>
        `;
      case "Safe Cracker":
        return `
          <div class="text-center">
            <p>Enter the 6-digit code into the secure vault system</p>
            <div class="mt-2 text-yellow-400">Double-check the code before submitting!</div>
          </div>
        `;
      default:
        return "Decode the data based on your expertise.";
    }
  }

  _checkSolution() {
    let isCorrect = false;
    let expectedOutput = "";

    // Check if solution is correct based on player role
    switch (this.playerRole) {
      case "Lookout":
        const colors = this.encodedMessage.split(" ");
        const expectedSymbols = colors
          .map((color) => {
            const symbolMap = {
              RED: "!",
              BLUE: "@",
              GREEN: "#",
              YELLOW: "$",
              PURPLE: "%",
              ORANGE: "^",
              PINK: "&",
              BLACK: "*",
              WHITE: "(",
              CYAN: ")",
            };
            return symbolMap[color] || "?";
          })
          .join("");

        // Remove all spaces and special characters for comparison
        const cleanInput = this.playerInput.replace(/[^!@#$%^&*()]/g, "");
        isCorrect = cleanInput === expectedSymbols;
        expectedOutput = expectedSymbols;
        break;

      case "Hacker":
        const symbols = this.encodedMessage;
        let expectedLetters = "";

        for (let i = 0; i < symbols.length; i++) {
          const letterMap = {
            "!": "A",
            "@": "B",
            "#": "C",
            $: "D",
            "%": "E",
            "^": "F",
            "&": "G",
            "*": "H",
            "(": "I",
            ")": "Z",
          };
          expectedLetters += letterMap[symbols[i]] || symbols[i];
        }

        // Remove all non-alphabet characters and convert to uppercase for comparison
        const cleanLetterInput = this.playerInput
          .replace(/[^A-Za-z]/g, "")
          .toUpperCase();
        isCorrect = cleanLetterInput === expectedLetters;
        expectedOutput = expectedLetters;
        break;

      case "Demolitions":
        const letters = this.encodedMessage;
        let expectedNumbers = "";

        for (let i = 0; i < letters.length; i++) {
          const numberMap = {
            A: "1",
            B: "2",
            C: "3",
            D: "4",
            E: "5",
            F: "6",
            G: "7",
            H: "8",
            I: "9",
            Z: "0",
          };
          expectedNumbers += numberMap[letters[i]] || letters[i];
        }

        // Remove all non-numeric characters for comparison
        const cleanNumberInput = this.playerInput.replace(/[^0-9]/g, "");
        isCorrect = cleanNumberInput === expectedNumbers;
        expectedOutput = expectedNumbers;
        break;

      case "Safe Cracker":
        // The Safe Cracker's input should match the final code
        isCorrect = this.playerInput === this.finalCode;
        expectedOutput = this.finalCode;
        break;
    }

    if (isCorrect) {
      this._handleSuccess();
    } else {
      this._handleFailure(expectedOutput);
    }
  }

  _handleSuccess() {
    this.isCompleted = true;

    // Update message
    this.messageElement.textContent =
      "Data successfully decoded! Share your output with the next team member.";
    this.messageElement.className = "mb-4 text-green-400 text-center text-sm";

    // Disable input
    this.inputElement.disabled = true;
    this.inputElement.className =
      "font-mono text-lg bg-green-900 text-green-300 p-3 rounded border border-green-500 text-center tracking-wider w-full";

    // Update submit button
    this.submitButton.disabled = true;
    this.submitButton.textContent = "Decoding Complete";
    this.submitButton.className =
      "bg-green-600 text-white px-4 py-2 rounded mx-auto block opacity-50 cursor-not-allowed";

    // If Safe Cracker completes their step, the entire puzzle is solved
    if (this.playerRole === "Safe Cracker") {
      // Create success animation
      const successAnimation = document.createElement("div");
      successAnimation.className = "text-center mt-4 mb-4";
      successAnimation.innerHTML =
        '<div class="inline-block text-4xl text-green-400 animate-pulse">🔓</div>';
      this.puzzleContainer.insertBefore(
        successAnimation,
        this.submitButton.nextSibling
      );

      // Add final success message
      const finalMessage = document.createElement("div");
      finalMessage.className =
        "bg-green-900 text-green-300 p-3 rounded-lg text-center mb-4 animate-pulse";
      finalMessage.textContent = "VAULT UNLOCKED! Mission accomplished.";
      this.puzzleContainer.appendChild(finalMessage);
    } else {
      // Show instruction for next step
      const nextPlayer = this.roleSequence[this.playerStepIndex + 1];

      // Show what to pass to the next player
      this.outputElement.textContent = `Tell ${this._getRoleEmoji(
        nextPlayer
      )} ${nextPlayer}: "${this.playerInput}"`;
      this.outputElement.className =
        "font-mono text-sm text-green-400 mt-3 text-center bg-gray-900 p-2 rounded";
    }

    // Call completion callback
    if (this.onComplete) {
      this.onComplete(this.playerRole === "Safe Cracker");
    }
  }

  _handleFailure(expectedOutput) {
    // Show error message
    this.messageElement.textContent = "Incorrect decoding. Please try again.";
    this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

    // Highlight input with error
    this.inputElement.className =
      "font-mono text-lg bg-red-900 text-red-300 p-3 rounded border border-red-700 text-center tracking-wider w-full";

    // After a delay, reset the input appearance
    setTimeout(() => {
      this.inputElement.className =
        "font-mono text-lg bg-black text-green-500 p-3 rounded border border-gray-700 text-center tracking-wider w-full";
      this.messageElement.className =
        "mb-4 text-yellow-400 text-center text-sm hidden";
    }, 2000);
  }

  handleRandomEvent(eventType) {
    if (this.isCompleted) return;

    if (eventType === "system_check") {
      this.messageElement.textContent =
        "System check in progress. Data transmission temporarily disrupted.";
      this.messageElement.className = "mb-4 text-red-400 text-center text-sm";

      // Temporarily disable input
      this.inputElement.disabled = true;
      this.submitButton.disabled = true;

      // Re-enable after delay
      setTimeout(() => {
        if (this.isCompleted) return;

        this.inputElement.disabled = false;
        this.submitButton.disabled = false;
        this.messageElement.className =
          "mb-4 text-yellow-400 text-center text-sm hidden";
      }, 5000);
    }
  }

  cleanup() {
    // Remove DOM elements
    if (this.puzzleContainer && this.puzzleContainer.parentNode) {
      this.puzzleContainer.parentNode.removeChild(this.puzzleContainer);
    }

    this.puzzleContainer = null;
    this.messageElement = null;
    this.codeDisplay = null;
    this.inputElement = null;
    this.outputElement = null;
    this.submitButton = null;
  }
}

export default DataChainPuzzle;
