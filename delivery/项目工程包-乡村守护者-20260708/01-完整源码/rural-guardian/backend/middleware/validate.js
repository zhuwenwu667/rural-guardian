/**
 * 请求参数验证中间件 — 基于 zod
 *
 * 用法:
 *   const { z } = require('zod');
 *   const { validate } = require('../middleware/validate');
 *   const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(6) });
 *   router.post('/login', validate(loginSchema), handler);
 */
const { ZodError } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          code: 400,
          data: errors,
          message: errors[0]?.message || '参数验证失败',
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };
