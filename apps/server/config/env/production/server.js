module.exports = ({ env }) => ({
  host: '0.0.0.0',
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', env('RAILWAY_PUBLIC_DOMAIN', '')),
  proxy: true,
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
