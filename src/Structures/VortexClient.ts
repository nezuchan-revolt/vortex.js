import EventEmitter from "node:events";
import { fetch } from "undici";
import { VortextVoiceWebsocketClient } from "./Socket/VortexVoiceWebsocketClient";

export class VortexClient extends EventEmitter {
    public baseUri = "https://api.revolt.chat";
    public ws: VortextVoiceWebsocketClient | null = null;
    public roomId: string | null = null;
    public token: string | null = null;

    public async connectToRoom(roomId: string, token: string): Promise<void> {
        const response = await fetch(`${this.baseUri}/channels/${roomId}/join_call`, {
            method: "POST",
            headers: {
                "X-Bot-Token": token
            }
        });

        if (response.ok) {
            const responseJson = await response.json() as { token: string };
            this.ws = new VortextVoiceWebsocketClient(this);
            this.roomId = roomId;
            this.token = responseJson.token;
            return this.ws.connect();
        }

        throw new Error(await response.text());
    }

    public provideFrame(frame: Uint8Array): Promise<void> | undefined {
        if (this.ws?.connected) {
            return this.ws.provide(frame);
        }
    }
}
