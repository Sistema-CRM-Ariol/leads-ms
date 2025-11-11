import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NatsModule } from 'src/transports/nats.module';

@Module({
    controllers: [LeadsController],
    providers: [LeadsService],
    imports: [PrismaModule, NatsModule],
})
export class LeadsModule { }
