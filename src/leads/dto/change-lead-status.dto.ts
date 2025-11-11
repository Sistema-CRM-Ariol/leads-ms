import { $Enums } from "@prisma/client";
import { IsEnum, IsString, IsUUID } from "class-validator";

export class ChangeLeadStatusDto{
    
    @IsUUID()
    id: string;
    
    @IsEnum($Enums.LeadStatus)
    status: $Enums.LeadStatus;
    
}
