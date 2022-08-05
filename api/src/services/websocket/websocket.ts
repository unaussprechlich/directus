import http from 'http';
import { SocketService } from './socket';

export class WebsocketService extends SocketService {
	constructor(httpServer: http.Server) {
		super(httpServer, {
			enabled: true,
			endpoint: '/websocket',
			public: false,
		});
		// this.server.on('connection', (ws) => {
		// 	ws.on('message', (data) => {
		// 		logger.trace(`[WSS] Received: ${data}`);
		// 	});

		// 	ws.send('something');
		// 	this.clients();
		// });
	}
}
