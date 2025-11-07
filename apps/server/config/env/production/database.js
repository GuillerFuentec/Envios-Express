module.exports = ({ env }) => {
  const client = 'postgres';
  const connectionString = env('DATABASE_URL');

  const connection = connectionString
    ? { connectionString }
    : {
        host: env('DATABASE_HOST', '127.0.0.1'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'railway'),
        user: env('DATABASE_USERNAME', 'postgres'),
        password: env('DATABASE_PASSWORD', ''),
      };

  const sslEnabled = env.bool('DATABASE_SSL', true);
  if (sslEnabled) {
    connection.ssl = {
      rejectUnauthorized: env.bool(
        'DATABASE_SSL_REJECT_UNAUTHORIZED',
        false
      ),
    };
  }

  connection.schema = env('DATABASE_SCHEMA', 'public');

  return {
    connection: {
      client,
      connection,
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
      acquireConnectionTimeout: env.int(
        'DATABASE_CONNECTION_TIMEOUT',
        60000
      ),
    },
  };
};
