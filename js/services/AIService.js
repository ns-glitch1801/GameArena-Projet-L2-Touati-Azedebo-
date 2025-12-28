import { eventBus } from '../core/EventBus.js';

export class AIService {
    constructor() {
        this.apiKey = localStorage.getItem('GEMINI_API_KEY') || ''; // Placeholder for now
        this.isProcessing = false;
    }

    async getChessMove(fen, level, history = []) {
        if (this.isProcessing) return null;
        this.isProcessing = true;
        const apiKey = localStorage.getItem('GEMINI_API_KEY');

        if (!apiKey) {
            console.warn("No API Key found for CORTEX.");
            this.isProcessing = false;
            return this.calculateMockMove('chess', null); // Fallback
        }

        try {
            // Level Prompts
            let systemPrompt = "";
            if (level === 'test' || level === 0) {
                systemPrompt = "You are a beginner chess player. You make occasional mistakes. Play a valid move for BLACK based on the FEN.";
            } else if (level === 1) {
                systemPrompt = "You are an intermediate chess player (Elo 1500). Play a strong valid move for BLACK based on the FEN.";
            } else {
                systemPrompt = "You are a Grandmaster chess engine (Elo 2800). Play the absolute best move for BLACK to win. Analyze deep.";
            }

            const prompt = `${systemPrompt}
            Current FEN: ${fen}
            Move History: ${history.join(', ')}
            
            Reply ONLY with the best move in Standard Algebraic Notation (SAN) or coordinate notation (e.g., "e5", "Nf3", "e2e4"). Do not explain.`;

            const move = await this.callGeminiAPI(prompt, apiKey);
            return move ? move.trim() : null;

        } catch (error) {
            console.error("Cortex Error:", error);
            return this.calculateMockMove('chess', null);
        } finally {
            this.isProcessing = false;
        }
    }

    async callGeminiAPI(prompt, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // Cleanup response to get just the move
            if (text) {
                // Remove any periods, extra spaces, or explanations
                return text.replace(/[\n\r]/g, '').split(' ')[0].replace('.', '');
            }
            return null;

        } catch (e) {
            console.error("Gemini API Request Failed", e);
            return null;
        }
    }

    calculateMockMove(gameType, gameState) {
        // Simple logic depending on game
        if (gameType === 'tictactoe') {
            const empties = gameState.map((v, i) => v === null ? i : null).filter(v => v !== null);
            return empties.length > 0 ? empties[Math.floor(Math.random() * empties.length)] : null;
        }

        if (gameType === 'chess') {
            return 'random';
        }

        return null;
    }
}

export const aiService = new AIService();
