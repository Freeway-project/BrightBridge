const path = require("path");
// __dirname resolves to the repo root — all paths are relative to it so this
// config works regardless of where the repo is cloned on the VPS.
const root = __dirname;

module.exports = {
  apps: [
    {
      name: "brightbridge",
      cwd: path.join(root, "apps/web"),
      script: path.join(root, "node_modules/.bin/next"),
      args: "start",

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        TZ: "America/Los_Angeles",
        // A single request's unhandled rejection (e.g. a transient
        // ChunkLoadError mid-deploy) must not take down the whole server.
        // Log it and keep serving instead of crash-looping.
        NODE_OPTIONS: "--unhandled-rejections=warn",
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
    {
      name: "brightbridge-autodeploy",
      script: path.join(root, "scripts/autodeploy.sh"),
      interpreter: "/bin/bash",

      // Never auto-restart on crash — avoids rapid-fire deploy loops
      autorestart: false,

      error_file: "/var/log/pm2/brightbridge-autodeploy-error.log",
      out_file:   "/var/log/pm2/brightbridge-autodeploy-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
