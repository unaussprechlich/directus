import http from 'http';
import { CloseEvent, MessageEvent, WebSocket, Event } from 'ws';
import logger from '../../logger';
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
			this.handlers.forEach(({ onOpen }) => {
				onOpen && onOpen(client, event);
			});
		});
		ws.addEventListener('message', async (event: MessageEvent) => {
			logger.debug(`[WS REST] ${clientName} message`, event);
			let message: WebsocketMessage;
			try {
				message = JSON.parse(event.data as string);
			} catch (err: any) {
				logger.error(err);
				client.send(err.message);
			}
			this.handlers.forEach(({ onMessage }) => {
				try {
					onMessage && onMessage(client, message);
				} catch (err: any) {
					logger.error(err);
					client.send(err.message);
				}
			});
		});
		ws.addEventListener('error', (event: Event) => {
			logger.debug(`[WS REST] ${clientName} error`, event);
			this.clients.delete(client);
			this.handlers.forEach(({ onError }) => {
				onError && onError(client, event);
			});
		});
		ws.addEventListener('close', (event: CloseEvent) => {
			logger.debug(`[WS REST] ${clientName} closed`, event);
			this.clients.delete(client);
			this.handlers.forEach(({ onClose }) => {
				onClose && onClose(client, event);
			});
		});
	}
	public registerExtension(handler: WebsocketExtension) {
		this.handlers.add(handler);
	}
	public broadcast(message: WebsocketMessage, filter?: { user?: string; role?: string }) {
		this.clients.forEach(({ accountability, send }) => {
			if (filter && filter.user && filter.user !== accountability.user) return;
			if (filter && filter.role && filter.role !== accountability.role) return;
			send(message);
		});
	}
}
