const builderService = require('./builders');
const scoringService = require('./scoring');

// Mock adapters for POC
class MockAdapter {
    constructor(platform) { this.platform = platform; }
    async fetchContent(builder) {
        // Return dummy content for the builder
        return [{
            title: `Latest on ${this.platform} by ${builder.name}`,
            url: `https://${this.platform}.com/${builder.name}/status/123`,
            author: builder.name,
            publishedAt: new Date(),
            rawContent: `This is a sample post from ${builder.name} about engineering excellence.`,
            sourceType: this.platform,
            metadata: { likes: Math.floor(Math.random() * 100) }
        }];
    }
}

class IngestionService {
    constructor() {
        this.adapters = {
            linkedin: new MockAdapter('linkedin'),
            twitter: new MockAdapter('twitter'),
            blog: new MockAdapter('blog')
        };
    }

    async ingestAllBuilders() {
        console.log('[Ingestion] Starting scheduled ingestion cycle...');

        // 1. Fetch all active builders
        const builders = await builderService.getBuilders();
        console.log(`[Ingestion] Found ${builders.length} active builders.`);

        const allContent = [];

        // 2. Iterate and fetch content
        for (const builder of builders) {
            const adapter = this.adapters[builder.platform];
            if (adapter) {
                console.log(`[Ingestion] Fetching for ${builder.name} (${builder.platform})...`);
                try {
                    const content = await adapter.fetchContent(builder);
                    allContent.push(...content);
                } catch (err) {
                    console.error(`[Ingestion] Reuse failed for ${builder.name}:`, err.message);
                }
            }
        }

        // 3. Score and Store (Mocked)
        console.log(`[Ingestion] Scoring ${allContent.length} new items...`);
        const processed = await Promise.all(allContent.map(async item => {
            const score = await scoringService.scoreContent(item);
            return {
                ...item,
                score
            };
        }));

        console.log('[Ingestion] Cycle complete.');
        return processed;
    }
}

module.exports = new IngestionService();
