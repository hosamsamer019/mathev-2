import { db } from '@smartmath/database';

export class ChatRepository {
  static async createSession(userId: string) {
    return db.chatSession.create({ data: { userId } });
  }

  static async getSessionsByUser(userId: string) {
    return db.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  static async getSessionById(id: string, userId: string) {
    return db.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  static async addMessage(sessionId: string, role: string, content: string, tokens?: number) {
    // Touch the session updatedAt
    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return db.chatMessage.create({
      data: { sessionId, role, content, tokens }
    });
  }

  static async getRecentMessages(sessionId: string, limit: number = 10) {
    return db.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit
    }).then((msgs: any[]) => msgs.reverse()); // Return in chronological order
  }
}
