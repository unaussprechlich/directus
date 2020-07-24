import express from 'express';
import asyncHandler from 'express-async-handler';
import Busboy from 'busboy';
import sanitizeQuery from '../middleware/sanitize-query';
import * as FilesService from '../services/files';
import useCollection from '../middleware/use-collection';
import { Item } from '../types';

const router = express.Router();

router.use(useCollection('directus_files'));

const multipartHandler = (operation: 'create' | 'update') =>
	asyncHandler(async (req, res, next) => {
		const busboy = new Busboy({ headers: req.headers });
		const savedFiles: Item[] = [];

		const accountability = {
			role: req.role,
			admin: req.admin,
			ip: req.ip,
			userAgent: req.get('user-agent'),
			user: req.user,
		};

		/**
		 * The order of the fields in multipart/form-data is important. We require that all fields
		 * are provided _before_ the files. This allows us to set the storage location, and create
		 * the row in directus_files async during the upload of the actual file.
		 */

		let disk: string = (process.env.STORAGE_LOCATIONS as string).split(',')[0].trim();
		let payload: Partial<Item> = {};
		let fileCount = 0;

		busboy.on('field', (fieldname, val) => {
			if (fieldname === 'storage') {
				disk = val;
			}

			payload[fieldname] = val;
		});

		busboy.on('file', async (fieldname, fileStream, filename, encoding, mimetype) => {
			fileCount++;

			payload = {
				...payload,
				filename_disk: filename,
				filename_download: filename,
				type: mimetype,
			};

			if (!payload.storage) {
				payload.storage = disk;
			}

			if (req.user) {
				payload.uploaded_by = req.user;
			}

			try {
				if (operation === 'create') {
					const pk = await FilesService.createFile(payload, fileStream, accountability);
					const file = await FilesService.readFile(
						pk,
						req.sanitizedQuery,
						accountability
					);

					savedFiles.push(file);
					tryDone();
				} else {
					const pk = await FilesService.updateFile(
						req.params.pk,
						payload,
						accountability,
						fileStream
					);
					const file = await FilesService.readFile(
						pk,
						req.sanitizedQuery,
						accountability
					);

					savedFiles.push(file);
					tryDone();
				}
			} catch (err) {
				busboy.emit('error', err);
			}
		});

		busboy.on('error', (error: Error) => {
			next(error);
		});

		busboy.on('finish', () => {
			tryDone();
		});

		req.pipe(busboy);

		function tryDone() {
			if (savedFiles.length === fileCount) {
				if (fileCount === 1) {
					return res.status(200).json({ data: savedFiles[0] });
				} else {
					return res.status(200).json({ data: savedFiles });
				}
			}
		}
	});

router.post('/', sanitizeQuery, multipartHandler('create'));

router.get(
	'/',
	sanitizeQuery,
	asyncHandler(async (req, res) => {
		const records = await FilesService.readFiles(req.sanitizedQuery, {
			role: req.role,
			admin: req.admin,
		});
		return res.json({ data: records || null });
	})
);

router.get(
	'/:pk',
	sanitizeQuery,
	asyncHandler(async (req, res) => {
		const record = await FilesService.readFile(req.params.pk, req.sanitizedQuery, {
			role: req.role,
			admin: req.admin,
		});
		return res.json({ data: record || null });
	})
);

router.patch(
	'/:pk',
	sanitizeQuery,
	asyncHandler(async (req, res, next) => {
		let file: Item;

		if (req.is('multipart/form-data')) {
			file = await multipartHandler('update')(req, res, next);
		} else {
			const pk = await FilesService.updateFile(req.params.pk, req.body, {
				role: req.role,
				admin: req.admin,
				ip: req.ip,
				userAgent: req.get('user-agent'),
				user: req.user,
			});
			file = await FilesService.readFile(pk, req.sanitizedQuery, {
				role: req.role,
				admin: req.admin,
			});
		}

		return res.status(200).json({ data: file || null });
	})
);

router.delete(
	'/:pk',
	asyncHandler(async (req, res) => {
		await FilesService.deleteFile(req.params.pk, {
			role: req.role,
			admin: req.admin,
			ip: req.ip,
			userAgent: req.get('user-agent'),
			user: req.user,
		});
		return res.status(200).end();
	})
);

export default router;
