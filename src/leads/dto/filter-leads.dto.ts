import { IsOptional, IsString } from "class-validator";
import { FilterPaginationDto } from "src/common/dto/filter-pagination.dto";


export class FilterLeadsDto extends FilterPaginationDto {

    @IsOptional()
    @IsString()
    source?: string;
    
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    priority?: string;
}