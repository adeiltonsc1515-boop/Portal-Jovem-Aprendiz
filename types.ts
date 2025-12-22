
export type UserRole = 'aprendiz' | 'empresa' | 'ministerio' | null;

export interface User {
  nome: string;
  identificacao: string;
  senha: string;
  role: UserRole;
  empresa?: string; // Campo para vincular o local de trabalho
}

export interface Company {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  unidade: string;
  endereco: string;
  cidade: string;
}

export interface ProtocolData {
  id: string;
  tipo: string;
  motivo: string;
  local: string;
  horario: string;
  empresa: string;
  descricao: string;
  dataCriacao: Date;
}
