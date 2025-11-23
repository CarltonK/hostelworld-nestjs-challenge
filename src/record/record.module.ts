import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordController } from './controllers/record.controller';
import { RecordService } from '../record/services/record.service';
import { RecordSchema } from '../record/schemas/record.schema';
import { MusicBrainzModule } from './../music-brainz/music-brainz.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Record', schema: RecordSchema }]),
    MusicBrainzModule,
  ],
  controllers: [RecordController],
  providers: [RecordService],
})
export class RecordModule {}
