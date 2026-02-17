import { prisma } from '../db';

interface TopItem {
    id: string;
    title: string;
    url: string;
    summary: string;
    published_at: string;
    platform: string;
    author: string;
    overall_score: number;
    why_it_matters: string;
    what_to_try: string;
    priority_flags: string[];
}

interface IntelligenceData {
    week_start: string;
    trend_summary: string;
    top_items: TopItem[];
    strategic_experiments: { title: string; description: string }[];
    builder_stats: { name: string; count: number; score: number }[];
}

class IntelligenceService {
    async getLatestWeeklyIntelligence(): Promise<IntelligenceData> {
        // 1. Try to get the latest weekly_intelligence report from DB
        const weeklyReport = await prisma.weeklyIntelligence.findFirst({
            orderBy: { created_at: 'desc' }
        });

        if (weeklyReport) {
            return this.parseWeeklyReport(weeklyReport);
        }

        // 2. No weekly report exists — build feed from processed_items directly
        return this.buildFeedFromProcessedItems();
    }

    private parseWeeklyReport(report: {
        week_start: Date;
        top_items_json: string;
        trend_summary: string;
        strategic_experiments: string;
        created_at: Date;
    }): IntelligenceData {
        let topItems: TopItem[] = [];
        let strategicExperiments: { title: string; description: string }[] = [];

        try {
            topItems = JSON.parse(report.top_items_json);
        } catch {
            topItems = [];
        }

        try {
            strategicExperiments = JSON.parse(report.strategic_experiments);
        } catch {
            strategicExperiments = [];
        }

        // Build builder_stats from top_items
        const builderMap = new Map<string, { count: number; totalScore: number }>();
        for (const item of topItems) {
            const existing = builderMap.get(item.author) || { count: 0, totalScore: 0 };
            existing.count++;
            existing.totalScore += item.overall_score;
            builderMap.set(item.author, existing);
        }

        const builderStats = Array.from(builderMap.entries())
            .map(([name, { count, totalScore }]) => ({
                name,
                count,
                score: Math.round((totalScore / count) * 10) / 10
            }))
            .sort((a, b) => b.score - a.score);

        return {
            week_start: report.week_start.toISOString(),
            trend_summary: report.trend_summary,
            top_items: topItems,
            strategic_experiments: strategicExperiments,
            builder_stats: builderStats
        };
    }

    private async buildFeedFromProcessedItems(): Promise<IntelligenceData> {
        // Query processed items with full join chain to get builder info
        const processedItems = await prisma.processedItem.findMany({
            orderBy: { overall_score: 'desc' },
            take: 10,
            include: {
                content_item: {
                    include: {
                        source: {
                            include: {
                                builder: true
                            }
                        }
                    }
                }
            }
        });

        if (processedItems.length === 0) {
            return {
                week_start: new Date().toISOString(),
                trend_summary: '',
                top_items: [],
                strategic_experiments: [],
                builder_stats: []
            };
        }

        // Map processed items to the feed format
        const topItems: TopItem[] = processedItems.map(pi => ({
            id: pi.id,
            title: pi.content_item.title,
            url: pi.content_item.url,
            summary: pi.summary,
            published_at: pi.content_item.published_at.toISOString(),
            platform: pi.content_item.source.source_type,
            author: pi.content_item.source.builder.name,
            overall_score: pi.overall_score,
            why_it_matters: pi.why_it_matters || '',
            what_to_try: pi.what_to_try || '',
            priority_flags: pi.priority_flags
        }));

        // Build builder stats from the processed items
        const builderMap = new Map<string, { count: number; totalScore: number }>();
        for (const item of topItems) {
            const existing = builderMap.get(item.author) || { count: 0, totalScore: 0 };
            existing.count++;
            existing.totalScore += item.overall_score;
            builderMap.set(item.author, existing);
        }

        const builderStats = Array.from(builderMap.entries())
            .map(([name, { count, totalScore }]) => ({
                name,
                count,
                score: Math.round((totalScore / count) * 10) / 10
            }))
            .sort((a, b) => b.score - a.score);

        return {
            week_start: new Date().toISOString(),
            trend_summary: '',
            top_items: topItems,
            strategic_experiments: [],
            builder_stats: builderStats
        };
    }
}

export default new IntelligenceService();
