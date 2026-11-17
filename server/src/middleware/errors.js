import multer from 'multer';

export const notFound = (req, res) => {
  res.status(404).json({ error: 'Ресурс не знайдено' });
};

// Єдиний обробник помилок: клієнт ніколи не бачить внутрішніх повідомлень (SQL, шляхи, стек)
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некоректний JSON у тілі запиту' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Тіло запиту завелике' });

  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      error: tooBig ? 'Файл завеликий (максимум 5 МБ)' : 'Некоректне завантаження файлу',
    });
  }

  // Власні помилки, повідомлення яких безпечно показувати користувачу
  if (err.expose && err.status) return res.status(err.status).json({ error: err.message });

  console.error(err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
};
