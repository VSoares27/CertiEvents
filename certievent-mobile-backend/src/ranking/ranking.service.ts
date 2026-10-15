import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Certificate, CertificateDocument } from '../certificates/schemas/certificate.schema.js';
import { User, UserDocument } from '../auth/schemas/user.schema.js';

// Serviço responsável pela lógica de ranking geral de participantes por pontuação de certificados
@Injectable()
export class RankingService {
  constructor(
    @InjectModel(Certificate.name)
    private certificateModel: Model<CertificateDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // Agrega certificados prontos agrupados por usuário, resolve os dados do usuário e retorna ranking ordenado por pontuação
  async getRanking() {
    const aggregation = await this.certificateModel.aggregate<{
      _id: string;
      certificateCount: number;
    }>([
      { $match: { status: 'ready' } },
      { $group: { _id: '$userId', certificateCount: { $sum: 1 } } },
      { $sort: { certificateCount: -1 } },
      { $limit: 50 },
    ]);

    const results = await Promise.all(
      aggregation.map(async (entry, index) => {
        let user: UserDocument | null = null;
        try {
          if (isValidObjectId(entry._id)) {
            // userId é um ObjectId válido — busca normal
            user = await this.userModel.findById(new Types.ObjectId(entry._id)).exec();
          } else {
            // userId é uma string arbitrária — tenta buscar como string
            user = await this.userModel.findOne({ _id: entry._id } as any).exec();
          }
        } catch {
          // Se falhar, segue sem dados do usuário
        }
        return {
          userId: entry._id,
          fullName: user?.fullName ?? 'Participante',
          avatarUrl: (user as any)?.avatarUrl as string | undefined,
          certificateCount: entry.certificateCount,
          score: entry.certificateCount * 20,
          position: index + 1,
        };
      }),
    );

    return results;
  }
}
