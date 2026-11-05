import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database successfully.');
    } catch (err: any) {
      this.logger.error(
        `Failed to connect to PostgreSQL database: ${err?.message || err}. Please ensure valid credentials in apps/api/.env (DATABASE_URL).`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
