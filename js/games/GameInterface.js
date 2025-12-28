export class GameInterface {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container ${containerId} not found`);
    }

    /**
     * Called when the game starts/mounts
     */
    start() {
        throw new Error("Method 'start()' must be implemented.");
    }

    /**
     * Called when the game is stopped/unmounted
     */
    cleanup() {
        this.container.innerHTML = '';
    }

    /**
     * Called to reset the current match
     */
    reset() {
        throw new Error("Method 'reset()' must be implemented.");
    }
}
