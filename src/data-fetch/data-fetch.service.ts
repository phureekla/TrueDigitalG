import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Content } from '@prisma/client';

@Injectable()
export class DataFetchService {
    private readonly logger = new Logger(DataFetchService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Fetch a single user by ID.
     */
    async getUser(userId: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id: userId },
        });
    }

    /**
     * Fetch a page of users for batch processing.
     */
    async getUsersBatch(skip: number, take: number): Promise<User[]> {
        return this.prisma.user.findMany({
            skip,
            take,
            orderBy: { id: 'asc' },
        });
    }

    /**
     * Fetch all content IDs watched by a given user.
     */
    async getUserWatchHistoryIds(userId: string): Promise<string[]> {
        const history = await this.prisma.userWatchHistory.findMany({
            where: { userId },
            select: { contentId: true },
        });
        return history.map((h) => h.contentId);
    }

    /**
     * Bulk fetch user wait histories for a batch of users.
     */
    async getBulkWatchHistory(userIds: string[]): Promise<Map<string, string[]>> {
        const histories = await this.prisma.userWatchHistory.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, contentId: true },
        });

        const map = new Map<string, string[]>();
        for (const h of histories) {
            if (!map.has(h.userId)) {
                map.set(h.userId, []);
            }
            map.get(h.userId)!.push(h.contentId);
        }
        return map;
    }

    /**
     * Fetch candidate content that the user hasn't watched yet.
     */
    async getCandidateContent(watchedContentIds: string[]): Promise<Content[]> {
        return this.prisma.content.findMany({
            where: {
                id: { notIn: watchedContentIds },
            },
        });
    }
}
