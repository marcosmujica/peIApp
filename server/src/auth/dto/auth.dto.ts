import { IsOptional, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Número en formato E.164 requerido' })
  phoneNumber: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Número en formato E.164 requerido' })
  phoneNumber: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código OTP debe tener 6 dígitos' })
  code: string;
}
