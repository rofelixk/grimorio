export interface CorPaleta {
  chave: string;
  rotulo: string;
  hex: string;
}

// Paleta fechada de cores para coleções — evita um color picker livre (ver
// docs/data-model.md, "collections"). `chave` é o valor salvo em `collections.color`.
export const PALETA_CORES_COLECAO: CorPaleta[] = [
  { chave: 'vermelho', rotulo: 'Red', hex: '#e5484d' },
  { chave: 'laranja', rotulo: 'Orange', hex: '#f76b15' },
  { chave: 'amarelo', rotulo: 'Yellow', hex: '#ffd60a' },
  { chave: 'verde', rotulo: 'Green', hex: '#30a46c' },
  { chave: 'azul', rotulo: 'Blue', hex: '#0090ff' },
  { chave: 'roxo', rotulo: 'Purple', hex: '#8e4ec6' },
  { chave: 'rosa', rotulo: 'Pink', hex: '#d6409f' },
  { chave: 'cinza', rotulo: 'Gray', hex: '#8b8d98' },
];
