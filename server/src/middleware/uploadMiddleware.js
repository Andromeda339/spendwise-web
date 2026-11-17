// src/middleware/uploadMiddleware.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Обмеження завантаження: лише зображення та не більше 5 МБ
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const limits = { fileSize: 5 * 1024 * 1024, files: 1 };
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
  const err = new Error('Дозволені лише зображення JPG, PNG або WebP');
  err.status = 400;
  err.expose = true;
  cb(err);
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'finance_receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, crop: 'limit' }],
  },
});

// Фото чека для конкретної транзакції (зберігається в Cloudinary)
export const upload = multer({ storage, limits, fileFilter });
// Сканер чеків (файл обробляється в пам'яті)
export const uploadScan = multer({ storage: multer.memoryStorage(), limits, fileFilter });
