import path from 'path';
import { APP_EXTENSION_TYPES, HYBRID_EXTENSION_TYPES } from '@directus/shared/constants';
import { ExtensionOptionsBundleEntry, ExtensionType } from '@directus/shared/types';
import { isIn, isTypeIn, pluralize } from '@directus/shared/utils';
import { pathToRelativeUrl } from '@directus/shared/utils/node';

export function generateBundleEntrypoints(
	entries: ExtensionOptionsBundleEntry[],
	types: readonly ExtensionType[]
): string {
	const entriesForTypes = entries.filter((entry) => isIn(entry.type, types));

	const imports = entriesForTypes.map(
		(entry, i) =>
			`import e${i} from './${pathToRelativeUrl(
				path.resolve(
					isTypeIn(entry, HYBRID_EXTENSION_TYPES)
						? isIn(entry.type, APP_EXTENSION_TYPES)
							? entry.source.app
							: entry.source.api
						: entry.source
				)
			)}';`
	);

	const exports = types.map(
		(type) =>
			`export const ${pluralize(type)} = [${entriesForTypes
				.map((entry, i) =>
					entry.type === type
						? isIn(entry.type, APP_EXTENSION_TYPES)
							? `e${i}`
							: `{name:'${entry.name}',config:e${i}}`
						: null
				)
				.filter((e): e is string => e !== null)
				.join(',')}];`
	);

	return `${imports.join('')}${exports.join('')}`;
}
