import internal, { Writable } from "stream";

// A class that captures output while also passing it through to the original stream
export class CaptureStream extends Writable {
    originalStream?: Writable;
    /** To store captured output. */
    captureBuffer: string;
    finished: boolean;

    constructor(originalStream?: Writable, options?: internal.WritableOptions) {
        super(options)
        this.originalStream = originalStream
        this.captureBuffer = ''
        this.finished = false;

        // Listen for the finish event
        this.on('finish', () => {
            this.finished = true;
            this.whenFinished(this.captureBuffer);
        });
    }

    whenFinished(captured: string) {
        // NOOP used for testing
    }

    _write(
        chunk: any,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void
    ) {
        // Convert the chunk to a string
        const chunkStr = chunk.toString();

        // Capture the chunk
        this.captureBuffer += chunkStr;

        // Pass the chunk through to the original stream
        if (this.originalStream) {
            this.originalStream.write(chunkStr);
        }

        // Call the callback to signal that writing is complete
        callback();
    }

    getCaptured() {
        return this.captureBuffer;
    }
}