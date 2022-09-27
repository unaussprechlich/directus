import emitter from '../../emitter';
import { errorMessage, fmtMessage, trimUpper } from '../utils/message';
import type { WebsocketClient, WebsocketMessage } from '../types';
import { getAccountabilityForToken } from '../../utils/get-accountability-for-token';
import { getSchema } from '../../utils/get-schema';
import { AuthenticationService } from '../../services';
import { DEFAULT_AUTH_PROVIDER } from '../../constants';

export class AuthHandler {
	constructor() {
		emitter.onAction('websocket.message', ({ client, message }) => {
			try {
				this.onMessage(client, message);
			} catch (err) {
				client.send(errorMessage(err));
			}
		});
	}
	async onMessage(client: WebsocketClient, message: WebsocketMessage) {
		if (trimUpper(message.type) !== 'AUTH') return;
		try {
			if (message?.['access_token']) {
				await this.auth(client, message['access_token']);
			} else if (message?.['refresh_token']) {
				await this.refresh(client, message['refresh_token']);
			} else if (message?.['email'] && message?.['password']) {
				await this.login(client, message['email'], message['password']);
			} else {
				throw new Error('Invalid authentication payload.');
			}
		} catch (err) {
			return client.send(errorMessage(err));
		}
	}
	private async auth(client: WebsocketClient, token: string) {
		client.accountability = await getAccountabilityForToken(token);
		client.send(fmtMessage('auth', { accountability: client.accountability }));
	}
	private async refresh(client: WebsocketClient, token: string) {
		const authenticationService = new AuthenticationService({
			accountability: client.accountability,
			schema: await getSchema(),
		});
		const {
			accessToken: access_token,
			refreshToken: refresh_token,
			expires,
		} = await authenticationService.refresh(token);
		await this.auth(client, access_token);
		client.send(fmtMessage('auth', { access_token, refresh_token, expires }));
	}
	private async login(client: WebsocketClient, email: string, password: string) {
		const authenticationService = new AuthenticationService({
			accountability: client.accountability,
			schema: await getSchema(),
		});
		const {
			accessToken: access_token,
			refreshToken: refresh_token,
			expires,
		} = await authenticationService.login(DEFAULT_AUTH_PROVIDER, {
			email,
			password,
		});
		await this.auth(client, access_token);
		client.send(fmtMessage('auth', { access_token, refresh_token, expires }));
	}
}
