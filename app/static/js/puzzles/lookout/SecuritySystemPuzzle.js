// SecuritySystemPuzzle.js - Security System Bypass Puzzle for the Lookout role
// Difficulty: 3/5 - Medium-hard difficulty

class SecuritySystemPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;
    this.isComplete = false;

    // Security system properties
    this.securityNodes = [];
    this.connections = [];
    this.numNodes = 8; // Number of security nodes
    this.activeNodeId = null; // Currently selected node

    // Timer for blinking and system rotations
    this.blinkingTimer = null;
    this.blinkingSpeed = 800; // ms

    // Rotating security system
    this.rotationTimer = null;
    this.rotationSpeed = 5000; // ms - rotate every 5 seconds
    this.rotationDirection = 1; // 1 for clockwise, -1 for counter-clockwise

    // Vulnerability window
    this.vulnerabilityActive = false;
    this.vulnerabilityTimer = null;
    this.vulnerabilityWindow = 8000; // 8 seconds vulnerability window

    // UI elements
    this.canvasElement = null;
    this.messageElement = null;
    this.statusElement = null;

    // Canvas properties
    this.canvasWidth = 500;
    this.canvasHeight = 500;
    this.centerX = this.canvasWidth / 2;
    this.centerY = this.canvasHeight / 2;
    this.radius = 180; // Radius of the circle of nodes

    // Solution tracking
    this.disabledNodes = 0;
    this.requiredDisabledNodes = 5; // Need to disable 5 nodes to complete

    // Difficulty adjustments
    this.difficulty = this.puzzleData.difficulty || 3;
    this._adjustForDifficulty();
  }

  /**
   * Adjust parameters based on difficulty
   */
  _adjustForDifficulty() {
    // Adjust number of nodes
    this.numNodes = 6 + this.difficulty; // 9 nodes for difficulty 3

    // Adjust required nodes to disable
    this.requiredDisabledNodes = 4 + Math.floor(this.difficulty / 2); // 5 for difficulty 3

    // Adjust rotation speed (faster at higher difficulties)
    this.rotationSpeed = Math.max(3000, 6000 - this.difficulty * 500);

    // Adjust vulnerability window (shorter at higher difficulties)
    this.vulnerabilityWindow = Math.max(4000, 10000 - this.difficulty * 1000);
  }

  /**
   * Initialize the puzzle
   */
  initialize() {
    // Create UI elements
    this._createUI();

    // Initialize nodes
    this._initializeNodes();

    // Initialize connections
    this._initializeConnections();

    // Start animation timers
    this._startBlinking();
    this._startRotation();

    // Start periodic vulnerability window
    this._scheduleVulnerabilityWindow();

    // Render initial state
    this._render();

    // Display instructions
    this._showMessage("Identify vulnerable nodes during system shifts.");
  }

  /**
   * Create the UI elements for the puzzle
   */
  _createUI() {
    const puzzleContainer = document.createElement("div");
    puzzleContainer.className =
      "security-system-puzzle flex flex-col items-center justify-center h-full";

    // Header with status
    this.statusElement = document.createElement("div");
    this.statusElement.className = "mb-4 text-white font-medium text-center";
    this.statusElement.textContent = `Security Nodes Disabled: 0/${this.requiredDisabledNodes}`;
    puzzleContainer.appendChild(this.statusElement);

    // Instructions
    const instructions = document.createElement("div");
    instructions.className = "mb-4 text-center text-gray-300";
    instructions.innerHTML = `
      <p class="mb-2">Disable the security nodes during vulnerability windows.</p>
      <p class="text-sm">
        <span class="bg-blue-500 text-white px-2 py-1 rounded">Active</span>
        <span class="ml-2 bg-red-500 text-white px-2 py-1 rounded">Disabled</span>
        <span class="ml-2 bg-green-500 text-white px-2 py-1 rounded">Vulnerable</span>
      </p>
    `;
    puzzleContainer.appendChild(instructions);

    // Canvas for security system visualization
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.width = this.canvasWidth;
    this.canvasElement.height = this.canvasHeight;
    this.canvasElement.className = "bg-gray-900 rounded-lg";
    this.canvasElement.addEventListener(
      "click",
      this._handleCanvasClick.bind(this)
    );
    puzzleContainer.appendChild(this.canvasElement);

    // Message element
    this.messageElement = document.createElement("div");
    this.messageElement.className =
      "mt-4 text-center h-8 text-white font-medium";
    puzzleContainer.appendChild(this.messageElement);

    this.containerElement.appendChild(puzzleContainer);
  }

  /**
   * Initialize security system nodes
   */
  _initializeNodes() {
    this.securityNodes = [];

    for (let i = 0; i < this.numNodes; i++) {
      // Calculate position on a circle
      const angle = (i / this.numNodes) * 2 * Math.PI;
      const x = this.centerX + this.radius * Math.cos(angle);
      const y = this.centerY + this.radius * Math.sin(angle);

      this.securityNodes.push({
        id: i,
        x,
        y,
        angle,
        status: "active", // active, vulnerable, disabled
        blinking: false,
        size: 25,
        connections: [],
      });
    }

    // Add a central node
    this.securityNodes.push({
      id: this.numNodes,
      x: this.centerX,
      y: this.centerY,
      angle: 0,
      status: "protected", // This one cannot be disabled
      blinking: false,
      size: 35,
      connections: [],
    });
  }

  /**
   * Initialize connections between nodes
   */
  _initializeConnections() {
    this.connections = [];

    // Connect each outer node to the center
    const centerNodeId = this.numNodes;

    for (let i = 0; i < this.numNodes; i++) {
      this.connections.push({
        sourceId: i,
        targetId: centerNodeId,
        active: true,
      });

      // Add to node's connection list
      this.securityNodes[i].connections.push(centerNodeId);
      this.securityNodes[centerNodeId].connections.push(i);
    }

    // Connect some nodes to each other
    for (let i = 0; i < this.numNodes; i++) {
      // Connect to next node (circular)
      const nextNode = (i + 1) % this.numNodes;

      this.connections.push({
        sourceId: i,
        targetId: nextNode,
        active: true,
      });

      // Add to node's connection list
      this.securityNodes[i].connections.push(nextNode);
      this.securityNodes[nextNode].connections.push(i);

      // Connect to a random node
      const randomNode =
        (i + 2 + Math.floor(Math.random() * (this.numNodes - 4))) %
        this.numNodes;

      // Avoid duplicate connections
      if (!this.securityNodes[i].connections.includes(randomNode)) {
        this.connections.push({
          sourceId: i,
          targetId: randomNode,
          active: true,
        });

        // Add to node's connection list
        this.securityNodes[i].connections.push(randomNode);
        this.securityNodes[randomNode].connections.push(i);
      }
    }
  }

  /**
   * Start blinking animation for nodes
   */
  _startBlinking() {
    this._stopBlinking();

    this.blinkingTimer = setInterval(() => {
      for (const node of this.securityNodes) {
        if (node.status === "active" || node.status === "vulnerable") {
          node.blinking = !node.blinking;
        }
      }

      this._render();
    }, this.blinkingSpeed);
  }

  /**
   * Stop blinking animation
   */
  _stopBlinking() {
    if (this.blinkingTimer) {
      clearInterval(this.blinkingTimer);
      this.blinkingTimer = null;
    }
  }

  /**
   * Start rotation animation
   */
  _startRotation() {
    this._stopRotation();

    this.rotationTimer = setInterval(() => {
      this._rotateSecuritySystem();
    }, this.rotationSpeed);
  }

  /**
   * Stop rotation animation
   */
  _stopRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  /**
   * Rotate the security system
   */
  _rotateSecuritySystem() {
    // Randomly switch direction sometimes
    if (Math.random() < 0.3) {
      this.rotationDirection *= -1;
    }

    // Calculate rotation angle
    const rotationAngle =
      (Math.PI / (this.numNodes / 2)) * this.rotationDirection;

    // Rotate each node (except center)
    for (let i = 0; i < this.numNodes; i++) {
      const node = this.securityNodes[i];

      // Skip disabled nodes
      if (node.status === "disabled") continue;

      // Calculate new angle
      node.angle += rotationAngle;

      // Calculate new position
      node.x = this.centerX + this.radius * Math.cos(node.angle);
      node.y = this.centerY + this.radius * Math.sin(node.angle);
    }

    // Show rotation message
    this._showMessage("Security system shifting...");

    // Render the updated system
    this._render();
  }

  /**
   * Schedule a vulnerability window
   */
  _scheduleVulnerabilityWindow() {
    // Clear any existing timer
    if (this.vulnerabilityTimer) {
      clearTimeout(this.vulnerabilityTimer);
      this.vulnerabilityTimer = null;
    }

    // Schedule next vulnerability
    const nextVulnerabilityTime = 10000 + Math.random() * 5000; // 10-15 seconds

    setTimeout(() => {
      this._openVulnerabilityWindow();
    }, nextVulnerabilityTime);
  }

  /**
   * Open a vulnerability window
   */
  _openVulnerabilityWindow() {
    // Only if not already in a vulnerability window
    if (this.vulnerabilityActive) return;

    this.vulnerabilityActive = true;

    // Select random nodes to be vulnerable (2-3 nodes)
    const numVulnerable = 2 + Math.floor(Math.random() * 2);
    const availableNodes = this.securityNodes
      .filter((node) => node.status === "active")
      .map((node) => node.id);

    // Shuffle and select first few
    availableNodes.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numVulnerable, availableNodes.length); i++) {
      const nodeId = availableNodes[i];
      this.securityNodes[nodeId].status = "vulnerable";
    }

    // Show message
    this._showMessage("Vulnerability detected! Disable nodes now!", "warning");

    // Change background color to indicate vulnerability
    this.canvasElement.classList.add("bg-gray-800");
    this.canvasElement.classList.remove("bg-gray-900");

    // Set timer to close vulnerability window
    this.vulnerabilityTimer = setTimeout(() => {
      this._closeVulnerabilityWindow();
    }, this.vulnerabilityWindow);

    // Render the updated system
    this._render();
  }

  /**
   * Close the vulnerability window
   */
  _closeVulnerabilityWindow() {
    this.vulnerabilityActive = false;

    // Reset vulnerable nodes to active
    for (const node of this.securityNodes) {
      if (node.status === "vulnerable") {
        node.status = "active";
      }
    }

    // Show message
    this._showMessage("Security restored. Wait for next vulnerability.");

    // Reset background color
    this.canvasElement.classList.remove("bg-gray-800");
    this.canvasElement.classList.add("bg-gray-900");

    // Schedule next vulnerability window
    this._scheduleVulnerabilityWindow();

    // Render the updated system
    this._render();
  }

  /**
   * Handle canvas click
   * @param {MouseEvent} event - Mouse event
   */
  _handleCanvasClick(event) {
    if (this.isComplete) return;

    // Get click coordinates relative to canvas
    const rect = this.canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if a node was clicked
    const clickedNode = this._getNodeAtPosition(x, y);

    if (clickedNode) {
      this._handleNodeClick(clickedNode);
    }
  }

  /**
   * Get node at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} - Node at position or null
   */
  _getNodeAtPosition(x, y) {
    for (const node of this.securityNodes) {
      const distance = Math.sqrt(
        Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
      );

      if (distance <= node.size) {
        return node;
      }
    }

    return null;
  }

  /**
   * Handle node click
   * @param {Object} node - Clicked node
   */
  _handleNodeClick(node) {
    // Cannot click disabled nodes
    if (node.status === "disabled") {
      this._showMessage("Node already disabled.", "info");
      return;
    }

    // Cannot click protected nodes
    if (node.status === "protected") {
      this._showMessage(
        "This node is protected and cannot be disabled.",
        "error"
      );
      return;
    }

    // Can only disable vulnerable nodes
    if (node.status !== "vulnerable") {
      this._showMessage(
        "Node not vulnerable. Wait for vulnerability window.",
        "error"
      );
      return;
    }

    // Disable the node
    node.status = "disabled";
    node.blinking = false;
    this.disabledNodes++;

    // Update status display
    this._updateStatus();

    // Show message
    this._showMessage("Node disabled successfully!", "success");

    // Check if puzzle is complete
    if (this.disabledNodes >= this.requiredDisabledNodes) {
      this._handleSuccess();
    }

    // Render the updated system
    this._render();
  }

  /**
   * Update status display
   */
  _updateStatus() {
    if (this.statusElement) {
      this.statusElement.textContent = `Security Nodes Disabled: ${this.disabledNodes}/${this.requiredDisabledNodes}`;
    }
  }

  /**
   * Render the security system
   */
  _render() {
    const ctx = this.canvasElement.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw system background
    this._drawSystemBackground(ctx);

    // Draw connections
    this._drawConnections(ctx);

    // Draw nodes
    this._drawNodes(ctx);
  }

  /**
   * Draw system background
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  _drawSystemBackground(ctx) {
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius + 10, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(100, 100, 150, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw inner circle
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 50, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(100, 100, 150, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw vulnerability indicator
    if (this.vulnerabilityActive) {
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radius + 25, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(0, 255, 0, 0.2)";
      ctx.lineWidth = 15;
      ctx.stroke();
    }
  }

  /**
   * Draw connections between nodes
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  _drawConnections(ctx) {
    for (const connection of this.connections) {
      const sourceNode = this.securityNodes[connection.sourceId];
      const targetNode = this.securityNodes[connection.targetId];

      // Skip connections to disabled nodes
      if (
        sourceNode.status === "disabled" ||
        targetNode.status === "disabled"
      ) {
        continue;
      }

      // Draw line
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);

      // Set color based on node status
      if (
        sourceNode.status === "vulnerable" ||
        targetNode.status === "vulnerable"
      ) {
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
      } else {
        ctx.strokeStyle = "rgba(100, 150, 255, 0.3)";
      }

      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /**
   * Draw nodes
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  _drawNodes(ctx) {
    for (const node of this.securityNodes) {
      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);

      // Set fill color based on status
      switch (node.status) {
        case "active":
          ctx.fillStyle = node.blinking
            ? "rgba(50, 100, 255, 0.9)"
            : "rgba(50, 100, 255, 0.6)";
          break;
        case "vulnerable":
          ctx.fillStyle = node.blinking
            ? "rgba(0, 255, 0, 0.9)"
            : "rgba(0, 255, 0, 0.6)";
          break;
        case "disabled":
          ctx.fillStyle = "rgba(255, 50, 50, 0.7)";
          break;
        case "protected":
          ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
          break;
      }

      ctx.fill();

      // Draw node border
      ctx.strokeStyle = "rgba(200, 200, 200, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw node ID
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.id.toString(), node.x, node.y);
    }
  }

  /**
   * Handle successful puzzle completion
   */
  _handleSuccess() {
    this.isComplete = true;

    // Stop animations
    this._stopBlinking();
    this._stopRotation();

    // Cancel vulnerability timers
    if (this.vulnerabilityTimer) {
      clearTimeout(this.vulnerabilityTimer);
      this.vulnerabilityTimer = null;
    }

    this._showMessage("Security system bypassed successfully!", "success");

    if (this.callbacks && this.callbacks.showSuccess) {
      this.callbacks.showSuccess();
    }
  }

  /**
   * Show a message to the player
   * @param {string} message - Message to display
   * @param {string} type - Message type (info, success, error, warning)
   */
  _showMessage(message, type = "info") {
    if (!this.messageElement) return;

    // Reset classes
    this.messageElement.className = "mt-4 text-center h-8 font-medium";

    // Apply type-specific styling
    switch (type) {
      case "success":
        this.messageElement.classList.add("text-green-400");
        break;
      case "error":
        this.messageElement.classList.add("text-red-400");
        break;
      case "warning":
        this.messageElement.classList.add("text-yellow-400");
        break;
      default:
        this.messageElement.classList.add("text-white");
    }

    this.messageElement.textContent = message;
  }

  /**
   * Clean up event listeners and timers
   */
  cleanup() {
    this._stopBlinking();
    this._stopRotation();

    if (this.vulnerabilityTimer) {
      clearTimeout(this.vulnerabilityTimer);
      this.vulnerabilityTimer = null;
    }

    // Remove click handler
    if (this.canvasElement) {
      this.canvasElement.removeEventListener("click", this._handleCanvasClick);
    }
  }

  /**
   * Get the current solution
   * @returns {Object} - The solution data
   */
  getSolution() {
    return {
      disabledNodes: this.disabledNodes,
      requiredNodes: this.requiredDisabledNodes,
      isComplete: this.isComplete,
    };
  }

  /**
   * Validate the current solution
   * @returns {boolean} - Whether the solution is valid
   */
  validateSolution() {
    return this.isComplete;
  }

  /**
   * Get error message for invalid solution
   * @returns {string} - Error message
   */
  getErrorMessage() {
    return `Need to disable ${this.requiredDisabledNodes} nodes to complete the puzzle!`;
  }

  /**
   * Handle random events
   * @param {string} eventType - Type of random event
   * @param {number} duration - Duration in seconds
   */
  handleRandomEvent(eventType, duration) {
    switch (eventType) {
      case "security_patrol":
        this._showMessage(
          "Security patrol detected! System on high alert.",
          "warning"
        );

        // Speed up rotation temporarily
        const originalSpeed = this.rotationSpeed;
        this.rotationSpeed = Math.max(1000, this.rotationSpeed / 2);

        // Update rotation timer
        this._stopRotation();
        this._startRotation();

        // Reset after duration
        setTimeout(() => {
          this.rotationSpeed = originalSpeed;
          this._stopRotation();
          this._startRotation();
          this._showMessage(
            "Security patrol moved on. System returning to normal."
          );
        }, duration * 1000);
        break;

      case "system_check":
        this._showMessage(
          "System diagnostics in progress! Random vulnerability.",
          "warning"
        );

        // Force a vulnerability window
        if (!this.vulnerabilityActive) {
          this._openVulnerabilityWindow();
        }
        break;
    }
  }
}

export default SecuritySystemPuzzle;
