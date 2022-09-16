import { DEFAULT_AUTH_PROVIDER } from '../../constants';
import { AuthenticationService } from '../../services';
import { getAccountabilityForToken } from '../../utils/get-accountability-for-token';
import { getSchema } from '../../utils/get-schema';

export async function getAccountability(tokenOrCreds: string | { email: string; password: string }) {
	let token: string;
	if (typeof tokenOrCreds !== 'string') {
		const authenticationService = new AuthenticationService({
			schema: await getSchema(),
		});
		const { accessToken } = await authenticationService.login(DEFAULT_AUTH_PROVIDER, {
			email: tokenOrCreds.email,
			password: tokenOrCreds.password,
		});
		token = accessToken;
	} else {
		token = tokenOrCreds;
	}
	return await getAccountabilityForToken(token);
}
