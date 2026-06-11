export class AudioBuffer {
  private chunks: Buffer[] = [];

  push(chunk: Buffer): void {
    this.chunks.push(chunk);
  }

  flush(): Buffer | null {
    if (!this.chunks.length) return null;
    const buf = Buffer.concat(this.chunks);
    this.chunks = [];
    return buf;
  }

  clear(): void {
    this.chunks = [];
  }

  get size(): number {
    return this.chunks.length;
  }
}