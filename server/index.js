require('dotenv').config();
const express = require('express');
const cors = require('cors');
const intelligenceService = require('./services/intelligence');
const builderRoutes = require('./routes/builders');
const builderSourceRoutes = require('./routes/builder-sources');

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

// Intelligence Feed (mock for now)
app.get('/api/intelligence', async (req, res) => {
    try {
        const data = await intelligenceService.getLatestWeeklyIntelligence();
        res.json(data);
    } catch (error) {
        console.error('Error fetching intelligence:', error);
        res.status(500).json({ error: 'Failed to fetch intelligence feed' });
    }
});

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n  🚀 Server running on http://localhost:${PORT}`);
    console.log(`  📡 Builder API:       /api/builders`);
    console.log(`  📡 Source API:        /api/builder-sources`);
    console.log(`  📡 Intelligence API:  /api/intelligence\n`);
});
