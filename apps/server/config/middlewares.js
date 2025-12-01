module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://miapp.local:3000',
        'http://localhost:3000',
        ...(process.env.CORS_ORIGIN
          ? process.env.CORS_ORIGIN.split(',').map((v) => v.trim()).filter(Boolean)
          : []),
      ],
      headers: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: true,
    },
  },
  {
    name: 'global::rate-limit',
    resolve: './src/middlewares/rate-limit',
    config: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.RATE_LIMIT_MAX || 240),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      includeUnparsed: true,
      formLimit: '3mb',
      jsonLimit: '3mb',
      textLimit: '3mb',
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
