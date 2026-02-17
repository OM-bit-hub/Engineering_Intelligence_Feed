// Legacy JS file — TypeScript version (scoring.ts) is the source of truth.
// This file is kept for backward compatibility only.

const dotenv = require('dotenv');
dotenv.config();

// ADR-005: LLM-Based Multi-Dimensional Scoring (General Provider)

const PROVIDER_BASE_URLS = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
};

const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash',
    deepseek: 'deepseek-chat',
    groq: 'llama-3.3-70b-versatile',
};

class ScoringService {
    constructor() {
        const provider = process.env.LLM_PROVIDER || 'openai';
        const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
        const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider] || 'gpt-4o-mini';
        const baseUrl = process.env.LLM_BASE_URL || PROVIDER_BASE_URLS[provider] || '';

        this.config = { provider, apiKey, model, baseUrl, maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1024', 10) };
        this.isConfigured = !!apiKey;
    }

    async scoreContent(contentItem) {
        if (!this.isConfigured) {
            return this.getMockScore();
        }
        // TODO: Implement real LLM call (see scoring.ts for full implementation)
        return this.getMockScore();
    }

    getProviderInfo() {
        return {
            provider: this.config.provider,
            model: this.config.model,
            configured: this.isConfigured
        };
    }

    getMockScore() {
        return {
            scores: {
                delivery_speed: Math.floor(Math.random() * 10),
                ai_workflows: Math.floor(Math.random() * 10),
                architecture: Math.floor(Math.random() * 10),
                reliability: Math.floor(Math.random() * 10),
                process_change: Math.floor(Math.random() * 10)
            },
            reasoning: "Mock reasoning generated without LLM.",
            overall_score: (Math.random() * 5 + 5).toFixed(1),
            primary_priorities: [],
            is_actionable: false,
            confidence: 0,
        };
    }
}

module.exports = new ScoringService();
