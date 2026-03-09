import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: RedisClientType;

    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });

        this.client.on('error', (err) => console.error('Redis Client Error', err));
    }

    async onModuleInit() {
        await this.client.connect();
    }

    async onModuleDestroy() {
        await this.client.quit();
    }

    async set(key: string, value: any, ttlSeconds: number = 600): Promise<void> {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    }

    async clearUserCache(userId: string): Promise<void> {
        const keys = await this.client.keys(`rec:user:${userId}:*`);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }
}
