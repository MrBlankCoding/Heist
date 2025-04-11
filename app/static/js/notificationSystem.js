// notificationSystem.js - Handles all game notifications and alerts

class NotificationSystem {
  constructor() {
    // DOM Elements
    this.elements = {
      alertNotification: document.getElementById("alert-notification"),
      alertMessage: document.getElementById("alert-message"),
    };

    // Validate elements exist
    this._validateElements();

    // State
    this.alertTimeout = null;
    this.notificationQueue = [];
    this.isShowingNotification = false;
    this.notificationDuration = 5000; // 5 seconds default

    // Sound settings
    this.soundEnabled = true;
    this.sounds = {
      info: "/static/sounds/notification.mp3",
      success: "/static/sounds/success_notification.mp3",
      warning: "/static/sounds/warning_notification.mp3",
      error: "/static/sounds/error_notification.mp3",
    };
  }

  /**
   * Validate that required DOM elements exist
   * @private
   */
  _validateElements() {
    if (!this.elements.alertNotification) {
      console.error("Alert notification element not found");
      this.elements.alertNotification = document.createElement("div");
      this.elements.alertNotification.className =
        "fixed bottom-4 right-4 text-white p-4 rounded-lg shadow-lg z-40 hidden";
      document.body.appendChild(this.elements.alertNotification);
    }

    if (!this.elements.alertMessage) {
      console.error("Alert message element not found");
      this.elements.alertMessage = document.createElement("div");
      this.elements.alertNotification.appendChild(this.elements.alertMessage);
    }
  }

  /**
   * Show an alert notification
   * @param {string} message - Alert message
   * @param {string} type - Alert type (success, error, warning, info)
   * @param {number} [duration] - Duration to show in ms (default: 5000ms)
   */
  showAlert(message, type = "info", duration) {
    // Add to queue
    this.notificationQueue.push({
      message,
      type,
      duration: duration || this.notificationDuration,
    });

    // Process queue if not already showing a notification
    if (!this.isShowingNotification) {
      this._processNotificationQueue();
    }
  }

  /**
   * Process the notification queue
   * @private
   */
  _processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      this.isShowingNotification = false;
      return;
    }

    this.isShowingNotification = true;
    const { message, type, duration } = this.notificationQueue.shift();
    this._displayNotification(message, type, duration);
  }

  /**
   * Display a notification
   * @param {string} message - Alert message
   * @param {string} type - Alert type
   * @param {number} duration - Duration to show
   * @private
   */
  _displayNotification(message, type, duration) {
    // Clear any existing timeout
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    // Set alert style based on type
    let alertClass = "bg-blue-900";
    let animationClass = "animate-slideIn";

    if (type === "success") {
      alertClass = "bg-green-900";
    } else if (type === "error") {
      alertClass = "bg-red-900";
    } else if (type === "warning") {
      alertClass = "bg-yellow-900";
    }

    // Update alert
    this.elements.alertNotification.className = `fixed bottom-4 right-4 text-white p-4 rounded-lg shadow-lg z-40 ${alertClass} ${animationClass}`;
    this.elements.alertMessage.textContent = message;

    // Play sound if enabled
    this._playNotificationSound(type);

    // Show alert
    this.elements.alertNotification.classList.remove("hidden");

    // Hide after duration
    this.alertTimeout = setTimeout(() => {
      // Add exit animation
      this.elements.alertNotification.classList.remove(animationClass);
      this.elements.alertNotification.classList.add("animate-slideOut");

      // Wait for animation to complete before hiding
      setTimeout(() => {
        this.elements.alertNotification.classList.add("hidden");
        this.elements.alertNotification.classList.remove("animate-slideOut");

        // Process next notification
        this._processNotificationQueue();
      }, 300); // Animation duration
    }, duration);
  }

  /**
   * Set notification duration
   * @param {number} duration - Duration in milliseconds
   */
  setNotificationDuration(duration) {
    if (typeof duration === "number" && duration > 0) {
      this.notificationDuration = duration;
    }
  }

  /**
   * Enable or disable notification sounds
   * @param {boolean} enabled - Whether sounds should be enabled
   */
  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
  }

  /**
   * Clear all pending notifications
   */
  clearNotifications() {
    this.notificationQueue = [];

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    this.elements.alertNotification.classList.add("hidden");
    this.isShowingNotification = false;
  }

  /**
   * Play a notification sound
   * @param {string} type - Notification type
   * @private
   */
  _playNotificationSound(type) {
    if (!this.soundEnabled) return;

    const soundFile = this.sounds[type] || this.sounds.info;

    try {
      const audio = new Audio(soundFile);
      audio.volume = 0.5; // 50% volume
      audio.play().catch((error) => {
        console.warn(`Failed to play notification sound: ${error.message}`);
      });
    } catch (error) {
      console.warn(`Error playing notification sound: ${error.message}`);
    }
  }
}

export default NotificationSystem;
