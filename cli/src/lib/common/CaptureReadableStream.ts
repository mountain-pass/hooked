import { Readable, Transform, TransformCallback, TransformOptions } from "stream";

export class CaptureTransformStream extends Transform {

    originalStream?: Readable
    captureBuffer: string = ''
    finished: boolean = false

    constructor(originalStream?: Readable, options?: TransformOptions) {
        super(options);
        this.originalStream = originalStream;
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        // Capture the data
        this.captureBuffer += chunk.toString();

        // Pass the data through
        this.push(chunk);

        callback();
    }

    _flush(callback: TransformCallback) {
        callback();
    }

    getCaptured() {
        return this.captureBuffer
    }
}
