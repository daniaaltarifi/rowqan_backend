module.exports = {
    apps: [{
      name: "rowqan-backend",
      script: "server.js",
      instances: 1,
      exec_mode: "cluster",
      watch: true,
      max_memory_restart: "2G",
      node_args: "--expose-gc --max-old-space-size=2048",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }]
  };