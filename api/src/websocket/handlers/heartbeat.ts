import logger from '../../logger';
import { WebsocketClient, WebsocketExtension, WebsocketMessage } from '../types';
import { trimUpper } from '../utils/message';

export class HeartbeatHandler implements WebsocketExtension {
	// do connection timeout
	async onMessage(client: WebsocketClient, message: WebsocketMessage) {
		if (trimUpper(message.type) !== 'PING') return;
		logger.debug(`[WS REST] HeartbeatHandler ${JSON.stringify(message)}`);
		client.send(JSON.stringify({ type: 'pong' }));
	}
}
