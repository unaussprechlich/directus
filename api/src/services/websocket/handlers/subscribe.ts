import { getSchema } from '../../../utils/get-schema';
import { ItemsService } from '../../items';
import { WebsocketClient, WebsocketExtension, WebsocketMessage } from '../types';
import { ActionHandler, Query } from '@directus/shared/types';
import emitter from '../../../emitter';

type Subscription = {
	query?: Query;
	client: WebsocketClient;
};
type SubscriptionMap = Record<string, Set<Subscription>>;

export class SubscribeHandler implements WebsocketExtension {
	subscriptions: SubscriptionMap;
	constructor() {
		this.subscriptions = {};
		const dispatchAction = this.buildDispatcher(
			(event: string, handler: ActionHandler) => emitter.onAction(event, handler) /*, logger*/
		);
		[
			'items' /*, 'activity', 'collections', 'fields', 'folders', 'permissions',
			'presets', 'relations', 'revisions', 'roles', 'settings', 'users', 'webhooks'*/,
		].forEach((collection) => {
			dispatchAction(collection + '.create', ({ key }: any) => ({ key }));
			dispatchAction(collection + '.update', ({ keys }: any) => ({ keys }));
			dispatchAction(collection + '.delete');
		});
	}
	buildDispatcher(action: any /*, logger: Logger*/) {
		return (event: string, mutator?: (args: any) => any) => {
			action(event, async (args: any) => {
				const message = mutator ? mutator(args) : {};
				message.action = event.split('.').pop();
				message.collection = args.collection;
				message.payload = args.payload;
				// logger.debug(`[ WS ] event ${event} `/*- ${JSON.stringify(message)}`*/);
				this.dispatch(message.collection, message);
			});
		};
	}
	subscribe(collection: string, client: WebsocketClient, conf: { query?: Query } = {}) {
		if (!this.subscriptions[collection]) this.subscriptions[collection] = new Set();
		this.subscriptions[collection]?.add({ ...conf, client });
	}
	unsubscribe(client: WebsocketClient) {
		for (const key of Object.keys(this.subscriptions)) {
			const subs = Array.from(this.subscriptions[key] || []);
			for (let i = subs.length - 1; i >= 0; i--) {
				const sub = subs[i];
				if (!sub) continue;
				if (sub.client === client) {
					this.subscriptions[key]?.delete(sub);
				}
			}
		}
	}
	async dispatch(collection: string, data: any) {
		const subs = this.subscriptions[collection] ?? new Set();
		for (const { client, query = {} } of subs) {
			const schema = await getSchema({ accountability: client.accountability });
			const service = new ItemsService(collection, {
				schema,
				accountability: client.accountability,
			});
			try {
				// get the payload based on the provided query
				const keys = data.key ? [data.key] : data.keys;
				let payload = data.action !== 'delete' ? await service.readMany(keys, query) : data.payload;
				if (payload.length > 0) {
					if (data.key) payload = payload[0];
					// const msg = await emitter.emitFilter('websocket.subscribe.beforeSend', {
					// 	type: 'SUBSCRIPTION',
					// 	...data,
					// 	payload,
					// });
					client.send(JSON.stringify({ payload }));
				}
			} catch (err: any) {
				// ignore these permission errors
				// logger.debug('[ WS ] permission error', err);
			}
		}
	}
	async onMessage(client: WebsocketClient, message: WebsocketMessage) {
		if (message.type !== 'subscribe') return;
		const collection = message.collection!;
		const service = new ItemsService(collection, {
			schema: await getSchema(),
			accountability: client.accountability,
		});
		try {
			// if not authorized the read should throw an error
			await service.readByQuery({ ...(message.query || {}), limit: 1 });
			// subscribe to events if all went well
			this.subscribe(collection, client, { query: message.query });
			// logger.info(`subscribed - ${message.collection} #${message.id}`);
		} catch (err: any) {
			// eslint-disable-next-line no-empty
		}
	}
	onError(client: WebsocketClient) {
		this.unsubscribe(client);
	}
	onClose(client: WebsocketClient) {
		this.unsubscribe(client);
	}
}
