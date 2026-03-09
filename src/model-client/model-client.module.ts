import { Global, Module } from '@nestjs/common';
import { ModelClientService } from './model-client.service';

@Global()
@Module({
    providers: [ModelClientService],
    exports: [ModelClientService],
})
export class ModelClientModule { }
