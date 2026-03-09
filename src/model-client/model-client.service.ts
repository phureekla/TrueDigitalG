import { Injectable, Logger } from '@nestjs/common';
import { Content } from '@prisma/client';

export interface ScoredContent extends Content {
    score: number;
}

@Injectable()
export class ModelClientService {
    private readonly logger = new Logger(ModelClientService.name);

    /**
     * Mock scoring algorithm.
     * In a real system, this would make an HTTP or gRPC call to a Python ML service.
     */
    async scoreCandidates(
        userId: string,
        candidates: Content[],
        watchHistory: string[],
    ): Promise<ScoredContent[]> {
        this.logger.debug(`Scoring ${candidates.length} candidates for user ${userId}`);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Mock algorithm: attach a random score between 0.0 and 1.0
        return candidates.map((c) => ({
            ...c,
            score: Math.random(),
        }));
    }
}
