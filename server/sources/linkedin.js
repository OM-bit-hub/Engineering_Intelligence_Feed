const SourceAdapter = require('./adapter');

class LinkedInAdapter extends SourceAdapter {
    constructor(config = {}) {
        super(config);
        this.apiKey = process.env.LINKEDIN_API_KEY; // ADR-002: Adapter-specific config handling
    }

    get sourceType() {
        return 'linkedin';
    }

    async testConnection() {
        return !!this.apiKey;
    }

    async fetchRecentContent(name) {
        if (!this.apiKey) {
            console.log('[LinkedIn] API key missing, returning mock data');
            return this.getMockData(name);
        }

        // TODO: Real API call here
        console.log('[LinkedIn] Fetching real data (simulated)');
        return this.getMockData(name);
    }

    getMockData(name) {
        return [
            {
                sourceType: 'linkedin',
                title: "Rethinking CI/CD for Speed",
                author: name || "Unknown Author",
                rawContent: `Excited to share that we've been rethinking our approach to CI/CD. The biggest lesson? Speed without reliability is just faster failure. Here's what changed everything for our team...`,
                publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                url: 'https://linkedin.com/post/mock-1',
                metadata: { likes: 342, comments: 47, reposts: 28 }
            },
            {
                sourceType: 'linkedin',
                title: "AI-Assisted Code Review Experiments",
                author: name || "Unknown Author",
                rawContent: `AI-assisted code review is not about replacing developers — it's about giving them superpowers. We ran a 3-month experiment and the results speak for themselves: 40% fewer bugs in production.`,
                publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
                url: 'https://linkedin.com/post/mock-2',
                metadata: { likes: 521, comments: 89, reposts: 64 }
            },
            {
                sourceType: 'linkedin',
                title: "Avoiding Premature Abstraction",
                author: name || "Unknown Author",
                rawContent: `The best architecture decisions are the ones you don't have to make yet. Premature abstraction is the root of most tech debt I've seen in the last decade.`,
                publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
                url: 'https://linkedin.com/post/mock-3',
                metadata: { likes: 1203, comments: 156, reposts: 91 }
            }
        ];
    }
}

module.exports = LinkedInAdapter;
