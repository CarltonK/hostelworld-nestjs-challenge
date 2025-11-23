export interface TrackItem {
  position?: string;
  title: string;
  lengthMs?: number;
}

export interface MusicBrainzRelease {
  mbid: string;
  title?: string;
  tracklist: TrackItem[];
}
