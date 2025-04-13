// main.bundle.js - Combines most of the game's modules for faster loading

// Import and re-export all components
export { default as websocketManager } from "/static/js/websocketManager.js";
export { default as playerStateManager } from "/static/js/playerStateManager.js";
export { default as gameStartScreen } from "/static/js/gameStartScreen.js";
export { default as GameUIManager } from "/static/js/gameUIManager.js";
export { default as GameEventHandler } from "/static/js/gameEventHandler.js";
export { default as NotificationSystem } from "/static/js/notificationSystem.js";
export { default as ChatManager } from "/static/js/chatManager.js";
export { default as puzzleLoader } from "/static/js/puzzleLoader.js";

// No longer importing puzzle controllers directly
// They will be dynamically loaded by puzzleLoader when needed
