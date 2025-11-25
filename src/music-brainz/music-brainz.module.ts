import { Module } from '@nestjs/common';
import { MusicBrainzService } from './music-brainz.service';
import { XmlModule } from './../xml/xml.module';
import { CacheModule } from './../cache/cache.module';
import { LoggerModule } from './../logger/logger.module';

@Module({
  imports: [XmlModule, CacheModule, LoggerModule],
  providers: [MusicBrainzService],
  exports: [MusicBrainzService],
})
export class MusicBrainzModule {}
