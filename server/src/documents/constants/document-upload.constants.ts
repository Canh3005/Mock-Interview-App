import { diskStorage } from 'multer';
import { extname } from 'path';

export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;

// 5MB
// to do: use cloud storage in production and remove local file after processing
export const documentStorage = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
      );
    },
  }),
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE,
  },
};
