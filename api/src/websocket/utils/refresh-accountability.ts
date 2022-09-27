import type { Accountability } from '@directus/shared/types';
import getDatabase from '../../database';
import { getAccountabilityForRole } from '../../utils/get-accountability-for-role';
import { getSchema } from '../../utils/get-schema';

// not really the way to do this but it works for PoC
export async function refreshAccountability(
	accountability: Accountability | null | undefined
): Promise<Accountability> {
	const result = await getAccountabilityForRole(accountability?.role || null, {
		accountability: accountability || null,
		schema: await getSchema(),
		database: getDatabase(),
	});
	result.user = accountability?.user || null;
	return result;
}
