import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // Pacotes internos já saem buildados (tsup), mas declaramos por garantia.
  transpilePackages: ['@pdv-udv/shared', '@pdv-udv/core'],
}

export default config
