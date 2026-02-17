
import express, { Request, Response } from 'express';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

const router = express.Router();

// ─────────────────────────────────────────────
//  BUILDERS CRUD
// ─────────────────────────────────────────────

// GET /api/builders — List all builders with their sources
router.get('/', async (req: Request, res: Response) => {
    try {
        const builders = await prisma.builder.findMany({
            include: { sources: true },
            orderBy: { created_at: 'desc' }
        });
        res.json(builders);
    } catch (error) {
        console.error('Error listing builders:', error);
        res.status(500).json({ error: 'Failed to list builders' });
    }
});

// POST /api/builders — Create a new builder
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, short_bio } = req.body;

        if (!name || !name.trim()) {
            res.status(400).json({ error: 'name is required' });
            return;
        }

        const builder = await prisma.builder.create({
            data: {
                name: name.trim(),
                short_bio: short_bio?.trim() || null
            },
            include: { sources: true }
        });

        res.status(201).json(builder);
    } catch (error) {
        console.error('Error creating builder:', error);
        res.status(500).json({ error: 'Failed to create builder' });
    }
});

// PATCH /api/builders/:id — Update a builder
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, short_bio, is_active } = req.body;

        const data: Prisma.BuilderUpdateInput = {};
        if (name !== undefined) data.name = name.trim();
        if (short_bio !== undefined) data.short_bio = short_bio?.trim() || null;
        if (is_active !== undefined) data.is_active = Boolean(is_active);

        const builder = await prisma.builder.update({
            where: { id },
            data,
            include: { sources: true }
        });

        res.json(builder);
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Builder not found' });
            return;
        }
        console.error('Error updating builder:', error);
        res.status(500).json({ error: 'Failed to update builder' });
    }
});

// DELETE /api/builders/:id — Delete a builder (cascades to sources)
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.builder.delete({ where: { id } });
        res.json({ message: 'Builder deleted' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Builder not found' });
            return;
        }
        console.error('Error deleting builder:', error);
        res.status(500).json({ error: 'Failed to delete builder' });
    }
});

export default router;
