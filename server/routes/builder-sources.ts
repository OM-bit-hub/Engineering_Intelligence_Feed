
import express, { Request, Response } from 'express';
import { prisma } from '../db';
import { Prisma, SourceType } from '@prisma/client';

const router = express.Router();
const VALID_SOURCE_TYPES: SourceType[] = ['rss_blog', 'rss_newsletter', 'github'];

// ─────────────────────────────────────────────
//  BUILDER SOURCES CRUD
// ─────────────────────────────────────────────

// POST /api/builder-sources — Add a source to a builder
router.post('/', async (req: Request, res: Response) => {
    try {
        const { builder_id, source_type, source_identifier } = req.body;

        if (!builder_id) {
            res.status(400).json({ error: 'builder_id is required' });
            return;
        }
        if (!source_type || !VALID_SOURCE_TYPES.includes(source_type as SourceType)) {
            res.status(400).json({
                error: `source_type must be one of: ${VALID_SOURCE_TYPES.join(', ')}`
            });
            return;
        }
        if (!source_identifier || !source_identifier.trim()) {
            res.status(400).json({ error: 'source_identifier is required' });
            return;
        }

        // Verify builder exists
        const builder = await prisma.builder.findUnique({ where: { id: builder_id } });
        if (!builder) {
            res.status(404).json({ error: 'Builder not found' });
            return;
        }

        const source = await prisma.builderSource.create({
            data: {
                builder_id,
                source_type: source_type as SourceType,
                source_identifier: source_identifier.trim()
            }
        });

        res.status(201).json(source);
    } catch (error) {
        console.error('Error creating builder source:', error);
        res.status(500).json({ error: 'Failed to create builder source' });
    }
});

// PATCH /api/builder-sources/:id — Update a source
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { source_type, source_identifier, is_active } = req.body;

        const data: Prisma.BuilderSourceUpdateInput = {};
        if (source_type !== undefined) {
            if (!VALID_SOURCE_TYPES.includes(source_type as SourceType)) {
                res.status(400).json({
                    error: `source_type must be one of: ${VALID_SOURCE_TYPES.join(', ')}`
                });
                return;
            }
            data.source_type = source_type as SourceType;
        }
        if (source_identifier !== undefined) data.source_identifier = source_identifier.trim();
        if (is_active !== undefined) data.is_active = Boolean(is_active);

        const source = await prisma.builderSource.update({
            where: { id },
            data
        });

        res.json(source);
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Builder source not found' });
            return;
        }
        console.error('Error updating builder source:', error);
        res.status(500).json({ error: 'Failed to update builder source' });
    }
});

// DELETE /api/builder-sources/:id — Delete a source
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.builderSource.delete({ where: { id } });
        res.json({ message: 'Builder source deleted' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Builder source not found' });
            return;
        }
        console.error('Error deleting builder source:', error);
        res.status(500).json({ error: 'Failed to delete builder source' });
    }
});

export default router;
