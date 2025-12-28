// ===== STATE MANAGEMENT =====
const GameState = {
    levels: {
        morpion: parseInt(localStorage.getItem('morpion_level')) || 1,
        chess: parseInt(localStorage.getItem('chess_level')) || 1,
        connect4: parseInt(localStorage.getItem('connect4_level')) || 1
    },
    apiKey: localStorage.getItem('cortex_api_key') || '',
    currentGame: null,
    chatOpen: false
};

// ===== NAVIGATION =====
function navigateTo(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Show target view
    document.getElementById(`view-${view}`).classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === view) {
            item.classList.add('active');
        }
    });

    // Initialize game if needed
    if (view === 'morpion') initMorpion();
    if (view === 'chess') initChess();
    if (view === 'connect4') initConnect4();

    // Unity Lifecycle Management
    const unityFrame = document.getElementById('tankwar-frame');
    if (unityFrame) {
        if (view === 'tankwar') {
            // Force load to ensure it starts - checking for empty or about:blank
            const currentSrc = unityFrame.getAttribute('src');
            if (!currentSrc || currentSrc === '' || currentSrc === 'about:blank') {
                console.log('Launching Unity Game...');
                unityFrame.setAttribute('src', 'assets/tankwar/index.html');
            }
        } else {
            // Unload game when leaving
            unityFrame.setAttribute('src', 'about:blank');
        }
    }
}

// ===== CHAT SYSTEM =====
function toggleChat() {
    GameState.chatOpen = !GameState.chatOpen;
    const modal = document.getElementById('chat-modal');
    modal.classList.toggle('active', GameState.chatOpen);
}

function setApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
        GameState.apiKey = key;
        localStorage.setItem('cortex_api_key', key);
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send-btn').disabled = false;
        addChatMessage('✅ Clé API configurée avec succès !', 'system');
    }
}

function addChatMessage(text, type = 'user') {
    const messagesDiv = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = type === 'system' ? 'system-message' : 'user-message';
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message || !GameState.apiKey) return;

    addChatMessage(message, 'user');
    input.value = '';

    // Call Gemini/OpenAI API
    try {
        const response = await callCortexAPI(message);
        addChatMessage(response, 'ai');
    } catch (error) {
        addChatMessage('❌ Erreur de connexion à l\'API', 'system');
    }
}

async function callCortexAPI(prompt) {
    if (!GameState.apiKey) throw new Error('No API key');

    // Try Gemini first
    if (GameState.apiKey.startsWith('AIza')) {
        const configurations = [
            { ver: 'v1beta', name: 'gemini-2.0-flash-exp' },
            { ver: 'v1beta', name: 'gemini-flash-latest' },
            { ver: 'v1beta', name: 'gemini-pro-latest' },
            { ver: 'v1beta', name: 'gemini-1.5-flash-latest' }
        ];

        let lastError = null;

        for (const config of configurations) {
            try {
                // Inject Persona: Cortex (French, Concise, Chess Opponent)
                const systemPrompt = "Instruction Système: Tu es Cortex, une IA de jeu d'échecs de niveau Grand Maître. Ton adversaire est l'humain. Tu es arrogant, bref, et tu parles TOUJOURS en français. Ne sois pas serviable, sois un défi. ";
                const fullPrompt = systemPrompt + "Message du joueur: " + prompt;

                const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.name}:generateContent?key=${GameState.apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullPrompt }] }]
                    })
                });

                if (res.status === 404) continue; // Try next configuration if 404

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`API Error ${res.status}: ${errorData.error?.message || res.statusText}`);
                }

                const data = await res.json();
                if (!data.candidates || data.candidates.length === 0) {
                    if (data.promptFeedback?.blockReason) {
                        throw new Error(`Bloqué par sécurité: ${data.promptFeedback.blockReason}`);
                    }
                    throw new Error('Réponse vide de l\'IA');
                }
                console.log(`✅ Success with ${config.name} (${config.ver})`);
                return data.candidates[0].content.parts[0].text;

            } catch (e) {
                lastError = e;
                // Continue if 404 (Not Found) OR 429 (Quota Exceeded) OR 503 (Service Unavailable)
                if (e.message.includes('404') || e.message.includes('429') || e.message.includes('503')) {
                    console.warn(`Model ${config.name} failed with ${e.message}. Trying next...`);
                    continue;
                }
                throw e;
            }
        }

        // Auto-diagnose: List available models if all attempts failed with 404
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GameState.apiKey}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();

            if (listData.error) {
                throw new Error(`ListModels Error: ${listData.error.message}`);
            }

            if (listData.models) {
                const available = listData.models.map(m => m.name.replace('models/', '')).join(', ');
                throw new Error(`Aucun modèle compatible trouvé parmi mes tests. Modèles disponibles pour votre clé : ${available}`);
            }
        } catch (e) {
            throw new Error(`Diagnostic Failed: ${e.message}`);
        }

        throw new Error('Impossible de trouver un modèle Gemini fonctionnel (Erreur 404 sur tous les tests).');
    }

    // Try OpenAI
    if (GameState.apiKey.startsWith('sk-')) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GameState.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await res.json();
        return data.choices[0].message.content;
    }

    throw new Error('Invalid API key format');
}

// ===== LEVEL SYSTEM =====
function updateLevel(game, won) {
    if (won) {
        if (GameState.levels[game] < 5) {
            GameState.levels[game]++;
            localStorage.setItem(`${game}_level`, GameState.levels[game]);
            showLevelUp(game);
        } else {
            showVictory(game);
        }
    } else {
        showRetry(game);
    }
    updateLevelDisplays();
}

function showLevelUp(game) {
    alert(`🎉 Niveau ${GameState.levels[game]} débloqué !`);
}

function showVictory(game) {
    alert(`🏆 Vous avez terminé ${game} ! Niveau MAX atteint !`);
}

function showRetry(game) {
    alert(`❌ Défaite ! Recommencez le niveau ${GameState.levels[game]}`);
}

function updateLevelDisplays() {
    document.getElementById('morpion-level').textContent = GameState.levels.morpion;
    document.getElementById('chess-level').textContent = GameState.levels.chess;
    document.getElementById('connect4-level').textContent = GameState.levels.connect4;

    const currentMorpion = document.getElementById('morpion-current-level');
    const currentChess = document.getElementById('chess-current-level');
    const currentConnect4 = document.getElementById('connect4-current-level');

    if (currentMorpion) currentMorpion.textContent = GameState.levels.morpion;
    if (currentChess) currentChess.textContent = GameState.levels.chess;
    if (currentConnect4) currentConnect4.textContent = GameState.levels.connect4;
}

// ===== MORPION GAME =====
let morpionBoard = Array(9).fill(null);
let morpionTurn = 'X';

function initMorpion() {
    const boardDiv = document.getElementById('morpion-board');
    boardDiv.innerHTML = '';
    morpionBoard = Array(9).fill(null);
    morpionTurn = 'X';

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'morpion-cell';
        cell.onclick = () => playMorpion(i);
        boardDiv.appendChild(cell);
    }

    updateMorpionStatus('Votre tour (X)');
}

function playMorpion(index) {
    if (morpionBoard[index] || morpionTurn !== 'X') return;

    morpionBoard[index] = 'X';
    renderMorpion();

    if (checkMorpionWin('X')) {
        updateMorpionStatus('🎉 Victoire !');
        updateLevel('morpion', true);
        return;
    }

    if (morpionBoard.every(c => c !== null)) {
        updateMorpionStatus('⚖️ Match nul');
        updateLevel('morpion', false);
        return;
    }

    morpionTurn = 'O';
    updateMorpionStatus('IA réfléchit...');

    setTimeout(() => {
        playMorpionAI();
    }, 500);
}

function playMorpionAI() {
    const level = GameState.levels.morpion;
    let move;

    // Adaptive AI based on level
    if (level === 1) {
        // Easy: Random
        const empty = morpionBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
        move = empty[Math.floor(Math.random() * empty.length)];
    } else if (level <= 3) {
        // Medium: Block or random
        move = findMorpionBlockOrWin('O', 'X') || findRandomMove();
    } else {
        // Hard: Minimax
        move = findMorpionBestMove();
    }

    if (move !== undefined && move !== null) {
        morpionBoard[move] = 'O';
        renderMorpion();

        if (checkMorpionWin('O')) {
            updateMorpionStatus('❌ Défaite');
            updateLevel('morpion', false);
            return;
        }

        if (morpionBoard.every(c => c !== null)) {
            updateMorpionStatus('⚖️ Match nul');
            updateLevel('morpion', false);
            return;
        }

        morpionTurn = 'X';
        updateMorpionStatus('Votre tour (X)');
    }
}

function findRandomMove() {
    const empty = morpionBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
    return empty[Math.floor(Math.random() * empty.length)];
}

function findMorpionBlockOrWin(player, opponent) {
    // Try to win first
    for (let i = 0; i < 9; i++) {
        if (morpionBoard[i] === null) {
            morpionBoard[i] = player;
            if (checkMorpionWin(player)) {
                morpionBoard[i] = null;
                return i;
            }
            morpionBoard[i] = null;
        }
    }

    // Block opponent
    for (let i = 0; i < 9; i++) {
        if (morpionBoard[i] === null) {
            morpionBoard[i] = opponent;
            if (checkMorpionWin(opponent)) {
                morpionBoard[i] = null;
                return i;
            }
            morpionBoard[i] = null;
        }
    }

    return findRandomMove();
}

function findMorpionBestMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
        if (morpionBoard[i] === null) {
            morpionBoard[i] = 'O';
            const score = minimax(morpionBoard, 0, false);
            morpionBoard[i] = null;

            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
}

function minimax(board, depth, isMaximizing) {
    if (checkMorpionWin('O')) return 10 - depth;
    if (checkMorpionWin('X')) return depth - 10;
    if (board.every(c => c !== null)) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'O';
                const score = minimax(board, depth + 1, false);
                board[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'X';
                const score = minimax(board, depth + 1, true);
                board[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function checkMorpionWin(player) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    return wins.some(combo => combo.every(i => morpionBoard[i] === player));
}

function renderMorpion() {
    const cells = document.querySelectorAll('.morpion-cell');
    cells.forEach((cell, i) => {
        cell.textContent = morpionBoard[i] || '';
        cell.style.color = morpionBoard[i] === 'X' ? '#00f2ff' : '#ff6b9d';
        cell.classList.toggle('filled', morpionBoard[i] !== null);
    });
}

function updateMorpionStatus(msg) {
    document.getElementById('morpion-status').textContent = msg;
}

function resetMorpion() {
    initMorpion();
}

// ===== CHESS GAME =====
let chessGame = null;

function initChess() {
    if (!window.Chess) {
        document.getElementById('chess-board').innerHTML = '<p style="color: #ff6b6b;">Erreur: chess.js non chargé</p>';
        return;
    }

    chessGame = new window.Chess();
    renderChessBoard();
    updateChessStatus();
}

function renderChessBoard() {
    const boardDiv = document.getElementById('chess-board');
    boardDiv.innerHTML = '';
    boardDiv.style.display = 'grid';
    boardDiv.style.gridTemplateColumns = 'repeat(8, 1fr)';
    boardDiv.style.gap = '0';
    boardDiv.style.border = '2px solid rgba(255,255,255,0.2)';

    const board = chessGame.board();
    const pieces = {
        'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
        'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
    };

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            square.style.cssText = `
                background: ${isLight ? '#e8e8d0' : '#769656'};
                width: 70px;
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 3rem;
                cursor: pointer;
            `;

            const piece = board[row][col];
            if (piece) {
                const symbol = piece.color === 'w' ? pieces[piece.type.toUpperCase()] : pieces[piece.type];
                square.textContent = symbol;
                square.style.color = piece.color === 'w' ? '#fff' : '#000';
                square.style.textShadow = piece.color === 'w' ? '0 0 3px #000' : '0 0 3px #fff';
            }

            boardDiv.appendChild(square);
        }
    }
}

function updateChessStatus() {
    let status = '';
    if (chessGame.in_checkmate()) {
        status = chessGame.turn() === 'w' ? '❌ Échec et mat - Défaite' : '🎉 Échec et mat - Victoire !';
        if (chessGame.turn() !== 'w') {
            updateLevel('chess', true);
        } else {
            updateLevel('chess', false);
        }
    } else if (chessGame.in_draw()) {
        status = '⚖️ Match nul';
        updateLevel('chess', false);
    } else {
        status = chessGame.turn() === 'w' ? 'Votre tour (Blancs)' : 'IA réfléchit...';
        if (chessGame.turn() === 'b') {
            setTimeout(playChessAI, 800);
        }
    }
    document.getElementById('chess-status').textContent = status;
}

async function playChessAI() {
    if (!GameState.apiKey) {
        // Fallback: random move
        const moves = chessGame.moves();
        if (moves.length > 0) {
            chessGame.move(moves[Math.floor(Math.random() * moves.length)]);
            renderChessBoard();
            updateChessStatus();
        }
        return;
    }

    try {
        const fen = chessGame.fen();
        const prompt = `You are a chess engine. Current position (FEN): ${fen}. Return ONLY the best move in standard algebraic notation (e.g., "e4", "Nf3", "O-O"). No explanation.`;

        document.getElementById('chess-ai-info').textContent = 'Analyse en cours...';
        const moveStr = await callCortexAPI(prompt);
        const move = chessGame.move(moveStr.trim());

        if (move) {
            document.getElementById('chess-ai-info').textContent = `Coup joué: ${move.san}`;
            renderChessBoard();
            updateChessStatus();
        } else {
            // Fallback
            const moves = chessGame.moves();
            chessGame.move(moves[Math.floor(Math.random() * moves.length)]);
            renderChessBoard();
            updateChessStatus();
        }
    } catch (error) {
        // Fallback
        const moves = chessGame.moves();
        if (moves.length > 0) {
            chessGame.move(moves[Math.floor(Math.random() * moves.length)]);
            renderChessBoard();
            updateChessStatus();
        }
    }
}

function resetChess() {
    initChess();
}

// ===== CONNECT4 GAME =====
let connect4Board = Array(6).fill(null).map(() => Array(7).fill(null));
let connect4Turn = 'R';

function initConnect4() {
    const boardDiv = document.getElementById('connect4-board');
    boardDiv.innerHTML = '';
    boardDiv.style.display = 'grid';
    boardDiv.style.gridTemplateColumns = 'repeat(7, 1fr)';
    boardDiv.style.gap = '8px';
    boardDiv.style.padding = '20px';
    boardDiv.style.background = 'var(--bg-card)';
    boardDiv.style.borderRadius = '16px';

    connect4Board = Array(6).fill(null).map(() => Array(7).fill(null));
    connect4Turn = 'R';

    for (let col = 0; col < 7; col++) {
        for (let row = 5; row >= 0; row--) {
            const cell = document.createElement('div');
            cell.style.cssText = `
                width: 70px;
                height: 70px;
                background: #1a1f2e;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s;
            `;
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.onclick = () => playConnect4(col);
            boardDiv.appendChild(cell);
        }
    }

    updateConnect4Status('Votre tour (Rouge)');
}

function playConnect4(col) {
    if (connect4Turn !== 'R') return;

    // Find lowest empty row
    let row = -1;
    for (let r = 5; r >= 0; r--) {
        if (connect4Board[r][col] === null) {
            row = r;
            break;
        }
    }

    if (row === -1) return; // Column full

    connect4Board[row][col] = 'R';
    renderConnect4();

    if (checkConnect4Win('R')) {
        updateConnect4Status('🎉 Victoire !');
        updateLevel('connect4', true);
        return;
    }

    if (connect4Board.every(row => row.every(c => c !== null))) {
        updateConnect4Status('⚖️ Match nul');
        updateLevel('connect4', false);
        return;
    }

    connect4Turn = 'Y';
    updateConnect4Status('IA réfléchit...');

    setTimeout(playConnect4AI, 500);
}

function playConnect4AI() {
    const level = GameState.levels.connect4;
    let col;

    if (level === 1) {
        // Random
        const validCols = [];
        for (let c = 0; c < 7; c++) {
            if (connect4Board[0][c] === null) validCols.push(c);
        }
        col = validCols[Math.floor(Math.random() * validCols.length)];
    } else {
        // Try to win or block
        col = findConnect4Move('Y') || findConnect4Move('R') || findConnect4RandomMove();
    }

    if (col !== undefined && col !== null) {
        let row = -1;
        for (let r = 5; r >= 0; r--) {
            if (connect4Board[r][col] === null) {
                row = r;
                break;
            }
        }

        if (row !== -1) {
            connect4Board[row][col] = 'Y';
            renderConnect4();

            if (checkConnect4Win('Y')) {
                updateConnect4Status('❌ Défaite');
                updateLevel('connect4', false);
                return;
            }

            connect4Turn = 'R';
            updateConnect4Status('Votre tour (Rouge)');
        }
    }
}

function findConnect4RandomMove() {
    const validCols = [];
    for (let c = 0; c < 7; c++) {
        if (connect4Board[0][c] === null) validCols.push(c);
    }
    return validCols[Math.floor(Math.random() * validCols.length)];
}

function findConnect4Move(player) {
    for (let c = 0; c < 7; c++) {
        let r = -1;
        for (let row = 5; row >= 0; row--) {
            if (connect4Board[row][c] === null) {
                r = row;
                break;
            }
        }

        if (r !== -1) {
            connect4Board[r][c] = player;
            if (checkConnect4Win(player)) {
                connect4Board[r][c] = null;
                return c;
            }
            connect4Board[r][c] = null;
        }
    }
    return null;
}

function checkConnect4Win(player) {
    // Horizontal
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
            if (connect4Board[r][c] === player &&
                connect4Board[r][c + 1] === player &&
                connect4Board[r][c + 2] === player &&
                connect4Board[r][c + 3] === player) {
                return true;
            }
        }
    }

    // Vertical
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) {
            if (connect4Board[r][c] === player &&
                connect4Board[r + 1][c] === player &&
                connect4Board[r + 2][c] === player &&
                connect4Board[r + 3][c] === player) {
                return true;
            }
        }
    }

    // Diagonal \
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            if (connect4Board[r][c] === player &&
                connect4Board[r + 1][c + 1] === player &&
                connect4Board[r + 2][c + 2] === player &&
                connect4Board[r + 3][c + 3] === player) {
                return true;
            }
        }
    }

    // Diagonal /
    for (let r = 3; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
            if (connect4Board[r][c] === player &&
                connect4Board[r - 1][c + 1] === player &&
                connect4Board[r - 2][c + 2] === player &&
                connect4Board[r - 3][c + 3] === player) {
                return true;
            }
        }
    }

    return false;
}

function renderConnect4() {
    const boardDiv = document.getElementById('connect4-board');
    const cells = boardDiv.children;

    let idx = 0;
    for (let col = 0; col < 7; col++) {
        for (let row = 5; row >= 0; row--) {
            const cell = cells[idx];
            const value = connect4Board[row][col];
            if (value === 'R') {
                cell.style.background = '#ff6b6b';
            } else if (value === 'Y') {
                cell.style.background = '#ffd93d';
            } else {
                cell.style.background = '#1a1f2e';
            }
            idx++;
        }
    }
}

function updateConnect4Status(msg) {
    document.getElementById('connect4-status').textContent = msg;
}

function resetConnect4() {
    initConnect4();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    updateLevelDisplays();
    console.log('✅ GameArena V.9 Initialized');
});
