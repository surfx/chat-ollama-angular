import { Message } from "ollama";

export interface Configuracoes {
    id: string;
    ollama_api: string;
    configuracoes: ConfiguracoesClass;
    configuracoesRAG: ConfiguracoesRAG;
}

export default function getDefaultPartialConfig(): Partial<Configuracoes> {
    return {
        configuracoes: {
            modo: 'rag', temperatura: 0.7
        },
        configuracoesRAG: {
            urlServico: 'http://127.0.0.1:5000/',
            lang: 'por',
            persistDbDirectory: '/home/emerson/projetos/chat-ollama-angular/db', // faiss
            uploadPathTemp: '/home/emerson/projetos/chat-ollama-angular/temp', // upload temp
            localModel: 'deepseek-r1', // ex: deepseek-r1 | llama3.2
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
    persistDbDirectory: string; // faiss
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
