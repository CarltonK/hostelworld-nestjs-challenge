import { Module } from '@nestjs/common';
import { MusicBrainzService } from './music-brainz.service';
import { XmlModule } from './../xml/xml.module';

@Module({
  imports: [XmlModule],
  providers: [MusicBrainzService],
  exports: [MusicBrainzService],
})
export class MusicBrainzModule {}
