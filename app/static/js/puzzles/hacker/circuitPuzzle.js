// Circuit Puzzle - Level 1
// A simple node connection game where players need to connect nodes to complete a circuit

class CircuitPuzzle {
  constructor(containerElement, puzzleData, callbacks) {
    this.containerElement = containerElement;
    this.puzzleData = puzzleData;
    this.callbacks = callbacks;

    // Puzzle state
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.isComplete = false;

    // Difficulty variables
    this.nodeCount = 5 + Math.min(3, puzzleData.difficulty || 1);
    this.targetConnections = Math.floor(this.nodeCount * 0.8);

    // Canvas context
    this.canvas = null;
    this.ctx = null;
  }

  initialize() {
    this._createGameArea();
    this._generateNodes();
    this._attachEventListeners();

    // Initial render
    this._render();

    // Show instructions
    if (this.callbacks && this.callbacks.showMessage) {
      this.callbacks.showMessage(
        "Connect the circuit nodes to create a complete path. Click nodes to connect them.",
        "info"
      );
    }
  }

  _createGameArea() {
    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = 600;
    this.canvas.height = 400;
    this.canvas.className =
      "bg-gray-900 rounded-lg mx-auto block border border-blue-500";
    this.containerElement.appendChild(this.canvas);

    // Get context
    this.ctx = this.canvas.getContext("2d");

    // Add instructions
    const instructions = document.createElement("div");
    instructions.className = "text-sm text-blue-300 mt-4 text-center";
    instructions.innerHTML =
      "Click on a node, then click on another node to connect them. Connect all required nodes to complete the circuit.";
    this.containerElement.appendChild(instructions);

    // Add status display
    this.statusDisplay = document.createElement("div");
    this.statusDisplay.className =
      "mt-4 text-center text-white font-mono bg-gray-800 p-2 rounded";
    this.statusDisplay.innerHTML = `Circuit Completion: <span class="text-blue-400">0/${this.targetConnections}</span>`;
    this.containerElement.appendChild(this.statusDisplay);
  }

  _generateNodes() {
    // Create nodes
    for (let i = 0; i < this.nodeCount; i++) {
      this.nodes.push({
        id: i,
        x: 100 + Math.random() * 400,
        y: 50 + Math.random() * 300,
        radius: 20,
        color: "#4B5563",
        connected: false,
      });
    }

    // Always make first and last nodes special (start/end)
    this.nodes[0].color = "#3B82F6"; // Start node - blue
    this.nodes[this.nodes.length - 1].color = "#10B981"; // End node - green
  }

  _attachEventListeners() {
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this._handleClick(x, y);
    });
  }

  _handleClick(x, y) {
    // Find if a node was clicked
    const clickedNodeIndex = this.nodes.findIndex(
      (node) =>
        Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)) <
        node.radius
    );

    if (clickedNodeIndex !== -1) {
      // Handle node click
      if (this.selectedNode === null) {
        // First node selection
        this.selectedNode = clickedNodeIndex;
        this.nodes[clickedNodeIndex].color = "#A78BFA"; // Purple when selected
      } else if (this.selectedNode !== clickedNodeIndex) {
        // Second node selection - create connection if it doesn't exist
        const alreadyConnected = this.connections.some(
          (conn) =>
            (conn.from === this.selectedNode && conn.to === clickedNodeIndex) ||
            (conn.from === clickedNodeIndex && conn.to === this.selectedNode)
        );

        if (!alreadyConnected) {
          this.connections.push({
            from: this.selectedNode,
            to: clickedNodeIndex,
          });

          // Mark nodes as connected
          this.nodes[this.selectedNode].connected = true;
          this.nodes[clickedNodeIndex].connected = true;

          // Play connection sound
          this._playSound("connection");
        }

        // Reset selection
        this.nodes[this.selectedNode].color = this.nodes[this.selectedNode]
          .connected
          ? "#6B7280"
          : "#4B5563";
        this.selectedNode = null;

        // Check if puzzle is solved
        this._checkCompletion();
      } else {
        // Clicked same node twice - deselect
        this.nodes[this.selectedNode].color = this.nodes[this.selectedNode]
          .connected
          ? "#6B7280"
          : "#4B5563";
        this.selectedNode = null;
      }

      // Update display
      this._updateStatusDisplay();
      this._render();
    }
  }

  _checkCompletion() {
    // Count connected nodes
    const connectedCount = this.nodes.filter((node) => node.connected).length;

    // Check if start and end are connected through a path
    const startIndex = 0;
    const endIndex = this.nodes.length - 1;

    // Check if both start and end nodes are connected
    if (!this.nodes[startIndex].connected || !this.nodes[endIndex].connected) {
      return false;
    }

    // Check if there are enough connections
    if (this.connections.length < this.targetConnections) {
      return false;
    }

    // Simple path finding to ensure start and end are connected
    const visited = new Array(this.nodes.length).fill(false);
    this._depthFirstSearch(startIndex, visited);

    if (visited[endIndex]) {
      this.isComplete = true;

      // Display success
      if (this.callbacks && this.callbacks.showSuccess) {
        this.callbacks.showSuccess();
      }

      return true;
    }

    return false;
  }

  _depthFirstSearch(nodeIndex, visited) {
    visited[nodeIndex] = true;

    // Find all connections for this node
    for (const conn of this.connections) {
      if (conn.from === nodeIndex && !visited[conn.to]) {
        this._depthFirstSearch(conn.to, visited);
      } else if (conn.to === nodeIndex && !visited[conn.from]) {
        this._depthFirstSearch(conn.from, visited);
      }
    }
  }

  _render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid lines
    this.ctx.strokeStyle = "#1F2937";
    this.ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = 0; x < this.canvas.width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y < this.canvas.height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Draw connections
    this.ctx.strokeStyle = "#60A5FA";
    this.ctx.lineWidth = 3;

    for (const connection of this.connections) {
      const fromNode = this.nodes[connection.from];
      const toNode = this.nodes[connection.to];

      this.ctx.beginPath();
      this.ctx.moveTo(fromNode.x, fromNode.y);
      this.ctx.lineTo(toNode.x, toNode.y);
      this.ctx.stroke();

      // Add electricity animation
      if (this.isComplete) {
        this._drawElectricity(fromNode, toNode);
      }
    }

    // Draw nodes
    for (const node of this.nodes) {
      // Draw outer circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = node.color;
      this.ctx.fill();

      // Draw inner circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius - 5, 0, Math.PI * 2);
      this.ctx.fillStyle = "#111827";
      this.ctx.fill();

      // Draw node ID
      this.ctx.fillStyle = "#E5E7EB";
      this.ctx.font = "12px monospace";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(node.id.toString(), node.x, node.y);
    }
  }

  _drawElectricity(fromNode, toNode) {
    // Create a lightning effect between nodes
    this.ctx.save();
    this.ctx.strokeStyle = "#FBBF24";
    this.ctx.lineWidth = 2;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Number of segments
    const segments = 6;
    const segmentLength = dist / segments;

    // Start position
    let x = fromNode.x;
    let y = fromNode.y;

    // Direction
    const angle = Math.atan2(dy, dx);

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    // Create jagged lightning path
    for (let i = 0; i < segments - 1; i++) {
      // Calculate next point along the line
      const nextX = fromNode.x + Math.cos(angle) * (segmentLength * (i + 1));
      const nextY = fromNode.y + Math.sin(angle) * (segmentLength * (i + 1));

      // Add some randomness
      const offsetAmount = 5 * Math.sin(Date.now() / 100 + i);
      const offsetX = -Math.sin(angle) * offsetAmount;
      const offsetY = Math.cos(angle) * offsetAmount;

      // Line to the next point with offset
      this.ctx.lineTo(nextX + offsetX, nextY + offsetY);
    }

    // Final line to target
    this.ctx.lineTo(toNode.x, toNode.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  _updateStatusDisplay() {
    if (this.statusDisplay) {
      const connectedCount = this.connections.length;
      this.statusDisplay.innerHTML = `Circuit Completion: <span class="text-blue-400">${connectedCount}/${this.targetConnections}</span>`;
    }
  }

  _playSound(type) {
    try {
      let sound;
      switch (type) {
        case "connection":
          sound = new Audio("../static/sounds/circuit-connect.mp3");
          sound.volume = 0.2;
          break;
        case "success":
          sound = new Audio("../static/sounds/circuit-complete.mp3");
          sound.volume = 0.3;
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
      connections: this.connections.length,
      isComplete: this.isComplete,
    };
  }

  validateSolution() {
    return this.isComplete;
  }

  getErrorMessage() {
    if (this.connections.length < this.targetConnections) {
      return `Need more connections! (${this.connections.length}/${this.targetConnections})`;
    }
    return "The circuit is not complete. Ensure start and end nodes are connected.";
  }

  showSuccess() {
    // Mark all nodes with success color
    for (const node of this.nodes) {
      node.color = "#10B981";
    }

    // Play success sound
    this._playSound("success");

    // Show animation
    const animateSuccess = () => {
      this._render();
      if (this.isComplete) {
        requestAnimationFrame(animateSuccess);
      }
    };

    animateSuccess();
  }

  cleanup() {
    if (this.canvas) {
      // Remove event listeners
      this.canvas.removeEventListener("click", this._handleClick);

      // Clear animation frames
      this.isComplete = false;
    }
  }

  handleRandomEvent(eventType, duration) {
    if (eventType === "security_patrol") {
      // Temporarily disable some random nodes
      const nodesToDisable = Math.min(2, Math.floor(this.nodeCount / 3));

      const disabledNodeIndexes = [];
      for (let i = 0; i < nodesToDisable; i++) {
        // Don't disable start or end node
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * this.nodes.length);
        } while (
          randomIndex === 0 ||
          randomIndex === this.nodes.length - 1 ||
          disabledNodeIndexes.includes(randomIndex)
        );

        disabledNodeIndexes.push(randomIndex);
        const originalColor = this.nodes[randomIndex].color;
        this.nodes[randomIndex].color = "#DC2626"; // Red

        // Reset after duration
        setTimeout(() => {
          if (this.nodes[randomIndex]) {
            this.nodes[randomIndex].color = originalColor;
            this._render();
          }
        }, duration * 1000);
      }

      this._render();
    }
  }
}

export default CircuitPuzzle;
