declare module "codem-isoboxer" {
  interface ISOBox {
    type: string;
    timescale?: number;
    duration?: number;
    fetch(type: string): ISOBox | null;
    fetchAll(type: string): ISOBox[];
    [key: string]: unknown;
  }

  interface ISOFile {
    fetch(type: string): ISOBox | null;
    fetchAll(type: string): ISOBox[];
    boxes: ISOBox[];
    write(): ArrayBuffer;
  }

  const ISOBoxer: {
    parseBuffer(buffer: ArrayBuffer): ISOFile;
  };

  export default ISOBoxer;
}
