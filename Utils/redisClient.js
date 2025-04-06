const { createClient } = require('redis');


const client = createClient({
  username: 'default',
  password: 'NXVbIXJuNZNA8906L4yZfvc6HvPHxxT2',
  socket: {
    host: 'redis-15954.c322.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 15954,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log('Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 10000,
  },

  maxRetriesPerRequest: 3,
  commandTimeout: 5000,

  maxMemoryPolicy: 'allkeys-lru',
});


client.on('connect', () => {
  console.log('Successfully connected to Redis!');
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('reconnecting', () => {
  console.log('Redis client reconnecting...');
});

client.on('ready', () => {
  console.log('Redis client is ready');
});


const cacheData = async (key, data, ttl = 300) => {
  try {
    await client.setEx(key, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Cache storage error:', error);
    return false;
  }
};


const getCachedData = async (key) => {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
};

const startRedis = async () => {
  try {
    await client.connect();
    

    await client.flushAll();
    
 
    setInterval(async () => {
      try {
        const info = await client.info('memory');
        console.log('Redis memory usage:', info);
      } catch (err) {
        console.error('Failed to get Redis info:', err);
      }
    }, 300000); 
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
};

const stopRedis = async () => {
  try {

    await client.flushAll();
    await client.quit();
    console.log('Redis connection closed');
  } catch (err) {
    console.error('Failed to close Redis connection:', err);
  }
};


process.on('SIGTERM', async () => {
  await stopRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await stopRedis();
  process.exit(0);
});

startRedis();

module.exports = { 
  client, 
  startRedis, 
  stopRedis,
  cacheData,
  getCachedData
};