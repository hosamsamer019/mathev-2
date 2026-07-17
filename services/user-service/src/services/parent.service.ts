import { db } from '@smartmath/database';

export class ParentService {
  static async getChildren(parentId: string) {
    const relations = await db.parentChildRelation.findMany({
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

  static async linkChild(parentId: string, childId: string) {
    // Basic verification that child exists
    const child = await db.user.findUnique({ where: { id: childId } });
    if (!child) throw new Error('Child user not found');

    // Create relation
    return db.parentChildRelation.create({
      data: {
        parentId,
        childId
      }
    });
  }
}
