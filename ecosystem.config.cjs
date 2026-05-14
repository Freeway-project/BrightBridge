module.exports = {
  apps: [
    {
      name: "brightbridge",
      cwd: "/mnt/external/BrightBridge/apps/web",
      script: "/mnt/external/BrightBridge/node_modules/.bin/next",
      args: "start",

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Logs
      error_file: "/var/log/pm2/brightbridge-error.log",
      out_file: "/var/log/pm2/brightbridge-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Restart policy
      max_memory_restart: "1G",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",

      // Graceful shutdown — gives Next.js time to finish in-flight requests
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
