module.exports = {
  apps: [{
    name: 'ambulance-planning',
    script: 'node',
    args: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      HOST: '0.0.0.0',
      DATABASE_URL: 'postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning',
      SESSION_SECRET: 'a0afebaec184434b5ec6950bb0f5fc2b'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://ambulance_user:DGHKempen005!@localhost:5432/ambulance_planning',
      SESSION_SECRET: 'a0afebaec184434b5ec6950bb0f5fc2b'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 5,
    min_uptime: '30s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    restart_delay: 5000
  }]
};
