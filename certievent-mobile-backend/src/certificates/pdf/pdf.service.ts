import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Injectable()
export class PdfService {
  async gerarCertificado(
    fullName: string,
    eventName: string,
    eventDate: string,
    certificateId: string,
  ): Promise<Buffer> {
    
    // Localiza e lê o arquivo de template HTML do certificado
    const templatePath = path.join(
      __dirname,
      '..',
      'templates',
      'certificado.hbs',
    );
    const templateStr = fs.readFileSync(templatePath, 'utf8');

    // Compila o template com o Handlebars e injeta os dados recebidos
    const template = handlebars.compile(templateStr);
    const html = template({
      nome: fullName,
      evento: eventName,
      data: eventDate,
      certificadoId: certificateId,
    });

    // Inicia o navegador Puppeteer em segundo plano com suporte a Docker
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      // Abre uma nova aba, define o conteúdo HTML e aguarda o carregamento
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      // Gera o PDF no formato A4 paisagem com margens e fundo impressos
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });

      return pdfBuffer as Buffer;
    } finally {
      // Fecha o navegador para liberar recursos e evitar vazamentos de memória
      await browser.close();
    }
  }
}