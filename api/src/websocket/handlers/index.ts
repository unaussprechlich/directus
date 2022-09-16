import env from '../../env';
import { AuthHandler, HeartbeatHandler, ItemsHandler, SubscribeHandler } from '../handlers';

export function startWebsocketHandlers() {
	new AuthHandler();
	if (env.WEBSOCKETS_HEARTBEAT_ENABLED) {
		new HeartbeatHandler();
	}
	new ItemsHandler();
	new SubscribeHandler();
}

export * from './auth';
export * from './heartbeat';
export * from './items';
export * from './subscribe';
