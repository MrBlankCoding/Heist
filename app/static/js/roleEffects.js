/**
 * Role Effects - High quality interactive effects for role cards
 * Modern animations designed for The Heist game
 */

// Initialize effects when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Target the role cards in the lobby
  const roleCards = document.querySelectorAll("#role-selection .role-card");

  // Set up effects for each role card
  roleCards.forEach((card) => {
    // Get role type, normalize for comparison
    const roleType = card.getAttribute("data-role");

    // Create canvas for WebGL effects if needed
    setupCanvasIfNeeded(card, roleType);

    // Interaction handlers
    card.addEventListener("mouseenter", () => {
      // Apply role-specific effects
      applyRoleEffect(card, roleType);
    });

    card.addEventListener("mouseleave", () => {
      // Clean up effects
      removeRoleEffect(card, roleType);
    });
  });
});

/**
 * Create and setup canvas for WebGL effects if the role needs it
 * @param {HTMLElement} card - The role card element
 * @param {string} roleType - The type of role
 */
function setupCanvasIfNeeded(card, roleType) {
  // Roles that need canvas-based effects
  if (roleType === "Hacker") {
    setupHackerBackground(card);
  }
}

/**
 * Apply role-specific effect when card is hovered
 * @param {HTMLElement} card - The role card element
 * @param {string} roleType - The type of role
 */
function applyRoleEffect(card, roleType) {
  // Add core hover class
  card.classList.add("effect-active");

  // Apply role-specific effect
  switch (roleType) {
    case "Hacker":
      applyHackerEffect(card);
      break;
    case "Safe Cracker":
      applySafeCrackerEffect(card);
      break;
    case "Demolitions":
      applyDemolitionsEffect(card);
      break;
    case "Lookout":
      applyLookoutEffect(card);
      break;
  }
}

/**
 * Clean up all effects when card is no longer hovered
 * @param {HTMLElement} card - The role card element
 * @param {string} roleType - The type of role
 */
function removeRoleEffect(card, roleType) {
  // Remove core hover class
  card.classList.remove("effect-active");

  // Clean up role-specific effects
  cleanupEffects(card, roleType);
}

/**
 * Remove all dynamic elements created for effects
 * @param {HTMLElement} card - The role card element
 * @param {string} roleType - The type of role
 */
function cleanupEffects(card, roleType) {
  // Clear all effect elements
  const effectElements = card.querySelectorAll(".effect-element");
  effectElements.forEach((el) => el.remove());

  // Clear interval timers specific to this card
  if (card._effectInterval) {
    clearInterval(card._effectInterval);
    card._effectInterval = null;
  }

  // Clear animation frames
  if (card._animationFrame) {
    cancelAnimationFrame(card._animationFrame);
    card._animationFrame = null;
  }

  // Additional role-specific cleanup
  switch (roleType) {
    case "Hacker":
      if (card._matrixEffect) {
        card._matrixEffect.stop();
        card._matrixEffect = null;
      }
      break;
    case "Demolitions":
      if (card._explosionTimeout) {
        clearTimeout(card._explosionTimeout);
        card._explosionTimeout = null;
      }
      break;
  }
}

/**
 * HACKER EFFECT
 * Matrix-style digital rain with interactive particle system
 */

// Set up the hacker background canvas
function setupHackerBackground(card) {
  // Find the existing gradient overlay div
  const overlay = card.querySelector(".absolute.inset-0.bg-gradient-radial");

  // Create a div to hold our effect, positioned absolute
  const effectContainer = document.createElement("div");
  effectContainer.className =
    "absolute inset-0 overflow-hidden z-0 opacity-0 transition-opacity duration-500";
  effectContainer.id =
    "hacker-effect-" + Math.random().toString(36).substr(2, 9);

  // Insert the effect container right after the overlay
  if (overlay && overlay.parentNode) {
    overlay.parentNode.insertBefore(effectContainer, overlay.nextSibling);
  } else {
    card.appendChild(effectContainer);
  }
}

// Apply the hacker effect
function applyHackerEffect(card) {
  // Find the effect container
  const effectContainer = card.querySelector(
    ".absolute.inset-0.overflow-hidden"
  );
  if (!effectContainer) return;

  // Show the effect container
  effectContainer.classList.add("opacity-100");

  // Create matrix rain effect
  const matrixEffect = createMatrixRain(effectContainer);
  card._matrixEffect = matrixEffect;

  // Create floating particles around the card icon
  createDigitalParticles(card);

  // Add a glitch effect to the card title
  addGlitchEffect(card);
}

// Create realistic digital particles that float around the card
function createDigitalParticles(card) {
  // Find the image container
  const imageContainer = card.querySelector(".w-32.h-32");
  if (!imageContainer) return;

  // Create particles
  const particleCount = 12;
  const characters = ["0", "1", "{", "}", "<>", "[]", "//", "&"];

  // Create and position particles
  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      // Exit if effect is no longer active
      if (!card.classList.contains("effect-active")) return;

      // Create particle element
      const particle = document.createElement("div");
      particle.className =
        "absolute text-xs font-mono effect-element digital-particle opacity-0";
      particle.style.color = `rgba(96, 165, 250, ${0.6 + Math.random() * 0.4})`;
      particle.style.textShadow = "0 0 5px rgba(96, 165, 250, 0.8)";

      // Set random character
      particle.textContent =
        characters[Math.floor(Math.random() * characters.length)];

      // Position randomly around the image
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 20;
      const centerX = imageContainer.offsetWidth / 2;
      const centerY = imageContainer.offsetHeight / 2;

      particle.style.left = `${centerX + Math.cos(angle) * distance}px`;
      particle.style.top = `${centerY + Math.sin(angle) * distance}px`;

      // Add custom animation using CSS variables
      particle.style.setProperty("--float-x", `${Math.random() * 20 - 10}px`);
      particle.style.setProperty("--float-y", `${Math.random() * 20 - 10}px`);
      particle.style.setProperty("--duration", `${2 + Math.random() * 2}s`);
      particle.style.setProperty("--delay", `${Math.random() * 0.5}s`);

      // Add to image container
      imageContainer.appendChild(particle);

      // Trigger animation by adding class after a small delay
      setTimeout(() => {
        particle.classList.add("digital-particle-animate");
      }, 10);

      // Remove after animation completes
      setTimeout(() => {
        if (particle.parentNode) {
          particle.classList.remove("digital-particle-animate");

          // Fade out before removing
          setTimeout(() => {
            if (particle.parentNode) {
              particle.remove();
            }
          }, 500);
        }
      }, 3000 + Math.random() * 1000);
    }, i * 200); // Stagger particle creation
  }
}

// Create Matrix-style digital rain effect
function createMatrixRain(container) {
  // Create canvas for the effect
  const canvas = document.createElement("canvas");
  canvas.className = "effect-element";
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  canvas.style.opacity = "0.15";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  // Matrix rain configuration
  const columns = Math.floor(canvas.width / 20);
  const drops = [];

  // Initialize drop positions
  for (let i = 0; i < columns; i++) {
    drops[i] = Math.floor(Math.random() * canvas.height);
  }

  // Function to draw the matrix effect
  function draw() {
    // Semi-transparent black to create trail effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set style for matrix characters
    ctx.fillStyle = "#60A5FA"; // Tailwind blue-400
    ctx.font = "15px monospace";

    // Draw each column
    for (let i = 0; i < drops.length; i++) {
      // Random character from matrix charset
      const char = String.fromCharCode(0x30a0 + Math.random() * 96);

      // Draw the character
      ctx.fillText(char, i * 20, drops[i] * 20);

      // Move the drop down
      if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      drops[i]++;
    }
  }

  // Start the animation loop
  let animationFrame;
  function animate() {
    draw();
    animationFrame = requestAnimationFrame(animate);
  }

  animate();

  // Return controller object
  return {
    stop: function () {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (canvas.parentNode) {
        canvas.remove();
      }
    },
  };
}

// Add glitch effect to card title
function addGlitchEffect(card) {
  // Find title element
  const titleEl = card.querySelector("h4");
  if (!titleEl) return;

  // Save original text
  const originalText = titleEl.textContent;

  // Create glitch effect
  const glitchInterval = setInterval(() => {
    // Only continue if effect is active
    if (!card.classList.contains("effect-active")) {
      clearInterval(glitchInterval);
      titleEl.textContent = originalText;
      return;
    }

    // Random chance to glitch
    if (Math.random() > 0.9) {
      // Create glitched text
      let glitchedText = "";
      const glitchChars = "!@#$%^&*<>/\\";

      for (let i = 0; i < originalText.length; i++) {
        if (Math.random() > 0.7) {
          glitchedText +=
            glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else {
          glitchedText += originalText[i];
        }
      }

      // Set glitched text
      titleEl.textContent = glitchedText;

      // Reset to original text after a short delay
      setTimeout(() => {
        if (titleEl) {
          titleEl.textContent = originalText;
        }
      }, 150);
    }
  }, 500);

  // Store interval for cleanup
  card._effectInterval = glitchInterval;
}

/**
 * SAFE CRACKER EFFECT
 * Interactive dial with precision lock movements and sound
 */
function applySafeCrackerEffect(card) {
  // Create the interactive dial
  const dial = createSafeDial(card);

  // Add combination number flickers
  addCombinationDisplay(card);

  // Play mechanical clicks
  const clickInterval = setInterval(() => {
    if (!card.classList.contains("effect-active")) {
      clearInterval(clickInterval);
      return;
    }

    // Play click sound at random intervals
    if (Math.random() > 0.5) {
      playSound("click");

      // Trigger a subtle vibration on the card
      card.classList.add("safe-click");
      setTimeout(() => card.classList.remove("safe-click"), 100);
    }
  }, 600);

  // Store interval for cleanup
  card._effectInterval = clickInterval;
}

// Create an interactive safe dial
function createSafeDial(card) {
  // Find the image container
  const imageContainer = card.querySelector(".w-32.h-32");
  if (!imageContainer) return null;

  // Create dial container
  const dialContainer = document.createElement("div");
  dialContainer.className =
    "absolute inset-0 flex items-center justify-center effect-element";
  imageContainer.appendChild(dialContainer);

  // Create rotating dial ring
  const dial = document.createElement("div");
  dial.className = "w-full h-full safe-dial-ring";
  dialContainer.appendChild(dial);

  // Create dial ticks
  for (let i = 0; i < 20; i++) {
    const tick = document.createElement("div");
    tick.className = "safe-dial-tick";

    // Position ticks in a circle
    const angle = (i / 20) * 360;
    tick.style.transform = `rotate(${angle}deg) translateY(-32px)`;

    // Every 5th tick is larger
    if (i % 5 === 0) {
      tick.classList.add("safe-dial-tick-large");

      // Add numbers
      const number = document.createElement("div");
      number.className = "safe-dial-number";
      number.textContent = (i / 5) * 20;
      tick.appendChild(number);
    }

    dial.appendChild(tick);
  }

  // Create dial pointer
  const pointer = document.createElement("div");
  pointer.className = "safe-dial-pointer";
  dialContainer.appendChild(pointer);

  // Add interactive rotation
  let rotation = 0;
  let direction = 1;
  let speed = 0.5;

  function rotateDial() {
    if (!card.classList.contains("effect-active")) return;

    // Update rotation with changing speed and direction
    rotation += direction * speed;

    // Occasionally change direction
    if (Math.random() > 0.995) {
      direction *= -1;

      // Play sound on direction change
      playSound("click");

      // Vibration effect
      card.classList.add("safe-click");
      setTimeout(() => card.classList.remove("safe-click"), 100);
    }

    // Update speed slightly
    speed = Math.max(0.3, Math.min(1.2, speed + (Math.random() - 0.5) * 0.1));

    // Apply rotation
    dial.style.transform = `rotate(${rotation}deg)`;

    // Continue animation
    card._animationFrame = requestAnimationFrame(rotateDial);
  }

  // Start animation
  card._animationFrame = requestAnimationFrame(rotateDial);

  return dialContainer;
}

// Create combination display that changes randomly
function addCombinationDisplay(card) {
  // Create combination display
  const comboDisplay = document.createElement("div");
  comboDisplay.className =
    "absolute bottom-2 right-2 px-2 py-1 bg-gray-900 rounded-md text-yellow-400 font-mono text-xs effect-element flex";

  // Create 3 digit positions
  for (let i = 0; i < 3; i++) {
    const digit = document.createElement("div");
    digit.className = "w-4 text-center";
    digit.textContent = Math.floor(Math.random() * 10);
    comboDisplay.appendChild(digit);
  }

  card.appendChild(comboDisplay);

  // Animate digits
  const digits = comboDisplay.querySelectorAll("div");
  const updateDigit = () => {
    if (!card.classList.contains("effect-active")) return;

    // Update a random digit
    const idx = Math.floor(Math.random() * digits.length);

    // Animate digit change
    digits[idx].classList.add("digit-change");

    // Change the digit value
    setTimeout(() => {
      digits[idx].textContent = Math.floor(Math.random() * 10);
      digits[idx].classList.remove("digit-change");
    }, 150);

    // Schedule next update
    setTimeout(updateDigit, 1000 + Math.random() * 1000);
  };

  // Start the updates
  setTimeout(updateDigit, 500);
}

/**
 * DEMOLITIONS EFFECT
 * Fuse burn with particles and explosive finale
 */
function applyDemolitionsEffect(card) {
  // Add a fuse that burns across the card
  const fuse = createFuse(card);

  // Create the explosion effect that happens at the end of the fuse
  card._explosionTimeout = setTimeout(() => {
    // Only trigger if effect is still active
    if (card.classList.contains("effect-active")) {
      createExplosion(card);
    }
  }, 3000);
}

// Create a burning fuse effect
function createFuse(card) {
  // Create fuse container
  const fuseContainer = document.createElement("div");
  fuseContainer.className =
    "absolute bottom-4 left-0 w-full h-2 effect-element";
  card.appendChild(fuseContainer);

  // Create the fuse line
  const fuseLine = document.createElement("div");
  fuseLine.className = "absolute h-1 bg-gray-500 fuse-line";
  fuseLine.style.width = "100%";
  fuseLine.style.top = "50%";
  fuseLine.style.transform = "translateY(-50%)";
  fuseContainer.appendChild(fuseLine);

  // Create fuse spark
  const fuseSpark = document.createElement("div");
  fuseSpark.className = "absolute h-4 w-4 fuse-spark";
  fuseContainer.appendChild(fuseSpark);

  // Animate the fuse spark
  let progress = 0;
  const duration = 3; // seconds
  const interval = 20; // ms
  const steps = (duration * 1000) / interval;

  // Start position
  fuseSpark.style.left = "0%";

  // Create fuse burn animation
  const fuseInterval = setInterval(() => {
    if (!card.classList.contains("effect-active")) {
      clearInterval(fuseInterval);
      return;
    }

    // Update progress
    progress += 1 / steps;

    if (progress >= 1) {
      clearInterval(fuseInterval);
      fuseSpark.remove();
      return;
    }

    // Update spark position
    fuseSpark.style.left = `${progress * 100}%`;

    // Burn the fuse behind the spark
    fuseLine.style.background = `linear-gradient(to right, 
      transparent ${progress * 100}%, 
      rgba(75, 85, 99, 1) ${progress * 100}%
    )`;

    // Add smoke particles occasionally
    if (Math.random() > 0.7) {
      createSmokeParticle(fuseContainer, progress);
    }
  }, interval);

  // Store interval for cleanup
  card._effectInterval = fuseInterval;

  return fuseContainer;
}

// Create a smoke particle at the fuse position
function createSmokeParticle(container, position) {
  const particle = document.createElement("div");
  particle.className = "smoke-particle effect-element";

  // Position at current fuse position
  particle.style.left = `${position * 100}%`;
  particle.style.bottom = "0px";

  // Randomize size and opacity
  const size = 4 + Math.random() * 4;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.opacity = 0.4 + Math.random() * 0.3;

  // Add to container
  container.appendChild(particle);

  // Remove after animation completes
  setTimeout(() => {
    if (particle.parentNode) {
      particle.remove();
    }
  }, 1000);
}

// Create explosion effect
function createExplosion(card) {
  // Find center of card
  const cardRect = card.getBoundingClientRect();
  const centerX = cardRect.width / 2;
  const centerY = cardRect.height / 2;

  // Create explosion container
  const explosionContainer = document.createElement("div");
  explosionContainer.className =
    "absolute inset-0 overflow-hidden effect-element";
  card.appendChild(explosionContainer);

  // Create flash effect
  const flash = document.createElement("div");
  flash.className = "absolute inset-0 bg-yellow-500 flash-effect";
  explosionContainer.appendChild(flash);

  // Create particles
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "explosion-particle effect-element";

    // Random position offset from center
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 15;

    particle.style.left = `${centerX + Math.cos(angle) * distance}px`;
    particle.style.top = `${centerY + Math.sin(angle) * distance}px`;

    // Random color (orange, red, yellow)
    const hue = 20 + Math.floor(Math.random() * 40);
    particle.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;

    // Random size
    const size = 3 + Math.random() * 6;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Custom animation properties
    particle.style.setProperty("--angle", angle);
    particle.style.setProperty("--speed", 60 + Math.random() * 40);

    explosionContainer.appendChild(particle);
  }

  // Play explosion sound
  playSound("explosion");

  // Add vibration effect
  card.classList.add("explosion-shake");
  setTimeout(() => card.classList.remove("explosion-shake"), 500);

  // Clean up explosion after animation
  setTimeout(() => {
    if (explosionContainer.parentNode) {
      explosionContainer.remove();
    }
  }, 1500);
}

/**
 * LOOKOUT EFFECT
 * Advanced radar with scanning and dynamic target detection
 */
function applyLookoutEffect(card) {
  // Create radar container
  const radarContainer = document.createElement("div");
  radarContainer.className =
    "absolute inset-0 flex items-center justify-center effect-element";
  card.appendChild(radarContainer);

  // Create radar screen
  const radar = document.createElement("div");
  radar.className = "radar-screen";
  radarContainer.appendChild(radar);

  // Create radar sweep
  const sweep = document.createElement("div");
  sweep.className = "radar-sweep";
  radar.appendChild(sweep);

  // Create grid lines
  const gridX = document.createElement("div");
  gridX.className = "radar-grid-x";
  radar.appendChild(gridX);

  const gridY = document.createElement("div");
  gridY.className = "radar-grid-y";
  radar.appendChild(gridY);

  // Add concentric circles
  for (let i = 1; i <= 3; i++) {
    const circle = document.createElement("div");
    circle.className = "radar-circle";
    circle.style.width = `${i * 25}%`;
    circle.style.height = `${i * 25}%`;
    radar.appendChild(circle);
  }

  // Add random blips
  createRadarBlips(radar, card);

  // Add data readout
  createDataReadout(card);
}

// Create radar blips that appear randomly
function createRadarBlips(radar, card) {
  // Create blips at random intervals
  const blipInterval = setInterval(() => {
    if (!card.classList.contains("effect-active")) {
      clearInterval(blipInterval);
      return;
    }

    // Add blip with about 40% chance
    if (Math.random() > 0.6) {
      createBlip(radar);
    }
  }, 800);

  // Store interval for cleanup
  card._effectInterval = blipInterval;
}

// Create individual radar blip
function createBlip(radar) {
  const blip = document.createElement("div");
  blip.className = "radar-blip effect-element";

  // Random position using polar coordinates
  const angle = Math.random() * Math.PI * 2;
  const distance = 10 + Math.random() * 35; // % from center

  // Convert to left/top position
  blip.style.left = `calc(50% + ${Math.cos(angle) * distance}%)`;
  blip.style.top = `calc(50% + ${Math.sin(angle) * distance}%)`;

  // Randomize size based on "distance"
  const size = 4 + Math.random() * 3;
  blip.style.width = `${size}px`;
  blip.style.height = `${size}px`;

  // Add to radar
  radar.appendChild(blip);

  // Play sound
  if (Math.random() > 0.5) {
    playSound("ping");
  }

  // Remove blip after animation
  setTimeout(() => {
    if (blip.parentNode) {
      blip.remove();
    }
  }, 2000);
}

// Create data readout display
function createDataReadout(card) {
  // Create readout container
  const readout = document.createElement("div");
  readout.className =
    "absolute bottom-3 right-3 bg-gray-900 bg-opacity-80 px-2 py-1 rounded font-mono text-xs text-green-400 effect-element";

  // Add scanning text
  readout.textContent = "SCANNING...";

  card.appendChild(readout);

  // Update readout text periodically
  const messages = [
    "SCANNING...",
    "CLEAR",
    "MONITORING",
    "ALERT: MOVEMENT",
    "PERIMETER SECURE",
  ];

  let messageIndex = 0;

  // Update readout text
  const textInterval = setInterval(() => {
    if (!card.classList.contains("effect-active")) {
      clearInterval(textInterval);
      return;
    }

    // Update message
    messageIndex = (messageIndex + 1) % messages.length;
    readout.textContent = messages[messageIndex];

    // Add blink effect
    readout.classList.add("text-blink");
    setTimeout(() => readout.classList.remove("text-blink"), 300);
  }, 2000);
}

/**
 * UTILITY FUNCTIONS
 */

// Simple sound function that logs to console
function playSound(type) {
  console.log(`Playing ${type} sound`);

  // Implement with actual sound files in production:
  // const sound = new Audio(`/static/sounds/${type}.mp3`);
  // sound.volume = 0.3;
  // sound.play();
}
