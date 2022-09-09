import WebSocket from 'ws';
import { Server as httpServer } from 'http';
import { WebRequest, WebsocketClient, WebsocketExtension, WebsocketMessage } from '../types';
import logger from '../../logger';
import env from '../../env';
import { refreshAccountability } from '../utils';

import SocketController from './base';
import { ItemsHandler, SubscribeHandler } from '../handlers';

export class WebsocketController extends SocketController {
	clients: Set<WebsocketClient>;
	handlers: Set<WebsocketExtension>;

	constructor(httpServer: httpServer) {
		super(httpServer, {
			endpoint: env.WEBSOCKETS_REST_PATH ?? '/websocket',
			public: env.WEBSOCKETS_REST_PUBLIC ?? false,
		});
		this.clients = new Set();
		this.handlers = new Set();
		this.server.on('connection', (ws: WebSocket, req: WebRequest) => {
			this.createClient(ws, req);
		});
	}
	private createClient(ws: WebSocket, req: WebRequest) {
		const client = ws as WebsocketClient;
		client.accountability = req.accountability;
		const clientName = client.accountability.user || 'public user';

		logger.debug(`[WS REST] ${clientName} connected`);
		ws.addEventListener('open', (event: WebSocket.Event) => {
			logger.debug(`[WS REST] open`, event);
			this.clients.add(client);
			this.handlers.forEach((handler) => {
				handler.onOpen && handler.onOpen(client, event);
			});
		});
		ws.addEventListener('message', async (event: WebSocket.MessageEvent) => {
			logger.debug(`[WS REST] ${clientName} message`, event);
			let message: WebsocketMessage;
			try {
				message = JSON.parse(event.data as string);
				client.accountability = await refreshAccountability(client.accountability);
			} catch (err: any) {
				// logger.error(err);
				client.send(err.message);
				return;
			}
			for (const handler of this.handlers) {
				try {
					if (handler.onMessage) {
						await handler.onMessage(client, message);
					}
				} catch (err: any) {
					logger.error(err);
					client.send(JSON.stringify({ error: err.message }));
				}
			}
		});
		ws.addEventListener('error', (event: WebSocket.Event) => {
			logger.debug(`[WS REST] ${clientName} error`, event);
			this.clients.delete(client);
			this.handlers.forEach((handler) => {
				handler.onError && handler.onError(client, event);
			});
		});
		ws.addEventListener('close', (event: WebSocket.CloseEvent) => {
			logger.debug(`[WS REST] ${clientName} closed`, event);
			this.clients.delete(client);
			this.handlers.forEach((handler) => {
				handler.onClose && handler.onClose(client, event);
			});
		});
	}
	public registerExtension(handler: WebsocketExtension) {
		this.handlers.add(handler);
	}
	public broadcast(message: WebsocketMessage, filter?: { user?: string; role?: string }) {
		this.clients.forEach((client) => {
			if (filter && filter.user && filter.user !== client.accountability.user) return;
			if (filter && filter.role && filter.role !== client.accountability.role) return;
			client.send(message);
		});
	}
}

let websocketController: WebsocketController | undefined;

export function createWebsocketController(server: httpServer) {
	if (env.WEBSOCKETS_REST_ENABLED) {
		websocketController = new WebsocketController(server);
		websocketController.registerExtension(new ItemsHandler());
		websocketController.registerExtension(new SubscribeHandler());
		logger.info(`Websocket available at ws://${env.HOST}:${env.PORT}${websocketController.config.endpoint}`);
	}
}

export function getWebsocketController() {
	return websocketController;
}
