
import { prisma } from '../db';
import scoringService from './scoring';

// Mock adapter interfaces
interface Content {
    title: string;
    url: string;
    author: string;
    publishedAt: Date;
    rawContent: string;
    sourceType: string;
    metadata: any;
}

class MockAdapter {
    platform: string;
    constructor(platform: string) { this.platform = platform; }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchContent(builder: any): Promise<Content[]> {
        // Return dummy content for the builder
        return [{
            title: `Latest on ${this.platform} by ${builder.name}`,
            url: `https://${this.platform}.com/${builder.name}/status/${Date.now()}`,
            author: builder.name,
            publishedAt: new Date(),
            rawContent: `This is a sample post from ${builder.name} about engineering excellence.`,
            sourceType: this.platform,
            metadata: { likes: Math.floor(Math.random() * 100) }
        }];
    }
}

class IngestionService {
    adapters: Record<string, MockAdapter>;

    constructor() {
        this.adapters = {
            linkedin: new MockAdapter('linkedin'),
            twitter: new MockAdapter('twitter'),
            blog: new MockAdapter('blog'),
            rss_blog: new MockAdapter('rss_blog'),
            rss_newsletter: new MockAdapter('rss_newsletter'),
            github: new MockAdapter('github')
        };
    }

    async ingestAllBuilders() {
        console.log('[Ingestion] Starting scheduled ingestion cycle...');

        // 1. Fetch all active builders with their sources
        const builders = await prisma.builder.findMany({
            where: { is_active: true },
            include: { sources: { where: { is_active: true } } }
        });
        console.log(`[Ingestion] Found ${builders.length} active builders.`);

        const allContent: (Content & { score?: any })[] = [];

        // 2. Iterate and fetch content
        for (const builder of builders) {
            for (const source of builder.sources) {
                const adapter = this.adapters[source.source_type];

                if (adapter) {
                    console.log(`[Ingestion] Fetching for ${builder.name} (${source.source_type})...`);
                    try {
                        const content = await adapter.fetchContent(builder);
                        allContent.push(...content);
                    } catch (err: any) {
                        console.error(`[Ingestion] Fetch failed for ${builder.name}:`, err.message);
                    }
                } else {
                    console.warn(`[Ingestion] No adapter for source type: ${source.source_type}`);
                }
            }
        }

        // 3. Score and Store (Mocked)
        console.log(`[Ingestion] Scoring ${allContent.length} new items...`);

        const processed = await Promise.all(allContent.map(async item => {
            const scoreResult = await scoringService.scoreContent(item);
            return {
                ...item,
                score: scoreResult.overall_score
            };
        }));

        console.log('[Ingestion] Cycle complete.');
        return processed;
    }
}

export default new IngestionService();
