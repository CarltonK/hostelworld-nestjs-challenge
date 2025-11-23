import { Module } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

@Module({
  providers: [
    {
      provide: XMLParser,
      useFactory: () =>
        new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
        }),
    },
  ],
  exports: [XMLParser],
})
export class XmlModule {}
