import { Controller, Get, Param, Query, ValidationPipe, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { GetSingleUserDto } from './dto/get-single-user.dto';
import { GetBatchUserDto } from './dto/get-batch-user.dto';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('batch')
    async getBatchUser(
        @Query(new ValidationPipe({ transform: true })) query: GetBatchUserDto,
    ) {
        return this.userService.getBatchUser(query.page || 1, query.limit || 20);
    }

    @Get(':user_id')
    async getSingleUser(
        @Param('user_id') userId: string,
        @Query(new ValidationPipe({ transform: true })) query: GetSingleUserDto,
    ) {
        return this.userService.getUser(userId, query.limit || 10);
    }

    @Post(':user_id/watch-history')
    async updateUserWatchHistory(@Param('user_id') userId: string) {
        // In a real system, this adds watch history to the DB.
        // Here we simulate the cache invalidation trigger.
        await this.userService['redis'].clearUserCache(userId);
        return { success: true, message: 'Cache invalidated to prevent stale data' };
    }
}
