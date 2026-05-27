import { Module } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Module({
  providers: [
    PrismaService,
    {
      provide: PrismaClient,
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, PrismaClient],
})
export class PrismaModule {}
