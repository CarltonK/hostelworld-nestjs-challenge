import { Module } from '@nestjs/common';
import { RecordModule } from './record/record.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config, { validationSchema } from './utils/config';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: false,
      cache: true,
      load: [config],
      validationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
      }),
      inject: [ConfigService],
    }),
    RecordModule,
    CacheModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
