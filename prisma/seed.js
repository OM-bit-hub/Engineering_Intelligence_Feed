const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    try {
        // Builder 1: Gergely Orosz (RSS Newsletter Example)
        const builder1 = await prisma.builder.create({
            data: {
                name: 'Gergely Orosz',
                role: 'Author',
                company: 'The Pragmatic Engineer',
                avatar_url: 'https://github.com/gergelyorosz.png',
                sources: {
                    create: [
                        {
                            source_type: 'rss_newsletter',
                            url: 'https://newsletter.pragmaticengineer.com/feed',
                            last_fetched_at: new Date(),
                            items: {
                                create: {
                                    title: 'The Software Architecture of High-Scale Systems',
                                    url: 'https://newsletter.pragmaticengineer.com/p/architecture-high-scale',
                                    published_at: new Date('2026-02-15T10:00:00Z'),
                                    content_hash: 'hash_gergely_001',
                                    status: 'processed',
                                    processed_item: {
                                        create: {
                                            summary: 'Deep dive into patterns for handling millions of requests.',
                                            why_it_matters: 'Relevant to our scaling challenges.',
                                            what_to_try: 'Assess our load balancer strategy.',
                                            scores_json: { architecture: 9, reliability: 8 },
                                            overall_score: 8.5,
                                            priority_flags: ['architecture', 'high_scale'],
                                            confidence: 0.95
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        });

        console.log(`Created builder with id: ${builder1.id}`);

        // Builder 2: Guillermo Rauch (GitHub Example)
        const builder2 = await prisma.builder.create({
            data: {
                name: 'Guillermo Rauch',
                role: 'CEO',
                company: 'Vercel',
                avatar_url: 'https://github.com/rauchg.png',
                sources: {
                    create: [
                        {
                            source_type: 'github',
                            url: 'https://github.com/rauchg',
                            last_fetched_at: new Date(),
                            items: {
                                create: {
                                    title: 'New React Features in Next.js',
                                    url: 'https://github.com/vercel/next.js/releases/tag/v15.0.0',
                                    published_at: new Date('2026-02-16T09:00:00Z'),
                                    content_hash: 'hash_rauchg_001',
                                    status: 'pending'
                                }
                            }
                        },
                        {
                            source_type: 'twitter',
                            url: 'https://twitter.com/rauchg',
                            last_fetched_at: null
                        }
                    ]
                }
            }
        });

        console.log(`Created builder with id: ${builder2.id}`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
