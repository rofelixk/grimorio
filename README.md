# Grimorio

Aplicativo pessoal e gratuito para gerenciar coleção e decks de Magic: The Gathering, feito para o público brasileiro. Inclui sistema de localização de armazenamento físico das cartas e, futuramente, escaneamento de cartas e análise de deck. Projeto de aprendizado em IA.

## Stack

- **Angular 22** (CLI, standalone components, roteamento via `@angular/router`)
- **Capacitor 8** — empacota o mesmo código Angular como app nativo (Android e desktop via Electron), além da versão web
- **Vitest** — executor de testes unitários (via `@angular/build:unit-test`)
- **ESLint** (`angular-eslint`) — análise estática de código
- **Prettier** — formatação de código
- Sem framework de UI (Ionic, Angular Material etc.) — componentes e estilos são escritos do zero

## Requisitos

- Node.js
- npm

## Instalação

```bash
npm install
```

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Sobe o servidor de desenvolvimento (`ng serve`) |
| `npm run build` | Gera o build de produção em `dist/grimorio` |
| `npm run watch` | Build em modo desenvolvimento com rebuild automático |
| `npm test` | Roda os testes unitários (Vitest) |
| `npm run lint` | Roda o ESLint sobre `src/` |

## Estrutura do projeto

```
public/
  assets/         # imagens, ícones e outros arquivos estáticos (servidos em /assets/...)
  favicon.ico
src/
  app/
    app.ts        # componente raiz
    app.html
    app.scss
    app.routes.ts # definição das rotas
    app.config.ts # configuração da aplicação (providers)
    views/
      home/       # tela inicial, rota padrão ("/")
  index.html
  main.ts         # bootstrap da aplicação
  styles.scss     # estilos globais
capacitor.config.ts  # configuração do Capacitor (appId, appName, webDir)
angular.json          # configuração do workspace Angular (build, serve, test, lint)
eslint.config.js
```

Telas da aplicação (rotas) ficam em `src/app/views/`.

## Rodando o app nativo (Capacitor)

O `webDir` do Capacitor aponta para `dist/grimorio/browser`, gerado pelo `npm run build`. As plataformas nativas (Android, Electron) ainda não foram adicionadas ao projeto — para adicioná-las:

```bash
npm run build
npx cap add android
npx cap add @capacitor-community/electron
```

## Licença

Projeto pessoal, sem licença definida.
