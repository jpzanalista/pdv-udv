import { Global, Module } from '@nestjs/common'
import { createDb } from '@pdv-udv/db'

export const DB = Symbol('DB')

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const url = process.env.DATABASE_URL
        if (!url) throw new Error('DATABASE_URL não definido')
        return createDb(url)
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
