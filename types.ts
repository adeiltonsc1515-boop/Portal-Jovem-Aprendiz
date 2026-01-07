
export type UserRole = 'aprendiz' | 'empresa' | 'ministerio' | null;

export interface User {
  nome: string;
  email: string;
  identificacao: string;
  senha: string;
  role: UserRole;
  empresa?: string;
  cnpj?: string;
  nomeEmpresa?: string;
  logo?: string; // Armazena a imagem em Base64
}

export interface Company {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  unidade: string;
  endereco: string;
  cidade: string;
}

export type ProtocolStatus = 'Recebido' | 'Em Análise' | 'Concluído' | 'Arquivado';

export interface ProtocolData {
  id: string;
  tipo: string;
  motivo: string;
  local?: string;
  horario?: string;
  empresa: string;
  descricao: string;
  dataCriacao: string | Date;
  status?: ProtocolStatus;
  usuario_email?: string;
}
