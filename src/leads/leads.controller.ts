import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { ChangeLeadStatusDto } from './dto/change-lead-status.dto';

@Controller()
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @MessagePattern('leads.create')
    create(@Payload() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    @MessagePattern('leads.seed')
    seed() {
        return this.leadsService.seed();
    }

    @MessagePattern('leads.findAll')
    findAll(@Payload() filterLeadsDto: FilterLeadsDto) {
        return this.leadsService.findAll(filterLeadsDto);
    }

    @MessagePattern('leads.changeStatus')
    changeStatus(@Payload() changeLeadStatusDto: ChangeLeadStatusDto) {
        return this.leadsService.changeStatus(changeLeadStatusDto);
    }

}
