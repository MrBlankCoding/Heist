// landingPage.js - Advanced animations and interactions for The Heist landing page

document.addEventListener("DOMContentLoaded", () => {
  // Cursor following glow effect
  const cursorHighlight = document.querySelector(".cursor-highlight");

  if (cursorHighlight) {
    document.addEventListener("mousemove", (e) => {
      const x = e.clientX;
      const y = e.clientY;

      cursorHighlight.style.opacity = "1";
      cursorHighlight.style.transform = `translate(${
        x - cursorHighlight.offsetWidth / 2
      }px, ${y - cursorHighlight.offsetHeight / 2}px)`;

      // Slight delay to create a trailing effect
      setTimeout(() => {
        cursorHighlight.style.opacity = "0.7";
      }, 100);
    });

    // Fade out when cursor is stationary
    let timeout;
    document.addEventListener("mousemove", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cursorHighlight.style.opacity = "0";
      }, 2000);
    });
  }

  // Role card 3D hover effects
  const roleCards = document.querySelectorAll(".role-card");

  roleCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      if (window.innerWidth > 768) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate rotation based on mouse position
        const xRotation = 15 * ((y - rect.height / 2) / rect.height);
        const yRotation = -15 * ((x - rect.width / 2) / rect.width);

        card.style.transform = `perspective(1000px) rotateX(${xRotation}deg) rotateY(${yRotation}deg) scale(1.05)`;

        // Add a dynamic light reflection effect based on mouse position
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        card.style.background = `linear-gradient(${glareX}deg, rgba(255, 255, 255, 0.05) 0%, rgba(15, 23, 42, 0.7) 60%)`;

        // Show role power info
        const roleInfo = card.querySelector(".role-power");
        if (roleInfo) {
          roleInfo.style.opacity = "1";
          roleInfo.style.transform = "translateY(0)";
        }
      }
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.background = "";

      // Hide role power info
      const roleInfo = card.querySelector(".role-power");
      if (roleInfo) {
        roleInfo.style.opacity = "0";
        roleInfo.style.transform = "translateY(4px)";
      }
    });

    // Mobile touch support for role cards
    card.addEventListener(
      "touchstart",
      () => {
        // Reset all cards first
        roleCards.forEach((otherCard) => {
          otherCard.style.transform = "";
          otherCard.style.boxShadow = "";

          const otherRoleInfo = otherCard.querySelector(".role-power");
          if (otherRoleInfo) {
            otherRoleInfo.style.opacity = "0";
            otherRoleInfo.style.transform = "translateY(4px)";
          }
        });

        // Apply effect to tapped card
        card.style.transform = "translateY(-10px) scale(1.03)";
        card.style.boxShadow = "0 15px 30px rgba(0, 0, 0, 0.4)";

        const roleInfo = card.querySelector(".role-power");
        if (roleInfo) {
          roleInfo.style.opacity = "1";
          roleInfo.style.transform = "translateY(0)";
        }
      },
      { passive: true }
    );
  });

  // Entrance animations
  const animateElements = document.querySelectorAll(".entrance-animation");

  // Fade in the main elements
  setTimeout(() => {
    animateElements.forEach((element) => {
      element.style.opacity = "1";
      element.style.transform = "translateY(0)";
    });
  }, 300);

  // Reveal role cards with staggered timing
  setTimeout(() => {
    const rolesContainer = document.querySelector(".roles-container");
    if (rolesContainer) {
      rolesContainer.style.opacity = "1";
      rolesContainer.style.transform = "translateY(0)";

      // Stagger the role card entrance
      const roleCards = rolesContainer.querySelectorAll(".role-card");
      roleCards.forEach((card, index) => {
        setTimeout(() => {
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
        }, 150 * index);
      });
    }
  }, 800);

  // Simulate terminal typing effect
  const simulateTyping = (element, text, speed = 50) => {
    let i = 0;
    element.textContent = "";

    function typeNextChar() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(typeNextChar, speed);
      }
    }

    typeNextChar();
  };

  // Apply terminal typing effects
  const terminalLines = document.querySelectorAll(".terminal-typing");
  if (terminalLines.length > 0) {
    terminalLines.forEach((line, index) => {
      const originalText = line.textContent;
      line.textContent = "";

      setTimeout(() => {
        simulateTyping(line, originalText);
      }, 1000 + index * 1000);
    });
  }

  // Security alarm effect
  setTimeout(() => {
    const alarmLights = document.querySelector(".alarm-lights");
    if (alarmLights) {
      alarmLights.style.animation = "alarmPulse 4s infinite alternate";
    }
  }, 5000);

  // Smooth scroll to roles section
  const selectRoleBtn = document.querySelector(".select-role-btn");
  if (selectRoleBtn) {
    selectRoleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const rolesSection = document.querySelector(".roles-container");
      if (rolesSection) {
        rolesSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Interactive heist button hover effects
  const heistButtons = document.querySelectorAll(".heist-button");
  heistButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      // Play subtle hover sound
      const hoverSound = new Audio("/static/sounds/button-hover.mp3");
      if (hoverSound) {
        hoverSound.volume = 0.2;
        hoverSound.play().catch(() => {
          // Silent fail if sound can't play (common in browsers)
        });
      }
    });
  });

  // Countdown timer animation
  const countdownBar = document.querySelector(".countdown-bar");
  if (countdownBar) {
    // Reset the animation if user returns to the page
    countdownBar.style.animation = "none";
    countdownBar.offsetHeight; // Trigger reflow
    countdownBar.style.animation = "countdown 60s linear forwards";
  }

  // Fingerprint scanner interaction
  const fingerprintScanner = document.querySelector(".fingerprint-scanner");
  if (fingerprintScanner) {
    fingerprintScanner.addEventListener("click", () => {
      fingerprintScanner.classList.add("scanning");

      // Simulate authentication
      setTimeout(() => {
        fingerprintScanner.classList.remove("scanning");
        fingerprintScanner.classList.add("authenticated");

        // Update text
        const authText = document.querySelector(".fingerprint-text");
        if (authText) {
          authText.textContent = "ACCESS GRANTED";
          authText.style.color = "var(--success)";
        }

        // Flash the alarm lights green briefly
        const alarmLights = document.querySelector(".alarm-lights");
        if (alarmLights) {
          alarmLights.style.background =
            "radial-gradient(ellipse at center, rgba(16, 185, 129, 0) 0%, rgba(16, 185, 129, 0.2) 70%, rgba(3, 7, 18, 0.5) 100%)";
          alarmLights.style.opacity = "1";

          setTimeout(() => {
            alarmLights.style.opacity = "0";
            alarmLights.style.background = "";
          }, 1500);
        }
      }, 2000);
    });
  }

  // Add parallax effect to background elements
  window.addEventListener("mousemove", (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;

    // Apply subtle parallax to different layers
    const laserGrid = document.querySelector(".laser-grid");
    if (laserGrid) {
      laserGrid.style.transform = `translate(${mouseX * -20}px, ${
        mouseY * -20
      }px)`;
    }

    const blueprintHighlight = document.querySelector(".blueprint-highlight");
    if (blueprintHighlight) {
      blueprintHighlight.style.transform = `translate(${mouseX * -40}px, ${
        mouseY * -40
      }px)`;
    }
  });
});
