// PM2 — processos de produção (API Nest + Web Next). Rodar da raiz do repo:
//   pnpm install && pnpm -r build && NEXT_PUBLIC_API_URL=https://api.emporio.cloud pnpm --filter @pdv-udv/web build
//   pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'pdv-api',
      cwd: 'apps/api', // ConfigModule lê ../../.env (raiz do repo)
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      max_restarts: 10,
    },
    {
      name: 'pdv-web',
      cwd: 'apps/web',
      script: '../../node_modules/.bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      max_restarts: 10,
    },
  ],
}
