
export enum MessageType {
    Authenticate = "Authenticate",
    InitializeTransports = "InitializeTransports",
    ConnectTransport = "ConnectTransport",
    StartProduce = "StartProduce"
}

export interface Message {
    type: MessageType;
    id: number;
    data: Record<string, unknown>;
}

export interface AuthenticateMessage extends Message {
    type: MessageType.Authenticate;
    data: {
        userId: string;
        roomId: string;
        rtpCapabilities: {
            codecs: {
                kind: "audio" | "video";
                mimeType: string;
                preferredPayloadType: number;
                clockRate: number;
                channels: number;
                parameters: Record<string, string>;
                rtcpFeedback: {
                    type: "transport-cc";
                    parameter: string;
                }[];
            }[];
        };
    };
}

export interface InitializeTransportsMessage extends Message {
    type: MessageType.InitializeTransports;
    data: {
        ip: string;
        port: number;
        protocol: "tcp" | "udp";
        id: string;
        srtpCryptoSuite: "AES_CM_128_HMAC_SHA1_80";
    };
}

interface ConnectTransportMessage extends Message {
    type: MessageType.ConnectTransport;
}

export type WebsocketMessage = AuthenticateMessage | ConnectTransportMessage | InitializeTransportsMessage;
