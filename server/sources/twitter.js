const SourceAdapter = require('./adapter');

class TwitterAdapter extends SourceAdapter {
    constructor(config = {}) {
        super(config);
        this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    }

    get sourceType() {
        return 'twitter';
    }

    async testConnection() {
        return !!this.bearerToken;
    }

    async fetchRecentContent(name) {
        if (!this.bearerToken) {
            console.log('[Twitter] Bearer token missing, returning mock data');
            return this.getMockData(name);
        }

        // TODO: Real API call here
        console.log('[Twitter] Fetching real data (simulated)');
        return this.getMockData(name);
    }

    getMockData(name) {
        return [
            {
                sourceType: 'twitter',
                title: "Microservices vs Distributed Monoliths",
                author: name || "Unknown Author",
                rawContent: `Hot take: most "microservices" architectures are just distributed monoliths with extra network calls.\n\nIf your services can't be deployed independently, you don't have microservices. You have a monolith with worse latency.`,
                publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                url: 'https://x.com/mock/1',
                metadata: { likes: 2847, comments: 312, reposts: 489 }
            },
            {
                sourceType: 'twitter',
                title: "Pair Programming with AI",
                author: name || "Unknown Author",
                rawContent: `Shipped a new feature in 2 hours using Claude Code. The future of software development is pair programming with AI, not AI replacing programmers. Big difference.`,
                publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                url: 'https://x.com/mock/2',
                metadata: { likes: 1654, comments: 201, reposts: 178 }
            },
            {
                sourceType: 'twitter',
                title: "Actionable Monitoring Alerts",
                author: name || "Unknown Author",
                rawContent: `Reminder: the best monitoring alert is one that tells you WHAT to do, not just that something is wrong.\n\nBad: "CPU is at 95%"\nGood: "CPU at 95% on api-server-3, likely caused by the image processing job. Runbook: [link]"`,
                publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                url: 'https://x.com/mock/3',
                metadata: { likes: 4102, comments: 287, reposts: 612 }
            },
            {
                sourceType: 'twitter',
                title: "Edge Migration Lessons",
                author: name || "Unknown Author",
                rawContent: `Thread 🧵 on what I learned migrating our entire infrastructure to edge computing:\n\n1/ Cold starts matter more than you think\n2/ Data locality is the real bottleneck\n3/ Not everything needs to be at the edge`,
                publishedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
                url: 'https://x.com/mock/4',
                metadata: { likes: 892, comments: 134, reposts: 201 }
            }
        ];
    }
}

module.exports = TwitterAdapter;
