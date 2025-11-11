import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { LeadsModule } from './leads/leads.module';

@Module({
    imports: [PrismaModule, LeadsModule],
})
export class AppModule { }
