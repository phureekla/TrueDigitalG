import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ModelClientModule } from './model-client/model-client.module';
import { DataFetchModule } from './data-fetch/data-fetch.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [PrismaModule, RedisModule, ModelClientModule, DataFetchModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
