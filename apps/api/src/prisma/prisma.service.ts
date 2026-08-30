import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client';
import { resolveDatabaseUrl } from './database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaLibSql({ url: resolveDatabaseUrl() }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

export type PrismaTransactionClient = Omit<
  PrismaService,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$use'
  | '$extends'
  | 'onModuleInit'
  | 'onModuleDestroy'
>;
