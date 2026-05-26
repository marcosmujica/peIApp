import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AI_RUBROS_GASTOS, AI_RUBROS_INGRESOS } from './rubros.constants';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.logger.log(`AIService initialized with API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    }
  }

  async predictRubro(description: string, type: 'income' | 'expense', allowedRubros?: any[]): Promise<string | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;

    try {
      const rubros = (allowedRubros && allowedRubros.length > 0) ? allowedRubros : (type === 'income' ? AI_RUBROS_INGRESOS : AI_RUBROS_GASTOS);
      const rubroList = rubros.map((r: any) => `${r.id} (${r.label || r.id})`).join(', ');

      const prompt = `Clasifica esta descripción de transacción financiera seleccionando el ID que mejor corresponda de la siguiente lista estricta.

LISTA DE IDS VÁLIDOS:
${rubroList}

Descripción a clasificar: "${description}"
Tipo: ${type === 'income' ? 'Ingreso' : 'Egreso'}

Reglas CRÍTICAS:
1. Devuelve ÚNICAMENTE uno de los IDs exactos de la lista anterior.
2. NUNCA inventes un ID que no esté en la lista. Si dudas, elige el más genérico (ej: "otros_ing").
3. No incluyas puntuación, comillas, ni explicaciones. Solo el ID literal.`;

      this.logger.debug(`[AIService] Predicting for: "${description}" using Gemini...`);

      const startTime = Date.now();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        }),
      });

      const delay = (Date.now() - startTime) / 1000;

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}));
        const status = response.status;
        
        if (status === 429) {
          this.logger.error('[AIService] Quota exceeded (429). The new API key is being rate-limited by Google.');
        } else if (status === 404) {
          this.logger.error('[AIService] Model not found (404). Trying fallback model...');
          // Fallback final a gemini-1.5-flash
          return this.fallbackPredict(prompt, apiKey, rubros);
        } else {
          this.logger.error(`[AIService] Gemini API error (${status}): ${JSON.stringify(errData)}`);
        }
        
        await this.logIARequest(prompt, `HTTP ERROR ${status}: ${JSON.stringify(errData)}`, 0, 'FAILURE', delay);
        
        return null;
      }

      const data: any = await response.json();
      const totalTokens = data.usageMetadata?.totalTokenCount || 0;
      const cleanResponse = this.processResponse(data, rubros);
      
      await this.logIARequest(prompt, JSON.stringify(data), totalTokens, cleanResponse, delay);
      
      return cleanResponse;

    } catch (err: any) {
      this.logger.error(`[AIService] FATAL Error: ${err.message}`);
      await this.logIARequest(description, `ERROR: ${err.message}`, 0, 'ERROR', 0);
      return null;
    }
  }

  private async fallbackPredict(prompt: string, apiKey: string, rubros: any[]): Promise<string | null> {
    try {
      const startTime = Date.now();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                temperature: 0.1, 
                maxOutputTokens: 500
            }
        }),
      });
      const delay = (Date.now() - startTime) / 1000;

      if (response.ok) {
          const data: any = await response.json();
          const totalTokens = data.usageMetadata?.totalTokenCount || 0;
          const cleanResponse = this.processResponse(data, rubros);
          
          await this.logIARequest(prompt, JSON.stringify(data), totalTokens, cleanResponse, delay);
          
          return cleanResponse;
      }
      
      const errData = await response.json().catch(() => ({}));
      await this.logIARequest(prompt, `FALLBACK ERROR ${response.status}: ${JSON.stringify(errData)}`, 0, 'FAILURE', delay);
      
      return null;
    } catch {
      return null;
    }
  }

  private processResponse(data: any, rubros: any[]): string | null {
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) return null;

    this.logger.log(`[AIService] RAW response from Gemini: "${rawText}"`);
    let cleanText = rawText.toLowerCase().replace(/[^a-z0-9_]/g, '');
    let found = rubros.find(r => r.id === cleanText);
    
    if (!found) {
        found = rubros.find((r: any) => r.id.startsWith(cleanText) || cleanText.startsWith(r.id));
    }
    
    if (!found) {
        found = rubros.find((r: any) => r.id.includes('otro') || r.id.includes('varios'));
    }

    if (found) {
      this.logger.log(`[AIService] Success! Identified rubro ID: "${found.id}"`);
      return found.id;
    }
    return null;
  }

  async askWalletQuestion(walletData: any, userData: any, question: string): Promise<string | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    // if (!apiKey) return "Servicio de IA no disponible en este momento."; // Removido por pedido de no usar Gemini directo

    try {
      this.logger.log(`[AIService] Starting PG_IA_QUERY for: "${question}"`);
      
      const startTime = Date.now();
      // Llamar directamente a la función de la base de datos
      const walletId = walletData.walletId || walletData.id;
      const userId = userData.userId || userData.id;

      const results = await this.dataSource.query('SELECT pg_ia_query($1, $2, $3) as result', [question, walletId, userId]);
      const delay = (Date.now() - startTime) / 1000;
      
      const dbResult = results[0]?.result;
      const answer = dbResult?.answer || "No se obtuvo respuesta del sistema de base de datos.";
      const executedSql = dbResult?.sql || "SELECT pg_ia_query(...)";

      // Log the Query details including internal SQL
      await this.logIAQuery(question, executedSql, dbResult, delay);

      return answer;

    } catch (err) {
      this.logger.error(`[AIService] Error in askWalletQuestion (pg_ia_query): ${err.message}`);
      await this.logIARequest(question, `DB FATAL ERROR: ${err.message}`, 0, 'ERROR', 0);
      return "Hubo un error al procesar la consulta en la base de datos.";
    }
  }

  /**
   * Registra las consultas relizadas mediante pg_ia_query (vía DB)
   */
  private async logIAQuery(question: string, sql: string, results: any, delay: number) {
    try {
      const logFile = path.resolve(process.cwd(), 'logs', 'ia-query.log');
      const logDir = path.dirname(logFile);
      if (!require('fs').existsSync(logDir)) {
        require('fs').mkdirSync(logDir, { recursive: true });
      }
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        delay,
        solicitado: question,
        consulta: sql,
        respuesta_db: results
      };
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      this.logger.warn(`Could not write to ia-query.log: ${err.message}`);
    }
  }

  // pg_ia_query anterior removido para usar la función nativa de Postgres
  /*
  private async pg_ia_query(question: string, walletId: string, ownerId: string): Promise<any[]> {
     ...
  }
  */

  private async retryWithV1(prompt: string, apiKey: string): Promise<string> {
    try {
      const startTime = Date.now();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        }),
      });
      const delay = (Date.now() - startTime) / 1000;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        this.logger.error(`[AIService] Gemini API error in retryWithV1 (${response.status}): ${JSON.stringify(errData)}`);
        
        await this.logIARequest(prompt, `RETRY HTTP ERROR ${response.status}: ${JSON.stringify(errData)}`, 0, 'FAILURE', delay);

        return "No se pudo conectar con los servicios de IA (v1).";
      }
      const data: any = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Respuesta vacía de la IA.";
      const totalTokens = data.usageMetadata?.totalTokenCount || 0;

      await this.logIARequest(prompt, JSON.stringify(data), totalTokens, answer, delay);

      return answer;
    } catch (err) {
      await this.logIARequest(prompt, `RETRY FATAL ERROR: ${err.message}`, 0, 'ERROR', 0);
      return "Error de conexión con la IA.";
    }
  }

  private async logIARequest(prompt: string, fullResponse: string, tokens: number, result: string | null, delay: number) {
    try {
      const logFile = path.resolve(process.cwd(), 'logs', 'ia-request.log');
      const logDir = path.dirname(logFile);
      if (!require('fs').existsSync(logDir)) {
        require('fs').mkdirSync(logDir, { recursive: true });
      }
      const timestamp = new Date().toISOString();
      const saldo = 0; // Se puede integrar con una lógica de cuotas/créditos real
      
      const logEntry = {
        timestamp,
        delay,
        prompt: prompt.replace(/\n/g, ' '),
        response: fullResponse.substring(0, 500), // Evitamos logs gigantescos
        result: result || 'N/A',
        tokens,
        saldo
      };

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      this.logger.warn(`Could not write to ia-request.log: ${err.message}`);
    }
  }
}
