module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: ['http://miapp.local:5173', 'http://localhost:5173'],
      headers: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: true,
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
