import { GameInterface } from './GameInterface.js';
import { eventBus } from '../core/EventBus.js';

export class TicTacToe extends GameInterface {
    constructor(containerId) {
        super(containerId);
        this.state = Array(9).fill(null);
        this.currentPlayer = 'X'; // Human
        this.isActive = false;
    }

    start() {
        this.isActive = true;
        this.render();
        eventBus.emit('status:update', 'Your Turn (X)');
    }

    reset() {
        this.state = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.isActive = true;
        this.render();
        eventBus.emit('status:update', 'Game Reset. Your Turn (X)');
    }

    handleCellClick(index) {
        if (!this.isActive || this.state[index]) return;

        // Human Move
        this.makeMove(index, 'X');

        if (this.checkWin('X')) {
            this.endGame('You Win!');
            return;
        }
        if (this.checkDraw()) {
            this.endGame('Draw!');
            return;
        }

        // AI Move (Simulated for now to prevent freeze, real AI comes next)
        this.currentPlayer = 'O';
        eventBus.emit('status:update', 'AI Thinking...');

        // Anti-Freeze: setTimeout to allow UI to render first
        setTimeout(() => this.aiMove(), 500);
    }

    makeMove(index, player) {
        this.state[index] = player;
        this.render(); // Re-render whole board for simplicity (no partial updates yet)
    }

    aiMove() {
        if (!this.isActive) return;

        // Simple Random AI for testing structure
        const emptyIndices = this.state.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (emptyIndices.length > 0) {
            const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            this.makeMove(randomIdx, 'O');

            if (this.checkWin('O')) {
                this.endGame('AI Wins!');
            } else if (this.checkDraw()) {
                this.endGame('Draw!');
            } else {
                this.currentPlayer = 'X';
                eventBus.emit('status:update', 'Your Turn (X)');
            }
        }
    }

    checkWin(player) {
        const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]           // Diagonals
        ];
        return wins.some(combo => combo.every(i => this.state[i] === player));
    }

    checkDraw() {
        return this.state.every(cell => cell !== null);
    }

    endGame(message) {
        this.isActive = false;
        eventBus.emit('status:update', message);
    }

    render() {
        this.container.innerHTML = `
            <style>
                .ttt-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    width: 300px;
                    height: 300px;
                }
                .ttt-cell {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .ttt-cell:hover {
                    background: rgba(255,255,255,0.1);
                }
                .cell-x { color: var(--accent-primary); }
                .cell-o { color: var(--accent-danger); }
            </style>
            <div class="ttt-grid">
                ${this.state.map((cell, i) => `
                    <div class="ttt-cell ${cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : ''}" 
                         data-index="${i}">
                        ${cell || ''}
                    </div>
                `).join('')}
            </div>
        `;

        // Re-attach listeners after render
        this.container.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                this.handleCellClick(parseInt(cell.dataset.index));
            });
        });
    }
}
