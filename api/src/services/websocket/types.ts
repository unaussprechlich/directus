/**
 * Types for websockets
 */
import { Accountability } from '@directus/shared/types';
import { WebSocket } from 'ws';

export type SocketConfig = {
	enabled: boolean; // socket server enabled
	endpoint: string; // endpoint for request upgrade
	public: boolean; // whether to require auth before upgrading
};

export type WebsocketClient = {
	id: string;
	socket: WebSocket;
	accountability: Accountability;
};
