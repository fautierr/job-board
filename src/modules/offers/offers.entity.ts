import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CONTRACT_TYPES,
  JOB_CATEGORIES,
  OFFER_STATUSES,
  SENIORITIES,
  WORKDAYS,
  WORK_MODES,
  type ContractType,
  type JobCategory,
  type OfferStatus,
  type Seniority,
  type Workday,
  type WorkMode,
} from '../../shared/constants/work-offer-values';
import { Application } from '../applications/applications.entity';
import { User } from '../users/users.entity';

@Entity('offers')
@Index('IDX_offers_status_category', ['status', 'category'])
@Index('IDX_offers_employer_id', ['employerId'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employer_id', type: 'uuid' })
  employerId!: string;

  @ManyToOne(() => User, (user) => user.offers, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'employer_id' })
  employer!: User;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: [...JOB_CATEGORIES], enumName: 'job_category' })
  category!: JobCategory;

  @Column({ type: 'enum', enum: [...SENIORITIES], enumName: 'seniority' })
  seniority!: Seniority;

  @Column({ type: 'enum', enum: [...WORK_MODES], enumName: 'work_mode' })
  workMode!: WorkMode;

  @Column({ type: 'enum', enum: [...WORKDAYS], enumName: 'workday' })
  workday!: Workday;

  @Column({ type: 'enum', enum: [...CONTRACT_TYPES], enumName: 'contract_type' })
  contractType!: ContractType;

  @Column({
    type: 'enum',
    enum: [...OFFER_STATUSES],
    enumName: 'offer_status',
    default: 'PUBLISHED',
  })
  status!: OfferStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Application, (application) => application.offer)
  applications!: Application[];
}
