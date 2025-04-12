// main.bundle.js - Combines most of the game's modules for faster loading

// Import and re-export all components
export { default as websocketManager } from "./websocketManager.js";
export { default as playerStateManager } from "./playerStateManager.js";
export { default as gameStartScreen } from "./gameStartScreen.js";
export { default as GameUIManager } from "./gameUIManager.js";
export { default as GameEventHandler } from "./gameEventHandler.js";
export { default as NotificationSystem } from "./notificationSystem.js";
export { default as ChatManager } from "./chatManager.js";
export { default as puzzleLoader } from "./puzzleLoader.js";

// No longer importing puzzle controllers directly
// They will be dynamically loaded by puzzleLoader when needed
