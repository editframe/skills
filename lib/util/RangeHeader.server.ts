export class RangeHeader {
  static parse(range: string, length?: number) {
    const [x, y] = range.replace("bytes=", "").split("-");
    const end = Number.parseInt(y ?? "0", 10) || 0;
    const start = Number.parseInt(x ?? "0", 10) || 0;
    return new RangeHeader(start, end, length);
  }

  constructor(
    public start: number,
    public end: number,
    private length?: number,
  ) {}

  toHeader() {
    return `bytes ${this.start}-${this.end}/${this.length ?? "*"}`;
  }
}
