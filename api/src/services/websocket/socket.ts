/**
 * Base class for handling the server and request upgrades
 */
import { Accountability } from '@directus/shared/types';
import http, { IncomingMessage } from 'http';
import { parse } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import logger from '../../logger';
import { getAccountabilityForToken } from '../../utils/get-accountability-for-token';
import { SocketConfig } from './types';

export const defaultSocketConfig: SocketConfig = {
	enabled: true,
	endpoint: '/websocket',
	public: false,
};

function extractToken(req: any, query: any): string | null {
	if (query && query.access_token) {
		return query.access_token as string;
	}

	let token: string | null = null;
	if (req.headers && req.headers.authorization) {
		const parts = req.headers.authorization.split(' ');

		if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
			token = parts[1];
		}
	}
	return token;
}

export class SocketService {
	config: SocketConfig;
	server: WebSocket.Server;

	constructor(httpServer: http.Server, config?: SocketConfig) {
		this.server = new WebSocketServer({ noServer: true });
		this.config = config ?? defaultSocketConfig;

		httpServer.on('upgrade', async (request: any, socket, head) => {
			const { pathname, query } = parse(request.url!, true);
			if (pathname === this.config.endpoint) {
				let accountability: Accountability;
				logger.info('test ' + this.constructor.name + ' - ' + JSON.stringify(this.config));
				if (!this.config.public) {
					// check token before upgrading when not set to public access
					accountability = await getAccountabilityForToken(extractToken(request, query));
					if (!accountability || !accountability.user /* || !accountability.role*/) {
						// do we need to check the role?
						logger.debug('Websocket upgrade denied - ' + JSON.stringify(accountability));
						socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
						socket.destroy();
						return;
					}
				}
				this.server.handleUpgrade(request, socket, head, (ws) => {
					this.server.emit('connection', ws, request);
				});
			}
		});
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
