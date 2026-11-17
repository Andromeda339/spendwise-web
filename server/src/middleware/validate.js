const describe = (issue) => {
  if (issue.code === 'invalid_type') return 'Поле обов’язкове або має неправильний тип';
  if (issue.code === 'invalid_value' || issue.code === 'invalid_enum_value') return 'Недопустиме значення';
  return issue.message;
};

// Перевіряє тіло запиту (body) або параметри адреси (query) за схемою zod
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: 'Некоректні дані запиту',
      details: result.error.issues.map((i) => ({ field: i.path.join('.') || source, message: describe(i) })),
    });
  }
  // Далі потрапляють лише очищені дані: без зайвих полів, з обрізаними пробілами й числами
  if (source === 'body') req.body = result.data;
  next();
};
