// ===== STATE =====
const State = {
    apiKey: localStorage.getItem('api_key') || '',
    apiProvider: localStorage.getItem('api_provider') || 'gemini',
    levels: {
        morpion: parseInt(localStorage.getItem('level_morpion')) || 1,
        chess: parseInt(localStorage.getItem('level_chess')) || 1,
        connect4: parseInt(localStorage.getItem('level_connect4')) || 1
    },
    games: {
        morpion: null,
        chess: null,
        connect4: null
    }
};

// ===== NAVIGATION =====
function navigateTo(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const navItems = document.querySelectorAll('.nav-item');
    const viewNames = ['home', 'morpion', 'chess', 'connect4', 'tankwar'];
    const index = viewNames.indexOf(view);
    if (index >= 0 && navItems[index]) {
        navItems[index].classList.add('active');
    }

    // INIT GAMES with security check for AI games
    if (view === 'chess') {
        if (!State.apiKey) {
            alert('🔒 Clé API manquante.\n\nCe jeu nécessite l\'intelligence artificielle Gemini Pro.\nVeuillez configurer votre clé dans les paramètres (⚙️).');
            navigateTo('home');
            return;
        }
        initChess();
    }

    if (view === 'morpion') initMorpion();
    if (view === 'connect4') initConnect4();
    if (view === 'tankwar') {
        // Reset to initial state (show overlay, empty frame)
        const overlay = document.getElementById('tankwar-overlay');
        const frame = document.getElementById('tankwar-frame');
        if (overlay) overlay.style.display = 'flex';
        if (frame && frame.getAttribute('src') !== '') {
            frame.setAttribute('src', ''); // Ensure it's empty initially to prevent background play
        }
    } else {
        // Unload Tank War if leaving the view
        const frame = document.getElementById('tankwar-frame');
        if (frame) {
            frame.setAttribute('src', 'about:blank');
        }
    }
}

function launchTankWar() {
    const frame = document.getElementById('tankwar-frame');
    const overlay = document.getElementById('tankwar-overlay');

    if (frame && overlay) {
        console.log('🚀 Manual Launch Triggered');
        overlay.style.display = 'none';
        frame.setAttribute('src', 'assets/tankwar/index.html');
    }
}

// ===== SETTINGS =====
function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    document.getElementById('api-provider').value = State.apiProvider;
    document.getElementById('api-key').value = State.apiKey;
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function saveApiKey() {
    State.apiKey = document.getElementById('api-key').value.trim();
    State.apiProvider = document.getElementById('api-provider').value;

    localStorage.setItem('api_key', State.apiKey);
    localStorage.setItem('api_provider', State.apiProvider);

    if (State.apiKey) {
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send').disabled = false;
        addChatMessage('✅ Clé API sauvegardée avec succès', 'system');
        const statusEl = document.getElementById('cortex-status');
        if (statusEl) {
            statusEl.textContent = 'ONLINE 🟢';
            statusEl.classList.remove('offline');
        }
    } else {
        const statusEl = document.getElementById('cortex-status');
        if (statusEl) {
            statusEl.textContent = 'OFFLINE 🔴';
            statusEl.classList.add('offline');
        }
    }

    closeSettings();
}

// ===== CHAT =====
function addChatMessage(text, type = 'user') {
    const messagesDiv = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = type === 'system' ? 'system-msg' : type === 'user' ? 'user-msg' : 'ai-msg';
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message || !State.apiKey) return;

    addChatMessage(message, 'user');
    input.value = '';

    try {
        const response = await callAPI(message);
        addChatMessage(response, 'ai');
    } catch (error) {
        addChatMessage('❌ Erreur: ' + error.message, 'system');
    }
}

async function callAPI(prompt) {
    if (State.apiProvider === 'gemini') {
        const configurations = [
            { ver: 'v1beta', name: 'gemini-2.5-flash' },
            { ver: 'v1beta', name: 'gemini-2.0-flash' },
            { ver: 'v1beta', name: 'gemini-2.0-flash-exp' },
            { ver: 'v1beta', name: 'gemini-1.5-flash' },
            { ver: 'v1beta', name: 'gemini-1.5-pro' }
        ];

        let lastError = null;

        for (const config of configurations) {
            try {
                const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.name}:generateContent?key=${State.apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
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
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${State.apiKey}`;
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
            // If diagnostic fails, show THAT error because it's likely the root cause (e.g. invalid key 400)
            throw new Error(`Diagnostic Failed: ${e.message}`);
        }

        throw new Error('Impossible de trouver un modèle Gemini fonctionnel (Erreur 404 sur tous les tests).');
    } else {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${State.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await res.json();
        return data.choices[0].message.content;
    }
}

// ===== LEVEL SYSTEM =====
function levelUp(game) {
    if (State.levels[game] < 5) {
        State.levels[game]++;
        localStorage.setItem(`level_${game}`, State.levels[game]);
        updateLevelDisplays();
        showNotification('levelup', `Niveau ${State.levels[game]} débloqué !`, `Félicitations ! Vous progressez dans ${game}.`);
    } else {
        showNotification('complete', 'Jeu Maîtrisé !', `🏆 Vous avez terminé tous les niveaux de ${game} !`);
    }
}

function levelRetry(game) {
    showNotification('defeat', 'Recommencez !', `Vous devez recommencer le niveau ${State.levels[game]}.`);
}

function updateLevelDisplays() {
    // Update Grid Cards
    for (const [game, level] of Object.entries(State.levels)) {
        const levelEl = document.getElementById(`level-${game}`);
        if (levelEl) levelEl.textContent = level;

        // CALIBRATION LOGIC FOR CHESS (CORTEX MODE)
        if (game === 'chess') {
            const chessMatches = parseInt(localStorage.getItem('chess_matches_played')) || 0;
            let label = "";
            let color = "#F6C85F";

            if (chessMatches === 0) { label = "PHASE 1 : CALIBRAGE"; color = "#F6C85F"; }
            else if (chessMatches === 1) { label = "PHASE 2 : LE DUEL"; color = "#FF6B6B"; }
            else if (chessMatches === 2) { label = "PHASE 3 : LA FINALE"; color = "#FF0000"; }
            else { label = "CORTEX VAINCU"; color = "#00FF00"; }

            if (levelEl) {
                levelEl.parentElement.innerHTML = `
                <span style="
                    color: #fff; 
                    background: ${color}; 
                    padding: 4px 12px; 
                    border-radius: 6px; 
                    font-size: 0.85rem; 
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    ${label}
                </span>`;
            }
            updateProgressBar(game, Math.min(100, (chessMatches / 3) * 100)); // 3 Phases
        } else {
            updateProgressBar(game, level);
        }
    }

    // Update Mini-Levels in Game Views
    for (const [game, level] of Object.entries(State.levels)) {
        const miniLevelEl = document.getElementById(`${game}-level`);
        if (miniLevelEl) {
            if (game === 'chess') {
                // Use specific Cortex Phase labels for Chess
                const chessMatches = parseInt(localStorage.getItem('chess_matches_played')) || 0;
                if (chessMatches === 0) miniLevelEl.textContent = "MATCH TEST";
                else if (chessMatches === 1) miniLevelEl.textContent = "PHASE 2";
                else if (chessMatches === 2) miniLevelEl.textContent = "PHASE 3";
                else miniLevelEl.textContent = "COMPLETE";
            } else {
                miniLevelEl.textContent = `Niveau ${level}/5`;
            }
        }
    }

    // Update Hero Banner Stats
    const heroRankEl = document.getElementById('hero-rank');
    const heroEloEl = document.getElementById('hero-elo');

    if (heroRankEl && heroEloEl) {
        const chessLevel = State.levels.chess;
        const eloValue = 800 + (chessLevel * 400);

        let rankLabel = "NOV 1";
        if (chessLevel === 2) rankLabel = "AMATEUR";
        if (chessLevel === 3) rankLabel = "CLUBEUR";
        if (chessLevel === 4) rankLabel = "EXPERT";
        if (chessLevel === 5) rankLabel = "MASTER";

        heroRankEl.textContent = `🏆 RANK: ${rankLabel}`;
        heroEloEl.textContent = `⚡ ELO: ${eloValue}`;
    }
}

function updateProgressBar(game, level) {
    const progressEl = document.getElementById(`${game}-progress`);
    if (progressEl) {
        const percentage = (level / 5) * 100;
        progressEl.style.width = percentage + '%';
    }
}

function resetGame(game) {
    if (game === 'morpion') initMorpion();
    if (game === 'chess') initChess();
    if (game === 'connect4') initConnect4();
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(type, title, message) {
    const modal = document.getElementById('notification-modal');
    const content = modal.querySelector('.notification-content');
    const icon = document.getElementById('notif-icon');
    const titleEl = document.getElementById('notif-title');
    const messageEl = document.getElementById('notif-message');

    // Remove previous classes
    content.classList.remove('victory', 'defeat', 'levelup');

    // Set content based on type
    if (type === 'victory') {
        icon.textContent = '🎉';
        content.classList.add('victory');
    } else if (type === 'defeat') {
        icon.textContent = '😔';
        content.classList.add('defeat');
    } else if (type === 'levelup') {
        icon.textContent = '⭐';
        content.classList.add('levelup');
    } else if (type === 'complete') {
        icon.textContent = '🏆';
        content.classList.add('levelup');
    }

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeNotification() {
    const modal = document.getElementById('notification-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Auto-restart game after notification closes
        const currentView = document.querySelector('.view.active');
        if (currentView) {
            const viewId = currentView.id;
            if (viewId === 'view-morpion') initMorpion();
            else if (viewId === 'view-chess') initChess();
            else if (viewId === 'view-connect4') initConnect4();
            else if (viewId === 'view-tankwar') initTankWar();

        }
    }, 300);
}

// ===== MORPION AI =====
function initMorpion() {
    const board = Array(9).fill(null);
    let turn = 'X';
    let gameOver = false;

    const boardDiv = document.getElementById('morpion-board');
    boardDiv.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'morpion-cell';
        cell.onclick = () => playMorpion(i);
        boardDiv.appendChild(cell);
    }

    function playMorpion(index) {
        if (board[index] || turn !== 'X' || gameOver) return;

        board[index] = 'X';
        renderBoard();

        if (checkWin('X')) {
            endGame('victory');
            return;
        }

        if (board.every(c => c)) {
            endGame('draw');
            return;
        }

        turn = 'O';
        setStatus('IA réfléchit...');

        // AI Delay for realism
        setTimeout(() => {
            const move = getBestMove();
            if (move !== -1) {
                board[move] = 'O';
                renderBoard();

                if (checkWin('O')) {
                    endGame('defeat');
                    return;
                }

                if (board.every(c => c)) {
                    endGame('draw');
                    return;
                }

                turn = 'X';
                setStatus('Votre tour (X)');
            }
        }, 500);
    }

    function endGame(result) {
        gameOver = true;
        if (result === 'victory') {
            setStatus('🎉 Victoire !');
            setTimeout(() => levelUp('morpion'), 500);
        } else if (result === 'defeat') {
            setStatus('❌ Défaite');
            setTimeout(() => levelRetry('morpion'), 500);
        } else {
            setStatus('⚖️ Match nul');
            setTimeout(() => levelRetry('morpion'), 500);
        }
    }

    function getBestMove() {
        const level = State.levels.morpion;

        // Level 1: Random (Easy)
        if (level === 1) return getRandomMove();

        // Level 2: Win or Block (Medium)
        if (level === 2) {
            // Try to win
            let move = findWinningMove('O');
            if (move !== -1) return move;
            // Block player
            move = findWinningMove('X');
            if (move !== -1) return move;
            return getRandomMove();
        }

        // Level 3+: Minimax (Hard/Unbeatable)
        // 20% chance of error on Level 3 to make it beatable
        // Level 3+: Minimax (Hard/Unbeatable)
        // STRICT: No randomness on Level 3+. Pure math.
        if (level >= 3) return minimax(board, 'O').index;

        return minimax(board, 'O').index;
    }

    function getRandomMove() {
        const empty = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : -1;
    }

    function findWinningMove(player) {
        for (let i = 0; i < 9; i++) {
            if (!board[i]) {
                board[i] = player;
                if (checkWin(player)) {
                    board[i] = null;
                    return i;
                }
                board[i] = null;
            }
        }
        return -1;
    }

    function minimax(currBoard, player) {
        const availSpots = currBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);

        if (checkWin('X')) return { score: -10 };
        if (checkWin('O')) return { score: 10 };
        if (availSpots.length === 0) return { score: 0 };

        const moves = [];

        for (let i = 0; i < availSpots.length; i++) {
            const move = {};
            move.index = availSpots[i];
            currBoard[availSpots[i]] = player;

            if (player === 'O') {
                const result = minimax(currBoard, 'X');
                move.score = result.score;
            } else {
                const result = minimax(currBoard, 'O');
                move.score = result.score;
            }

            currBoard[availSpots[i]] = null;
            moves.push(move);
        }

        let bestMove;
        if (player === 'O') {
            let bestScore = -10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        } else {
            let bestScore = 10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        }

        return moves[bestMove];
    }

    function checkWin(player) {
        const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        return wins.some(combo => combo.every(i => board[i] === player));
    }

    function renderBoard() {
        const cells = boardDiv.children;
        for (let i = 0; i < 9; i++) {
            cells[i].textContent = board[i] || '';
            cells[i].style.color = board[i] === 'X' ? '#00f2ff' : '#ff6b9d';
            cells[i].classList.toggle('taken', board[i] !== null);
        }
    }

    function setStatus(msg) {
        document.getElementById('morpion-status').textContent = msg;
    }

    setStatus('Votre tour (X)');
}

// ===== CHESS =====
function initChess() {
    if (!window.Chess) {
        document.getElementById('chess-board').innerHTML = '<p>Erreur: chess.js non chargé</p>';
        return;
    }

    const game = new window.Chess();
    const boardDiv = document.getElementById('chess-board');
    let selectedSquare = null;
    let possibleMoves = [];

    render();

    function render() {
        boardDiv.innerHTML = '';

        // Update Label
        const matchesPlayed = parseInt(localStorage.getItem('chess_matches_played')) || 0;
        const labelEl = document.querySelector('.match-test-label');
        if (labelEl) {
            if (matchesPlayed === 0) labelEl.textContent = "MATCH TEST (CALIBRATION)";
            else if (matchesPlayed === 1) labelEl.textContent = "CORTEX LEVEL 1";
            else labelEl.textContent = "CORTEX LEVEL 2 (MAX)";
        }

        boardDiv.style.display = 'grid';
        boardDiv.style.gridTemplateColumns = 'repeat(8, 1fr)';
        boardDiv.style.gap = '0';
        boardDiv.style.border = '2px solid rgba(255,255,255,0.2)';

        const board = game.board();
        // Reverting to Unicode for 100% Reliability and Speed
        const pieces = {
            'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
            'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
        };

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const squareName = String.fromCharCode(97 + col) + (8 - row);
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;

                // Modern Board Colors
                let bg = isLight ? '#EBECD0' : '#739552';
                if (selectedSquare === squareName) bg = '#F5F682'; // Yellow highlight
                if (possibleMoves.includes(squareName)) bg = isLight ? '#A9A950' : '#696910'; // Hint

                square.style.cssText = `
                    background: ${bg};
                    width: 70px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem; /* Giant pieces */
                    cursor: pointer;
                    user-select: none;
                    position: relative;
                `;

                const piece = board[row][col];
                if (piece) {
                    const symbol = piece.color === 'w' ? pieces[piece.type.toUpperCase()] : pieces[piece.type];
                    const pieceSpan = document.createElement('span');
                    pieceSpan.textContent = symbol;

                    // Professional Styling via Code (No Image)
                    if (piece.color === 'w') {
                        pieceSpan.style.color = '#fff';
                        pieceSpan.style.textShadow = '0 0 5px rgba(0,0,0,1), 1px 1px 2px black';
                    } else {
                        pieceSpan.style.color = '#000';
                        pieceSpan.style.textShadow = '0 0 2px rgba(255,255,255,0.5)';
                    }

                    square.appendChild(pieceSpan);
                }

                square.onclick = () => handleSquareClick(squareName);
                boardDiv.appendChild(square);
            }
        }

        updateStatus();
    }

    function handleSquareClick(square) {
        if (game.game_over() || game.turn() !== 'w') return; // Only allow Human (White) to move

        // If clicking a move target
        if (selectedSquare && possibleMoves.includes(square)) {
            game.move({ from: selectedSquare, to: square, promotion: 'q' });
            selectedSquare = null;
            possibleMoves = [];
            render();
            return;
        }

        // Check if clicking own piece
        const piece = game.get(square);
        if (piece && piece.color === 'w') {
            if (selectedSquare === square) {
                // Deselect
                selectedSquare = null;
                possibleMoves = [];
            } else {
                // Select
                selectedSquare = square;
                const moves = game.moves({ square: square, verbose: true });
                possibleMoves = moves.map(m => m.to);
            }
            render();
        } else {
            // Deselect if clicking empty or enemy not in move list
            selectedSquare = null;
            possibleMoves = [];
            render();
        }
    }

    function updateStatus() {
        let status = '';
        if (game.in_checkmate()) {
            status = game.turn() === 'w' ? '❌ Échec et mat - Défaite' : '🎉 Échec et mat - Victoire';
            if (game.turn() !== 'w') {
                if (!handleChessGameOver()) {
                    setTimeout(() => levelUp('chess'), 500);
                }
            } else {
                if (!handleChessGameOver()) {
                    setTimeout(() => levelRetry('chess'), 500);
                }
            }
        } else if (game.in_draw()) {
            status = '⚖️ Match nul';
            if (!handleChessGameOver()) {
                setTimeout(() => levelRetry('chess'), 500);
            }
        } else {
            status = game.turn() === 'w' ? 'Votre tour (Blancs)' : 'IA réfléchit...';
            if (game.turn() === 'b') {
                setTimeout(playGeminiAI, 300);
            }
        }
        document.getElementById('chess-status').textContent = status;
    }

    function playGeminiAI() {
        if (game.game_over()) return;

        const level = State.levels.chess;
        const fen = game.fen();
        const history = game.history().join(' ');
        let aiPrompt = "";
        let statusMsg = "";

        const matchesPlayed = parseInt(localStorage.getItem('chess_matches_played')) || 0;
        let persona = "";
        let systemInstruction = "";

        // UPDATE UI LABEL
        const labelEl = document.querySelector('.match-test-label');

        if (matchesPlayed === 0) {
            // PHASE 1: MATCH TEST / CALIBRATION
            if (labelEl) labelEl.textContent = "MATCH TEST (CALIBRATION)";
            statusMsg = `CORTEX (CALIBRAGE) : Analyse en cours...`;
            systemInstruction = "You are a beginner/intermediate chess player (Elo 1000). You are testing the opponent. Play a standard opening. Make occasional minor mistakes but generally play valid moves.";
        } else if (matchesPlayed === 1) {
            // PHASE 2: LEVEL 1 (INTERMEDIATE)
            if (labelEl) labelEl.textContent = "CORTEX LEVEL 1";
            statusMsg = `CORTEX (NIVEAU 1) : "Pas mal..."`;
            systemInstruction = "You are a strong intermediate chess player (Elo 1600). Play solid tactical moves. Punish blunders. Do not make simple mistakes.";
        } else {
            // PHASE 3: LEVEL 2 (GRANDMASTER)
            if (labelEl) labelEl.textContent = "CORTEX LEVEL 2 (MAX)";
            statusMsg = `CORTEX (NIVEAU 2) : "ECHEC ET MAT."`;
            systemInstruction = "You are a Grandmaster chess engine (Elo 2800+). Play the absolute best optimal move. Calculate deep variations. Show no mercy. Win as fast as possible.";
        }

        aiPrompt = `${systemInstruction}
        Current FEN: ${fen}
        History: ${history}
        You play as BLACK.
        Reply ONLY with the best move in Standard Algebraic Notation (SAN) or coordinate notation (e.g., e5, Nf3, e7e5). DO NOT EXPLAIN.`;

        document.getElementById('chess-status').textContent = statusMsg;

        callAPI(aiPrompt).then(response => {
            console.log("Gemini Response:", response);
            let moveSan = "";

            // Parsing Logic
            let cleanResponse = response.replace(/\*/g, '').replace(/\[|\]/g, '').trim();
            // Take the first word
            moveSan = cleanResponse.split(/[\s\n]+/)[0].replace('.', '');

            const move = game.move(moveSan);
            if (move) {
                render();
            } else {
                console.warn("Invalid move from Gemini:", response, "Trying fallback parsing...");
                // Try to find any valid move string in the text
                const possibleMove = cleanResponse.match(/([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:\=[KQRBN])?|O-O(?:-O)?)/);
                if (possibleMove && game.move(possibleMove[0])) {
                    render();
                } else {
                    document.getElementById('chess-status').textContent = "⚠️ Cortex Glitch. Random Move.";
                    fallbackMove();
                }
            }
        }).catch(err => {
            console.error("Gemini Error:", err);
            document.getElementById('chess-status').textContent = "⚠️ Cortex Offline. Random Move.";
            fallbackMove();
        });
    }

    function fallbackMove() {
        const moves = game.moves();
        if (moves.length > 0) {
            game.move(moves[Math.floor(Math.random() * moves.length)]);
            render();
        }
    }

    function handleChessGameOver() {
        // Simple match count for analytics, no more calibration logic
        let matchesPlayed = parseInt(localStorage.getItem('chess_matches_played')) || 0;
        matchesPlayed++;
        localStorage.setItem('chess_matches_played', matchesPlayed);
        return false; // Return false to allow standard levelUp/retry logic
    }
}

// ===== CONNECT 4 =====
function initConnect4() {
    const ROWS = 6;
    const COLS = 7;
    const board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    let turn = 'R';
    let gameOver = false;

    const boardDiv = document.getElementById('connect4-board');
    boardDiv.innerHTML = '';
    boardDiv.style.display = 'grid';
    boardDiv.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    boardDiv.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    boardDiv.style.gap = '8px';
    boardDiv.style.padding = '20px';
    boardDiv.style.background = 'var(--bg-card)';
    boardDiv.style.borderRadius = '16px';
    boardDiv.style.width = 'fit-content';
    boardDiv.style.margin = '0 auto';

    // Create cells row by row, top to bottom
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.style.cssText = `
                width: 70px;
                height: 70px;
                background: #2a3142;
                border-radius: 50%;
                cursor: pointer;
                transition: background 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.1);
            `;
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.onclick = () => playColumn(col);
            cell.onmouseenter = () => {
                if (!gameOver && turn === 'R') {
                    cell.style.borderColor = 'rgba(255, 107, 107, 0.5)';
                }
            };
            cell.onmouseleave = () => {
                cell.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            };
            boardDiv.appendChild(cell);
        }
    }

    function playColumn(col) {
        if (gameOver || turn !== 'R') return;

        // Find lowest empty row in this column
        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) {
                row = r;
                break;
            }
        }

        if (row === -1) return; // Column full

        board[row][col] = 'R';
        render();

        if (checkWin('R')) {
            setStatus('🎉 Victoire !');
            gameOver = true;
            setTimeout(() => levelUp('connect4'), 500);
            return;
        }

        if (isBoardFull()) {
            endGame('draw');
            return;
        }

        turn = 'Y';
        setStatus('IA réfléchit...');
        // Small delay for UX, then move
        setTimeout(() => {
            const col = getConnect4AIMove();

            // Find lowest empty row for the chosen col
            let row = -1;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (board[r][col] === null) {
                    row = r;
                    break;
                }
            }

            if (row !== -1) {
                board[row][col] = 'Y';
                render();

                if (checkWin('Y')) {
                    endGame('defeat');
                    return;
                }

                if (isBoardFull()) {
                    endGame('draw');
                    return;
                }
            }

            turn = 'R';
            setStatus('Votre tour (Rouge)');
        }, 500);
    }

    function endGame(result) {
        gameOver = true;
        if (result === 'victory') {
            setStatus('🎉 Victoire !');
            setTimeout(() => levelUp('connect4'), 500);
        } else if (result === 'defeat') {
            setStatus('❌ Défaite');
            setTimeout(() => levelRetry('connect4'), 500);
        } else {
            setStatus('⚖️ Match nul');
            setTimeout(() => levelRetry('connect4'), 500);
        }
    }

    function getConnect4AIMove() {
        const level = State.levels.connect4;
        const validCols = [];
        for (let c = 0; c < COLS; c++) {
            if (board[0][c] === null) validCols.push(c);
        }

        // IMPLEMENTATION MINIMAX (Depth based on Level)
        let depth = 1;
        if (level === 2) depth = 2;
        if (level === 3) depth = 4;
        if (level === 4) depth = 5;
        if (level === 5) depth = 7; // Grandmaster Depth (Wait ~1-2s)

        // On Level 1, keep it partly random
        if (level === 1 && Math.random() < 0.3) {
            const move = validCols[Math.floor(Math.random() * validCols.length)];
            return move;
        }

        const bestMove = minimaxC4(board, depth, -Infinity, Infinity, true);
        return bestMove.col;
    }

    function evaluateWindow(window) {
        let score = 0;
        let piece = 'Y'; // AI
        let opp = 'R';   // Player

        let countPiece = window.filter(c => c === piece).length;
        let countOpp = window.filter(c => c === opp).length;
        let countEmpty = window.filter(c => c === null).length;

        if (countPiece === 4) score += 100;
        else if (countPiece === 3 && countEmpty === 1) score += 5;
        else if (countPiece === 2 && countEmpty === 2) score += 2;

        // IMPROVED HEURISTIC: Value blocking more
        if (countOpp === 3 && countEmpty === 1) score -= 80; // URGENT BLOCK
        if (countOpp === 2 && countEmpty === 2) score -= 10; // Prevent setup

        return score;
    }

    function scorePosition(board, piece) {
        let score = 0;
        // Center Column Preference
        const centerArray = [];
        for (let r = 0; r < ROWS; r++) {
            centerArray.push(board[r][3]);
        }
        let centerCount = centerArray.filter(c => c === piece).length;
        score += centerCount * 3;

        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                let window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
                score += evaluateWindow(window);
            }
        }
        // Vertical
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS - 3; r++) {
                let window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
                score += evaluateWindow(window);
            }
        }
        // Diagonal /
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                let window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
                score += evaluateWindow(window);
            }
        }
        // Diagonal \
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                let window = [board[r + 3][c], board[r + 2][c + 1], board[r + 1][c + 2], board[r][c + 3]];
                score += evaluateWindow(window);
            }
        }
        return score;
    }

    function minimaxC4(nodeBoard, depth, alpha, beta, maximizingPlayer) {
        const validLocations = [];
        for (let c = 0; c < COLS; c++) {
            if (nodeBoard[0][c] === null) validLocations.push(c);
        }

        const isTerminal = checkWin('R') || checkWin('Y') || validLocations.length === 0;
        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                if (checkWin('Y')) return { score: 1000000 };
                if (checkWin('R')) return { score: -1000000 };
                return { score: 0 };
            } else {
                return { score: scorePosition(nodeBoard, 'Y') };
            }
        }

        if (maximizingPlayer) {
            let value = -Infinity;
            let column = validLocations[Math.floor(Math.random() * validLocations.length)];
            for (let col of validLocations) {
                // Copy board
                let row = -1;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (nodeBoard[r][col] === null) { row = r; break; }
                }
                const bCopy = nodeBoard.map(arr => [...arr]);
                if (row !== -1) bCopy[row][col] = 'Y';

                const newScore = minimaxC4(bCopy, depth - 1, alpha, beta, false).score;
                if (newScore > value) {
                    value = newScore;
                    column = col;
                }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break;
            }
            return { col: column, score: value };
        } else {
            let value = Infinity;
            let column = validLocations[Math.floor(Math.random() * validLocations.length)];
            for (let col of validLocations) {
                let row = -1;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (nodeBoard[r][col] === null) { row = r; break; }
                }
                const bCopy = nodeBoard.map(arr => [...arr]);
                if (row !== -1) bCopy[row][col] = 'R';

                const newScore = minimaxC4(bCopy, depth - 1, alpha, beta, true).score;
                if (newScore < value) {
                    value = newScore;
                    column = col;
                }
                beta = Math.min(beta, value);
                if (alpha >= beta) break;
            }
            return { col: column, score: value };
        }
    }

    function checkWin(player) {
        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c <= COLS - 4; c++) {
                if (board[r][c] === player &&
                    board[r][c + 1] === player &&
                    board[r][c + 2] === player &&
                    board[r][c + 3] === player) {
                    return true;
                }
            }
        }

        // Vertical
        for (let r = 0; r <= ROWS - 4; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] === player &&
                    board[r + 1][c] === player &&
                    board[r + 2][c] === player &&
                    board[r + 3][c] === player) {
                    return true;
                }
            }
        }

        // Diagonal \
        for (let r = 0; r <= ROWS - 4; r++) {
            for (let c = 0; c <= COLS - 4; c++) {
                if (board[r][c] === player &&
                    board[r + 1][c + 1] === player &&
                    board[r + 2][c + 2] === player &&
                    board[r + 3][c + 3] === player) {
                    return true;
                }
            }
        }

        // Diagonal /
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c <= COLS - 4; c++) {
                if (board[r][c] === player &&
                    board[r - 1][c + 1] === player &&
                    board[r - 2][c + 2] === player &&
                    board[r - 3][c + 3] === player) {
                    return true;
                }
            }
        }

        return false;
    }

    function isBoardFull() {
        return board.every(row => row.every(cell => cell !== null));
    }

    function render() {
        const cells = boardDiv.children;

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const index = row * COLS + col;
                const cell = cells[index];
                const value = board[row][col];

                if (value === 'R') {
                    cell.style.background = 'radial-gradient(circle at 35% 35%, #ff9999, #ff6b6b)';
                    cell.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4), inset 0 -3px 8px rgba(0, 0, 0, 0.3)';
                } else if (value === 'Y') {
                    cell.style.background = 'radial-gradient(circle at 35% 35%, #ffe680, #ffd93d)';
                    cell.style.boxShadow = '0 4px 15px rgba(255, 217, 61, 0.4), inset 0 -3px 8px rgba(0, 0, 0, 0.3)';
                } else {
                    cell.style.background = '#2a3142';
                    cell.style.boxShadow = 'inset 0 2px 8px rgba(0, 0, 0, 0.4)';
                }
            }
        }
    }

    function setStatus(msg) {
        document.getElementById('connect4-status').textContent = msg;
    }

    setStatus('Votre tour (Rouge)');
    render();
}

// ===== TANK WAR =====
let tankGameLoop;
let tankState = {
    player: { x: 50, y: 50, angle: 0, speed: 3, cooldown: 0 },
    bullets: [],
    enemies: [],
    lives: 3,
    level: 1,
    keys: {}
};

function initTankWar() {
    console.log('🚀 Initializing Unity WebGL Container...');
    // The iframe in index.html handles the loading of assets/tankwar/index.html
    // We just need to ensure the view is active, which Router.js handles.

    const iframe = document.getElementById('tankwar-frame');
    if (iframe) {
        // Optional: reload if needed, or just let it persist
        // iframe.contentWindow.location.reload(); 
        iframe.focus();
    }
}

// Legacy logic removed in favor of Unity integration

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    updateLevelDisplays();

    if (State.apiKey) {
        document.getElementById('chat-input').disabled = false;
        document.getElementById('chat-send').disabled = false;
        const statusEl = document.getElementById('cortex-status');
        if (statusEl) {
            statusEl.textContent = 'ONLINE 🟢';
            statusEl.classList.remove('offline');
        }
    } else {
        const statusEl = document.getElementById('cortex-status');
        if (statusEl) {
            statusEl.textContent = 'OFFLINE 🔴';
            statusEl.classList.add('offline');
        }
    }

    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });

    console.log('✅ GameArena V.9 Ready');
});

// Expose global reset for UI
window.resetCalibration = function () {
    if (confirm('Voulez-vous vraiment réinitialiser votre progression pour tout recommencer au Niveau 1 ?')) {
        localStorage.clear(); // Complete reset for clean slate
        window.location.reload();
    }
};

// ===== PER-GAME RESET =====
window.resetGameProgress = function (event, game) {
    event.stopPropagation(); // Prevent card click

    if (!confirm(`Voulez-vous vraiment réinitialiser votre progression pour ${game.toUpperCase()} ?\nCela effacera votre niveau et vos statistiques.`)) {
        return;
    }

    if (game === 'chess') {
        localStorage.removeItem('level_chess');
        localStorage.removeItem('chess_matches_played');
        alert('Progression Échecs (Cortex) réinitialisée.');
    } else if (game === 'morpion') {
        localStorage.removeItem('level_morpion');
        alert('Progression Morpion réinitialisée.');
    } else if (game === 'connect4') {
        localStorage.removeItem('level_connect4');
        alert('Progression Puissance 4 réinitialisée.');
    }

    // Reload to update UI
    location.reload();
};
