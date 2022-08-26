/**
 * Types for websockets
 */
import { Accountability } from '@directus/shared/types';
import { IncomingMessage } from 'http';
import { CloseEvent, Event, WebSocket } from 'ws';

export type SocketConfig = {
	enabled: boolean; // socket server enabled
	endpoint: string; // endpoint for request upgrade
	public: boolean; // whether to require auth before upgrading
};

export type WebRequest = IncomingMessage & { accountability: Accountability };
export type WebsocketClient = WebSocket & { accountability: Accountability };
export type WebsocketMessage = { type: string } & Record<string, any>;

export interface WebsocketExtension {
	onOpen?: (client: WebsocketClient, event: Event) => any;
	onMessage?: (client: WebsocketClient, message: WebsocketMessage) => any;
	onError?: (client: WebsocketClient, event: Event) => any;
	onClose?: (client: WebsocketClient, event: CloseEvent) => any;
}
