import { eventBus } from './EventBus.js';
import { Router } from './Router.js';
import { TicTacToe } from '../games/TicTacToe.js';
import { ChessGame } from '../games/Chess.js';

class App {
    constructor() {
        this.router = new Router();
        this.activeGame = null;
        this.init();
    }

    init() {
        console.log("GameArena Initializing...");

        // Register Views
        this.router.register('home', 'view-home');
        this.router.register('game', 'view-game');

        this.setupNavigation();
        this.setupGameEvents();

        // Start at home
        this.router.navigateTo('home');
    }

    setupNavigation() {
        const backBtn = document.getElementById('btn-back-home');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                eventBus.emit('navigate', 'home');
                this.stopActiveGame();
            });
        }
    }

    setupGameEvents() {
        // Game Selection from Home
        eventBus.on('game:select', (gameType) => {
            this.startGame(gameType);
        });

        // Status Updates from Game
        eventBus.on('status:update', (msg) => {
            const el = document.getElementById('status-display');
            if (el) el.textContent = msg;
        });

        // Restart Button
        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (this.activeGame) {
                    this.activeGame.reset();
                }
            });
        }
    }

    startGame(gameType) {
        this.stopActiveGame(); // Safety cleanup

        const containerId = 'game-board-area';

        switch (gameType) {
            case 'tictactoe':
                this.activeGame = new TicTacToe(containerId);
                break;
            case 'chess':
                this.activeGame = new ChessGame(containerId);
                break;
            case 'connect4':
                document.getElementById(containerId).innerHTML = "<h3>Connect 4 coming soon...</h3>";
                return;
            default:
                console.error("Unknown game type:", gameType);
                return;
        }

        if (this.activeGame) {
            this.activeGame.start();
        }
    }

    stopActiveGame() {
        if (this.activeGame) {
            this.activeGame.cleanup();
            this.activeGame = null;
        }
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.eventBus = eventBus; // Expose for HTML onclicks
});
