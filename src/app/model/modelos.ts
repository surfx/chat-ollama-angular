import { Message } from "ollama";

export interface Configuracoes {
    id: string;
    ollama_api: string;
    configuracoes: ConfiguracoesClass;
}

export interface ConfiguracoesClass {
    temperatura: number;
    modo: 'chat' | 'generate';
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