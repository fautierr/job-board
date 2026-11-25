import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Offer } from '../offers/offers.entity';
import { User } from '../users/users.entity';

@Entity('applications')
@Unique('UQ_applications_offer_candidate', ['offerId', 'candidateId'])
@Index('IDX_applications_offer_id', ['offerId'])
@Index('IDX_applications_candidate_id', ['candidateId'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId!: string;

  @ManyToOne(() => Offer, (offer) => offer.applications, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => User, (user) => user.applications, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: User;

  @Column({ name: 'candidate_name', type: 'text' })
  candidateName!: string;

  @Column({ type: 'text' })
  phone!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
