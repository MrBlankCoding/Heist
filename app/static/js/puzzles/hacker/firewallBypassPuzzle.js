// firewallBypassPuzzle.js - Stage 3 Hacker puzzle - Firewall bypass challenge

class FirewallBypassPuzzle {
  constructor(containerElement, puzzleData) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.gridSize = 6; // Default
    this.grid = [];
    this.vulnerabilities = [];
    this.exploitedVulnerabilities = [];
    this.timeElapsed = 0;
    this.timer = null;
    this.firewallScanActive = false;
    this.scanSpeed = 1500; // ms per scan cycle
    this.isActive = true;

    // DOM elements
    this.firewallElement = null;
    this.gridElement = null;
    this.scanElement = null;
    this.timerElement = null;
    this.statusElement = null;
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Get puzzle data
    const { grid_size, vulnerability_count, scan_speed } = this.puzzleData.data;
    this.gridSize = grid_size || 6;
    this.scanSpeed = scan_speed || 1500;

    // Create firewall grid
    this._initializeGrid();

    // Generate vulnerabilities
    this._generateVulnerabilities(vulnerability_count || 5);

    // Create firewall UI
    this._createFirewallUI();

    // Start firewall scan
    this._startFirewallScan();

    // Start timer
    this._startTimer();
  }

  /**
   * Initialize the grid with security nodes
   */
  _initializeGrid() {
    this.grid = [];

    // Create empty grid
    for (let i = 0; i < this.gridSize; i++) {
      const row = [];
      for (let j = 0; j < this.gridSize; j++) {
        // Each cell contains security level (1-5) and status (0=normal, 1=vulnerable, 2=exploited)
        row.push({
          securityLevel: Math.floor(Math.random() * 5) + 1, // 1-5
          status: 0, // 0=normal
          x: j,
          y: i,
        });
      }
      this.grid.push(row);
    }
  }

  /**
   * Generate random vulnerabilities on the grid
   * @param {number} count - Number of vulnerabilities to generate
   */
  _generateVulnerabilities(count) {
    this.vulnerabilities = [];

    // Always make sure we have at least 1 vulnerability
    count = Math.max(1, count);

    // Generate random positions for vulnerabilities
    for (let i = 0; i < count; i++) {
      let x, y;

      // Make sure we don't place vulnerabilities on the same spot
      do {
        x = Math.floor(Math.random() * this.gridSize);
        y = Math.floor(Math.random() * this.gridSize);
      } while (this.vulnerabilities.some((v) => v.x === x && v.y === y));

      // Add vulnerability
      this.vulnerabilities.push({ x, y, exploited: false });

      // Mark cell as vulnerable
      this.grid[y][x].status = 1;
    }
  }

  /**
   * Create the firewall UI
   */
  _createFirewallUI() {
    // Create main container
    this.firewallElement = document.createElement("div");
    this.firewallElement.className =
      "bg-gray-900 border-2 border-blue-500 rounded-lg p-4 relative w-full max-w-2xl";

    // Add header with status
    const header = document.createElement("div");
    header.className =
      "flex justify-between items-center border-b border-blue-500 pb-2 mb-4";

    const title = document.createElement("div");
    title.className = "text-blue-400 font-bold";
    title.textContent = "NETWORK FIREWALL SECURITY";

    this.statusElement = document.createElement("div");
    this.statusElement.className = "flex items-center";

    const statusDot = document.createElement("div");
    statusDot.className = "w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse";

    const statusText = document.createElement("span");
    statusText.className = "text-xs text-red-400";
    statusText.textContent = "PROTECTED";

    this.statusElement.appendChild(statusDot);
    this.statusElement.appendChild(statusText);

    header.appendChild(title);
    header.appendChild(this.statusElement);

    this.firewallElement.appendChild(header);

    // Add timer and vulnerability counter
    const infoBar = document.createElement("div");
    infoBar.className = "flex justify-between items-center mb-4 text-sm";

    this.timerElement = document.createElement("div");
    this.timerElement.className = "text-gray-300";
    this.timerElement.textContent = "Time: 00:00";

    const vulnCounter = document.createElement("div");
    vulnCounter.className = "text-gray-300";
    vulnCounter.textContent = `Vulnerabilities: 0 / ${this.vulnerabilities.length}`;

    infoBar.appendChild(this.timerElement);
    infoBar.appendChild(vulnCounter);

    this.firewallElement.appendChild(infoBar);

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className = "text-yellow-400 text-sm mb-4";
    instructions.textContent =
      "Identify and exploit firewall vulnerabilities when scan is not active in that area.";

    this.firewallElement.appendChild(instructions);

    // Create grid container
    this.gridElement = document.createElement("div");
    this.gridElement.className = "grid gap-1 relative";
    this.gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, minmax(0, 1fr))`;

    // Add cells to grid
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this._createGridCell(x, y);
        this.gridElement.appendChild(cell);
      }
    }

    // Add scan line
    this.scanElement = document.createElement("div");
    this.scanElement.className =
      "absolute top-0 left-0 w-full bg-blue-500 opacity-30 z-10 pointer-events-none";
    this.scanElement.style.height = "40px";
    this.scanElement.style.transform = "translateY(-100%)";

    this.gridElement.appendChild(this.scanElement);

    this.firewallElement.appendChild(this.gridElement);

    // Append to container
    this.containerElement.appendChild(this.firewallElement);

    // Update vulnerability counter
    this._updateVulnerabilityCounter();
  }

  /**
   * Create a grid cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {HTMLElement} - Cell element
   */
  _createGridCell(x, y) {
    const cell = document.createElement("div");
    const cellData = this.grid[y][x];

    // Set base classes
    cell.className =
      "flex items-center justify-center w-12 h-12 rounded relative cursor-pointer overflow-hidden transition-all duration-200";
    cell.dataset.x = x;
    cell.dataset.y = y;

    // Set security level color
    const securityLevel = cellData.securityLevel;
    const colors = [
      "bg-green-700", // Level 1 (lowest)
      "bg-green-600",
      "bg-yellow-600",
      "bg-orange-600",
      "bg-red-700", // Level 5 (highest)
    ];

    cell.classList.add(colors[securityLevel - 1]);

    // Create content
    const content = document.createElement("div");
    content.className = "text-xs text-white font-bold";
    content.textContent = securityLevel.toString();

    cell.appendChild(content);

    // Add vulnerability indicator (only visible when scanned)
    if (cellData.status === 1) {
      const vulnIndicator = document.createElement("div");
      vulnIndicator.className =
        "absolute inset-0 bg-yellow-500 opacity-0 transition-opacity duration-300 flex items-center justify-center";
      vulnIndicator.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
      vulnIndicator.dataset.type = "vulnerability";

      cell.appendChild(vulnIndicator);
    }

    // Add click handler
    cell.addEventListener("click", () => this._handleCellClick(x, y));

    return cell;
  }

  /**
   * Handle click on a grid cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  _handleCellClick(x, y) {
    if (!this.isActive) return;

    const cellData = this.grid[y][x];
    const isVulnerable = cellData.status === 1;
    const isExploited = cellData.status === 2;

    // Check if there's an active scan at this row
    const scanPosition =
      (parseInt(
        this.scanElement.style.transform
          .replace("translateY(", "")
          .replace("%)", "")
      ) /
        100) *
      this.gridSize;
    const isScanActive = scanPosition >= y && scanPosition < y + 1;

    if (isScanActive) {
      // Show warning message if trying to exploit during scan
      this._showFeedback("Cannot exploit during active scan!", "warning");
      return;
    }

    if (isVulnerable && !isExploited) {
      // Exploit vulnerability
      cellData.status = 2;

      // Update UI
      const cell = this.gridElement.querySelector(
        `[data-x="${x}"][data-y="${y}"]`
      );
      if (cell) {
        cell.classList.add("bg-green-900", "border", "border-green-400");

        const vulnIndicator = cell.querySelector('[data-type="vulnerability"]');
        if (vulnIndicator) {
          vulnIndicator.className =
            "absolute inset-0 bg-green-500 opacity-70 transition-opacity duration-300 flex items-center justify-center";
          vulnIndicator.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
        }
      }

      // Update vulnerability status
      const vulnIndex = this.vulnerabilities.findIndex(
        (v) => v.x === x && v.y === y
      );
      if (vulnIndex !== -1) {
        this.vulnerabilities[vulnIndex].exploited = true;
        this.exploitedVulnerabilities.push({ x, y });
      }

      // Show success message
      this._showFeedback("Vulnerability exploited!", "success");

      // Update vulnerability counter
      this._updateVulnerabilityCounter();

      // Check if all vulnerabilities are exploited
      if (
        this.exploitedVulnerabilities.length === this.vulnerabilities.length
      ) {
        this._puzzleComplete();
      }
    } else if (isExploited) {
      // Already exploited
      this._showFeedback("Vulnerability already exploited.", "info");
    } else {
      // Not a vulnerability
      this._showFeedback("No vulnerability detected at this node.", "error");

      // Penalty: Speed up scan temporarily
      this._temporarilyIncreaseScanSpeed();
    }
  }

  /**
   * Start the firewall scan animation
   */
  _startFirewallScan() {
    this.firewallScanActive = true;
    let scanPosition = 0;
    const cellHeight = 48; // 12rem (h-12) = 48px

    const runScan = () => {
      if (!this.isActive) return;

      // Update scan line position
      scanPosition = (scanPosition + 1) % (this.gridSize + 1);
      this.scanElement.style.transform = `translateY(${
        (scanPosition - 1) * 100
      }%)`;
      this.scanElement.style.height = `${cellHeight}px`;

      // Highlight vulnerabilities in the current scan row
      this._highlightVulnerabilitiesInScanRow(scanPosition - 1);

      // Schedule next scan
      setTimeout(runScan, this.scanSpeed);
    };

    // Start scan
    runScan();
  }

  /**
   * Highlight vulnerabilities in the current scan row
   * @param {number} rowIndex - Current scan row index
   */
  _highlightVulnerabilitiesInScanRow(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.gridSize) return;

    for (let x = 0; x < this.gridSize; x++) {
      const cell = this.gridElement.querySelector(
        `[data-x="${x}"][data-y="${rowIndex}"]`
      );

      if (cell) {
        const vulnIndicator = cell.querySelector('[data-type="vulnerability"]');

        if (vulnIndicator) {
          // Show vulnerability indicator during scan
          vulnIndicator.style.opacity = "1";

          // Hide it after the scan passes
          setTimeout(() => {
            if (this.grid[rowIndex][x].status !== 2) {
              // Don't hide if already exploited
              vulnIndicator.style.opacity = "0";
            }
          }, this.scanSpeed);
        }
      }
    }
  }

  /**
   * Start the timer
   */
  _startTimer() {
    this.timer = setInterval(() => {
      if (!this.isActive) return;

      this.timeElapsed++;
      this._updateTimerDisplay();
    }, 1000);
  }

  /**
   * Update the timer display
   */
  _updateTimerDisplay() {
    const minutes = Math.floor(this.timeElapsed / 60);
    const seconds = this.timeElapsed % 60;

    this.timerElement.textContent = `Time: ${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * Update vulnerability counter
   */
  _updateVulnerabilityCounter() {
    const counter = this.firewallElement.querySelector(
      "div.text-gray-300:nth-child(2)"
    );
    if (counter) {
      counter.textContent = `Vulnerabilities: ${this.exploitedVulnerabilities.length} / ${this.vulnerabilities.length}`;

      // Update color based on progress
      if (this.exploitedVulnerabilities.length === 0) {
        counter.className = "text-gray-300";
      } else if (
        this.exploitedVulnerabilities.length < this.vulnerabilities.length
      ) {
        counter.className = "text-yellow-300";
      } else {
        counter.className = "text-green-300";
      }
    }
  }

  /**
   * Show feedback message
   * @param {string} message - Message to show
   * @param {string} type - Type of message (success, error, warning, info)
   */
  _showFeedback(message, type) {
    // Check if feedback element already exists
    let feedbackElement =
      this.firewallElement.querySelector(".feedback-message");

    if (!feedbackElement) {
      // Create feedback element
      feedbackElement = document.createElement("div");
      feedbackElement.className =
        "feedback-message absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded text-center text-sm z-20";
      this.firewallElement.appendChild(feedbackElement);
    }

    // Set message
    feedbackElement.textContent = message;

    // Set type
    feedbackElement.className =
      "feedback-message absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded text-center text-sm z-20";

    switch (type) {
      case "success":
        feedbackElement.classList.add("bg-green-900", "text-green-300");
        break;
      case "error":
        feedbackElement.classList.add("bg-red-900", "text-red-300");
        break;
      case "warning":
        feedbackElement.classList.add("bg-yellow-900", "text-yellow-300");
        break;
      case "info":
        feedbackElement.classList.add("bg-blue-900", "text-blue-300");
        break;
      default:
        feedbackElement.classList.add("bg-gray-900", "text-gray-300");
    }

    // Show feedback
    feedbackElement.style.opacity = "1";

    // Hide after delay
    setTimeout(() => {
      feedbackElement.style.opacity = "0";

      // Remove element after fade
      setTimeout(() => {
        if (feedbackElement.parentNode) {
          feedbackElement.parentNode.removeChild(feedbackElement);
        }
      }, 300);
    }, 2000);
  }

  /**
   * Temporarily increase scan speed as a penalty
   */
  _temporarilyIncreaseScanSpeed() {
    const originalSpeed = this.scanSpeed;
    this.scanSpeed = this.scanSpeed / 2;

    // Restore original speed after a few seconds
    setTimeout(() => {
      this.scanSpeed = originalSpeed;
    }, 5000);
  }

  /**
   * Handle puzzle completion
   */
  _puzzleComplete() {
    // Stop timer
    clearInterval(this.timer);
    this.isActive = false;

    // Update status
    const statusDot = this.statusElement.querySelector(".rounded-full");
    const statusText = this.statusElement.querySelector("span");

    if (statusDot)
      statusDot.className = "w-2 h-2 rounded-full bg-green-500 mr-2";
    if (statusText) {
      statusText.className = "text-xs text-green-400";
      statusText.textContent = "BYPASSED";
    }

    // Show completion message
    this._showFeedback("Firewall successfully bypassed!", "success");
  }

  /**
   * Get the current solution
   * @returns {Array} - Array of exploited vulnerability coordinates
   */
  getSolution() {
    return this.exploitedVulnerabilities;
  }

  /**
   * Validate the solution
   * @returns {boolean} - Whether all vulnerabilities are exploited
   */
  validateSolution() {
    return this.exploitedVulnerabilities.length === this.vulnerabilities.length;
  }

  /**
   * Get error message
   * @returns {string} - Error message
   */
  getErrorMessage() {
    const remaining =
      this.vulnerabilities.length - this.exploitedVulnerabilities.length;
    return `You still need to exploit ${remaining} more vulnerabilit${
      remaining === 1 ? "y" : "ies"
    }.`;
  }

  /**
   * Disable the puzzle
   */
  disable() {
    this.isActive = false;
    if (this.firewallElement) {
      this.firewallElement.classList.add("opacity-50", "pointer-events-none");
    }
  }

  /**
   * Enable the puzzle
   */
  enable() {
    this.isActive = true;
    if (this.firewallElement) {
      this.firewallElement.classList.remove(
        "opacity-50",
        "pointer-events-none"
      );
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop timers
    clearInterval(this.timer);
    this.isActive = false;
  }
}

export default FirewallBypassPuzzle;
