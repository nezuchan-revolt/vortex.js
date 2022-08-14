import { ByteWriter } from "../Bytes/ByteWriter";

export type uint8 = number;
export type uint16 = number;
export type uint32 = number;

export interface ICryptoStrategy {
    name: string;
}

export interface RtpHeader {
    sequence: uint16;
    timestamp: uint32;
    ssrc: uint32;

    version: number;
    hasPadding: boolean;
    hasExtension: boolean;
    csrcCount: number;
    csrcIdentifiers: number[];
    marker: boolean;
    payloadType: number;
}

export interface EncryptionStrategy extends ICryptoStrategy {
    encrypt: (cursor: ByteWriter, header: RtpHeader, payload: Uint8Array) => void;

    nextSequence: (previous: number) => number;
}
