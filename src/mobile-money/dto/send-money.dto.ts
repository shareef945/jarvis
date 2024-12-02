import { IsNumber, IsString, Min, Matches } from 'class-validator';

export class SendMoneyDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @Matches(/^0[0-9]{9}$/, {
    message: 'Phone number must be a valid Ghana phone number',
  })
  phoneNumber: string;
}
