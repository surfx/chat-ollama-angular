import { Message } from "ollama";

export interface Configuracoes {
    id: string;
    ollama_api: string;
    query_prompt: string;
    configuracoes: ConfiguracoesClass;
    configuracoesRAG: ConfiguracoesRAG;
}

export default function getDefaultPartialConfig(): Partial<Configuracoes> {
    return {
        id: "1",
        ollama_api: "http://localhost:11434",
        query_prompt: 'Você é um assistente de modelo de linguagem de IA. Sua tarefa é gerar respostas da pergunta do usuário fornecida para recuperar documentos relevantes de um banco de dados vetorial. Ao gerar múltiplas perspectivas sobre a pergunta do usuário, seu objetivo é ajudar o usuário a superar algumas das limitações da pesquisa de similaridade baseada em distância. Forneça sua resposta em formato markdown.', 
        configuracoes: {
            modo: 'chat', 
            temperatura: 0.7
        },
        configuracoesRAG: {
            urlServico: 'http://127.0.0.1:5000/',
            lang: 'por',
            useDb: 'Faiss',
            persistDbDirectory: '/home/emerson/projetos/chat-ollama-angular/db', // faiss
            uploadPathTemp: '/home/emerson/projetos/chat-ollama-angular/temp', // upload temp
            localModel: 'deepseek-r1:latest', // ex: deepseek-r1 | llama3.2
            embeddingModelName: 'nomic-embed-text', // ex: nomic-embed-text | llama3
            allowedExtensions: ['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'html'], // sem uso por hora
            extensoesImagens: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
        }
    };
}

export const ModosValidos = ['chat', 'generate', 'rag'];

export interface ConfiguracoesClass {
    modo: typeof ModosValidos[number]; // 'chat' | 'generate' | 'rag'
    temperatura: number;
}

export interface ConfiguracoesRAG {
    urlServico: string;
    lang: 'por' | 'eng';
    useDb: 'Faiss' | 'Chroma';
    persistDbDirectory: string; // db path
    uploadPathTemp: string; // upload temp
    localModel: string; // ex: deepseek-r1 | llama3.2
    embeddingModelName: string; // ex: nomic-embed-text | llama3
    allowedExtensions: string[]; // sem uso por hora
    extensoesImagens: string[];
}

export enum TipoMensagem {
    INFO = 'info',
    SUCESSO = 'successo',
    ALERTA = 'alerta',
    ERRO = 'erro',
    NEUTRO = 'neutro'
}


//#region chat ollama
export interface UnifiedChatResponse {
    model: string;
    created_at: Date;
    message: Message;
    done: boolean;
    done_reason: string;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
}
//#endregion

export interface StatusIndexacao {
    terminado: boolean;
    porcentagem: number;
}
