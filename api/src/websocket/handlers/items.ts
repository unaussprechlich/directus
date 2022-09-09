import logger from '../../logger';
import { getSchema } from '../../utils/get-schema';
import { ItemsService } from '../../services/items';
import { WebsocketClient, WebsocketExtension, WebsocketMessage } from '../types';

const errorMessage = (error: any) => JSON.stringify({ error });
const responseMessage = (data: any) => JSON.stringify({ type: 'response', data });

export class ItemsHandler implements WebsocketExtension {
	async onMessage(client: WebsocketClient, message: WebsocketMessage) {
		if (message.type !== 'items') return;
		if (!message.collection) {
			return client.send(errorMessage('invalid collection'));
		}
		const service = new ItemsService(message.collection, {
			accountability: client.accountability,
			schema: await getSchema(),
		});
		if (!['create', 'read', 'update', 'delete'].includes(message.action)) {
			return client.send(errorMessage('invalid action'));
		}
		let result;
		switch (message.action) {
			case 'create':
				if (Array.isArray(message.data)) {
					const keys = await service.createMany(message.data);
					result = await service.readMany(keys, message.query || {});
				} else if (!message.data) {
					return client.send(errorMessage('invalid data payload'));
				} else {
					const key = await service.createOne(message.data);
					result = await service.readOne(key, message.query || {});
				}
				break;
			case 'read':
				if (!message.query) {
					return client.send(errorMessage('invalid query'));
				}
				result = await service.readByQuery(message.query);
				break;
			case 'update':
				if (Array.isArray(message.data)) {
					const keys = await service.updateMany(message.ids, message.data);
					result = await service.readMany(keys, message.query);
				} else if (!message.data) {
					return client.send(errorMessage('invalid data payload'));
				} else {
					const key = await service.updateOne(message.id, message.data);
					result = await service.readOne(key);
				}
				break;
			case 'delete':
				if (message.keys) {
					await service.deleteMany(message.keys);
					result = message.keys;
				} else if (message.key) {
					await service.deleteOne(message.key);
					result = message.key;
				} else {
					return client.send(errorMessage("Either 'keys' or 'key' is required for a DELETE request"));
				}
				break;
		}
		logger.debug(`[WS REST] ItemsHandler ${JSON.stringify(message)}`);
		client.send(responseMessage(result));
	}
}
