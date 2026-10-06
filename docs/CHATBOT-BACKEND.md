# Chatbot Backend (FastAPI + Ollama)

Este backend fornece uma API simples em **FastAPI** para integrar um chatbot com **Ollama (Llama 3.2)** na aplicação mobile (React Native + Expo).

---

## Pré-requisitos

- **Python 3.10+**
- **pip**
- **virtualenv**
- **Ollama** instalado no sistema

### Instalar Ollama (Debian/Ubuntu)

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verificar se está instalado:

```bash
ollama --version
```

Baixar o modelo Llama 3.2:

```bash
ollama pull llama3.2
```

Testar:

```bash
ollama run llama3.2 "Olá, quem és tu?"
```

---

## Configuração do Ambiente

Clonar o repositório e entrar na pasta do backend:

```bash
git clone <link-do-repo>
cd chatbot-backend
```

Criar ambiente virtual:

```bash
python3 -m venv venv
source venv/bin/activate
```

Instalar dependências:

```bash
pip install fastapi uvicorn pydantic ollama requests python-dotenv
```

---

## Rodar o Servidor

Na pasta `chatbot-backend`, executar:

```bash
uvicorn server:app --reload
```

Por default o servidor vai rodar em:

```
http://127.0.0.1:8000
```

---

## Endpoints

### `POST /chat`

Envia uma mensagem ao chatbot.

**Request:**

```json
{
  "message": "Olá, recomenda-me um filme."
}
```

**Response:**

```json
{
  "response": "Claro! Recomendo ver Inception, um filme do Christopher Nolan."
}
```

---

## Dicas

- Se não precisares mais do ambiente virtual, desativa com:

  ```bash
  deactivate
  ```

- Para rodar em rede local (e usar no telemóvel), inicia com:
  ```bash
  uvicorn server:app --reload --host <ip-local> --port 8000
  ```

---

## Integração com App (Expo)

O frontend Expo lê o endereço deste backend da variável `EXPO_PUBLIC_CHAT_API_URL` no ficheiro `.env`:

```
EXPO_PUBLIC_CHAT_API_URL=http://<ip-local>:8000
```

Substitui `<ip-local>` pelo IP da tua máquina (ex: `192.168.1.10`) e reinicia o `expo start`.
