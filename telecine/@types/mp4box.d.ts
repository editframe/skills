import { Writable } from "stream";

/* eslint-disable @typescript-eslint/method-signature-style */
declare module "mp4box" {
  export class MP4BoxStream {
    constructor(arrayBuffer: ArrayBuffer);

    getPosition(): number;

    seek(position: number): void;
  }

  type SegmentOptions =
    | {
        rapAlignement: boolean;
      }
    | { nbSamples: number };
  export class ISOFile {}

  export class DataStream {
    static readonly BIG_ENDIAN = false;
    static readonly LITTLE_ENDIAN = true;

    constructor(
      arrayBuffer: ArrayBuffer | undefined,
      byteOffset: number,
      endianness: boolean,
    );

    readonly buffer: ArrayBuffer;
  }

  export interface Box {
    type: string;
    size: number;
    hdr_size: number;
    start: number;

    write(stream: DataStream): void;
  }

  export enum BoxParser {
    ERR_INVALID_DATA = -1,
    ERR_NOT_ENOUGH_DATA = 0,
    OK = 1,
  }

  export interface BoxResult {
    code: BoxParser.OK;
    box: Box;
    size: number;
  }

  export interface HeaderOnlyResult {
    code: BoxParser.OK;
    type: string;
    size: number;
    hdr_size: number;
    start: number;
  }

  export interface InvalidDataResult {
    code: BoxParser.ERR_INVALID_DATA;
  }

  export interface NotEnoughDataResult {
    code: BoxParser.ERR_NOT_ENOUGH_DATA;
    type?: string;
    size?: number;
    hdr_size?: number;
    start?: number;
  }

  export namespace BoxParser {
    export function parseOneBox(
      stream: MP4BoxStream,
      headerOnly: true,
    ): HeaderOnlyResult | InvalidDataResult | NotEnoughDataResult;

    export function parseOneBox(
      stream: MP4BoxStream,
      headerOnly?: false,
    ): BoxResult | InvalidDataResult | NotEnoughDataResult;
  }

  export function createFile(): ISOFile;

  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number;
  }

  interface AddSampleOptions {
    sample_description_index?: number;
    duration?: number;
    cts?: number;
    dts?: number;
    is_sync?: boolean;
    is_leading?: number;
    depends_on?: number;
    is_depended_on?: number;
    has_redundancy?: number;
    degradation_priority?: number;
    subsamples?: any[];
  }

  interface AddTrackOptions {
    width?: number;
    height?: number;
    id?: number;
    type?: string;
    hdlr?: string;
    timescale?: number;
    language?: string | number;
    name?: string;
    type?: string;
    duration?: number;
    sample_rate?: number;
    channel_count?: number;
    samplesize?: number;
    media_duration?: number;
    // nb_samples?: number;
    default_sample_description_index?: number;
    default_sample_duration?: number;
    default_sample_size?: number;
    default_sample_flags?: number;
    avcDecoderConfigRecord?: ArrayBuffer;
    hevcDecoderConfigRecord?: ArrayBuffer;
  }

  interface FragmentedTrack {
    id: number;
    user: any;
    trak: TrakBox;
    segmentStream: any;
    nb_samples: number;
    rapAlignement: boolean;
  }

  interface ExtractedTrack {
    id: number;
    user: any;
    trak: TrakBox;
    nb_samples: number;
    sampleProcessingStarted: boolean;
    sampleOptions: ExtractionOptions;
    samples: Sample[];
  }

  interface InitializationSegment {
    /** Track id */
    id: number;
    /** @deprecated User-supplied data */
    user: any;
    /** Bytes for init segment including `ftyp` and `moov` boxes */
    buffer: ArrayBuffer;
  }

  export interface MultiBufferStream extends DataStream {
    buffers: MP4ArrayBuffer[];
    bufferIndex: number;
    initalized(): boolean;
    concat(b1: ArrayBuffer, b2: ArrayBuffer): ArrayBuffer;
    reduceBuffer(
      buffer: ArrayBuffer,
      offset: number,
      newLength: number,
    ): ArrayBuffer;
    insertBuffer(arrayBuffer: ArrayBuffer): void;
    logBufferLevel(info: any): void;
    cleanBuffers(): void;
    mergeNextBuffer(): boolean;
    findPosition(
      fromStart: number,
      filePosition: number,
      markAsUsed: boolean,
    ): number;
    findEndContiguousBuf(inputIndex: number): number;
    getEndFilePositionAfter(position: number): number;
    addUsedBytes(numberOfBytes: number): void;
    setAllUsedBytes(): void;
    seek(position: number, fromStart: boolean, markAsUsed: boolean): boolean;
    getPosition(): number;
    getLength(): number;
    getEndPosition(): number;
  }

  export interface ISOFile {
    fragmentedTracks: FragmentedTrack[];
    extractedTracks: ExtractedTrack[];
    sampleProcessingStarted: boolean;
    isFragmentationInitialized: boolean;
    readySent: boolean;
    nextMoofNumber: number;
    stream: MultiBufferStream;

    onSegment?: (
      trackId: number,
      user: any,
      buffer: Uint8Array,
      sampleNum: number,
      last: boolean,
    ) => void;

    appendBuffer(ab: MP4ArrayBuffer, last?: boolean): number;

    addTrack(options?: AddTrackOptions): number;

    addSample(
      trackId: number,
      data: Uint8Array,
      options?: AddSampleOptions,
    ): void;

    createFragment(
      track_id: number,
      sampleNumber: number,
      stream?: DataStream,
    ): DataStream;

    getAllocatedSampleDataSize(): number;

    getInfo(): Info;

    getTrackById(trackId: number): TrakBox;

    getSample(trak: TrakBox, sampleNum: number): Sample | undefined;

    initializeSegmentation(): InitializationSegment[];

    setExtractionOptions(
      trackId: number,
      user: any,
      options: ExtractionOptions,
    );

    setNextSeekPositionFromSample(sample?: Sample): void;

    start(): void;

    stop(): void;

    flush(): void;

    onSamples?: (trackId: number, user: any, samples: Sample[]) => void;

    onError?: (e: Error) => void;

    onReady?: (info: Info) => void;

    releaseUsedSamples(trackId: number, sampleNum: number): void;

    write(outstream: Writable): void;

    getBuffer(): ArrayBuffer;
  }

  export interface Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasIOD: boolean;
    brands: string[];
    created: Date;
    modified: Date;
    tracks: TrackInfo[];
    audioTracks: AudioTrackInfo[];
    videoTracks: VideoTrackInfo[];
  }

  export interface TrackInfo {
    type: "audio" | "video";
    id: number;
    name: string;
    created: Date;
    modified: Date;
    movie_duration: number;
    samples_duration: number;
    layer: number;
    alternate_group: number;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    language: "und";
    nb_samples: number;
  }

  export interface AudioTrackInfo extends TrackInfo {
    type: "audio";
    audio: {
      sample_rate: number;
      channel_count: number;
      sample_size: number;
    };
  }

  export interface VideoTrackInfo extends TrackInfo {
    type: "video";
    video: {
      width: number;
      height: number;
    };
    edits: EditBox[];
  }

  export interface TrakBox extends Box {
    type: "trak";
    mdia: MdiaBox;
    samples?: Sample[];
    timescale?: number;
    nextSample?: number;
  }

  export interface MdiaBox extends Box {
    type: "mdia";
    minf: MinfBox;
  }

  export interface MinfBox extends Box {
    type: "minf";
    stbl: StblBox;
  }

  export interface StblBox extends Box {
    type: "stbl";
    stsd: StsdBox;
  }

  export interface StsdBox extends Box {
    type: "stsd";
    entries: StsdEntry[];
  }

  export interface StsdEntry extends Box {
    avcC?: AvccBox;
    hvcC?: HvcCBox;
  }

  export interface AvcBox extends Box {
    type: "avc1";
    avcC: AvccBox;
  }

  export interface AvccBox extends Box {
    type: "avcC";
  }

  export interface ExtractionOptions {
    nbSamples?: number;
  }

  export interface Sample {
    number: number;
    track_id: number;
    timescale: number;
    description: Box;
    size: number;
    data?: Uint8Array;
    duration: number;
    dts: number;
    cts: number;
    is_sync: boolean;
    is_leading: number;
    is_depended_on: number;
    has_redundancy: number;
    degradation_priority: number;
    offset: number;
  }
}
