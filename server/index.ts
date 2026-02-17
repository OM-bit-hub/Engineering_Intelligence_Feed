
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import intelligenceService from './services/intelligence';
import builderRoutes from './routes/builders';
import builderSourceRoutes from './routes/builder-sources';
import settingsRoutes from './routes/settings';
import ingestionService from './services/ingestion';
import scoringService from './services/scoring';
import { prisma } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────

// Builder Management (Prisma → Supabase)
app.use('/api/builders', builderRoutes);
app.use('/api/builder-sources', builderSourceRoutes);

// System Settings, Stats, Health
app.use('/api/settings', settingsRoutes);

// Intelligence Feed (real DB queries)
app.get('/api/intelligence', async (req: Request, res: Response) => {
    try {
        const data = await intelligenceService.getLatestWeeklyIntelligence();
        res.json(data);
    } catch (error) {
        console.error('Error fetching intelligence:', error);
        res.status(500).json({ error: 'Failed to fetch intelligence feed' });
    }
});

// Content Items — Recent items with processed data
app.get('/api/content-items', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const items = await prisma.contentItem.findMany({
            orderBy: { published_at: 'desc' },
            take: limit,
            include: {
                source: {
                    include: { builder: { select: { id: true, name: true } } }
                },
                processed_item: true
            }
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching content items:', error);
        res.status(500).json({ error: 'Failed to fetch content items' });
    }
});

// Trigger Manual Ingestion Cycle
app.post('/api/ingest/trigger', async (req: Request, res: Response) => {
    try {
        const results = await ingestionService.ingestAllBuilders();
        res.json({ status: 'success', items_processed: results.length });
    } catch (error) {
        console.error('Ingestion error:', error);
        res.status(500).json({ error: 'Ingestion cycle failed' });
    }
});

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n  🚀 Server running on http://localhost:${PORT}`);
    console.log(`  📡 Builder API:       /api/builders`);
    console.log(`  📡 Source API:        /api/builder-sources`);
    console.log(`  📡 Settings API:      /api/settings`);
    console.log(`  📡 Intelligence API:  /api/intelligence`);
    console.log(`  📡 Content Items API: /api/content-items\n`);
    const llmInfo = scoringService.getProviderInfo();
    console.log(`  🧠 Scoring LLM: ${llmInfo.configured ? `✅ ${llmInfo.provider} (${llmInfo.model})` : '⚠️  Not configured'}`);
    console.log(`  💬 Slack:     ${process.env.SLACK_BOT_TOKEN ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`  🔗 LinkedIn:  ${process.env.LINKEDIN_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`  🐦 Twitter:   ${process.env.TWITTER_BEARER_TOKEN ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`  🐙 GitHub:    ${process.env.GITHUB_TOKEN ? '✅ Configured' : '⚠️  Not configured'}\n`);
});
