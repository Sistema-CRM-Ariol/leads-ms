import { Inject, Injectable, Logger } from '@nestjs/common';
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

    private readonly logger = new Logger('LeadsService');

    constructor(
        private readonly prisma: PrismaService,
        @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy,
    ) { }

    // ─── Dashboard Stats ────────────────────────────────────────────
    async getStats() {

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const [
            totalLeads,
            newThisWeek,
            convertedToClient,
            discarded,
            wonLeads,
        ] = await Promise.all([
            this.prisma.leads.count(),
            this.prisma.leads.count({
                where: { createdAt: { gte: startOfWeek } },
            }),
            this.prisma.leads.count({
                where: { status: LeadStatus.WON },
            }),
            this.prisma.leads.count({
                where: { status: LeadStatus.LOST },
            }),
            this.prisma.leads.findMany({
                where: { status: LeadStatus.WON },
                select: { createdAt: true, updatedAt: true },
            }),
        ]);

        // Tasa de conversión
        const conversionRate = totalLeads > 0
            ? parseFloat(((convertedToClient / totalLeads) * 100).toFixed(2))
            : 0;

        // Tiempo promedio de cierre en días (diferencia entre createdAt y updatedAt de leads WON)
        let avgClosingTimeDays = 0;
        if (wonLeads.length > 0) {
            const totalDays = wonLeads.reduce((sum, lead) => {
                const diffMs = lead.updatedAt.getTime() - lead.createdAt.getTime();
                return sum + diffMs / (1000 * 60 * 60 * 24);
            }, 0);
            avgClosingTimeDays = parseFloat((totalDays / wonLeads.length).toFixed(1));
        }

        return {
            totalLeads,
            newThisWeek,
            convertedToClient,
            discarded,
            conversionRate,
            avgClosingTimeDays,
        };
    }

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

    async getDashboardData() {
        try {
            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

            const [totalLeads, recentLeads, byStatusRaw, bySourceRaw] = await Promise.all([
                this.prisma.leads.count(),
                this.prisma.leads.findMany({
                    where: { createdAt: { gte: sixMonthsAgo } },
                    select: { createdAt: true },
                }),
                this.prisma.leads.groupBy({ by: ['status'], _count: { _all: true } }),
                this.prisma.leads.groupBy({ by: ['source'], _count: { _all: true } }),
            ]);

            // Chart mensual de últimos 6 meses
            const monthlyMap: Record<string, number> = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthlyMap[key] = 0;
            }
            for (const lead of recentLeads) {
                const key = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyMap[key] !== undefined) monthlyMap[key]++;
            }
            const sixMonthChart = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

            const byStatus = byStatusRaw.map(r => ({ status: r.status, count: r._count._all }));
            const bySource = bySourceRaw.map(r => ({ source: r.source, count: r._count._all }));

            return { totalLeads, sixMonthChart, byStatus, bySource };
        } catch (error) {
            throw new RpcException(error);
        }
    }
}
