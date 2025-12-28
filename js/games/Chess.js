import { GameInterface } from './GameInterface.js';
import { eventBus } from '../core/EventBus.js';
import { aiService } from '../services/AIService.js';

export class ChessGame extends GameInterface {
    constructor(containerId) {
        super(containerId);
        this.game = new window.Chess();
        this.selectedSquare = null;
        this.boardEl = null;
        this.pieces = {
            'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
            'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
        };
    }

    start() {
        this.renderBoard();
        this.updateStatus();
    }

    reset() {
        this.game.reset();
        this.selectedSquare = null;
        this.updateBoard();
        this.updateStatus();
        eventBus.emit('status:update', 'Game Reset. White to Move.');
    }

    handleSquareClick(square) {
        // Human's turn is White in this simple version
        if (this.game.game_over()) return;

        // If clicking same square, deselect
        if (this.selectedSquare === square) {
            this.selectedSquare = null;
            this.highlightSquares([]);
            return;
        }

        // If making a move
        if (this.selectedSquare) {
            const move = {
                from: this.selectedSquare,
                to: square,
                promotion: 'q' // Always promote to queen for simplicity
            };

            const result = this.game.move(move);
            if (result) {
                // Valid move
                this.selectedSquare = null;
                this.updateBoard();
                this.updateStatus();
                this.triggerAIMove();
                return;
            }
        }

        // Selecting a piece
        const piece = this.game.get(square);
        if (piece && piece.color === this.game.turn()) {
            this.selectedSquare = square;
            this.highlightSquares([square, ...this.game.moves({ square: square, verbose: true }).map(m => m.to)]);
        }
    }

    async triggerAIMove() {
        if (this.game.game_over()) return;

        eventBus.emit('status:update', 'CORTEX IS THINKING... 🧠');

        // Determiner le niveau (stocké en localStorage ou props)
        // Pour l'instant on mock à 'test' ou récupération depuis LS
        const level = localStorage.getItem('chess_level') || 'test';

        // Appel à l'IA via AIService
        const fen = this.game.fen();
        const history = this.game.history();

        try {
            const moveSan = await aiService.getChessMove(fen, level, history);

            if (moveSan) {
                if (moveSan === 'random') {
                    // Fallback logic
                    this.makeRandomMove();
                } else {
                    // Try to play the SAN move
                    try {
                        const result = this.game.move(moveSan);
                        if (!result) {
                            // If Gemini gave invalid move, fallback to random to keep game going
                            console.warn("Invalid move from Cortex:", moveSan);
                            this.makeRandomMove();
                        } else {
                            this.updateBoard();
                            this.updateStatus();
                        }
                    } catch (e) {
                        this.makeRandomMove();
                    }
                }
            } else {
                this.makeRandomMove();
            }
        } catch (err) {
            console.error("AI Move Error", err);
            this.makeRandomMove();
        }
    }

    makeRandomMove() {
        const moves = this.game.moves();
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            this.game.move(randomMove);
            this.updateBoard();
            this.updateStatus();
        }
    }

    updateStatus() {
        let status = '';
        if (this.game.in_checkmate()) {
            status = 'Checkmate!';
        } else if (this.game.in_draw()) {
            status = 'Draw!';
        } else {
            status = this.game.turn() === 'w' ? 'Your Turn (White)' : 'AI Turn (Black)';
            if (this.game.in_check()) {
                status += ' (CHECK!)';
            }
        }
        eventBus.emit('status:update', status);
    }

    renderBoard() {
        this.container.innerHTML = '';
        this.boardEl = document.createElement('div');
        this.boardEl.className = 'chess-board';

        // CSS for board
        const style = document.createElement('style');
        style.textContent = `
            .chess-board {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                width: 480px;
                height: 480px;
                border: 2px solid var(--text-secondary);
            }
            .chess-square {
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                cursor: pointer;
            }
            .square-light { background: #eeeed2; color: black; }
            .square-dark { background: #769656; color: black; }
            .square-selected { background: rgba(255, 255, 0, 0.5) !important; }
            .square-highlight { background: rgba(0, 255, 255, 0.5) !important; box-shadow: inset 0 0 10px blue;}
            
            /* Piece Colors if using text/emoji */
            .piece-w { color: #fff; text-shadow: 0 0 2px #000; }
            .piece-b { color: #000; text-shadow: 0 0 1px #fff; }
        `;
        this.container.appendChild(style);
        this.container.appendChild(this.boardEl);

        // Generate Squares
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        let isLight = true;

        for (const rank of ranks) {
            for (const file of files) {
                const squareDiv = document.createElement('div');
                const squareId = file + rank;
                squareDiv.className = `chess-square ${isLight ? 'square-light' : 'square-dark'}`;
                squareDiv.dataset.square = squareId;

                squareDiv.onclick = () => this.handleSquareClick(squareId);

                this.boardEl.appendChild(squareDiv);
                isLight = !isLight;
            }
            isLight = !isLight;
        }

        this.updateBoard();
    }

    updateBoard() {
        const board = this.game.board(); // 8x8 array
        const squares = this.boardEl.querySelectorAll('.chess-square');

        // Should optimize this mapping, but valid for now
        let i = 0;
        board.forEach(row => {
            row.forEach(piece => {
                const el = squares[i];
                el.innerHTML = '';
                if (piece) {
                    const span = document.createElement('span');
                    span.className = `piece-${piece.color}`;
                    span.textContent = this.pieces[piece.type] || '';
                    if (piece.color === 'w') span.textContent = this.pieces[piece.type.toUpperCase()]; // Use mapped chars

                    // Better emoji mapping override based on color to ensure visibility
                    // Actually, let's just use the char code, filtering is done above
                    // Re-Correction: Emoji characters are universal, we add class for slight styling
                    el.appendChild(span);
                }
                el.classList.remove('square-selected', 'square-highlight');
                i++;
            });
        });

        // Re-apply highlight if needed
        if (this.selectedSquare) {
            const index = this.getSquareIndex(this.selectedSquare);
            if (index !== -1) squares[index].classList.add('square-selected');
        }
    }

    highlightSquares(squaresToHighlight) {
        const allSquares = this.boardEl.querySelectorAll('.chess-square');
        squaresToHighlight.forEach(sq => {
            const idx = this.getSquareIndex(sq);
            if (idx !== -1) allSquares[idx].classList.add('square-highlight');
        });
    }

    getSquareIndex(square) {
        const fileMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
        const file = fileMap[square[0]];
        const rank = 8 - parseInt(square[1]); // 8->0, 1->7
        return rank * 8 + file;
    }
}
