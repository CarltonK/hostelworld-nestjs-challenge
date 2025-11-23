import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './../cache/cache.module';
import axios, { AxiosInstance } from 'axios';
import { MusicBrainzRelease, TrackItem } from './dtos/music-brainz.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class MusicBrainzService {
  // TTL in seconds for 5 days - Only for my testing purpose
  private readonly CACHE_TTL_SECONDS = 24 * 60 * 60 * 5;
  private readonly http: AxiosInstance;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly xmlParser: XMLParser,
  ) {
    this.http = axios.create({
      baseURL: 'https://musicbrainz.org/ws/2',
      headers: { Accept: 'application/xml' },
    });
  }

  async getReleaseByMBID(mbid: string): Promise<MusicBrainzRelease> {
    if (!mbid) throw new BadRequestException('MBID is required');

    const key = this.cacheKey(mbid);

    // Check cache first
    try {
      this.logger.info('Checking cache...');
      const cached = await this.redisClient.get(key);
      if (cached) {
        this.logger.info('Fetching from cache...');
        try {
          const parsed: MusicBrainzRelease = JSON.parse(cached);
          return parsed;
        } catch (err) {
          // Cache is corrupted, delete and continue
          this.logger.warn(
            `Corrupted cache for ${key}, deleting and refetching`,
          );
          await this.redisClient.del(key);
        }
      }
    } catch (err) {
      // continue without failing the whole operation
      this.logger.warn('Redis get failed, continuing without cache', err);
    }

    // Then fetch from MusicBrainz
    const xml = await this.fetchReleaseXml(mbid);

    // Parse XML
    const parsed = this.parseReleaseXml(xml, mbid);

    // Cache parsed result
    try {
      this.logger.info('Caching result...');
      await this.redisClient.set(
        key,
        JSON.stringify(parsed),
        'EX',
        this.CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn('Redis set failed (non-fatal)', err);
    }

    return parsed;
  }

  /*
   * Private Methods
   */
  private cacheKey(mbid: string) {
    return `musicbrainz:${mbid}`;
  }

  private async fetchReleaseXml(mbid: string): Promise<string> {
    const url = `/release/${mbid}?inc=recordings&fmt=xml`;
    try {
      const resp = await this.http.get<string>(url, { responseType: 'text' });
      return resp.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        throw new NotFoundException(`MBID ${mbid} not found on MusicBrainz`);
      }
      if (status === 429) {
        this.logger.warn('MusicBrainz rate limit hit');
        throw new ServiceUnavailableException(
          'MusicBrainz rate limited; try again later',
        );
      }

      if (
        err.code === 'ECONNABORTED' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'ECONNREFUSED'
      ) {
        this.logger.error('Network error fetching MusicBrainz', err);
        throw new ServiceUnavailableException('Unable to reach MusicBrainz');
      }
      this.logger.error('Unexpected error fetching MusicBrainz', err);
      throw new ServiceUnavailableException('MusicBrainz request failed');
    }
  }

  private parseReleaseXml(xml: string, mbid: string): MusicBrainzRelease {
    let obj: any;
    try {
      obj = this.xmlParser.parse(xml);
    } catch (err) {
      this.logger.error('XML parse error', err);
      throw new BadRequestException('Invalid XML from MusicBrainz');
    }

    // XML root is <metadata><release ...>...</release></metadata>
    const release = obj?.metadata?.['release'] ?? obj?.release;
    if (!release) {
      this.logger.warn('No release node found in MusicBrainz XML');
      throw new BadRequestException('MusicBrainz release data missing');
    }

    const title = release?.title ?? undefined;

    // Medium list can be single object or array
    // path to track = release -> medium-list -> medium -> track-list -> track
    const mediums = (() => {
      const ml =
        release?.['medium-list'] ??
        release?.['medium_list'] ??
        release?.mediumlist;
      if (!ml) return [];
      const medium = ml?.medium ?? ml;
      if (Array.isArray(medium)) return medium;
      return [medium];
    })();

    const trackItems: TrackItem[] = [];

    for (const medium of mediums) {
      // track-list is directly at medium for test mbid = 63823c15-6abc-473e-9fad-d0d0fa983b34 - Response below
      const trackListNode =
        medium?.['track-list'] ??
        medium?.['track_list'] ??
        medium?.tracklist ??
        medium?.['track-list'];
      if (!trackListNode) continue;
      const tracks = trackListNode?.track ?? trackListNode;
      const list = Array.isArray(tracks) ? tracks : [tracks];

      for (const t of list) {
        if (!t) continue;
        // Get position, recording/title, length under track node
        const position = t?.position ?? t?.['@_position'] ?? undefined;
        const lengthStr = t?.length ?? t?.['@_length'] ?? undefined;
        const lengthMs = lengthStr ? parseInt(lengthStr, 10) : undefined;

        // Title may be under recording.title or title
        let titleText = undefined;
        if (t?.recording?.title) titleText = t.recording.title;
        else if (t?.title) titleText = t.title;
        else if (t?.['recording'] && typeof t.recording === 'string')
          titleText = t.recording;

        if (!titleText) {
          for (const v of Object.values(t)) {
            if (v && typeof v === 'object' && 'title' in v) {
              const vv: any = v;
              if (typeof vv.title === 'string') {
                titleText = vv.title;
                break;
              }
            }
          }
        }

        if (!titleText) continue; // skip malformed track entries

        trackItems.push({
          position: position?.toString(),
          title: titleText,
          lengthMs,
        });
      }
    }

    if (trackItems.length === 0) {
      this.logger.warn(`No tracks parsed for MBID ${mbid}`);
    }

    const result: MusicBrainzRelease = {
      mbid,
      title,
      tracklist: trackItems,
    };

    return result;
  }
}

/* 
 <?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns="http://musicbrainz.org/ns/mmd-2.0#">
    <release id="63823c15-6abc-473e-9fad-d0d0fa983b34">
        <title>First and Last and Always</title>
        <status id="4e304316-386d-3409-af2e-78857eec5cfe">Official</status>
        <quality>normal</quality>
        <disambiguation>original EU vinyl version / Eldritch mixes</disambiguation>
        <packaging id="f7101ce3-0384-39ce-9fde-fbbd0044d35f">Cardboard/Paper Sleeve</packaging>
        <text-representation>
            <language>eng</language>
            <script>Latn</script>
        </text-representation>
        <date>1985-03</date>
        <country>XE</country>
        <release-event-list count="1">
            <release-event>
                <date>1985-03</date>
                <area id="89a675c2-3e37-3518-b83c-418bad59a85a">
                    <name>Europe</name>
                    <sort-name>Europe</sort-name>
                    <iso-3166-1-code-list>
                        <iso-3166-1-code>XE</iso-3166-1-code>
                    </iso-3166-1-code-list>
                </area>
            </release-event>
        </release-event-list>
        <barcode/>
        <cover-art-archive>
            <artwork>true</artwork>
            <count>1</count>
            <front>true</front>
            <back>false</back>
        </cover-art-archive>
        <medium-list count="1">
            <medium id="b0337a5e-034c-384c-9cb4-e6f6a88e83c7">
                <position>1</position>
                <format id="3e9080b0-5e6c-34ab-bd15-f526b6306a64">12" Vinyl</format>
                <track-list count="10" offset="0">
                    <track id="ca93bab6-d02a-3d1a-b0f1-ef9c1b1e39ba">
                        <position>1</position>
                        <number>A1</number>
                        <length>267000</length>
                        <recording id="d48c8aab-ffd3-4926-93bc-d753dd100a9c">
                            <title>Black Planet</title>
                            <length>267000</length>
                            <disambiguation>EU, US, AU album version / Eldritch mix / 4th mix</disambiguation>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="82bcb4c1-6d72-3968-becc-1ee1f503185f">
                        <position>2</position>
                        <number>A2</number>
                        <length>200000</length>
                        <recording id="9294620b-e49a-489c-807e-9b889fd30544">
                            <title>Walk Away</title>
                            <length>204000</length>
                            <disambiguation>album version / Genetic studio mix</disambiguation>
                            <first-release-date>1984</first-release-date>
                        </recording>
                    </track>
                    <track id="dead794a-c1c1-3538-9750-39b86b39afe7">
                        <position>3</position>
                        <number>A3</number>
                        <length>234000</length>
                        <recording id="591852c4-2386-4efa-b42f-9985c3161646">
                            <title>No Time to Cry</title>
                            <length>242733</length>
                            <disambiguation>EU, US, AU album version / Eldritch mix / 12" single mix</disambiguation>
                            <first-release-date>1985-02</first-release-date>
                        </recording>
                    </track>
                    <track id="87b9da8c-3e11-3988-b5d7-f21290d6c75b">
                        <position>4</position>
                        <number>A4</number>
                        <length>216000</length>
                        <recording id="865fec1c-ba38-4363-b23a-cf28abcfe4e6">
                            <title>A Rock and a Hard Place</title>
                            <length>216000</length>
                            <disambiguation>EU, US, AU album version / Eldritch mix</disambiguation>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="014f9737-b35f-366b-968d-99f7f2151e31">
                        <position>5</position>
                        <number>A5</number>
                        <length>337000</length>
                        <recording id="a110ef30-4199-44b6-8a53-0f79a0a3e974">
                            <title>Marian (version)</title>
                            <length>344000</length>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="2896e936-bc5b-3011-9d4f-1ad5ac799e88">
                        <position>6</position>
                        <number>B1</number>
                        <length>238000</length>
                        <recording id="bf702986-a15b-4ee7-a017-6f4d72c9a6b3">
                            <title>First and Last and Always</title>
                            <length>242000</length>
                            <disambiguation>EU, US, AU album version / Eldritch mix</disambiguation>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="bfde74ec-f52b-339c-a1e7-2a6eba0f988f">
                        <position>7</position>
                        <number>B2</number>
                        <length>276000</length>
                        <recording id="a347ed57-7dda-4465-bece-28f4ce39d860">
                            <title>Possession</title>
                            <length>279000</length>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="f0183bc0-3e67-3dad-89d4-9ef19f5b05b4">
                        <position>8</position>
                        <number>B3</number>
                        <length>247000</length>
                        <recording id="6a1cc0e6-ae65-46ee-852e-ac510ac5fa2c">
                            <title>Nine While Nine</title>
                            <length>251000</length>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="13e27aee-21b8-36e5-b8ad-48c5cfc72d44">
                        <position>9</position>
                        <number>B4</number>
                        <title>Logic</title>
                        <length>286000</length>
                        <recording id="fd76129c-119c-4345-836f-2e8f02a9e01f">
                            <title>Amphetamine Logic</title>
                            <length>291533</length>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                    <track id="4e5c8fd0-4736-30c3-9249-06f746914780">
                        <position>10</position>
                        <number>B5</number>
                        <length>436000</length>
                        <recording id="02cf24a1-8e8c-4f60-80a8-6492ab2a75db">
                            <title>Some Kind of Stranger</title>
                            <length>440000</length>
                            <first-release-date>1985-03</first-release-date>
                        </recording>
                    </track>
                </track-list>
            </medium>
        </medium-list>
    </release>
</metadata>
 */
