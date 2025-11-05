import { RENDITION_CONFIGS } from './transcoding-service';
import { calculateSegmentDurations } from './calculateSegmentDurations';

export interface ManifestOptions {
  baseUrl: string;
  duration: number;
  segmentDuration: number;
  videoRenditions: string[]; // high, medium, low
  audioRenditions: string[]; // audio
  sourceUrl?: string; // Add source URL to pass through to segments
}

export class ManifestGenerator {
  static generateDashManifest(options: ManifestOptions): string {
    const { baseUrl, duration, segmentDuration, videoRenditions, audioRenditions, sourceUrl } = options;
    const encodedUrl = sourceUrl ? encodeURIComponent(sourceUrl) : '';

    // Calculate actual segment durations for video (in milliseconds)
    const videoActualDurationsMs = calculateSegmentDurations(duration * 1000, segmentDuration * 1000, { mediaType: 'video' });
    const videoActualDurations = videoActualDurationsMs.map(d => d / 1000); // Convert to seconds for manifest

    // Calculate actual segment durations for audio (in milliseconds) 
    const audioActualDurationsMs = calculateSegmentDurations(duration * 1000, segmentDuration * 1000, { mediaType: 'audio' });
    const audioActualDurations = audioActualDurationsMs.map(d => d / 1000); // Convert to seconds for manifest

    // Create video AdaptationSet with multiple Representations
    const videoRepresentations = videoRenditions.map(rendition => {
      const config = RENDITION_CONFIGS[rendition];
      if (!config) {
        throw new Error(`Invalid video rendition: ${rendition}`);
      }
      const bandwidth = Number.parseInt(config.videoBitrate.replace('k', '')) * 1000;

      // Create SegmentTimeline with actual durations
      const segmentTimeline = videoActualDurations.map((actualDuration, i) =>
        `<S t="${videoActualDurations.slice(0, i).reduce((sum, d) => sum + d * 1000, 0)}" d="${Math.round(actualDuration * 1000)}"/>`
      ).join('\n            ');

      return `      <Representation 
        id="${rendition}" 
        bandwidth="${bandwidth}" 
        width="${config.width}" 
        height="${config.height}" 
        frameRate="30"
        codecs="avc1.640029">
        <SegmentTemplate 
          media="${baseUrl}/api/v1/transcode/${rendition}/$Number%05d$.m4s?url=${encodedUrl}"
          initialization="${baseUrl}/api/v1/transcode/${rendition}/init.m4s?url=${encodedUrl}"
          timescale="1000"
          startNumber="1">
          <SegmentTimeline>
            ${segmentTimeline}
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>`;
    }).join('\n');

    // Create audio AdaptationSet with actual durations
    const audioRepresentations = audioRenditions.map(rendition => {
      const config = RENDITION_CONFIGS[rendition];
      if (!config) {
        throw new Error(`Invalid audio rendition: ${rendition}`);
      }
      const bandwidth = Number.parseInt(config.audioBitrate.replace('k', '')) * 1000;

      // Create SegmentTimeline with actual durations
      const segmentTimeline = audioActualDurations.map((actualDuration, i) =>
        `<S t="${audioActualDurations.slice(0, i).reduce((sum, d) => sum + d * 1000, 0)}" d="${Math.round(actualDuration * 1000)}"/>`
      ).join('\n            ');

      return `      <Representation 
        id="${rendition}" 
        bandwidth="${bandwidth}" 
        audioSamplingRate="48000"
        codecs="mp4a.40.2">
        <SegmentTemplate 
          media="${baseUrl}/api/v1/transcode/${rendition}/$Number%05d$.m4s?url=${encodedUrl}"
          initialization="${baseUrl}/api/v1/transcode/${rendition}/init.m4s?url=${encodedUrl}"
          timescale="1000"
          startNumber="1">
          <SegmentTimeline>
            ${segmentTimeline}
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>`;
    }).join('\n');

    const videoAdaptationSet = videoRenditions.length > 0 ? `
    <AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1" codecs="avc1.640029">
${videoRepresentations}
    </AdaptationSet>` : '';

    const audioAdaptationSet = audioRenditions.length > 0 ? `
    <AdaptationSet mimeType="audio/mp4" segmentAlignment="true" startWithSAP="1" codecs="mp4a.40.2">
${audioRepresentations}
    </AdaptationSet>` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" 
     profiles="urn:mpeg:dash:profile:isoff-live:2011" 
     type="static" 
     mediaPresentationDuration="PT${duration}S" 
     minBufferTime="PT2S">
  <Period id="0" start="PT0S">
${videoAdaptationSet}
${audioAdaptationSet}
  </Period>
</MPD>`;
  }

  static generateHlsManifest(options: ManifestOptions): string {
    const { baseUrl, videoRenditions, audioRenditions, sourceUrl } = options;
    const encodedUrl = sourceUrl ? encodeURIComponent(sourceUrl) : '';

    const videoPlaylists = videoRenditions.map(rendition => {
      const config = RENDITION_CONFIGS[rendition];
      if (!config) {
        throw new Error(`Invalid video rendition: ${rendition}`);
      }
      const bandwidth = Number.parseInt(config.videoBitrate.replace('k', '')) * 1000;

      return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${config.width}x${config.height},CODECS="avc1.640029,mp4a.40.2"
${baseUrl}/api/v1/transcode/${rendition}.m3u8?url=${encodedUrl}`;
    }).join('\n');

    const audioPlaylists = audioRenditions.map(rendition => {
      const config = RENDITION_CONFIGS[rendition];
      if (!config) {
        throw new Error(`Invalid audio rendition: ${rendition}`);
      }
      const bandwidth = Number.parseInt(config.audioBitrate.replace('k', '')) * 1000;

      return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},CODECS="mp4a.40.2"
${baseUrl}/api/v1/transcode/${rendition}.m3u8?url=${encodedUrl}`;
    }).join('\n');

    const playlists = [videoPlaylists, audioPlaylists].filter(p => p.length > 0).join('\n');

    return `#EXTM3U
#EXT-X-VERSION:6
${playlists}`;
  }

  static generateHlsQualityPlaylist(options: ManifestOptions & { rendition: string }): string {
    const { baseUrl, duration, segmentDuration, rendition, sourceUrl } = options;
    const encodedUrl = sourceUrl ? encodeURIComponent(sourceUrl) : '';

    // Calculate actual segment durations for HLS
    // Use video frame alignment for video renditions, AAC alignment for audio renditions
    const isVideoRendition = RENDITION_CONFIGS[rendition]?.videoBitrate !== undefined;
    const actualDurationsMs = calculateSegmentDurations(
      duration * 1000,
      segmentDuration * 1000,
      { mediaType: isVideoRendition ? 'video' : 'audio' }
    );
    const actualDurations = actualDurationsMs.map(d => d / 1000); // Convert to seconds for manifest

    const segments = actualDurations.map((actualDuration, i) => {
      const segmentId = String(i + 1).padStart(5, '0');
      return `#EXTINF:${actualDuration.toFixed(6)},
${baseUrl}/api/v1/transcode/${rendition}/${segmentId}.m4s?url=${encodedUrl}`;
    }).join('\n');

    // Use the maximum actual duration for target duration (HLS requirement)
    const maxDuration = Math.max(...actualDurations);

    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:${Math.ceil(maxDuration)}
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MAP:URI="${baseUrl}/api/v1/transcode/${rendition}/init.m4s?url=${encodedUrl}"
${segments}
#EXT-X-ENDLIST`;
  }
} 