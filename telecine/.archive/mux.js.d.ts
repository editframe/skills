declare module "mux.js" {
  class Stream {
    on(type: string, callback: any): void;
    off(type: string, callback: any): void;
    trigger(type: string, ...args: any[]): void;
    dispose(): void;
    pipe<DestinationStream extends Stream>(
      destination: DestinationStream,
    ): DestinationStream;
    push(data: any): void;
    flush(): void;
    partialFlush(): void;
    endTimeline(): void;
    reset(): void;
  }

  namespace mp4 {
    interface BaseTrack {
      id: number;
      duration: number;
      type: string;
      baseMediaDecodeTime: number;
      width: number;
      height: number;
    }

    interface VideoTrack extends BaseTrack {
      type: "video";
      sps?: Uint8Array[];
      pps?: Uint8Array[];
      profileIdc: number;
      profileCompatibility: number;
      levelIdc: number;
      sarRatio?: number[];
    }

    interface AudioTrack extends BaseTrack {
      type: "audio";
      channelcount: number;
      samplesize: number;
      samplerate: number;
      audioobjecttype: number;
      samplingfrequencyindex: number;
    }

    type Track = VideoTrack | AudioTrack;

    declare const generator = {
      initSegment: (tracks: Track[]) => Uint8Array,
      moov: (tracks: Track[]) => Uint8Array,
    };
    export class VideoSegmentStream extends Stream {
      ctor(
        track: VideoTrack,
        options: {
          alignGopsAtEnd: boolean;
          keepOriginalTimestamps: boolean;
          firstSequenceNumber: number;
        },
      ): VideoSegmentStream;
    }
    export class AudioSegmentStream extends Stream {
      ctor(): AudioSegmentStream;
    }
  }

  namespace codecs {
    namespace h264 {
      interface Packet {
        data: Uint8Array;
        dts: number;
        pts: number;
        trackId: number;
        type: "audio" | "video";
      }

      export class H264Stream extends Stream {
        ctor(): H264Stream;
        push(packet: Packet): void;
      }

      export class NalByteStream extends Stream {
        ctor(): NalByteStream;
        push(data: Uint8Array): void;
      }
    }
  }
}
