/* eslint-disable generator-star-spacing */
/* eslint-disable no-eq-null */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable class-methods-use-this */
import { EventEmitter } from "node:events";
import { VortexClient } from "../VortexClient";
import WebSocket from "ws";
import { AuthenticateMessage, MessageType, WebsocketMessage } from "./Types/index";
import { VortextVoiceUdpClient } from "./VortexVoiceUdpClient";
import { createRtpHeader, randomNumber, writeRtpHeader } from "../../Utilities/Util";
import { ByteWriter } from "../../Utilities/Bytes/ByteWriter";
import { EncryptionStrategy, RtpHeader } from "../../Utilities/Types/index";
import { create, generateMasterKey, generateSessionContext, getMasterKeyBase64 } from "../../Utilities/Encryptions/AesCmHmacSha1_80";
import { randomUUID } from "node:crypto";

export class VortextVoiceWebsocketClient extends EventEmitter {
    public vortexUri = "wss://vortex.revolt.chat";
    public socket: WebSocket | null = null;
    public udpSocket: VortextVoiceUdpClient | null = null;
    public codecs: AuthenticateMessage["data"]["rtpCapabilities"]["codecs"] = [];
    public id = 0;
    public mid = 0;
    public transportId: string | null = null;
    public ssrc = randomNumber(1000, 10000);
    public audioEncryption: EncryptionStrategy | null = null;

    public constructor(public client: VortexClient) {
        super();
    }

    public get connected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    public sendAuthentication(): void {
        this.send({
            data: {
                roomId: this.client.roomId, token: this.client.token
            },
            type: MessageType.Authenticate
        });
    }

    public async onMessage(data: string): Promise<void> {
        const message: WebsocketMessage = JSON.parse(data);
        switch (message.type) {
            case MessageType.Authenticate: {
                this.codecs = message.data.rtpCapabilities.codecs;
                this.send({
                    type: MessageType.InitializeTransports,
                    data: {
                        mode: "CombinedRTP",
                        rtpCapabilities: { codecs: this.codecs, headerExtensions: [] }
                    }
                });
                break;
            }
            case MessageType.InitializeTransports: {
                this.transportId = message.data.id;
                this.udpSocket = new VortextVoiceUdpClient(this, { ip: message.data.ip, port: message.data.port });
                const masterKey = await generateMasterKey();
                this.audioEncryption = create({
                    session: await generateSessionContext(masterKey)
                });

                this.send({
                    type: MessageType.ConnectTransport,
                    data: {
                        id: message.data.id,
                        srtpParameters: {
                            cryptoSuite: "AES_CM_128_HMAC_SHA1_80",
                            keyBase64: getMasterKeyBase64(masterKey)
                        }
                    }
                });
                break;
            }
            case MessageType.ConnectTransport: {
                this.send({
                    type: MessageType.StartProduce,
                    data: {
                        rtpParameters: {
                            mid: `${this.mid}`,
                            codecs: [
                                {
                                    channels: 2,
                                    clockRate: 48000,
                                    mimeType: "audio/opus",
                                    payloadType: 120,
                                    parameters: {},
                                    rtcpFeedback: []
                                }
                            ],
                            headerExtensions: [],
                            encodings: [{ ssrc: this.ssrc, maxBitrate: 512000 }],
                            rtcp: { cname: randomUUID(), reducedSize: false },
                        },
                        type: "audio"
                    }
                });
                break;
            }
            default:
        }
    }

    public connect(): void {
        this.socket = new WebSocket(this.vortexUri);
        this.socket.once("open", () => this.sendAuthentication());
        this.socket.on("message", (data: string) => this.onMessage(data));
    }

    public send<T>(message: T): void {
        if (this.connected) {
            this.id += 1;
            this.client.emit("debug", `Sending: ${JSON.stringify({ id: this.id, ...message })}`);
            return this.socket!.send(JSON.stringify({ id: this.id, ...message }));
        }
        throw new Error("Not connected to the gateway");
    }

    public async provide(frame: Uint8Array | null): Promise<void> {
        if (!this.audioEncryption) throw Error("Could not find audio encryption");
        const provider = this.audioProvider(this.ssrc, this.audioEncryption);

        if (frame != null) {
            await provider.provide(frame);
        }
    }

    public audioProvider(ssrc: number, enryption: EncryptionStrategy): PacketProvider {
        const cursor = ByteWriter.withSize(2048);

        let sequence = 0; let timestamp = 0;
        function getRtpHeader(): RtpHeader {
            const ts = timestamp;
            timestamp += 960;

            return createRtpHeader(
                sequence = enryption.nextSequence(sequence),
                ts,
                ssrc
            );
        }

        return {
            provide: async frame => {
                cursor.reset();
                cursor.data.fill(0);

                /* write the rtp header to the byte cursor */
                const header = getRtpHeader();
                writeRtpHeader(cursor, header);

                /* encrypt the packet. */
                this.audioEncryption!.encrypt(cursor, header, frame);
                return cursor.slice();
            }
        };
    }
}

export interface PacketProvider {
    provide: (data: Uint8Array) => Promise<Uint8Array>;
}
