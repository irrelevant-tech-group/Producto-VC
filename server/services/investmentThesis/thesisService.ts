// server/services/investmentThesis/thesisService.ts

import { InvestmentThesisRepository } from "../../storage/repositories/investmentThesisRepository";
import { InvestmentThesis } from "@shared/schema";

export class InvestmentThesisService {
  private repository: InvestmentThesisRepository;

  constructor() {
    this.repository = new InvestmentThesisRepository();
  }

  async getActiveThesis(fundId: string): Promise<InvestmentThesis | undefined> {
    return await this.repository.getActiveThesis(fundId);
  }

  /**
   * Construye el contexto de tesis de inversión para usar en prompts
   */
  async buildThesisContext(fundId: string): Promise<string> {
    const thesis = await this.getActiveThesis(fundId);
    
    if (!thesis) {
      return this.getDefaultThesisContext();
    }

    const verticals = (thesis.preferredVerticals as any[])
      .map(v => `${v.vertical} (peso: ${v.weight}, criterios: ${v.criteria || 'estándar'})`)
      .join(', ');

    const stages = (thesis.preferredStages as any[])
      .map(s => `${s.stage} (peso: ${s.weight}, ticket: $${s.ticketRange?.min || 'N/A'}-$${s.ticketRange?.max || 'N/A'})`)
      .join(', ');

    const geographic = (thesis.geographicFocus as any[])
      .map(g => `${g.region} (peso: ${g.weight})`)
      .join(', ');

    const criteria = thesis.evaluationCriteria as any;
    const evaluationDetails = Object.entries(criteria)
      .map(([key, value]: [string, any]) => 
        `${key}: peso ${value.weight} - ${Object.entries(value.subcriteria || {})
          .map(([subKey, subValue]: [string, any]) => `${subKey} (${subValue.weight || 'N/A'})`)
          .join(', ')}`
      ).join('\n  ');

    const redFlags = (thesis.redFlags as any[])?.join(', ') || 'No especificados';
    const mustHaves = (thesis.mustHaves as any[])?.join(', ') || 'No especificados';

    return `
TESIS DE INVERSIÓN ACTIVA - ${thesis.name} (v${thesis.version})

FILOSOFÍA DE INVERSIÓN:
${thesis.investmentPhilosophy}

PROPUESTA DE VALOR:
${thesis.valueProposition}

CRITERIOS DE SELECCIÓN:
- Verticales preferidos: ${verticals}
- Etapas de inversión: ${stages}
- Enfoque geográfico: ${geographic}
- Rango de ticket: $${thesis.ticketSizeMin || 'N/A'} - $${thesis.ticketSizeMax || 'N/A'}
- Ownership objetivo: ${thesis.targetOwnershipMin || 'N/A'}% - ${thesis.targetOwnershipMax || 'N/A'}%

CRITERIOS DE EVALUACIÓN DETALLADOS:
  ${evaluationDetails}

PROCESO DE TOMA DE DECISIONES:
${thesis.decisionProcess || 'Proceso estándar de due diligence'}

APETITO DE RIESGO:
${thesis.riskAppetite || 'Moderado con enfoque en crecimiento sostenible'}

RED FLAGS CRÍTICOS:
${redFlags}

REQUISITOS INDISPENSABLES:
${mustHaves}

RETORNOS ESPERADOS:
${JSON.stringify(thesis.expectedReturns, null, 2)}

Esta tesis debe guiar TODOS los análisis, evaluaciones y recomendaciones. Evalúa cada startup contra estos criterios específicos y proporciona justificaciones basadas en esta filosofía de inversión.
    `;
  }

  private getDefaultThesisContext(): string {
    return `
TESIS DE INVERSIÓN POR DEFECTO - H20 Capital

FILOSOFÍA DE INVERSIÓN:
Invertimos en startups tecnológicos de alto crecimiento en América Latina, enfocándonos en equipos excepcionales que resuelven problemas reales con soluciones escalables e innovadoras.

CRITERIOS DE SELECCIÓN:
- Verticales: Fintech (40%), SaaS (30%), AI (20%), Marketplace (10%)
- Etapas: Pre-seed (50%), Seed (40%), Series A (10%)
- Geográfico: México (40%), Colombia (25%), Brasil (20%), Otros LATAM (15%)
- Ticket: $50K - $500K USD
- Ownership: 5% - 20%

CRITERIOS DE EVALUACIÓN:
- Equipo (30%): Experiencia, complementariedad, dominio técnico
- Mercado (25%): Tamaño, crecimiento, timing
- Producto (20%): Innovación, PMF, defensibilidad
- Tracción (15%): Métricas, crecimiento, validación
- Financieros (10%): Unit economics, eficiencia capital

RED FLAGS: Equipos incompletos, mercados pequeños, falta de tracción, quemado alto de capital
MUST HAVES: Equipo técnico fuerte, mercado grande, alguna validación inicial
    `;
  }

  /**
   * Construye contexto específico para análisis de alignment
   */
  async buildAlignmentContext(fundId: string): Promise<string> {
    const thesis = await this.getActiveThesis(fundId);
    if (!thesis) return this.getDefaultThesisContext();

    const verticals = thesis.preferredVerticals as any[];
    const stages = thesis.preferredStages as any[];
    const criteria = thesis.evaluationCriteria as any;

    return `
CRITERIOS DE ALINEAMIENTO ESPECÍFICOS:

VERTICAL SCORING:
${verticals.map(v => `- ${v.vertical}: peso ${v.weight} (${v.criteria || 'criterios estándar'})`).join('\n')}

STAGE SCORING:
${stages.map(s => `- ${s.stage}: peso ${s.weight}`).join('\n')}

EVALUATION WEIGHTS:
${Object.entries(criteria).map(([key, value]: [string, any]) => `- ${key}: ${value.weight}`).join('\n')}

DECISION FACTORS:
- Filosofía: ${thesis.investmentPhilosophy.substring(0, 200)}...
- Red Flags: ${(thesis.redFlags as any[])?.join(', ') || 'No especificados'}
- Must Haves: ${(thesis.mustHaves as any[])?.join(', ') || 'No especificados'}
    `;
  }
}

export const investmentThesisService = new InvestmentThesisService();