import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT || 3000;

  // Initialize Gemini API client if API key is available
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // API endpoint for AI WhatsApp message generation
  app.post('/api/generate-message', async (req, res) => {
    try {
      const { leadName, leadCompany, leadNotes, leadStatus, promptType } = req.body;

      if (!ai) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no ambiente.' });
      }

      let systemInstruction = "Você é um assistente comercial especialista em vendas consultivas e fechamento de negócios pelo WhatsApp. Responda APENAS com a mensagem pronta para envio, em português cordial, profissional e persuasivo, sem aspas e sem introduções.";
      let userPrompt = `Crie uma mensagem de WhatsApp para o lead ${leadName}`;
      if (leadCompany) userPrompt += ` da empresa ${leadCompany}`;
      if (leadStatus) userPrompt += ` que está no status "${leadStatus}"`;
      if (leadNotes) userPrompt += ` com o seguinte contexto/observações: "${leadNotes}".`;

      if (promptType === 'initial') {
        userPrompt += " A mensagem deve ser um primeiro contato amigável apresentando nossos serviços.";
      } else if (promptType === 'followup') {
        userPrompt += " A mensagem deve ser um follow-up retomando a conversa anterior sem ser invasivo.";
      } else if (promptType === 'closing') {
        userPrompt += " A mensagem deve ser focada em tirar dúvidas e incentivar o fechamento ou agendamento.";
      } else {
        userPrompt += " A mensagem deve ser personalizada e engajadora.";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const message = response.text ? response.text.trim() : 'Olá! Tudo bem? Gostaria de retomar nosso contato.';
      res.json({ message });
    } catch (error: any) {
      console.error('Erro ao gerar mensagem com IA:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar mensagem.' });
    }
  });

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Erro ao iniciar o servidor:', err);
});
