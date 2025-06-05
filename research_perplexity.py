import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import os
from dataclasses import dataclass
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import re

@dataclass
class StartupDueDiligenceConfig:
    """Configuración para due diligence de startups"""
    industry: str
    country: str
    startup_stage: str = "Series A"  # Pre-seed, Seed, Series A, Series B, etc.
    year: str = "2024"
    currency: str = "USD"
    focus_areas: List[str] = None  # ['market', 'competition', 'regulatory', 'risks', 'opportunities']
    
    def __post_init__(self):
        if self.focus_areas is None:
            self.focus_areas = ['market', 'competition', 'regulatory', 'risks', 'opportunities']

class SimplePDFGenerator:
    """Generador de PDFs simples para reportes de due diligence"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_simple_styles()
    
    def _setup_simple_styles(self):
        """Configura estilos simples para el PDF"""
        # Título principal simple
        self.styles.add(ParagraphStyle(
            name='SimpleTitle',
            parent=self.styles['Title'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtítulos de sección simples
        self.styles.add(ParagraphStyle(
            name='SimpleHeader',
            parent=self.styles['Heading1'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        ))
        
        # Párrafos normales
        self.styles.add(ParagraphStyle(
            name='SimpleNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        ))
        
        # Metadata simple
        self.styles.add(ParagraphStyle(
            name='SimpleMetadata',
            parent=self.styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Oblique'
        ))
    
    def _clean_text(self, text: str) -> str:
        """Limpia el texto para PDF"""
        if not text:
            return ""
        
        # Reemplazar caracteres problemáticos
        text = text.replace('•', '-')
        text = text.replace('–', '-')
        text = text.replace('—', '-')
        text = text.replace('"', '"')
        text = text.replace('"', '"')
        text = text.replace("''", "'")
        text = text.replace("''", "'")
        
        # Escapar caracteres XML
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        
        return text
    
    def _create_simple_cover(self, config: StartupDueDiligenceConfig) -> List:
        """Crea portada simple"""
        elements = []
        
        elements.append(Spacer(1, 1 * inch))
        
        # Título
        title = f"Due Diligence Report: {config.industry.title()} Sector"
        elements.append(Paragraph(title, self.styles['SimpleTitle']))
        elements.append(Spacer(1, 0.3 * inch))
        
        # Información básica
        info_text = f"""
        Country: {config.country}<br/>
        Industry: {config.industry.title()}<br/>
        Stage Focus: {config.startup_stage}<br/>
        Analysis Year: {config.year}<br/>
        Currency: {config.currency}<br/>
        Generated: {datetime.now().strftime('%B %d, %Y')}
        """
        elements.append(Paragraph(info_text, self.styles['SimpleMetadata']))
        elements.append(PageBreak())
        
        return elements
    
    def _format_simple_section(self, content: str, title: str) -> List:
        """Formatea sección simple"""
        elements = []
        
        # Título de sección
        elements.append(Paragraph(title, self.styles['SimpleHeader']))
        elements.append(Spacer(1, 8))
        
        # Contenido limpio
        cleaned_content = self._clean_text(content)
        paragraphs = cleaned_content.split('\n\n')
        
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.strip(), self.styles['SimpleNormal']))
                elements.append(Spacer(1, 4))
        
        elements.append(Spacer(1, 15))
        return elements

class StartupDueDiligenceResearcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.perplexity.ai/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.research_data = {}
        self.pdf_generator = SimplePDFGenerator()
    
    def _make_request(self, messages: List[Dict], model: str = "sonar-pro") -> Optional[str]:
        """Realiza petición a Perplexity API"""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 4000
        }
        
        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            return data['choices'][0]['message']['content']
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error en la petición: {e}")
            return None
        except KeyError as e:
            print(f"❌ Error en la respuesta: {e}")
            return None
    
    def research_market_opportunity(self, config: StartupDueDiligenceConfig) -> Optional[str]:
        """Analiza oportunidad de mercado para VCs"""
        print(f"📊 Analizando oportunidad de mercado: {config.industry} en {config.country}")
        
        system_prompt = """Eres un analista de venture capital experto en due diligence. Tu enfoque es evaluar oportunidades de mercado 
        para startups desde la perspectiva de un inversionista. Proporciona datos concretos, TAM/SAM/SOM, y métricas de inversión."""
        
        user_prompt = f"""
        Analiza la oportunidad de mercado para startups de {config.industry} en {config.country} en {config.year}, 
        enfocándote en empresas en etapa {config.startup_stage}.
        
        DESDE LA PERSPECTIVA DE UN VC, proporciona:
        
        1. TAMAÑO DE MERCADO (TAM/SAM/SOM):
        - Total Addressable Market (TAM) en {config.currency}
        - Serviceable Addressable Market (SAM) 
        - Serviceable Obtainable Market (SOM) para startups
        
        2. CRECIMIENTO Y PROYECCIONES:
        - CAGR del mercado (próximos 5 años)
        - Proyecciones de inversión en el sector
        - Tendencias de funding por etapa
        
        3. MÉTRICAS CLAVE PARA VCs:
        - Multiple de salida promedio (exit multiples)
        - Tiempo promedio hasta exit
        - Tasa de éxito de startups en el sector
        - Valoraciones típicas por etapa de inversión
        
        4. DRIVERS DE CRECIMIENTO:
        - Catalizadores principales del mercado
        - Factores tecnológicos disruptivos
        - Cambios regulatorios favorables
        
        5. FUENTES DE DATOS:
        - Incluye fuentes específicas y fechas
        
        Enfócate en información ACCIONABLE para decisiones de inversión.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        result = self._make_request(messages)
        if result:
            self.research_data['market_opportunity'] = result
        return result
    
    def research_competitive_landscape(self, config: StartupDueDiligenceConfig) -> Optional[str]:
        """Analiza panorama competitivo para due diligence"""
        print(f"🏢 Analizando competencia: {config.industry} en {config.country}")
        
        system_prompt = """Eres un analista de due diligence especializado en análisis competitivo para VCs. 
        Evalúa el panorama competitivo desde la perspectiva de riesgo/oportunidad para startups emergentes."""
        
        user_prompt = f"""
        Analiza el panorama competitivo para startups de {config.industry} en {config.country} ({config.startup_stage}), 
        desde la perspectiva de due diligence para VCs.
        
        ANÁLISIS COMPETITIVO PARA VCs:
        
        1. INCUMBENTES Y DISRUPTORES:
        - Top 5 incumbentes establecidos (con market share)
        - Startups unicornio/decacornio del sector
        - Nuevos entrantes disruptivos (últimos 2 años)
        
        2. ANÁLISIS DE FUNDING:
        - Startups mejor financiadas del sector
        - Rondas de inversión recientes (+$10M)
        - VCs más activos en el sector
        - Valuaciones de referencia por etapa
        
        3. BARRERAS COMPETITIVAS:
        - Barreras de entrada para nuevas startups
        - Moats defensibles típicos del sector
        - Ventajas competitivas sostenibles
        - Capital requerido para competir
        
        4. RIESGOS COMPETITIVOS:
        - Amenaza de big tech (Google, Amazon, Microsoft, etc.)
        - Riesgo de comoditización
        - Ciclos de vida de productos
        - Poder de negociación de customers
        
        5. OPORTUNIDADES DE NICHO:
        - Segmentos sub-atendidos
        - Mercados verticales emergentes
        - Geografías con menor competencia
        
        6. CASOS DE ÉXITO Y FRACASOS:
        - Exits exitosos recientes (IPO/M&A)
        - Startups que han fracasado y por qué
        - Lecciones para nuevos entrantes
        
        Enfócate en RIESGOS e IMPLICACIONES para decisiones de inversión.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        result = self._make_request(messages)
        if result:
            self.research_data['competitive_landscape'] = result
        return result
    
    def research_regulatory_risks(self, config: StartupDueDiligenceConfig) -> Optional[str]:
        """Analiza riesgos regulatorios para startups"""
        print(f"⚖️ Analizando riesgos regulatorios: {config.industry} en {config.country}")
        
        system_prompt = """Eres un analista legal/regulatorio especializado en due diligence para VCs. 
        Tu objetivo es identificar riesgos regulatorios que puedan impactar startups y decisiones de inversión."""
        
        user_prompt = f"""
        Analiza los riesgos regulatorios para startups de {config.industry} en {config.country} desde 
        la perspectiva de due diligence para VCs.
        
        ANÁLISIS REGULATORIO PARA VCs:
        
        1. MARCO REGULATORIO ACTUAL:
        - Regulaciones existentes que impactan startups
        - Autoridades regulatorias clave
        - Requisitos de licencias/permisos
        - Compliance obligatorio
        
        2. RIESGOS REGULATORIOS EMERGENTES:
        - Propuestas de ley en discusión
        - Nuevas regulaciones en proceso
        - Cambios regulatorios probables (próximos 2-3 años)
        - Impacto potencial en modelos de negocio
        
        3. PRECEDENTES REGULATORIOS:
        - Casos de startups penalizadas/cerradas
        - Multas o sanciones recientes en el sector
        - Cambios regulatorios que afectaron startups
        
        4. COMPLIANCE Y COSTOS:
        - Costo de compliance para startups
        - Recursos legales/regulatorios necesarios
        - Tiempo de aprobaciones regulatorias
        - Barreras regulatorias para escalamiento
        
        5. RIESGOS GEOPOLÍTICOS:
        - Regulaciones de países clave (US, EU, China)
        - Riesgos de sanciones comerciales
        - Regulaciones de transferencia de datos
        - Restricciones de inversión extranjera
        
        6. MITIGACIÓN DE RIESGOS:
        - Mejores prácticas de compliance
        - Estructuras legales recomendadas
        - Estrategias de regulatory affairs
        
        Enfócate en RIESGOS MATERIALES que puedan afectar valuaciones o exits.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        result = self._make_request(messages)
        if result:
            self.research_data['regulatory_risks'] = result
        return result
    
    def research_investment_risks(self, config: StartupDueDiligenceConfig) -> Optional[str]:
        """Analiza riesgos específicos de inversión"""
        print(f"⚠️ Analizando riesgos de inversión: {config.industry} en {config.country}")
        
        system_prompt = """Eres un analista de riesgos senior especializado en venture capital. 
        Tu trabajo es identificar todos los riesgos materiales que un VC debe considerar antes de invertir."""
        
        user_prompt = f"""
        Analiza los riesgos de inversión para startups de {config.industry} en {config.country} ({config.startup_stage}) 
        desde la perspectiva de un VC realizando due diligence.
        
        ANÁLISIS DE RIESGOS PARA VCs:
        
        1. RIESGOS DE MERCADO:
        - Volatilidad del mercado objetivo
        - Dependencia de ciclos económicos
        - Sensibilidad a recesiones
        - Riesgo de contracción del mercado
        
        2. RIESGOS TECNOLÓGICOS:
        - Obsolescencia tecnológica
        - Dependencia de plataformas terceras
        - Riesgos de cyberseguridad
        - Complejidad de desarrollo tecnológico
        
        3. RIESGOS OPERACIONALES:
        - Dependencia de talento especializado
        - Escalabilidad del modelo de negocio
        - Riesgos de supply chain
        - Concentración de customers/proveedores
        
        4. RIESGOS FINANCIEROS:
        - Burn rate típico del sector
        - Dificultad para conseguir funding futuro
        - Unit economics desafiantes
        - Capital intensivo vs. capital eficiente
        
        5. RIESGOS GEOGRÁFICOS ({config.country}):
        - Estabilidad política y económica
        - Tipo de cambio y inflación
        - Acceso a mercados internacionales
        - Infraestructura y conectividad
        
        6. RIESGOS DE SALIDA:
        - Liquidez del mercado de M&A local
        - Apetito de IPO en mercados públicos
        - Restricciones para exits internacionales
        - Multiples de salida históricos
        
        7. RIESGOS ESG:
        - Riesgos ambientales y sociales
        - Governance y compliance
        - Reputación y PR
        
        Proporciona PROBABILIDAD e IMPACTO de cada riesgo identificado.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        result = self._make_request(messages)
        if result:
            self.research_data['investment_risks'] = result
        return result
    
    def research_strategic_opportunities(self, config: StartupDueDiligenceConfig) -> Optional[str]:
        """Identifica oportunidades estratégicas específicas"""
        print(f"🎯 Identificando oportunidades estratégicas: {config.industry} en {config.country}")
        
        system_prompt = """Eres un consultor estratégico especializado en identificar oportunidades de inversión 
        para VCs. Tu enfoque es encontrar ventajas competitivas y oportunidades de crecimiento específicas."""
        
        user_prompt = f"""
        Identifica oportunidades estratégicas específicas para startups de {config.industry} en {config.country} 
        desde la perspectiva de un VC buscando opportunities con alto potencial de retorno.
        
        ANÁLISIS DE OPORTUNIDADES PARA VCs:
        
        1. OPORTUNIDADES DE MERCADO:
        - Segmentos emergentes sub-atendidos
        - Shifts en comportamiento del consumidor
        - Nuevas necesidades post-pandemia
        - Mercados adyacentes para expansión
        
        2. OPORTUNIDADES TECNOLÓGICAS:
        - Tecnologías emergentes aplicables (AI, blockchain, IoT, etc.)
        - Convergencia de tecnologías
        - Reducción de costos tecnológicos
        - APIs y plataformas facilitadoras
        
        3. OPORTUNIDADES REGULATORIAS:
        - Nuevas regulaciones que crean mercados
        - Incentivos gubernamentales
        - Cambios regulatorios favorables
        - Gaps regulatorios aprovechables
        
        4. OPORTUNIDADES DE TIMING:
        - Windows of opportunity específicos
        - First-mover advantages disponibles
        - Ciclos de adopción tecnológica
        - Momentum de mercado actual
        
        5. OPORTUNIDADES DE PARTNERSHIP:
        - Corporates buscando innovación
        - Programas de corporate VC
        - Potential acquirers estratégicos
        - Partnerships go-to-market
        
        6. OPORTUNIDADES DE TALENT:
        - Disponibilidad de talento especializado
        - Costo de talento vs. otros mercados
        - Ecosistema de talent pipeline
        - Remote work opportunities
        
        7. ARBITRAJE GEOGRÁFICO:
        - Modelos exitosos en otros países
        - Oportunidades de localización
        - Ventajas de costo geográficas
        - Acceso a mercados regionales
        
        Para cada oportunidad, incluye TIMELINE y BARRIERS TO ENTRY.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        result = self._make_request(messages)
        if result:
            self.research_data['strategic_opportunities'] = result
        return result
    
    def generate_investment_thesis(self, config: StartupDueDiligenceConfig) -> Optional[str]:
        """Genera tesis de inversión basada en el research"""
        print("📋 Generando tesis de inversión...")
        
        if not self.research_data:
            print("❌ No hay datos de investigación disponibles")
            return None
        
        system_prompt = """Eres un General Partner de un fondo de VC tier-1. Tu trabajo es sintetizar 
        research de due diligence en una tesis de inversión clara y accionable para el investment committee."""
        
        research_context = "\n\n".join([
            f"=== {section.upper()} ===\n{content}" 
            for section, content in self.research_data.items()
        ])
        
        user_prompt = f"""
        Basándote en el siguiente due diligence research para {config.industry} en {config.country} ({config.startup_stage}), 
        crea una INVESTMENT THESIS profesional para presentar al investment committee:
        
        {research_context}
        
        La INVESTMENT THESIS debe incluir:
        
        1. EXECUTIVE SUMMARY (2-3 párrafos):
        - Oportunidad de inversión principal
        - Thesis statement clave
        - Expected returns y timeline
        
        2. MARKET OPPORTUNITY (Bull Case):
        - TAM/SAM/SOM sizing
        - Market timing y catalysts
        - Growth projections
        
        3. COMPETITIVE POSITIONING:
        - Competitive moats identificados
        - Differentiation opportunities
        - Defensive strategies
        
        4. KEY SUCCESS FACTORS:
        - Critical factores para éxito
        - Execution requirements
        - Milestones clave
        
        5. RISK ASSESSMENT:
        - Top 3-5 riesgos materiales
        - Mitigation strategies
        - Deal-breaker risks
        
        6. INVESTMENT RATIONALE:
        - Por qué invertir AHORA
        - Expected exit scenarios
        - Return multiple expectations
        
        7. NEXT STEPS:
        - Due diligence adicional requerida
        - Key questions para management
        - Timeline para decisión
        
        Mantén un tono ANALÍTICO y DIRECTO, enfocado en RETORNOS y RIESGOS.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        result = self._make_request(messages)
        if result:
            self.research_data['investment_thesis'] = result
        return result
    
    def conduct_full_due_diligence(self, config: StartupDueDiligenceConfig) -> Dict[str, str]:
        """Conduce due diligence completo"""
        print(f"🚀 Iniciando Due Diligence Research")
        print(f"📊 Industry: {config.industry}")
        print(f"🌍 Country: {config.country}")
        print(f"🎯 Stage: {config.startup_stage}")
        print(f"📅 Year: {config.year}")
        print("=" * 60)
        
        results = {}
        
        # 1. Market Opportunity
        if 'market' in config.focus_areas:
            market_opportunity = self.research_market_opportunity(config)
            if market_opportunity:
                results['market_opportunity'] = market_opportunity
            time.sleep(2)
        
        # 2. Competitive Landscape
        if 'competition' in config.focus_areas:
            competitive_landscape = self.research_competitive_landscape(config)
            if competitive_landscape:
                results['competitive_landscape'] = competitive_landscape
            time.sleep(2)
        
        # 3. Regulatory Risks
        if 'regulatory' in config.focus_areas:
            regulatory_risks = self.research_regulatory_risks(config)
            if regulatory_risks:
                results['regulatory_risks'] = regulatory_risks
            time.sleep(2)
        
        # 4. Investment Risks
        if 'risks' in config.focus_areas:
            investment_risks = self.research_investment_risks(config)
            if investment_risks:
                results['investment_risks'] = investment_risks
            time.sleep(2)
        
        # 5. Strategic Opportunities
        if 'opportunities' in config.focus_areas:
            strategic_opportunities = self.research_strategic_opportunities(config)
            if strategic_opportunities:
                results['strategic_opportunities'] = strategic_opportunities
            time.sleep(2)
        
        # 6. Investment Thesis
        investment_thesis = self.generate_investment_thesis(config)
        if investment_thesis:
            results['investment_thesis'] = investment_thesis
        
        return results
    
    def save_markdown_report(self, config: StartupDueDiligenceConfig, output_file: str = None):
        """Guarda reporte en markdown"""
        if not self.research_data:
            print("❌ No hay datos para guardar")
            return
        
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_industry = re.sub(r'[^\w\-_.]', '_', config.industry)
            output_file = f"due_diligence_{safe_industry}_{config.country}_{timestamp}.md"
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Due Diligence Report: {config.industry.title()} - {config.country}\n\n")
                f.write(f"**Generated:** {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}\n\n")
                f.write(f"**Configuration:**\n")
                f.write(f"- Industry: {config.industry}\n")
                f.write(f"- Country: {config.country}\n")
                f.write(f"- Startup Stage: {config.startup_stage}\n")
                f.write(f"- Analysis Year: {config.year}\n")
                f.write(f"- Currency: {config.currency}\n\n")
                f.write("---\n\n")
                
                section_titles = {
                    'investment_thesis': '💡 Investment Thesis',
                    'market_opportunity': '📊 Market Opportunity Analysis',
                    'competitive_landscape': '🏢 Competitive Landscape',
                    'regulatory_risks': '⚖️ Regulatory Risk Assessment',
                    'investment_risks': '⚠️ Investment Risk Analysis',
                    'strategic_opportunities': '🎯 Strategic Opportunities'
                }
                
                # Orden específico - Investment Thesis primero
                section_order = [
                    'investment_thesis',
                    'market_opportunity',
                    'competitive_landscape',
                    'regulatory_risks',
                    'investment_risks',
                    'strategic_opportunities'
                ]
                
                for section_key in section_order:
                    if section_key in self.research_data:
                        title = section_titles.get(section_key, section_key.title())
                        f.write(f"## {title}\n\n")
                        f.write(f"{self.research_data[section_key]}\n\n")
                        f.write("---\n\n")
            
            print(f"✅ Markdown report saved: {output_file}")
            return output_file
            
        except Exception as e:
            print(f"❌ Error saving markdown: {e}")
            return None
    
    def generate_simple_pdf(self, config: StartupDueDiligenceConfig, output_file: str = None) -> Optional[str]:
        """Genera PDF simple con solo texto"""
        if not self.research_data:
            print("❌ No hay datos para generar PDF")
            return None
        
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_industry = re.sub(r'[^\w\-_.]', '_', config.industry)
            output_file = f"due_diligence_{safe_industry}_{config.country}_{timestamp}.pdf"
        
        try:
            print("📄 Generando PDF simple...")
            
            doc = SimpleDocTemplate(
                output_file,
                pagesize=A4,
                rightMargin=50,
                leftMargin=50,
                topMargin=50,
                bottomMargin=50
            )
            
            story = []
            
            # Portada simple
            story.extend(self.pdf_generator._create_simple_cover(config))
            
            # Contenido
            section_titles = {
                'investment_thesis': 'Investment Thesis',
                'market_opportunity': 'Market Opportunity Analysis',
                'competitive_landscape': 'Competitive Landscape',
                'regulatory_risks': 'Regulatory Risk Assessment',
                'investment_risks': 'Investment Risk Analysis',
                'strategic_opportunities': 'Strategic Opportunities'
            }
            
            section_order = [
                'investment_thesis',
                'market_opportunity',
                'competitive_landscape',
                'regulatory_risks',
                'investment_risks',
                'strategic_opportunities'
            ]
            
            for section_key in section_order:
                if section_key in self.research_data:
                    title = section_titles.get(section_key, section_key.title())
                    content = self.research_data[section_key]
                    
                    section_elements = self.pdf_generator._format_simple_section(content, title)
                    story.extend(section_elements)
                    
                    # Page break entre secciones principales
                    if section_key != section_order[-1]:
                        story.append(PageBreak())
            
            doc.build(story)
            
            print(f"✅ Simple PDF generated: {output_file}")
            return output_file
            
        except Exception as e:
            print(f"❌ Error generating PDF: {e}")
            import traceback
            traceback.print_exc()
            return None

# Ejemplo de uso para Due Diligence
def main():
    # Configuración para due diligence
    API_KEY = "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"
    
    # Crear investigador de due diligence
    researcher = StartupDueDiligenceResearcher(API_KEY)
    
    # Configurar análisis específico para startup
    config = StartupDueDiligenceConfig(
        industry="fintech",  # o "logistics", "healthtech", etc.
        country="Colombia",
        startup_stage="Series A",  # Pre-seed, Seed, Series A, Series B
        year="2024",
        currency="USD",
        focus_areas=['market', 'competition', 'regulatory', 'risks', 'opportunities']
    )
    
    # Realizar due diligence completo
    results = researcher.conduct_full_due_diligence(config)
    
    # Mostrar resultados resumidos
    print("\n" + "=" * 80)
    print("🎯 DUE DILIGENCE COMPLETED")
    print("=" * 80)
    
    for section, content in results.items():
        print(f"\n{'=' * 15} {section.upper()} {'=' * 15}")
        # Mostrar solo los primeros 300 caracteres
        preview = content[:300]
        print(preview + "..." if len(content) > 300 else preview)
    
    # Guardar reportes
    markdown_file = researcher.save_markdown_report(config)
    pdf_file = researcher.generate_simple_pdf(config)
    
    print(f"\n✅ Due Diligence completado exitosamente")
    print(f"📁 Secciones analizadas: {len(results)}")
    if markdown_file:
        print(f"📝 Markdown: {markdown_file}")
    if pdf_file:
        print(f"📄 PDF: {pdf_file}")

# Función auxiliar para análisis rápido por sector
def quick_sector_analysis(industry: str, country: str = "Colombia", stage: str = "Series A"):
    """Función helper para análisis rápido de sector"""
    API_KEY = "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"
    
    researcher = StartupDueDiligenceResearcher(API_KEY)
    
    config = StartupDueDiligenceConfig(
        industry=industry,
        country=country,
        startup_stage=stage,
        focus_areas=['market', 'competition', 'risks']  # Análisis más rápido
    )
    
    print(f"🔍 Análisis rápido: {industry} en {country} ({stage})")
    results = researcher.conduct_full_due_diligence(config)
    
    # Solo generar markdown para análisis rápido
    markdown_file = researcher.save_markdown_report(config)
    
    return results, markdown_file

# Función para comparar múltiples sectores
def compare_sectors(sectors: List[str], country: str = "Colombia", stage: str = "Series A"):
    """Compara múltiples sectores para identificar mejores oportunidades"""
    API_KEY = "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"
    
    researcher = StartupDueDiligenceResearcher(API_KEY)
    comparison_results = {}
    
    for sector in sectors:
        print(f"\n🔄 Analizando sector: {sector}")
        
        config = StartupDueDiligenceConfig(
            industry=sector,
            country=country,
            startup_stage=stage,
            focus_areas=['market', 'competition']  # Solo lo esencial para comparación
        )
        
        # Análisis enfocado solo en market opportunity
        market_analysis = researcher.research_market_opportunity(config)
        competitive_analysis = researcher.research_competitive_landscape(config)
        
        comparison_results[sector] = {
            'market_opportunity': market_analysis,
            'competitive_landscape': competitive_analysis
        }
        
        time.sleep(3)  # Rate limiting entre sectores
    
    # Generar reporte comparativo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    comparison_file = f"sector_comparison_{country}_{timestamp}.md"
    
    try:
        with open(comparison_file, 'w', encoding='utf-8') as f:
            f.write(f"# Sector Comparison Analysis: {country}\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%B %d, %Y')}\n")
            f.write(f"**Sectors Analyzed:** {', '.join(sectors)}\n")
            f.write(f"**Stage Focus:** {stage}\n\n")
            f.write("---\n\n")
            
            for sector, data in comparison_results.items():
                f.write(f"## {sector.title()}\n\n")
                
                if data['market_opportunity']:
                    f.write(f"### Market Opportunity\n")
                    f.write(f"{data['market_opportunity']}\n\n")
                
                if data['competitive_landscape']:
                    f.write(f"### Competitive Landscape\n")
                    f.write(f"{data['competitive_landscape']}\n\n")
                
                f.write("---\n\n")
        
        print(f"✅ Sector comparison saved: {comparison_file}")
        
    except Exception as e:
        print(f"❌ Error saving comparison: {e}")
    
    return comparison_results

# Configuraciones predefinidas para sectores comunes
SECTOR_CONFIGS = {
    "fintech": {
        "focus_areas": ['market', 'competition', 'regulatory', 'risks'],
        "key_metrics": ["TAM", "Regulatory Risk", "Competition Intensity", "Funding Activity"]
    },
    "healthtech": {
        "focus_areas": ['market', 'regulatory', 'risks', 'opportunities'],
        "key_metrics": ["Market Size", "Regulatory Complexity", "R&D Requirements", "Exit Potential"]
    },
    "edtech": {
        "focus_areas": ['market', 'competition', 'opportunities'],
        "key_metrics": ["Market Growth", "User Acquisition", "Monetization", "Scalability"]
    },
    "logistics": {
        "focus_areas": ['market', 'competition', 'risks'],
        "key_metrics": ["Market Fragmentation", "Capital Requirements", "Network Effects", "Unit Economics"]
    },
    "ecommerce": {
        "focus_areas": ['market', 'competition', 'opportunities'],
        "key_metrics": ["Market Penetration", "Competition", "Customer Acquisition", "Retention"]
    },
    "proptech": {
        "focus_areas": ['market', 'regulatory', 'risks'],
        "key_metrics": ["Real Estate Market", "Regulatory Environment", "Capital Intensity", "Adoption Rate"]
    }
}

def analyze_predefined_sector(sector_key: str, country: str = "Colombia", stage: str = "Series A"):
    """Analiza un sector usando configuración predefinida"""
    if sector_key not in SECTOR_CONFIGS:
        print(f"❌ Sector '{sector_key}' no está en configuraciones predefinidas")
        print(f"Sectores disponibles: {list(SECTOR_CONFIGS.keys())}")
        return None
    
    API_KEY = "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"
    researcher = StartupDueDiligenceResearcher(API_KEY)
    
    sector_config = SECTOR_CONFIGS[sector_key]
    
    config = StartupDueDiligenceConfig(
        industry=sector_key,
        country=country,
        startup_stage=stage,
        focus_areas=sector_config['focus_areas']
    )
    
    print(f"🎯 Analizando {sector_key} con configuración optimizada")
    print(f"📊 Key metrics: {', '.join(sector_config['key_metrics'])}")
    
    results = researcher.conduct_full_due_diligence(config)
    
    # Generar ambos reportes
    markdown_file = researcher.save_markdown_report(config)
    pdf_file = researcher.generate_simple_pdf(config)
    
    return results, markdown_file, pdf_file

if __name__ == "__main__":
    # Ejemplos de uso:
    
    # 1. Análisis completo de un sector
    print("🚀 OPCIÓN 1: Análisis completo")
    main()
    
    # 2. Análisis rápido de fintech
    print("\n🚀 OPCIÓN 2: Análisis rápido de fintech")
    # quick_results, quick_file = quick_sector_analysis("fintech", "México", "Seed")
    
    # 3. Comparación de múltiples sectores
    print("\n🚀 OPCIÓN 3: Comparación de sectores")
    # sectors_to_compare = ["fintech", "healthtech", "edtech"]
    # comparison = compare_sectors(sectors_to_compare, "Colombia", "Series A")
    
    # 4. Análisis con configuración predefinida
    print("\n🚀 OPCIÓN 4: Análisis con configuración predefinida")
    # predefined_results = analyze_predefined_sector("fintech", "Colombia", "Series A")
