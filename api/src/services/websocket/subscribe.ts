/**
 * Service for the specifics surrounding GraphQL Subscriptions
 */
import http from 'http';
import logger from '../../logger';
import { GraphQLService } from '../graphql';
import { useServer as useGraphQLServer } from 'graphql-ws/lib/use/ws';
import { getSchema } from '../../utils/get-schema';
import { getAccountabilityForToken } from '../../utils/get-accountability-for-token';
import { SocketService } from './socket';

export class SubscriptionService extends SocketService {
	constructor(httpServer: http.Server) {
		super(httpServer, {
			enabled: true,
			endpoint: '/graphql',
			public: true,
		});
		useGraphQLServer(
			{
				context: {},
				schema: async (ctx) => {
					const accountability = await getAccountabilityForToken(ctx.connectionParams?.token as string | undefined);

					const service = new GraphQLService({
						schema: await getSchema(),
						scope: 'items',
						accountability,
					});

					return service.getSchema();
				},
			},
			this.server
		);
		// this.server.on('connection', (ws) => {
		// 	ws.on('message', (data) => {
		// 		logger.trace(`[WSS GraphQL] Received: ${data}`);
		// 	});
		// });
	}
}
