/*
 * =============================================================================
 * PRODUCTION SECURITY NOTE
 * =============================================================================
 * This service communicates directly with the Google Gemini API from the client-side.
 * This requires the API_KEY to be available in the browser, which is a major security risk.
 * Anyone could inspect the browser's network traffic and steal your API key,
 * leading to unauthorized use and potential high costs.
 *
 * For a real online application, these API calls MUST be proxied through your own backend server.
 * The flow should be:
 * 1. Frontend -> Your Backend API (e.g., POST /api/generate-insights)
 * 2. Your Backend API -> Google Gemini API (using the securely stored API key)
 * 3. Google Gemini API -> Your Backend API
 * 4. Your Backend API -> Frontend
 *
 * This ensures the API key is never exposed to the public. The `GEMINI_API_PROXY_URL`
 * in `config.ts` is a placeholder for your backend endpoint.
 * =============================================================================
 */
import { GoogleGenAI, Type } from "@google/genai";
import { DashboardData, Employee, EngineeringStandard, ShiftPlan } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateDashboardInsights = async (data: DashboardData): Promise<string> => {
    const model = 'gemini-2.5-flash';

    const prompt = `
        Você é um especialista em operações de logística e gerenciamento de mão de obra de armazém.
        Analise os seguintes dados operacionais de um dashboard e forneça insights acionáveis.
        Seja conciso e foque em pontos de melhoria, gargalos potenciais e sucessos notáveis.
        Formate sua resposta usando markdown, com títulos em negrito (**Título**) e listas de itens (* item).

        **Dados do Dashboard:**
        - **Funcionários Ativos:** ${data.activeEmployees}
        - **Tarefas Concluídas Hoje (Total):** ${data.totalTasksToday} unidades
        - **Demanda Planejada Hoje (Total):** ${data.plannedTasksToday} Lines
        - **Progresso Geral da Demanda:** ${data.tasksProgress.toFixed(1)}%
        - **Eficiência Operacional (Produtividade Geral):** ${data.overallProductivity}%
        - **Demanda Diária vs. Execução por Atividade:**
        ${data.demandVsExecutionByActivity.map(p => `  - ${p.name}: Executado ${p.actual}, Planejado ${p.planned} (${p.driver})`).join('\n')}
        - **Distribuição de Funcionários:**
        ${data.employeeDistribution.map(d => `  - ${d.name}: ${d.value} funcionário(s)`).join('\n')}

        **Análise Solicitada:**
        1.  **Análise de Progresso da Demanda:** Compare as quantidades executadas com as planejadas para cada atividade. Quais atividades estão adiantadas e quais estão atrasadas em relação à meta diária?
        2.  **Pontos Fortes:** Identifique as atividades que mais se aproximaram ou superaram a demanda planejada.
        3.  **Pontos de Melhoria:** Identifique as atividades mais distantes de atingir a demanda. Sugira possíveis causas (ex: falta de pessoal, gargalos no processo, necessidade de treinamento).
        4.  **Sugestão Estratégica:** Dê uma recomendação geral para otimizar o cumprimento da demanda diária com base nos dados.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Falha ao comunicar com a API Gemini. Verifique a chave de API e a configuração.");
    }
};

export const generateShiftPlan = async (employees: Employee[], standards: EngineeringStandard[]): Promise<ShiftPlan> => {
    const model = 'gemini-2.5-flash';

    const headcountDemand = standards.reduce((acc, s) => {
        if (!acc[s.activity]) {
            acc[s.activity] = 0;
        }
        acc[s.activity] += s.headcounts;
        return acc;
    }, {} as Record<string, number>);

    const prompt = `
        Você é um sistema especialista em planejamento de turnos para um centro de distribuição logístico.
        Sua tarefa é criar um plano de trabalho semanal (Segunda a Sexta) para uma equipe de funcionários.

        **Regras e Restrições:**
        1.  O plano deve cobrir 5 dias: Segunda, Terça, Quarta, Quinta, Sexta.
        2.  Cada funcionário deve trabalhar 5 dias, a menos que o número de funcionários exceda a demanda total. Se houver excesso de pessoal, atribua "Folga" para balancear a carga.
        3.  Priorize a alocação de funcionários para suas atividades principais, conforme listado nos dados dos funcionários.
        4.  Garanta que a demanda diária de headcount para cada atividade seja atendida. Se a demanda for maior que o número de funcionários com essa atividade principal, aloque funcionários de outras áreas (realocação).
        5.  Distribua as folgas de forma justa entre os funcionários, se aplicável.
        6.  O resultado DEVE ser um objeto JSON válido que corresponda ao esquema fornecido.

        **Dados de Entrada:**

        **1. Lista de Funcionários e suas Atividades Principais:**
        {/* FIX: The Employee type has an 'activities' array. Joining them to list all specialties. */}
        ${employees.map(e => `- ${e.name} (Especialidade: ${e.activities.join(', ')})`).join('\n')}

        **2. Demanda Diária de Headcount por Atividade:**
        ${Object.entries(headcountDemand).map(([activity, count]) => `- ${activity}: ${count} funcionários`).join('\n')}

        **Exemplo de Saída Esperada:**
        A saída deve ser um array de objetos, onde cada objeto representa um funcionário e seu cronograma para a semana.
        [
          {
            "employeeName": "João Silva",
            "schedule": {
              "Segunda": "Picking",
              "Terça": "Picking",
              "Quarta": "Picking",
              "Quinta": "Picking",
              "Sexta": "Folga"
            }
          },
          ...
        ]

        Gere o plano de turnos em formato JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            employeeName: { type: Type.STRING },
                            schedule: {
                                type: Type.OBJECT,
                                properties: {
                                    Segunda: { type: Type.STRING },
                                    Terça: { type: Type.STRING },
                                    Quarta: { type: Type.STRING },
                                    Quinta: { type: Type.STRING },
                                    Sexta: { type: Type.STRING },
                                },
                                required: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
                            }
                        },
                        required: ["employeeName", "schedule"]
                    }
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as ShiftPlan;

    } catch (error) {
        console.error("Error calling Gemini API for shift plan:", error);
        throw new Error("Falha ao gerar o plano de turnos com a API Gemini.");
    }
};

export const identifyEmployeeByFace = async (frameDataUrl: string, employees: Employee[]): Promise<string | null> => {
    const model = 'gemini-2.5-flash';

    const employeesWithPhotos = employees.filter(e => e.photo);
    if (!frameDataUrl || employeesWithPhotos.length === 0) {
        return null;
    }

    const getBase64 = (dataUrl: string) => dataUrl.split(',')[1];

    const contents = {
        parts: [
            { text: `
                You are a facial recognition system. Your task is to identify which registered employee appears in the first image (the "live frame").
                Compare the face in the live frame with the subsequent employee images.
                Return a JSON object with the key "employeeId". The value should be the ID of the matching employee.
                If there is a clear match, provide their employeeId string.
                If there is no confident match, or if no face is visible, the value for "employeeId" must be null.
                Only return the raw JSON object. Example of no match: {"employeeId": null}.
            `},
            { inlineData: { mimeType: 'image/jpeg', data: getBase64(frameDataUrl) } },
            ...employeesWithPhotos.flatMap(emp => [
                { text: `This is employee with ID: ${emp.id}` },
                { inlineData: { mimeType: 'image/jpeg', data: getBase64(emp.photo!) } }
            ])
        ]
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) {
            console.error("Gemini API returned an empty response for face identification.");
            return null;
        }

        const cleanResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanResponse);
        return result.employeeId || null;

    } catch (error) {
        console.error("Error calling Gemini API for face identification:", error);
        return null;
    }
};
