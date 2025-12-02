module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    sessions: {
      // lifetimes en segundos; ajusta si requieres un tiempo diferente
      accessTokenLifespan: env.int('ADMIN_ACCESS_TOKEN_LIFESPAN', 1800), // 30 min
      maxRefreshTokenLifespan: env.int('ADMIN_MAX_REFRESH_LIFESPAN', 604800), // 7 días
      maxSessionLifespan: env.int('ADMIN_MAX_SESSION_LIFESPAN', 604800), // 7 días
      idleRefreshTokenLifespan: env.int('ADMIN_IDLE_REFRESH_LIFESPAN', 604800),
      idleSessionLifespan: env.int('ADMIN_IDLE_SESSION_LIFESPAN', 3600),
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
