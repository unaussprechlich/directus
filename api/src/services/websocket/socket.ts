/**
 * Base class for handling the server and request upgrades
 */
import http from 'http';
import { parse } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import logger from '../../logger';
import { SocketConfig } from './types';

export class SocketService {
	config: SocketConfig;
	server: WebSocket.Server;

	constructor(httpServer: http.Server, config?: SocketConfig) {
		this.server = new WebSocketServer({ noServer: true });
		this.config = config ?? this.getDefaultConf();

		httpServer.on('upgrade', (request, socket, head) => {
			const { pathname } = parse(request.url!);

			if (pathname === this.config.endpoint) {
				this.server.handleUpgrade(request, socket, head, (ws) => {
					this.server.emit('connection', ws, request);
				});
			}
		});

		// this.server.on('connection', (ws) => {
		// 	ws.on('message', (data) => {
		// 		logger.trace(`[WSS] Received: ${data}`);
		// 	});

		// 	ws.send('something');
		// });
	}

	getDefaultConf(): SocketConfig {
		return { enabled: true, endpoint: '/websocket', public: false };
	}

	/**
	 * Terminate all open connections
	 */
	terminate() {
		this.server.clients.forEach((ws) => {
			ws.terminate();
		});
	}
}
