import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../../application/interfaces/id-generator';
import { randomUUID } from 'crypto';

@Injectable()
export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
