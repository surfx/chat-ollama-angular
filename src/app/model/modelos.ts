import { Message } from "ollama";

export interface Configuracoes {
    id: string;
    ollama_api: string;
    configuracoes: ConfiguracoesClass;
    configuracoesRAG: ConfiguracoesRAG;
}

export interface ConfiguracoesClass {
    modo: 'chat' | 'generate';
    rag: boolean;
    temperatura: number;
}

export interface ConfiguracoesRAG {
    urlServico: string;
    collectionName: string;
    pathDocumentos: string;
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