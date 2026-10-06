<p align="center">
  <img src="src/assets/icon2.png" width="110" alt="Logótipo da View-App" />
</p>

<h1 align="center">View-App</h1>

<p align="center">
  Aplicação móvel para descobrir e acompanhar filmes e séries.<br />
  Tendências, calendário de estreias, listas pessoais e recomendações à tua medida.
</p>

<!--
## Capturas de ecrã

Coloca as imagens em docs/screenshots/ e remove este comentário.

<p align="center">
  <img src="docs/screenshots/home.png" width="200" alt="Início" />
  <img src="docs/screenshots/titulo.png" width="200" alt="Detalhe do título" />
  <img src="docs/screenshots/calendario.png" width="200" alt="Calendário" />
  <img src="docs/screenshots/perfil.png" width="200" alt="Perfil" />
</p>
-->

## Sobre o projeto

A View-App junta num só sítio o que há para ver e o que já viste. Os dados de filmes, séries e atores vêm da API do TMDB, e a conta de cada utilizador (listas, avaliações, preferências e foto de perfil) fica guardada no Firebase.

Projeto académico de Engenharia Informática.

## Funcionalidades

**Conta**
- Registo e login por email, com verificação de email obrigatória
- Recuperação e alteração de password
- Perfil com nome e foto editáveis, e eliminação de conta

**Descoberta**
- Página inicial com tendências da semana e secções por género
- Pesquisa de filmes, séries e atores
- Página de título com sinopse, elenco e críticas
- Página de ator com a respetiva filmografia

**Acompanhamento**
- Favoritos, watchlist e lista de vistos, sincronizados com a conta
- Avaliação de títulos
- Calendário de estreias, com notificações locais para os títulos subscritos

**Personalização**
- Escolha de géneros preferidos no primeiro arranque
- Recomendações com base nesses géneros
- Tema claro e escuro
- Chatbot de recomendações (opcional, precisa de um backend próprio)

## Tecnologias

| Área | Stack |
|---|---|
| App | React Native 0.81, Expo SDK 54, TypeScript |
| Interface | NativeWind (Tailwind CSS), React Navigation 7 |
| Autenticação e dados | Firebase Authentication, Cloud Firestore |
| Catálogo | [TMDB API](https://developer.themoviedb.org/) |
| Notificações | expo-notifications |
| Chatbot | FastAPI e Ollama (Llama 3.2), fora deste repositório |

## Como correr localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- Um projeto [Firebase](https://console.firebase.google.com/) com **Authentication** (email/password) e **Cloud Firestore** ativos
- Uma conta [TMDB](https://www.themoviedb.org/settings/api), para obter o *API Read Access Token*
- Um dispositivo ou emulador Android, ou um Mac com Xcode para iOS

### 1. Instalar

```bash
git clone https://github.com/joelfgaspar10/view-app.git
cd view-app
npm install
```

### 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

| Variável | Onde obter |
|---|---|
| `EXPO_PUBLIC_TMDB_API_KEY` | TMDB, em *Settings > API > API Read Access Token* |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase, em *Project settings > General > Your apps* |
| `EXPO_PUBLIC_CHAT_API_URL` | Endereço do backend do chatbot (opcional) |

As variáveis `EXPO_PUBLIC_*` ficam incluídas na aplicação compilada. Protege o projeto Firebase com regras de segurança (ver abaixo) e não uses aqui chaves com permissões de escrita ou de administração.

### 3. Adicionar os ficheiros do Firebase

Descarrega da consola do Firebase e coloca na raiz do projeto:

- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

Ambos estão no `.gitignore` e não devem ser enviados para o repositório.

### 4. Compilar e arrancar

O projeto usa `expo-dev-client`, por isso precisa de uma *development build* instalada no dispositivo:

```bash
npx expo run:android      # build local, requer Android Studio
npx expo run:ios          # build local, requer macOS e Xcode
```

Em alternativa, com o [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
eas build --profile development --platform android
```

Com a build instalada, arranca o servidor de desenvolvimento:

```bash
npx expo start
```

## Firestore

A app usa as seguintes coleções:

| Caminho | Conteúdo |
|---|---|
| `users/{uid}` | Nome, géneros preferidos e foto de perfil |
| `users/{uid}/favorites` | Títulos favoritos |
| `users/{uid}/watchlist` | Títulos para ver |
| `users/{uid}/watched` | Títulos vistos |
| `users/{uid}/ratings` | Avaliações |
| `profileImages/{uid}` | Foto de perfil em Base64 |
| `deviceTokens/{uid}` | Tokens de notificações push |

Exemplo de regras que limitam cada utilizador aos seus próprios dados:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /profileImages/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /deviceTokens/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Chatbot (opcional)

O ecrã de chat envia as mensagens para um backend FastAPI com Ollama, que não faz parte deste repositório. A configuração está descrita em [docs/CHATBOT-BACKEND.md](docs/CHATBOT-BACKEND.md). Sem esse backend, o resto da aplicação funciona normalmente.

## Estrutura do projeto

```
App.tsx               Ponto de entrada: providers, autenticação e notificações
FirebaseConfig.ts     Inicialização do Firebase a partir do .env
src/
  assets/             Imagens, ícones e vídeo de splash
  components/         Componentes reutilizáveis
  contexts/           Estado global: favoritos, watchlist, vistos, avaliações, notificações, tema
  hooks/              Hooks de dados (recomendações, foto de perfil)
  navigation/         Navegação por stack e por separadores
  screens/            Ecrãs da aplicação
  services/           TMDB, chat, notificações e upload de imagens
  types/              Tipos TypeScript
  utils/              Funções utilitárias
docs/                 Documentação adicional
```

## Créditos e avisos

- Este produto usa a API do TMDB mas não é endossado nem certificado pelo TMDB.
- As imagens de filmes e séries usadas como fundo e como exemplo pertencem aos respetivos detentores de direitos e servem apenas fins de demonstração académica.
