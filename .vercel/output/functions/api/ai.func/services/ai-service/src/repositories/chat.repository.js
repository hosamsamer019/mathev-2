"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRepository = void 0;
const database_1 = require("@smartmath/database");
class ChatRepository {
    static async createSession(userId) {
        return database_1.db.chatSession.create({ data: { userId } });
    }
    static async getSessionsByUser(userId) {
        return database_1.db.chatSession.findMany({
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
    static async getSessionById(id, userId) {
        return database_1.db.chatSession.findFirst({
            where: { id, userId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });
    }
    static async addMessage(sessionId, role, content, tokens) {
        // Touch the session updatedAt
        await database_1.db.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() }
        });
        return database_1.db.chatMessage.create({
            data: { sessionId, role, content, tokens }
        });
    }
    static async getRecentMessages(sessionId, limit = 10) {
        return database_1.db.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            take: limit
        }).then((msgs) => msgs.reverse()); // Return in chronological order
    }
}
exports.ChatRepository = ChatRepository;
//# sourceMappingURL=chat.repository.js.map