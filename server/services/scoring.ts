
import dotenv from 'dotenv';
dotenv.config();

// ADR-005: LLM-Based Multi-Dimensional Scoring
// Generalized to support any LLM provider via configuration

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────

type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'openrouter' | 'custom';

interface LLMConfig {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    baseUrl?: string;   // For OpenAI-compatible endpoints (DeepSeek, Groq, OpenRouter, etc.)
    maxTokens: number;
}

interface DimensionScores {
    delivery_speed: number;
    ai_workflows: number;
    architecture: number;
    reliability: number;
    process_change: number;
}

interface ScoreResult {
    scores: DimensionScores;
    reasoning: string;
    overall_score: string;
    primary_priorities: string[];
    is_actionable: boolean;
    confidence: number;
}

// ─────────────────────────────────────────────
//  DEFAULT BASE URLs PER PROVIDER
// ─────────────────────────────────────────────

const PROVIDER_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
};

const DEFAULT_MODELS: Record<string, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash',
    deepseek: 'deepseek-chat',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'openai/gpt-4o-mini',
};

// ─────────────────────────────────────────────
//  SCORING PROMPT (from ADR-005)
// ─────────────────────────────────────────────

function buildScoringPrompt(content: { title: string; author?: string; sourceType?: string; rawContent?: string }): string {
    const contentPreview = content.rawContent ? content.rawContent.slice(0, 2000) : '';

    return `You are an expert at evaluating engineering content for relevance to a team's strategic priorities.

Content to evaluate:
Title: ${content.title}
Author: ${content.author || 'Unknown'}
Source Type: ${content.sourceType || 'Unknown'}
Content Preview: ${contentPreview}

Evaluate this content against these 5 priorities:

1. **Delivery Speed**: CI/CD, deployment automation, release processes, development velocity, reducing time-to-production, build optimization
2. **AI-Assisted Dev Workflows**: LLM integration, AI coding assistants, copilots, AI-powered testing, prompt engineering for developers, AI tooling
3. **Architecture**: System design, microservices, scalability, design patterns, technical decision-making, infrastructure choices
4. **Reliability**: Observability, monitoring, incident management, SRE practices, uptime, performance optimization, alerting
5. **Process Change**: Team practices, agile/methodologies, engineering culture, collaboration, remote work, organizational change

For each priority, assign a score from 0-10:
- 0: Not relevant at all
- 1-3: Tangentially relevant or minor mention
- 4-6: Moderately relevant, addresses some aspects
- 7-9: Highly relevant, significant focus
- 10: Directly and deeply addresses this priority

Return ONLY valid JSON (no markdown, no code fences):
{
  "scores": {
    "delivery_speed": <0-10>,
    "ai_workflows": <0-10>,
    "architecture": <0-10>,
    "reliability": <0-10>,
    "process_change": <0-10>
  },
  "reasoning": {
    "delivery_speed": "Brief explanation",
    "ai_workflows": "Brief explanation",
    "architecture": "Brief explanation",
    "reliability": "Brief explanation",
    "process_change": "Brief explanation"
  },
  "primary_priorities": ["list", "of", "top", "priorities"],
  "is_actionable": <true/false>,
  "confidence": <0-10>
}`;
}

// ─────────────────────────────────────────────
//  SCORING SERVICE
// ─────────────────────────────────────────────

class ScoringService {
    private config: LLMConfig;
    private isConfigured: boolean;

    // Priority weights from ADR-005
    private readonly weights: Record<string, number> = {
        delivery_speed: 1.2,
        ai_workflows: 1.5,
        architecture: 1.0,
        reliability: 1.0,
        process_change: 0.8,
    };

    constructor() {
        const provider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider;

        // Support both general LLM_API_KEY and legacy ANTHROPIC_API_KEY / OPENAI_API_KEY
        const apiKey =
            process.env.LLM_API_KEY ||
            process.env.OPENAI_API_KEY ||
            process.env.ANTHROPIC_API_KEY ||
            '';

        const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider] || 'gpt-4o-mini';
        const baseUrl = process.env.LLM_BASE_URL || PROVIDER_BASE_URLS[provider] || '';
        const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '1024', 10);

        this.config = { provider, apiKey, model, baseUrl, maxTokens };
        this.isConfigured = !!apiKey;

        if (this.isConfigured) {
            console.log(`[ScoringService] ✅ Configured → Provider: ${provider}, Model: ${model}`);
        } else {
            console.log(`[ScoringService] ⚠️  No API key found. Using mock scores.`);
        }
    }

    // ── Public API ──────────────────────────────

    async scoreContent(contentItem: any): Promise<ScoreResult> {
        if (!this.isConfigured) {
            return this.getMockScore();
        }

        try {
            return await this.callLLM(contentItem);
        } catch (error: any) {
            console.error(`[ScoringService] Scoring failed: ${error.message}`);
            return this.getMockScore();
        }
    }

    getProviderInfo(): { provider: string; model: string; configured: boolean } {
        return {
            provider: this.config.provider,
            model: this.config.model,
            configured: this.isConfigured
        };
    }

    // ── LLM Call (Provider-Agnostic) ────────────

    private async callLLM(content: any): Promise<ScoreResult> {
        const prompt = buildScoringPrompt(content);

        // Anthropic uses a different API format
        if (this.config.provider === 'anthropic') {
            return this.callAnthropic(prompt);
        }

        // Google Gemini uses its own REST API
        if (this.config.provider === 'gemini') {
            return this.callGemini(prompt);
        }

        // Everything else uses the OpenAI-compatible chat completions API
        // This covers: OpenAI, DeepSeek, Groq, OpenRouter, local LLMs, etc.
        return this.callOpenAICompatible(prompt);
    }

    // ── OpenAI-Compatible Provider ──────────────

    private async callOpenAICompatible(prompt: string): Promise<ScoreResult> {
        const url = `${this.config.baseUrl}/chat/completions`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
        };

        // OpenRouter requires extra headers
        if (this.config.provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://savant-growth.app';
            headers['X-Title'] = 'Savant Growth';
        }

        const body = {
            model: this.config.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a JSON-outputting scoring engine. Return ONLY valid JSON, no markdown.'
                },
                { role: 'user', content: prompt }
            ],
            max_tokens: this.config.maxTokens,
            temperature: 0.3,  // Low temp for consistent scoring
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || '';

        return this.parseAndBuildResult(rawText);
    }

    // ── Anthropic Provider ──────────────────────

    private async callAnthropic(prompt: string): Promise<ScoreResult> {
        const url = 'https://api.anthropic.com/v1/messages';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                system: 'You are a JSON-outputting scoring engine. Return ONLY valid JSON, no markdown.',
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const rawText = data.content?.[0]?.text || '';

        return this.parseAndBuildResult(rawText);
    }

    // ── Google Gemini Provider ──────────────────

    private async callGemini(prompt: string): Promise<ScoreResult> {
        const model = this.config.model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

        const body = {
            contents: [
                {
                    parts: [
                        {
                            text: `You are a JSON-outputting scoring engine. Return ONLY valid JSON, no markdown.\n\n${prompt}`
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: this.config.maxTokens,
                responseMimeType: 'application/json',
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return this.parseAndBuildResult(rawText);
    }

    // ── Response Parsing ────────────────────────

    private parseAndBuildResult(rawText: string): ScoreResult {
        // Strip markdown code fences if present
        let cleanText = rawText.trim();
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        let parsed: any;
        try {
            parsed = JSON.parse(cleanText);
        } catch {
            console.error('[ScoringService] Failed to parse LLM response as JSON:', cleanText.slice(0, 200));
            return this.getMockScore();
        }

        // Validate scores exist
        const scores: DimensionScores = {
            delivery_speed: this.clampScore(parsed.scores?.delivery_speed),
            ai_workflows: this.clampScore(parsed.scores?.ai_workflows),
            architecture: this.clampScore(parsed.scores?.architecture),
            reliability: this.clampScore(parsed.scores?.reliability),
            process_change: this.clampScore(parsed.scores?.process_change),
        };

        // Calculate weighted overall score (ADR-005)
        const weightedSum = Object.entries(scores).reduce((sum, [key, val]) => {
            return sum + val * (this.weights[key] || 1.0);
        }, 0);
        const totalWeight = Object.values(this.weights).reduce((s, w) => s + w, 0);
        const overallScore = (weightedSum / totalWeight);

        // Flatten reasoning to a single string if it's an object
        let reasoning = '';
        if (typeof parsed.reasoning === 'string') {
            reasoning = parsed.reasoning;
        } else if (typeof parsed.reasoning === 'object') {
            reasoning = Object.entries(parsed.reasoning)
                .map(([key, val]) => `${key}: ${val}`)
                .join('; ');
        }

        return {
            scores,
            reasoning,
            overall_score: overallScore.toFixed(1),
            primary_priorities: parsed.primary_priorities || [],
            is_actionable: parsed.is_actionable ?? false,
            confidence: this.clampScore(parsed.confidence ?? 5),
        };
    }

    private clampScore(value: any): number {
        const num = Number(value);
        if (isNaN(num)) return 0;
        return Math.max(0, Math.min(10, Math.round(num)));
    }

    // ── Mock Fallback ───────────────────────────

    private getMockScore(): ScoreResult {
        return {
            scores: {
                delivery_speed: Math.floor(Math.random() * 10),
                ai_workflows: Math.floor(Math.random() * 10),
                architecture: Math.floor(Math.random() * 10),
                reliability: Math.floor(Math.random() * 10),
                process_change: Math.floor(Math.random() * 10),
            },
            reasoning: 'Mock reasoning generated without LLM.',
            overall_score: (Math.random() * 5 + 5).toFixed(1),
            primary_priorities: [],
            is_actionable: false,
            confidence: 0,
        };
    }
}

export default new ScoringService();
