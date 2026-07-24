"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentService = void 0;
const database_1 = require("@smartmath/database");
class ParentService {
    static async getChildren(parentId) {
        const relations = await database_1.db.parentChildRelation.findMany({
            where: { parentId },
            include: {
                child: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });
        return relations.map(r => r.child);
    }
    static async linkChild(parentId, childId) {
        // Basic verification that child exists
        const child = await database_1.db.user.findUnique({ where: { id: childId } });
        if (!child)
            throw new Error('Child user not found');
        // Create relation
        return database_1.db.parentChildRelation.create({
            data: {
                parentId,
                childId
            }
        });
    }
}
exports.ParentService = ParentService;
//# sourceMappingURL=parent.service.js.map