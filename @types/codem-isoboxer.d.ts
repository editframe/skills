declare module "codem-isoboxer" {
  interface ISOBox {
    type: string;
    size: number;
    hdr_size: number;
    start: number;
  }

  export interface ftypBox extends ISOBox {
    type: "ftyp";
  }

  export interface moovBox extends ISOBox {
    type: "moov";
  }

  export interface moofBox extends ISOBox {
    type: "moof";
  }

  export interface tfdtBox extends ISOBox {
    type: "tfdt";
    baseMediaDecodeTime: number;
  }

  export interface mfhdBox extends ISOBox {
    type: "mfhd";
    sequence_number: number;
  }

  export interface tfhdBox extends ISOBox {
    type: "tfhd";
    default_sample_duration: number;
    default_sample_size: number;
  }

  export interface tkhdBox extends ISOBox {
    type: "tkhd";
    duration: number;
  }

  export interface trunBox extends ISOBox {
    type: "trun";
    sample_count: number;
  }

  export interface mdhdBox extends ISOBox {
    type: "mdhd";
    timescale: number;
    duration: number;
  }

  export interface mvhdBox extends ISOBox {
    type: "mvhd";
    timescale: number;
    duration: number;
  }

  export interface mfraBox extends ISOBox {
    type: "mfra";
  }

  export interface mdatBox extends ISOBox {
    type: "mdat";
  }

  export interface mehdBox extends ISOBox {
    type: "mehd";
    fragment_duration: number;
  }

  export interface mevxBox extends ISOBox {
    type: "mvex";
  }

  export interface edtsBox extends ISOBox {
    type: "edts";
  }

  export interface trexBox extends ISOBox {
    type: "trex";
  }

  export type AnyBox =
    | ftypBox
    | moovBox
    | moofBox
    | tfdtBox
    | mfhdBox
    | mdhdBox
    | tfhdBox
    | tkhdBox
    | trunBox
    | mvhdBox
    | mfraBox
    | mdatBox
    | mehdBox
    | mevxBox
    | edtsBox
    | trexBox;

  type FilterBoxByType<T extends AnyBox, U extends string> = T extends {
    type: U;
  }
    ? T
    : never;

  function fetch<T extends AnyBox["type"]>(type: T): FilterBoxByType<AnyBox, T>;
  function fetchAll<T extends AnyBox["type"]>(
    type: T,
  ): FilterBoxByType<AnyBox, T>[];

  export interface ISOFile {
    boxes: AnyBox[];
    fetch: typeof fetch;
    fetchAll: typeof fetchAll;
    write: () => ArrayBuffer;
  }

  type ParseBuffer = (buffer: ArrayBufferLike) => ISOFile;

  const codemIsoboxer: {
    parseBuffer: ParseBuffer;
    createBox<T extends AnyBox["type"]>(type: T, parent: ISOBox, pos?: number): FilterBoxByType<AnyBox, T>;
  };

  export default codemIsoboxer;
}
