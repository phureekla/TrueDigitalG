import { Global, Module } from '@nestjs/common';
import { DataFetchService } from './data-fetch.service';

@Global()
@Module({
    providers: [DataFetchService],
    exports: [DataFetchService],
})
export class DataFetchModule { }
