import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { DataFetchService } from '../data-fetch/data-fetch.service';
import { ModelClientService } from '../model-client/model-client.service';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly redis: RedisService,
        private readonly dataFetch: DataFetchService,
        private readonly modelClient: ModelClientService,
    ) { }

    async getUser(userId: string, limit: number) {
        const cacheKey = `rec:user:${userId}:limit:${limit}`;

        // 1. Cache Check
        const cachedData = await this.redis.get<any>(cacheKey);
        if (cachedData) {
            this.logger.debug(`Cache hit for ${cacheKey}`);
            return {
                source: 'cache',
                user: cachedData,
            };
        }

        this.logger.debug(`Cache miss for ${cacheKey}. Generating fresh user data.`);

        // 2. Fetch User and Watch History
        const [user, watchHistoryIds] = await Promise.all([
            this.dataFetch.getUser(userId),
            this.dataFetch.getUserWatchHistoryIds(userId),
        ]);

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // 3. Fetch Candidate Content
        const candidates = await this.dataFetch.getCandidateContent(watchHistoryIds);

        // 4. Model Inference
        const scoredCandidates = await this.modelClient.scoreCandidates(
            userId,
            candidates,
            watchHistoryIds,
        );

        // 5. Rank and Filter
        const ranked = scoredCandidates
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // 6. Cache Store (10 minutes = 600s)
        await this.redis.set(cacheKey, ranked, 600);

        return {
            source: 'generated',
            user: ranked,
        };
    }

    async getBatchUser(page: number, limit: number) {
        const startTime = Date.now();
        const skip = (page - 1) * limit;

        // 1. Fetch Users
        const users = await this.dataFetch.getUsersBatch(skip, limit);
        if (!users.length) {
            return {
                page,
                limit,
                summary: { total: 0, success: 0, failed: 0, processingTimeMs: 0 },
                results: [],
            };
        }

        const CONCURRENCY_LIMIT = 5; // Bounded worker pool size
        const results: any[] = [];
        const chunks = [];

        // Chunking to simulate bounded worker pool
        for (let i = 0; i < users.length; i += CONCURRENCY_LIMIT) {
            chunks.push(users.slice(i, i + CONCURRENCY_LIMIT));
        }

        let successCount = 0;
        let failedCount = 0;

        for (const chunk of chunks) {
            const promises = chunk.map(async (user) => {
                try {
                    const userData = await this.getUser(user.id, 10);
                    return { userId: user.id, status: 'success', user: userData.user };
                } catch (error: any) {
                    this.logger.error(`Failed to get data for user ${user.id}: ${error.message}`);
                    return { userId: user.id, status: 'failed', error: error.message };
                }
            });

            const settled = await Promise.allSettled(promises);
            for (const result of settled) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                    if (result.value.status === 'success') successCount++;
                    else failedCount++;
                } else {
                    failedCount++;
                }
            }
        }

        const processingTimeMs = Date.now() - startTime;

        return {
            page,
            limit,
            summary: {
                total: users.length,
                success: successCount,
                failed: failedCount,
                processingTimeMs,
            },
            results,
        };
    }
}
