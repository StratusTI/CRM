module.exports = {
  apps: [
    {
      name: 'crm',
      script: 'pnpm',
      args: 'start',
      cwd: '/var/www/CRM',
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://painel.stratustelecom.com.br',
      },
    },
  ],
};
