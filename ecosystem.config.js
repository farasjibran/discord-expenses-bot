module.exports = {
  apps: [
    {
      name: 'discord-expense-bot',
      script: 'src/index.js',
      
      // Runtime
      instances: 1,
      exec_mode: 'fork',
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Restart behavior
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Logs
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
      },
      
      // Error handling
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Additional options
      time: true,
      log_type: 'json',
    }
  ]
};
