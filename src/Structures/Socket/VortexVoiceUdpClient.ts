/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-empty */
import { createSocket, Socket } from "node:dgram";
import EventEmitter from "node:events";
import { VortextVoiceWebsocketClient } from "./VortexVoiceWebsocketClient";

interface KeepAlive {
    value: number;
    timestamp: number;
}

/**
 * The interval in milliseconds at which keep alive datagrams are sent.
 */
const KEEP_ALIVE_INTERVAL = 5e3;

/**
  * The maximum number of keep alive packets which can be missed.
  */
const KEEP_ALIVE_LIMIT = 12;

/**
  * The maximum value of the keep alive counter.
  */
const MAX_COUNTER_VALUE = (2 ** 32) - 1;


export class VortextVoiceUdpClient extends EventEmitter {
    public socket: Socket;
    public ping = 0;
    private readonly keepAlives: KeepAlive[];
    private keepAliveCounter = 0;
    private readonly keepAliveBuffer: Buffer;
    private readonly keepAliveInterval: NodeJS.Timeout;
    public constructor(public client: VortextVoiceWebsocketClient, public remote: { ip: string; port: number }) {
        super();
        this.socket = createSocket("udp4");
        this.keepAlives = [];
        this.keepAliveBuffer = Buffer.alloc(8);
        this.keepAliveInterval = setInterval(() => this.keepAlive(), KEEP_ALIVE_INTERVAL);
        this.socket.on("error", (error: Error) => this.emit("error", error));
        this.socket.on("message", (buffer: Buffer) => this.onMessage(buffer));
        this.socket.on("close", () => this.emit("close"));
        setImmediate(() => this.keepAlive());
    }

    public send(buffer: Buffer): void {
        return this.socket.send(buffer, this.remote.port, this.remote.ip);
    }

    public destroy(): void {
        try {
            this.socket.close();
        } catch {}
        clearInterval(this.keepAliveInterval);
    }

    private onMessage(buffer: Buffer): void {
        if (buffer.length === 8) {
            const counter = buffer.readUInt32LE(0);
            const index = this.keepAlives.findIndex(({ value }) => value === counter);
            if (index === -1) return;
            this.ping = Date.now() - this.keepAlives[index]!.timestamp;
            this.keepAlives.splice(0, index);
        }
        this.emit("message", buffer);
    }

    private keepAlive(): void {
        if (this.keepAlives.length >= KEEP_ALIVE_LIMIT) {
            this.destroy();
            return;
        }

        this.keepAliveBuffer.writeUInt32LE(this.keepAliveCounter, 0);
        this.send(this.keepAliveBuffer);
        this.keepAlives.push({
            value: this.keepAliveCounter,
            timestamp: Date.now()
        });
        this.keepAliveCounter++;
        if (this.keepAliveCounter > MAX_COUNTER_VALUE) {
            this.keepAliveCounter = 0;
        }
    }
}
