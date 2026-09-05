export interface CorPaleta {
  chave: string;
  rotulo: string;
  hex: string;
}

// Paleta fechada de cores para coleções — evita um color picker livre (ver
// docs/data-model.md, "collections"). `chave` é o valor salvo em `collections.color`.
export const PALETA_CORES_COLECAO: CorPaleta[] = [
  { chave: 'vermelho', rotulo: 'Vermelho', hex: '#e5484d' },
  { chave: 'laranja', rotulo: 'Laranja', hex: '#f76b15' },
  { chave: 'amarelo', rotulo: 'Amarelo', hex: '#ffd60a' },
  { chave: 'verde', rotulo: 'Verde', hex: '#30a46c' },
  { chave: 'azul', rotulo: 'Azul', hex: '#0090ff' },
  { chave: 'roxo', rotulo: 'Roxo', hex: '#8e4ec6' },
  { chave: 'rosa', rotulo: 'Rosa', hex: '#d6409f' },
  { chave: 'cinza', rotulo: 'Cinza', hex: '#8b8d98' },
];
