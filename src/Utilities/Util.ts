/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-mixed-operators */

import { isIPv4 } from "node:net";
import { Endianess } from "./Binaries/Endianess";
import { ByteWriter } from "./Bytes/ByteWriter";
import { RtpHeader, uint32 } from "./Types";

/* eslint-disable @typescript-eslint/restrict-plus-operands */
export function floorDiv(a: number, b: number): number {
    return Math.floor(a / b);
}

export function range(start: number, stop: number, step = 1): number[] {
    return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step);
}

export function withIndex<T>(arr: T[]): { index: number; value: T }[] {
    return arr.map((value, index) => ({ value, index }));
}

export function concat(...buf: Uint8Array[]): Uint8Array {
    let length = 0;
    for (const b of buf) {
        length += b.length;
    }

    const output = new Uint8Array(length);
    let index = 0;
    for (const b of buf) {
        output.set(b, index);
        index += b.length;
    }

    return output;
}

export function uint32toBytes(value: uint32, endianess: Endianess = "big"): Uint8Array {
    return ByteWriter.withSize(4)
        .writeUInt32(value, endianess)
        .data;
}

export function parseLocalPacket(message: Buffer): { ip: string; port: number } {
    const packet = Buffer.from(message);

    const ip = packet.subarray(8, packet.indexOf(0, 8)).toString("utf-8");

    if (!isIPv4(ip)) {
        throw new Error("Malformed IP address");
    }

    const port = packet.readUInt16BE(packet.length - 2);

    return { ip, port };
}

export function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
}

export function createRtpHeader(sequence: number, timestamp: number, ssrc: number): RtpHeader {
    return {
        version: 2,
        hasExtension: false,
        hasPadding: false,
        csrcCount: 0,
        marker: false,
        payloadType: 0x78,
        sequence,
        timestamp,
        ssrc,
        csrcIdentifiers: []
    };
}

const RTP_HEADER_SIZE = 12;

export function writeRtpHeader(writer: ByteWriter, header: RtpHeader): void {
    if (writer.data.length < RTP_HEADER_SIZE) {
        throw new Error(`Writer buffer is too short, must be (atleast) ${RTP_HEADER_SIZE} bytes`);
    }

    // 00
    const padding = header.hasPadding ? 0x20 : 0x00;
    const extension = header.hasExtension ? 0x10 : 0x00;
    writer.write((header.version << 6) | padding | extension | (header.csrcCount & 0x0F));

    // 01
    const marker = header.marker ? 0x80 : 0x00;
    writer.write(header.payloadType | marker);

    // 02 03
    writer.writeUInt16(header.sequence);

    // 04 05 06 07
    writer.writeUInt32(header.timestamp);

    // 08 09 10 11
    writer.writeUInt32(header.ssrc);

    /* write constributing-source identifiers. */
    if (header.csrcCount != 0) {
        const size = RTP_HEADER_SIZE + header.csrcCount * 2;
        if (writer.data.length < size) {
            throw new Error(`Writer buffer is too short, must be (at least) ${size} bytes long.`);
        }

        for (const identifier of header.csrcIdentifiers) writer.writeUInt32(identifier);
    }
}
