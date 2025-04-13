// universalPuzzleController.js - Universal controller for all role puzzles

// Import all puzzle types
// Hacker
import CircuitPuzzle from "./hacker/circuitPuzzle.js";
import PasswordCrackPuzzle from "./hacker/passwordCrackPuzzle.js";
import FirewallBypassPuzzle from "./hacker/firewallBypassPuzzle.js";
import EncryptionKeyPuzzle from "./hacker/encryptionKeyPuzzle.js";
import SystemOverridePuzzle from "./hacker/systemOverridePuzzle.js";

// Safe Cracker
import LockCombinationPuzzle from "./safeCracker/lockCombinationPuzzle.js";
import PatternRecognitionPuzzle from "./safeCracker/patternRecognitionPuzzle.js";
import MultiLockPuzzle from "./safeCracker/multiLockPuzzle.js";
import AudioSequencePuzzle from "./safeCracker/audioSequencePuzzle.js";
import TimedLockPuzzle from "./safeCracker/timedLockPuzzle.js";

// Demolitions
import WireCuttingPuzzle from "./demolitions/wireCuttingPuzzle.js";
import TimeBombPuzzle from "./demolitions/timeBombPuzzle.js";
import CircuitBoardPuzzle from "./demolitions/circuitBoardPuzzle.js";
import ExplosiveSequencePuzzle from "./demolitions/explosiveSequencePuzzle.js";
import FinalDetonationPuzzle from "./demolitions/finalDetonationPuzzle.js";

// Lookout
import SurveillancePuzzle from "./lookout/SurveillancePuzzle.js";
import PatrolPatternPuzzle from "./lookout/PatrolPatternPuzzle.js";
import SecuritySystemPuzzle from "./lookout/SecuritySystemPuzzle.js";
import AlarmPuzzle from "./lookout/AlarmPuzzle.js";
import EscapeRoutePuzzle from "./lookout/EscapeRoutePuzzle.js";

class UniversalPuzzleController {
  constructor(containerElement, puzzleData, submitSolutionCallback) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.submitSolution = submitSolutionCallback;
    this.isCompleted = false;
    this.currentStage = puzzleData.difficulty || 1;
    this.autoAdvance = true;
    this.timer = null;
    this.countdownValue = 60;
    this.activePuzzle = null;
    this.countdownElement = null;
    this.messageElement = null;
    this.submitButton = null;
    this.gameArea = null;

    this.puzzleTypeMap = this._createPuzzleTypeMap();
  }

  _createPuzzleTypeMap() {
    const standardMap = {
      // Hacker puzzles
      circuit: CircuitPuzzle,
      password_crack: PasswordCrackPuzzle,
      firewall_bypass: FirewallBypassPuzzle,
      encryption_key: EncryptionKeyPuzzle,
      system_override: SystemOverridePuzzle,

      // Safe Cracker puzzles
      lock_combination: LockCombinationPuzzle,
      pattern_recognition: PatternRecognitionPuzzle,
      multi_lock: MultiLockPuzzle,
      audio_sequence: AudioSequencePuzzle,
      timed_lock: TimedLockPuzzle,

      // Demolitions puzzles
      wire_cutting: WireCuttingPuzzle,
      time_bomb: TimeBombPuzzle,
      circuit_board: CircuitBoardPuzzle,
      explosive_sequence: ExplosiveSequencePuzzle,
      final_detonation: FinalDetonationPuzzle,

      // Lookout puzzles
      surveillance: SurveillancePuzzle,
      patrol_pattern: PatrolPatternPuzzle,
      security_system: SecuritySystemPuzzle,
      alarm: AlarmPuzzle,
      escape_route: EscapeRoutePuzzle,
    };

    // Legacy format support
    const legacyMap = {
      hacker_puzzle_1: CircuitPuzzle,
      hacker_puzzle_2: PasswordCrackPuzzle,
      hacker_puzzle_3: FirewallBypassPuzzle,
      hacker_puzzle_4: EncryptionKeyPuzzle,
      hacker_puzzle_5: SystemOverridePuzzle,

      safe_cracker_puzzle_1: LockCombinationPuzzle,
      safe_cracker_puzzle_2: PatternRecognitionPuzzle,
      safe_cracker_puzzle_3: MultiLockPuzzle,
      safe_cracker_puzzle_4: AudioSequencePuzzle,
      safe_cracker_puzzle_5: TimedLockPuzzle,

      demo_puzzle_1: WireCuttingPuzzle,
      demo_puzzle_2: TimeBombPuzzle,
      demo_puzzle_3: CircuitBoardPuzzle,
      demo_puzzle_4: ExplosiveSequencePuzzle,
      demo_puzzle_5: FinalDetonationPuzzle,

      lookout_puzzle_1: SurveillancePuzzle,
      lookout_puzzle_2: PatrolPatternPuzzle,
      lookout_puzzle_3: SecuritySystemPuzzle,
      lookout_puzzle_4: AlarmPuzzle,
      lookout_puzzle_5: EscapeRoutePuzzle,
    };

    return { ...standardMap, ...legacyMap };
  }

  initialize() {
    this._createUIElements();
    this._initializePuzzle();

    if (this.submitButton) {
      this.submitButton.addEventListener("click", () => this._handleSubmit());
    }
  }

  _createUIElements() {
    this.containerElement.innerHTML = "";

    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "w-full max-w-4xl mx-auto bg-gray-800 rounded-lg overflow-hidden shadow-lg";

    // Header with title and timer
    const header = document.createElement("div");
    header.className = "p-4 bg-gray-700 flex items-center justify-between";

    const title = document.createElement("h2");
    title.className = "text-xl font-bold text-white";
    title.textContent = this._getPuzzleTitle();
    header.appendChild(title);

    this.countdownElement = document.createElement("div");
    this.countdownElement.className =
      "bg-gray-900 text-white px-3 py-1 rounded-md font-mono";
    this.countdownElement.textContent = `${this.countdownValue}s`;
    header.appendChild(this.countdownElement);
    puzzleContainer.appendChild(header);

    // Game area
    this.gameArea = document.createElement("div");
    this.gameArea.className = "p-6 bg-gray-800";
    puzzleContainer.appendChild(this.gameArea);

    // Message area
    this.messageElement = document.createElement("div");
    this.messageElement.className = "p-4 bg-gray-700 text-center text-white";
    this.messageElement.textContent =
      "Complete the puzzle before time runs out!";
    puzzleContainer.appendChild(this.messageElement);

    // Submit button
    const actionArea = document.createElement("div");
    actionArea.className = "p-4 bg-gray-700 flex justify-center";

    this.submitButton = document.createElement("button");
    this.submitButton.className =
      "px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors";
    this.submitButton.textContent = "Submit Solution";
    actionArea.appendChild(this.submitButton);
    puzzleContainer.appendChild(actionArea);

    this.containerElement.appendChild(puzzleContainer);

    this._startCountdown();
  }

  _initializePuzzle() {
    const puzzleType = this.puzzleData.type;

    this.countdownValue = this._getCountdownTime();
    this.updateCountdownDisplay();

    const callbacks = {
      showMessage: (message, type) => this._showMessage(message, type),
      showSuccess: () => this.showSuccess(),
      disableSubmit: () => this._disableSubmit(),
      getCountdownElement: () => this.countdownElement,
      startCountdown: (timeUpCallback) => this._startCountdown(timeUpCallback),
      reduceTime: (seconds) => this._reduceTime(seconds),
      submitSolution: this.submitSolution,
    };

    const PuzzleClass = this.puzzleTypeMap[puzzleType];

    if (PuzzleClass) {
      try {
        this.activePuzzle = new PuzzleClass(
          this.gameArea,
          this.puzzleData,
          typeof PuzzleClass.prototype.getSolution === "function"
            ? callbacks
            : this.submitSolution
        );

        // Add default implementations if needed
        if (!this.activePuzzle.getSolution) {
          this.activePuzzle.getSolution = () => true;
        }

        if (!this.activePuzzle.validateSolution) {
          this.activePuzzle.validateSolution = () => true;
        }

        if (!this.activePuzzle.getErrorMessage) {
          this.activePuzzle.getErrorMessage = () => "Solution not valid";
        }

        this.activePuzzle.initialize();
      } catch (error) {
        console.error(
          `Error initializing puzzle of type ${puzzleType}:`,
          error
        );
        this._showMessage(
          `Error initializing puzzle: ${error.message}`,
          "error"
        );
      }
    } else {
      console.error(`Unknown puzzle type: ${puzzleType}`);
      this._showMessage(`Unknown puzzle type: ${puzzleType}`, "error");
    }
  }

  _handleSubmit() {
    if (!this.activePuzzle) return;

    try {
      const solution = this.activePuzzle.getSolution?.() || true;
      const isValid = this.activePuzzle.validateSolution?.(solution) ?? true;

      if (isValid) {
        this.isCompleted = true;
        this._clearCountdown();
        this._disableSubmit();

        // Get puzzle info before submitting
        const puzzleInfo = this.getPuzzleInfo();
        console.log("Submitting solution with puzzle info:", puzzleInfo);

        if (this.submitSolution) {
          this.submitSolution({
            success: true,
            solution: solution,
            time_remaining: this.countdownValue,
            puzzle_info: puzzleInfo,
          });
        }

        this.showSuccess();
      } else {
        const errorMessage =
          this.activePuzzle.getErrorMessage?.() ||
          "Invalid solution. Try again.";
        this._showMessage(errorMessage, "error");
        this._reduceTime(5);
      }
    } catch (error) {
      console.error("Error submitting solution:", error);
      this._showMessage(`Error: ${error.message}`, "error");
    }
  }

  _startCountdown(timeUpCallback) {
    this._clearCountdown();

    this.timer = setInterval(() => {
      this.countdownValue--;
      this.updateCountdownDisplay();

      if (this.countdownValue <= 0) {
        this._clearCountdown();

        if (timeUpCallback) {
          timeUpCallback();
        } else {
          this._showMessage("Time's up! Puzzle failed.", "error");
          this._disableSubmit();

          if (this.submitSolution) {
            this.submitSolution({
              success: false,
              reason: "time_expired",
            });
          }
        }
      }
    }, 1000);
  }

  _clearCountdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateCountdownDisplay() {
    if (!this.countdownElement) return;

    this.countdownElement.textContent = `${Math.max(0, this.countdownValue)}s`;
    this.countdownElement.classList.remove(
      "bg-green-600",
      "bg-yellow-600",
      "bg-red-600",
      "bg-gray-900"
    );

    if (this.countdownValue > 30) {
      this.countdownElement.classList.add("bg-green-600");
    } else if (this.countdownValue > 10) {
      this.countdownElement.classList.add("bg-yellow-600");
    } else {
      this.countdownElement.classList.add("bg-red-600");
    }
  }

  _reduceTime(seconds) {
    this.countdownValue = Math.max(1, this.countdownValue - seconds);
    this.updateCountdownDisplay();
  }

  _getCountdownTime() {
    const difficulty = this.currentStage || 1;
    const baseTime = Math.max(30, 90 - (difficulty - 1) * 10);
    const puzzleType = this.puzzleData.type;

    const timeAdjustments = {
      time_bomb: -10,
      demo_puzzle_2: -10,
      audio_sequence: 15,
      safe_cracker_puzzle_4: 15,
    };

    return baseTime + (timeAdjustments[puzzleType] || 0);
  }

  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    const typeStyles = {
      success: ["bg-green-700", "text-white"],
      error: ["bg-red-700", "text-white", "animate-pulse"],
      warning: ["bg-yellow-700", "text-white"],
      info: ["bg-gray-700", "text-white"],
    };

    this.messageElement.className = "p-4 text-center";
    this.messageElement.classList.add(...(typeStyles[type] || typeStyles.info));
    this.messageElement.textContent = message;

    if (type === "error") {
      setTimeout(() => {
        this.messageElement.classList.remove("animate-pulse");
      }, 2000);
    }
  }

  _disableSubmit() {
    if (!this.submitButton) return;

    this.submitButton.disabled = true;
    this.submitButton.classList.add("opacity-50", "cursor-not-allowed");
    this.submitButton.classList.remove("hover:bg-blue-700");
  }

  _enableSubmit() {
    if (!this.submitButton) return;

    this.submitButton.disabled = false;
    this.submitButton.classList.remove("opacity-50", "cursor-not-allowed");
    this.submitButton.classList.add("hover:bg-blue-700");
  }

  showSuccess(shouldAutoAdvance, onSuccessCallback) {
    this._clearCountdown();
    this._disableSubmit();
    this._showMessage("Puzzle completed successfully!", "success");
    this.isCompleted = true;

    const willAutoAdvance =
      shouldAutoAdvance !== undefined ? shouldAutoAdvance : this.autoAdvance;

    // Log for debugging
    console.log(
      `showSuccess called with shouldAutoAdvance=${shouldAutoAdvance}, willAutoAdvance=${willAutoAdvance}`
    );

    if (this.activePuzzle?.showSuccess) {
      // If the puzzle has its own success animation, show it
      this.activePuzzle.showSuccess();
      // Still need to trigger the callback after the puzzle's own animation
      setTimeout(() => {
        if (typeof onSuccessCallback === "function") {
          console.log(
            "Executing callback after puzzle's own success animation"
          );
          onSuccessCallback(this.getPuzzleInfo());
        }
      }, 3000);
    } else {
      // Use default animation with callback
      this._showDefaultSuccessAnimation(willAutoAdvance, onSuccessCallback);
    }
  }

  _showDefaultSuccessAnimation(willAutoAdvance, onSuccessCallback) {
    const successOverlay = document.createElement("div");
    successOverlay.className =
      "absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center z-10";

    const successIcon = document.createElement("div");
    successIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;
    successOverlay.appendChild(successIcon);

    if (willAutoAdvance && this.currentStage < 5) {
      const advanceMessage = document.createElement("div");
      advanceMessage.className =
        "absolute bottom-4 text-center text-white bg-black bg-opacity-50 px-4 py-2 rounded";
      advanceMessage.textContent = "Advancing to next puzzle...";
      successOverlay.appendChild(advanceMessage);
    }

    if (this.gameArea) {
      if (getComputedStyle(this.gameArea).position === "static") {
        this.gameArea.style.position = "relative";
      }

      this.gameArea.appendChild(successOverlay);
      this._playSuccessSound();

      setTimeout(() => {
        successOverlay.remove();
        if (typeof onSuccessCallback === "function") {
          onSuccessCallback(this.getPuzzleInfo());
        }
      }, 3000);
    } else if (typeof onSuccessCallback === "function") {
      setTimeout(() => {
        onSuccessCallback(this.getPuzzleInfo());
      }, 3000);
    }
  }

  _playSuccessSound() {
    try {
      const successSound = new Audio("../static/sounds/puzzle-complete.mp3");
      successSound.volume = 0.3;
      successSound
        .play()
        .catch((e) => console.warn("Could not play sound:", e));
    } catch (e) {
      console.warn("Could not play success sound:", e);
    }
  }

  handleRandomEvent(eventType, duration) {
    if (this.activePuzzle?.handleRandomEvent) {
      this.activePuzzle.handleRandomEvent(eventType, duration);
      return;
    }

    const eventActions = {
      security_patrol: () => {
        this._showMessage(
          "Security patrol in progress! Puzzle difficulty increased.",
          "warning"
        );
        this._reduceTime(5);
      },
      camera_sweep: () => {
        this._showMessage(
          "Security cameras scanning the area! Work carefully.",
          "warning"
        );
      },
      system_check: () => {
        this._showMessage(
          "System security scan in progress! Be extra careful.",
          "warning"
        );
      },
    };

    eventActions[eventType]?.();
    this._showRandomEventEffect(eventType, duration);
  }

  _showRandomEventEffect(eventType, duration) {
    if (!this.gameArea) return;

    const eventOverlay = document.createElement("div");
    eventOverlay.className =
      "absolute inset-0 flex items-center justify-center z-10 pointer-events-none";

    const eventStyles = {
      security_patrol: () => {
        eventOverlay.classList.add(
          "bg-red-900",
          "bg-opacity-20",
          "animate-pulse"
        );
      },
      camera_sweep: () => {
        eventOverlay.classList.add("bg-blue-900", "bg-opacity-20");
        const scanner = document.createElement("div");
        scanner.className =
          "absolute h-full w-1/6 bg-blue-400 bg-opacity-10 transform -skew-x-12";
        scanner.style.animation = `scannerSweep ${duration}s linear infinite`;
        eventOverlay.appendChild(scanner);

        this._ensureKeyframesExist(
          "scanner-keyframes",
          `
          @keyframes scannerSweep {
            0% { left: -10%; }
            100% { left: 100%; }
          }
        `
        );
      },
      system_check: () => {
        eventOverlay.classList.add("bg-yellow-900", "bg-opacity-20");
        eventOverlay.style.animation =
          "flicker 0.5s ease-in-out infinite alternate";

        this._ensureKeyframesExist(
          "flicker-keyframes",
          `
          @keyframes flicker {
            0% { opacity: 0.2; }
            100% { opacity: 0.6; }
          }
        `
        );
      },
    };

    eventStyles[eventType]?.();

    if (getComputedStyle(this.gameArea).position === "static") {
      this.gameArea.style.position = "relative";
    }

    this.gameArea.appendChild(eventOverlay);

    setTimeout(() => {
      eventOverlay.remove();
    }, duration * 1000);
  }

  _ensureKeyframesExist(id, styleText) {
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = styleText;
      document.head.appendChild(style);
    }
  }

  _getPuzzleTitle() {
    const puzzleType = this.puzzleData.type;

    const titles = {
      // Hacker puzzles
      circuit: "Circuit Connectivity",
      password_crack: "Password Cracking",
      firewall_bypass: "Firewall Bypass",
      encryption_key: "Encryption Key Recovery",
      system_override: "System Override",

      // Safe Cracker puzzles
      lock_combination: "Vault Combination",
      pattern_recognition: "Security Pattern",
      multi_lock: "Multi-Layer Lock",
      audio_sequence: "Audio Tumbler",
      timed_lock: "Timed Security System",

      // Demolitions puzzles
      wire_cutting: "Security Bypass",
      time_bomb: "Time Bomb Disarm",
      circuit_board: "Circuit Board Repair",
      explosive_sequence: "Explosive Sequence",
      final_detonation: "Final Detonation",

      // Lookout puzzles
      surveillance: "Surveillance Evasion",
      patrol_pattern: "Patrol Pattern Analysis",
      security_system: "Security System Bypass",
      alarm: "Alarm System Control",
      escape_route: "Escape Route Planning",

      // Legacy mappings
      hacker_puzzle_1: "Circuit Connectivity",
      hacker_puzzle_2: "Password Cracking",
      hacker_puzzle_3: "Firewall Bypass",
      hacker_puzzle_4: "Encryption Key Recovery",
      hacker_puzzle_5: "System Override",

      safe_cracker_puzzle_1: "Vault Combination",
      safe_cracker_puzzle_2: "Security Pattern",
      safe_cracker_puzzle_3: "Multi-Layer Lock",
      safe_cracker_puzzle_4: "Audio Tumbler",
      safe_cracker_puzzle_5: "Timed Security System",

      demo_puzzle_1: "Security Bypass",
      demo_puzzle_2: "Time Bomb Disarm",
      demo_puzzle_3: "Circuit Board Repair",
      demo_puzzle_4: "Explosive Sequence",
      demo_puzzle_5: "Final Detonation",

      lookout_puzzle_1: "Surveillance Evasion",
      lookout_puzzle_2: "Patrol Pattern Analysis",
      lookout_puzzle_3: "Security System Bypass",
      lookout_puzzle_4: "Alarm System Control",
      lookout_puzzle_5: "Escape Route Planning",
    };

    return titles[puzzleType] || `Stage ${this.currentStage} Challenge`;
  }

  cleanup() {
    this._clearCountdown();

    if (this.activePuzzle?.cleanup) {
      this.activePuzzle.cleanup();
    }

    if (this.submitButton) {
      const newButton = this.submitButton.cloneNode(true);
      this.submitButton.parentNode.replaceChild(newButton, this.submitButton);
      this.submitButton = newButton;
    }

    this.activePuzzle = null;
    this.countdownElement = null;
    this.messageElement = null;
    this.submitButton = null;
    this.gameArea = null;
  }

  getPuzzleInfo() {
    return {
      type: this.puzzleData.type,
      difficulty: this.currentStage,
      isCompleted: this.isCompleted,
      timeRemaining: this.countdownValue,
      autoAdvance: this.autoAdvance,
    };
  }
}

export default UniversalPuzzleController;
