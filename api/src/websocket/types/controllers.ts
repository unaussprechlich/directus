/**
 * Types for websocket controllers
 */
import { Accountability, Query } from '@directus/shared/types';
import { WebSocket, CloseEvent, Event } from 'ws';
import { WebsocketMessage } from './messages';

export type SocketControllerConfig = {
	endpoint: string; // endpoint for request upgrade
	public: boolean; // whether to require auth before upgrading
};

export type WebsocketClient = WebSocket & { accountability: Accountability };

export type Subscription = {
	query?: Query;
	client: WebsocketClient;
};
export type SubscriptionMap = Record<string, Set<Subscription>>;

export interface WebsocketExtension {
	onOpen?: (client: WebsocketClient, event: Event) => any;
	onMessage?: (client: WebsocketClient, message: WebsocketMessage) => Promise<any>;
	onError?: (client: WebsocketClient, event: Event) => any;
	onClose?: (client: WebsocketClient, event: CloseEvent) => any;
}
