import express, { Request, Response } from 'express';
import { prisma } from '../db';
import scoringService from '../services/scoring';

const router = express.Router();

// ─────────────────────────────────────────────
//  SETTINGS CRUD
// ─────────────────────────────────────────────

// GET /api/settings — Fetch system settings, auto-create default if none exists
router.get('/', async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemSettings.upsert({
            where: { id: 'settings' },
            update: {},
            create: {
                id: 'settings',
                automation_enabled: true,
                manual_override: false
            }
        });

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PATCH /api/settings — Update system settings
router.patch('/', async (req: Request, res: Response) => {
    try {
        const { automation_enabled, manual_override } = req.body;

        const data: Record<string, boolean> = {};
        if (automation_enabled !== undefined) data.automation_enabled = Boolean(automation_enabled);
        if (manual_override !== undefined) data.manual_override = Boolean(manual_override);

        const settings = await prisma.systemSettings.upsert({
            where: { id: 'settings' },
            update: data,
            create: {
                id: 'settings',
                automation_enabled: data.automation_enabled ?? true,
                manual_override: data.manual_override ?? false
            }
        });

        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ─────────────────────────────────────────────
//  SYSTEM STATS & HEALTH
// ─────────────────────────────────────────────

// GET /api/settings/stats — Return aggregate counts from real DB
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const [builders, sources, contentItems, processedItems] = await Promise.all([
            prisma.builder.count(),
            prisma.builderSource.count(),
            prisma.contentItem.count(),
            prisma.processedItem.count()
        ]);

        const lastIngestion = await prisma.builderSource.findFirst({
            where: { last_fetched_at: { not: null } },
            orderBy: { last_fetched_at: 'desc' },
            select: { last_fetched_at: true }
        });

        res.json({
            builders,
            sources,
            content_items: contentItems,
            processed_items: processedItems,
            last_ingestion: lastIngestion?.last_fetched_at || null
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/settings/health — Return which env vars are configured
router.get('/health', async (req: Request, res: Response) => {
    const llmInfo = scoringService.getProviderInfo();

    res.json({
        database: !!process.env.DATABASE_URL,
        scoring_llm: llmInfo.configured,
        llm_provider: llmInfo.provider,
        llm_model: llmInfo.model,
        slack: !!process.env.SLACK_BOT_TOKEN,
        linkedin: !!process.env.LINKEDIN_API_KEY,
        twitter: !!process.env.TWITTER_BEARER_TOKEN,
        github: !!process.env.GITHUB_TOKEN
    });
});

export default router;
