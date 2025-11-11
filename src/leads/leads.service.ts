import { Inject, Injectable } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NATS_SERVICE } from 'src/config/services';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { leadsSeeder } from 'src/data/leads.seeder';
import { ChangeLeadStatusDto } from './dto/change-lead-status.dto';
import { Leads, LeadStatus, Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LeadsService {

    constructor(
        private readonly prisma: PrismaService,
        @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy,
    ) { }

    async create(createLeadDto: CreateLeadDto) {

        const verifyLead = await this.prisma.leads.findFirst({
            where: {
                OR: [
                    { email1: createLeadDto.email1 },
                    { email2: createLeadDto.email2 },
                    { phone1: createLeadDto.phone1 },
                    { phone2: createLeadDto.phone2 },
                ],
            },
        });

        if (verifyLead) {
            throw new RpcException({
                status: 400,
                message: 'Ya existe un lead con alguno de los datos proporcionados (email o teléfono).',
                lead: verifyLead,
            })
        }

        const newLead = await this.prisma.leads.create({
            data: {
                ...createLeadDto,
            },
        });

        return {
            message: 'Lead creado con éxito',
            lead: newLead,
        }
    }


    async seed() {

        console.log('🌱 Comenzando seeding de leads...');
        await this.prisma.leadActivity.deleteMany();
        await this.prisma.leads.deleteMany();
        console.log('✅ Base de datos limpiada');

        await this.prisma.leads.createMany({
            data: leadsSeeder,
        });

        console.log(`✅ ${leadsSeeder.length} leads creados con éxito`);
        return '🌱 Seeding de leads completado';

    }

    async findAll(filterLeadsDto: FilterLeadsDto) {

        const { isActive, limit, page, priority, search, source, status } = filterLeadsDto;

        const filters: any[] = [];

        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone1: { contains: search, mode: 'insensitive' } },
                    { phone2: { contains: search, mode: 'insensitive' } },
                    { email1: { contains: search, mode: 'insensitive' } },
                    { email2: { contains: search, mode: 'insensitive' } },
                ],
            });
        }

        // Si status viene definido, lo agregamos
        if (isActive !== undefined) {
            filters.push({ isActive });
        }

        if (priority) {
            filters.push({ priority });
        }

        if (source) {
            filters.push({ source });
        }

        if (status) {
            filters.push({ status });
        }

        // Si existen filtros, los combinamos en un AND; de lo contrario, la consulta no tiene filtro
        const whereClause = filters.length > 0 ? { AND: filters } : {};

        // Ejecutamos la consulta de conteo y búsqueda con el mismo whereClause
        const [totalLeads, leads] = await Promise.all([
            this.prisma.leads.count({
                where: whereClause,
            }),
            this.prisma.leads.findMany({
                take: limit,
                skip: (page! - 1) * limit!,
                orderBy: { updatedAt: 'desc' },
                where: { ...whereClause, },
                omit: {
                    position: true,
                    address: true,
                    razonSocial: true,
                    nit: true,
                    email2: true,
                    phone2: true,
                    updatedAt: true,
                    clientId: true,
                    description: true,
                    assignedToId: true,
                }
            }),
        ]);

        const lastPage = Math.ceil(totalLeads / limit!);

        return {
            leads,
            meta: {
                page,
                lastPage,
                total: totalLeads,
            },
        };
    }

    async changeStatus(changeLeadStatusDto: ChangeLeadStatusDto) {

        const { id, status } = changeLeadStatusDto;

        const lead = await this.prisma.leads.findUnique({
            where: { id },
        });

        if (!lead) {
            throw new RpcException({
                status: 404,
                message: 'Lead no encontrado',
            });
        }

        const updatedLead = await this.prisma.leads.update({
            where: { id },
            data: { status },
        });

        if (status === LeadStatus.WON) {
            return this.convertToClient(updatedLead);
        }

        return {
            message: 'Estado del lead actualizado con éxito',
            lead: updatedLead,
        };

    }

    async convertToClient(lead: Leads) {

        const { priority, source, status, assignedToId, notes, createdAt, updatedAt, description, clientId, id, ...client } = lead;

        try {
            const response = await firstValueFrom(
                this.natsClient.send('clients.createFromLead', client)
            );
    
            await this.prisma.leads.update({
                where: { id: lead.id },
                data: { isActive: false },
            });
    
            return {
                message: 'Lead convertido a cliente con éxito',
                client: response,
            }
            
        } catch (error) {
            throw new RpcException(error);
        }
    }
}
