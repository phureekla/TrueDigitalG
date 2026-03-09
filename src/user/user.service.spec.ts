import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { RedisService } from '../redis/redis.service';
import { DataFetchService } from '../data-fetch/data-fetch.service';
import { ModelClientService } from '../model-client/model-client.service';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
    let service: UserService;
    let redisService: jest.Mocked<RedisService>;
    let dataFetchService: jest.Mocked<DataFetchService>;
    let modelClientService: jest.Mocked<ModelClientService>;

    beforeEach(async () => {
        const mockRedisService = {
            get: jest.fn(),
            set: jest.fn(),
            clearUserCache: jest.fn(),
        };

        const mockDataFetchService = {
            getUser: jest.fn(),
            getUsersBatch: jest.fn(),
            getUserWatchHistoryIds: jest.fn(),
            getBulkWatchHistory: jest.fn(),
            getCandidateContent: jest.fn(),
        };

        const mockModelClientService = {
            scoreCandidates: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: RedisService, useValue: mockRedisService },
                { provide: DataFetchService, useValue: mockDataFetchService },
                { provide: ModelClientService, useValue: mockModelClientService },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        redisService = module.get(RedisService);
        dataFetchService = module.get(DataFetchService);
        modelClientService = module.get(ModelClientService);
    });

    describe('Single User Workflow', () => {
        it('should return from cache if data exists', async () => {
            const cached = [{ id: '1', title: 'A', score: 0.9 }];
            redisService.get.mockResolvedValue(cached);

            const result = await service.getUser('user1', 10);
            expect(result.source).toBe('cache');
            expect(result.user).toEqual(cached);
            expect(dataFetchService.getUser).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if user not found', async () => {
            redisService.get.mockResolvedValue(null);
            dataFetchService.getUser.mockResolvedValue(null);
            dataFetchService.getUserWatchHistoryIds.mockResolvedValue([]);

            await expect(service.getUser('invalid', 10)).rejects.toThrow(NotFoundException);
        });

        it('should generate fresh data on cache miss and sort by score', async () => {
            redisService.get.mockResolvedValue(null);
            dataFetchService.getUser.mockResolvedValue({ id: 'user1', name: 'Test', createdAt: new Date() });
            dataFetchService.getUserWatchHistoryIds.mockResolvedValue(['watched1']);

            const candidates = [
                { id: 'cam1', title: 'C1', category: 'Act', createdAt: new Date() },
                { id: 'cam2', title: 'C2', category: 'Act', createdAt: new Date() },
            ];
            dataFetchService.getCandidateContent.mockResolvedValue(candidates);

            modelClientService.scoreCandidates.mockResolvedValue([
                { ...candidates[0], score: 0.5 },
                { ...candidates[1], score: 0.9 }, // Higher score
            ]);

            const result = await service.getUser('user1', 10);

            expect(result.source).toBe('generated');
            // Should be sorted descending by score
            expect(result.user[0].id).toBe('cam2');
            expect(result.user[1].id).toBe('cam1');
            expect(redisService.set).toHaveBeenCalledTimes(1);
        });
    });

    describe('Batch Workflow', () => {
        it('should process a batch of users concurrently', async () => {
            dataFetchService.getUsersBatch.mockResolvedValue([
                { id: 'u1', name: 'User 1', createdAt: new Date() },
                { id: 'u2', name: 'User 2', createdAt: new Date() },
            ]);
            redisService.get.mockResolvedValue([{ id: 'mock', score: 0.9 }]);

            const result = await service.getBatchUser(1, 10);

            expect(result.summary.total).toBe(2);
            expect(result.summary.success).toBe(2);
            expect(result.results.length).toBe(2);
        });
    });
});
