import { $Enums, Prisma } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateLeadDto implements Prisma.LeadsCreateInput{
    
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    lastname?: string | null | undefined;   
    
    @IsString()
    @IsOptional()
    position?: string | null | undefined;
    
    @IsString()
    city: string;
    
    @IsString()
    @IsOptional()
    address?: string | null | undefined;
    
    @IsString()
    @IsOptional()
    razonSocial?: string | null | undefined;
    
    @IsString()
    @IsOptional()
    nit?: string | null | undefined;
    
    @IsEmail()
    email1: string;
    
    @IsEmail()
    @IsOptional()
    email2?: string | null | undefined;
    
    @IsString()
    phone1: string;
    
    @IsString()
    @IsOptional()
    phone2?: string | null | undefined;

    @IsOptional()
    @IsEnum($Enums.LeadSource)
    source: $Enums.LeadSource | undefined;
    
    @IsOptional()
    @IsEnum($Enums.LeadStatus)
    status: $Enums.LeadStatus | undefined;
    
    @IsOptional()
    @IsEnum($Enums.LeadPriority)
    priority: $Enums.LeadPriority | undefined;
    
    @IsString()
    @IsOptional()
    description?: string | null | undefined;
    
    @IsString()
    @IsOptional()
    notes?: string | null | undefined;

    @IsString()
    @IsOptional()
    assignedToId?: string | null | undefined;

    @IsString()
    @IsOptional()
    clientId?: string | null | undefined;
    
    @IsBoolean()
    @IsOptional()
    isActive?: boolean | undefined;
}
