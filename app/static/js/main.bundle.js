// main.bundle.js - Combines most of the game's modules for faster loading

// Import and re-export all components
export { default as websocketManager } from "./websocketManager.js";
export { default as playerStateManager } from "./playerStateManager.js";
export { default as gameStartScreen } from "./gameStartScreen.js";
export { default as GameUIManager } from "./gameUIManager.js";
export { default as GameEventHandler } from "./gameEventHandler.js";
export { default as NotificationSystem } from "./notificationSystem.js";
export { default as ChatManager } from "./chatManager.js";

// Re-export puzzle controllers - ensure these paths are correct and the files exist
export { default as HackerPuzzleController } from "./puzzles/hacker/hackerPuzzleController.js";
export { default as SafeCrackerPuzzleController } from "./puzzles/safeCracker/SafeCrackerPuzzleController.js";
export { default as DemolitionsPuzzleController } from "./puzzles/demolitions/demolitionsPuzzleController.js";
export { default as LookoutPuzzleController } from "./puzzles/lookout/lookoutPuzzleController.js";
export { default as TeamPuzzleController } from "./puzzles/teamPuzzles/teamPuzzleController.js";
