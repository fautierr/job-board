import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import {
  USER_ROLES,
  type UserRole,
} from '../../shared/constants/work-offer-values';
import { Application } from '../applications/applications.entity';
import { Offer } from '../offers/offers.entity';

@Entity('users')
@Unique('UQ_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'enum', enum: [...USER_ROLES], enumName: 'user_role' })
  role!: UserRole;

  @Column({ name: 'company_name', type: 'text', nullable: true })
  companyName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => Offer, (offer) => offer.employer)
  offers!: Offer[];

  @OneToMany(() => Application, (application) => application.candidate)
  applications!: Application[];
}
