import { Endianess } from "../Binaries/Endianess";

export class ByteWriter {
    public position = 0;

    public constructor(public data: Uint8Array, public endianess: Endianess = "big") { }


    /**
     * Sets the current position to the given {@link value offset}.
     * Warning: this may cause data to be overwritten.
     *
     * @param {number} value the value to set the position to.
     */
    public usePosition(value: number): void {
        this.position = value;
    }

    /**
     */
    public slice(start = 0, end = this.position): Uint8Array {
        return this.data.subarray(start, end);
    }

    /**
     * Resets this byte array cursor.
     */
    public reset(): void {
        this.position = 0;
    }

    /**
     * Grow the underlying byte array by the given number of bytes.
     *
     * @return `true` if the underlying byte array was grown, `false` otherwise.
     */
    public grow(size: number): boolean {
        return this.resize(this.position + size);
    }

    /**
     * Resize the underlying byte array to the given size.
     *
     * @return `true` if the underlying byte array was resized, `false` otherwise.
     */
    public resize(newLen: number, ifSmaller = false): boolean {
        if (this.data.length < newLen || ifSmaller) {
            const source = newLen < this.data.length
                ? new Uint8Array(this.data, this.data.byteOffset, newLen)
                : this.data;

            const newData = new Uint8Array(newLen);
            source.set(newData);
            this.data = newData;
            return true;
        }

        return false;
    }

    /**
     * Writes the supplied byte to the underlying buffer at the current position.
     * @param {number} byte the byte to write.
     * @returns {this} this cursor, useful for chaining.
     */
    public write(byte: number): this {
        this.isNotExhaustedOrThrow();
        this.data[this.position++] = byte;
        return this;
    }

    /**
     * Copies the supplied byte array to the underlying buffer at the current position.
     * @param {Uint8Array} bytes the byte array to copy.
     * @param {number} offset the offset to start copying from.
     * @param {number} length the number of bytes to copy.
     * @param {boolean} offsetLength if `true`, the number of bytes copied are offset by {@link offset}.
     * @returns {this} this cursor, useful for chaining.
     */
    public writeBytes(bytes: ArrayBufferLike | number[]): this {
        if (Array.isArray(bytes)) {
            for (const byte of bytes) {
                this.write(byte);
            }
        } else if (bytes instanceof Uint8Array) {
            const source = new Uint8Array(bytes, bytes.byteOffset, bytes.length);
            this.data.set(source, this.position);
            this.forward(source.length);
        } else {
            return this.writeBytes(new Uint8Array(bytes));
        }

        return this;
    }

    /**
     * Writes the supplied value to the underlying buffer at the current position.
     *
     * @param {number} value the 16-bit integer to write.
     * @returns {this} this cursor, useful for chaining.
     */
    public writeUInt16(value: number, endianess: Endianess = this.endianess): this {
        const bytes = [value & 0xff, value >> 8];
        this.writeBytes(endianess === "big" ? bytes.reverse() : bytes);

        return this;
    }

    /**
     * Writes the supplied value to the underlying buffer at the current position.
     *
     * @param {number} value the 32-bit integer to write.
     * @returns {this} this cursor, useful for chaining.
     */
    public writeUInt32(value: number, endianess: Endianess = this.endianess): this {
        const bytes = [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, value >> 24];
        this.writeBytes(endianess === "big" ? bytes.reverse() : bytes);

        return this;
    }

    public forward(by: number): void {
        this.position += by;
    }

    private isNotExhaustedOrThrow(): void {
        if (this.isExhausted) {
            throw new Error("Unable to write any more data.");
        }
    }

    /**
     * Creates a new {@link ByteWriter} with an underlying buffer of the supplied {@link size}.
     * @param {number} size
     * @param endianess
     * @returns {ByteWriter} the new cursor.
     */
    public static withSize(size: number, endianess: Endianess = "big"): ByteWriter {
        return new ByteWriter(new Uint8Array(size), endianess);
    }

    /**
     * Whether this byte array cursor is exhausted.
     */
    public get isExhausted(): boolean {
        return this.position === this.data.length + 1;
    }
}
