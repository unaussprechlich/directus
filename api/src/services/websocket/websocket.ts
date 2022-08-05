import http from 'http';
import { v4 as uuid } from 'uuid';
import { CloseEvent, MessageEvent, WebSocket } from 'ws';
import logger from '../../logger';
import { SocketService } from './socket';
import { WebsocketClient } from './types';
import { Accountability } from '@directus/shared/types';

export class WebsocketService extends SocketService {
	clients: Set<WebsocketClient>;

	constructor(httpServer: http.Server) {
		super(httpServer, {
			enabled: true,
			endpoint: '/websocket',
			public: false,
		});
		this.clients = new Set();
		this.server.on('connection', this.createClient.bind(this));
	}
	createClient(ws: WebSocket, req: any) {
		const client: WebsocketClient = {
			id: uuid(),
			socket: ws,
			accountability: req.accountability as Accountability,
		};
		logger.debug(`[ WS-${client.id} ] connected`);
		ws.addEventListener('open', (evt: Event) => {
			logger.debug(`[ WS-${client.id} ] open`, evt);
			this.clients.add(client);
			// this.handlers.forEach(({ onOpen }) => {
			// 	onOpen && onOpen(client, evt);
			// });
		});
		ws.addEventListener('message', async (evt: MessageEvent) => {
			logger.debug(`[ WS-${client.id} ] message`, evt);
			// try {
			// 	await this.handleMessage(client, evt);
			// } catch (err: any) {
			// 	logger.error(err);
			// 	client.socket.send(outgoingError(err.message));
			// }
		});
		ws.addEventListener('error', (evt: Event) => {
			logger.debug(`[ WS-${client.id} ] error`, evt);
			this.clients.delete(client);
			// this.handlers.forEach(({ onError }) => {
			// 	onError && onError(client, evt);
			// });
		});
		ws.addEventListener('close', (evt: CloseEvent) => {
			logger.debug(`[ WS-${client.id} ] closed`, evt);
			this.clients.delete(client);
			// this.handlers.forEach(({ onClose }) => {
			// 	onClose && onClose(client, evt);
			// });
		});
	}
}
