export interface Configuracoes {
    id: string;
    ollama_api: string;
    configuracoes: ConfiguracoesClass;
}

export interface ConfiguracoesClass {
    temperatura: number;
}

export enum TipoMensagem {
    INFO = 'info',
    SUCESSO = 'successo',
    ALERTA = 'alerta',
    ERRO = 'erro',
    NEUTRO = 'neutro'
}