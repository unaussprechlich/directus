import http from 'http';
import { CloseEvent, MessageEvent, WebSocket, Event } from 'ws';
import logger from '../../logger';
import { refreshAccountability } from './refresh-accountability';
import { SocketService } from './socket';
import { WebRequest, WebsocketClient, WebsocketExtension, WebsocketMessage } from './types';

export class WebsocketService extends SocketService {
	clients: Set<WebsocketClient>;
	handlers: Set<WebsocketExtension>;

	constructor(httpServer: http.Server) {
		super(httpServer, {
			enabled: true,
			endpoint: '/websocket',
			public: false,
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
		ws.addEventListener('open', (event: Event) => {
			logger.debug(`[WS REST] open`, event);
			this.clients.add(client);
			this.handlers.forEach((handler) => {
				handler.onOpen && handler.onOpen(client, event);
			});
		});
		ws.addEventListener('message', async (event: MessageEvent) => {
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
		ws.addEventListener('error', (event: Event) => {
			logger.debug(`[WS REST] ${clientName} error`, event);
			this.clients.delete(client);
			this.handlers.forEach((handler) => {
				handler.onError && handler.onError(client, event);
			});
		});
		ws.addEventListener('close', (event: CloseEvent) => {
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
