import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { dueDiligenceTemplates } from "@shared/schema";
import { DueDiligenceTemplate, InsertDueDiligenceTemplate, DueDiligenceCategory } from "@shared/types";

export interface IDueDiligenceRepository {
  getActiveTemplate(fundId: string): Promise<DueDiligenceTemplate | undefined>;
  getTemplatesByFund(fundId: string): Promise<DueDiligenceTemplate[]>;
  createTemplate(template: InsertDueDiligenceTemplate): Promise<DueDiligenceTemplate>;
  updateTemplate(id: string, data: Partial<DueDiligenceTemplate>): Promise<DueDiligenceTemplate | undefined>;
  activateTemplate(id: string, fundId: string): Promise<DueDiligenceTemplate | undefined>;
  deleteTemplate(id: string, fundId: string): Promise<boolean>;
  getDefaultCategories(): DueDiligenceCategory[];
}

export class DueDiligenceRepository implements IDueDiligenceRepository {
  getDefaultCategories(): DueDiligenceCategory[] {
    return [
      {
        key: 'pitch-deck',
        name: 'Pitch Deck',
        required: 1,
        importance: 'high',
        description: 'Company presentation and vision',
        order: 1,
        documentTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        isDefault: true
      },
      {
        key: 'financials',
        name: 'Financial Documents',
        required: 3,
        importance: 'high',
        description: 'Financial statements, projections, unit economics',
        order: 2,
        documentTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        isDefault: true
      },
      {
        key: 'legal',
        name: 'Legal Documents',
        required: 4,
        importance: 'medium',
        description: 'Corporate structure, IP, contracts, compliance',
        order: 3,
        documentTypes: ['application/pdf'],
        isDefault: true
      },
      {
        key: 'tech',
        name: 'Technical Documentation',
        required: 2,
        importance: 'high',
        description: 'Technical documentation, architecture, security',
        order: 4,
        isDefault: true
      },
      {
        key: 'market',
        name: 'Market Analysis',
        required: 2,
        importance: 'medium',
        description: 'Market research, competitive analysis',
        order: 5,
        isDefault: true
      },
      {
        key: 'other',
        name: 'Other Documents',
        required: 0,
        importance: 'low',
        description: 'Additional supporting documents',
        order: 999,
        isDefault: true
      }
    ];
  }

  async getActiveTemplate(fundId: string): Promise<DueDiligenceTemplate | undefined> {
    const [template] = await db
      .select()
      .from(dueDiligenceTemplates)
      .where(and(
        eq(dueDiligenceTemplates.fundId, fundId),
        eq(dueDiligenceTemplates.isActive, true)
      ));

    if (!template) {
      return this.createDefaultTemplate(fundId);
    }

    return template as DueDiligenceTemplate;
  }

  private async createDefaultTemplate(fundId: string): Promise<DueDiligenceTemplate> {
    const defaultTemplate = {
      fundId,
      name: 'Default Due Diligence Process',
      categories: this.getDefaultCategories(),
      isActive: true
    };

    return this.createTemplate(defaultTemplate);
  }

  async getTemplatesByFund(fundId: string): Promise<DueDiligenceTemplate[]> {
    return await db
      .select()
      .from(dueDiligenceTemplates)
      .where(eq(dueDiligenceTemplates.fundId, fundId))
      .orderBy(desc(dueDiligenceTemplates.createdAt));
  }

  async createTemplate(insertTemplate: InsertDueDiligenceTemplate): Promise<DueDiligenceTemplate> {
    if (insertTemplate.isActive) {
      await db
        .update(dueDiligenceTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(dueDiligenceTemplates.fundId, insertTemplate.fundId));
    }

    const categories = [...insertTemplate.categories];
    const hasOther = categories.some(cat => cat.key === 'other');
    if (!hasOther) {
      categories.push(this.getDefaultCategories().find(cat => cat.key === 'other')!);
    }

    const [template] = await db
      .insert(dueDiligenceTemplates)
      .values({
        ...insertTemplate,
        categories
      })
      .returning();

    return template as DueDiligenceTemplate;
  }

  async updateTemplate(id: string, data: Partial<DueDiligenceTemplate>): Promise<DueDiligenceTemplate | undefined> {
    if (data.categories) {
      const categories = [...data.categories];
      const hasOther = categories.some(cat => cat.key === 'other');
      if (!hasOther) {
        categories.push(this.getDefaultCategories().find(cat => cat.key === 'other')!);
      }
      data.categories = categories as any;
    }

    const [updated] = await db
      .update(dueDiligenceTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(dueDiligenceTemplates.id, id))
      .returning();

    return updated as DueDiligenceTemplate;
  }

  async activateTemplate(id: string, fundId: string): Promise<DueDiligenceTemplate | undefined> {
    await db
      .update(dueDiligenceTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dueDiligenceTemplates.fundId, fundId));

    const [activated] = await db
      .update(dueDiligenceTemplates)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(dueDiligenceTemplates.id, id))
      .returning();

    return activated as DueDiligenceTemplate;
  }

  async deleteTemplate(id: string, fundId: string): Promise<boolean> {
    const templates = await this.getTemplatesByFund(fundId);
    if (templates.length === 1) {
      throw new Error("Cannot delete the only due diligence template");
    }

    const result = await db
      .delete(dueDiligenceTemplates)
      .where(eq(dueDiligenceTemplates.id, id))
      .returning();

    return result.length > 0;
  }
}
