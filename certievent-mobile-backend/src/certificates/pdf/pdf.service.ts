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

  // Escapa caracteres HTML especiais para evitar injeção de markup em conteúdo gerado pelo usuário
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Gera um relatório PDF em formato de tabela com os dados de participações informados
  async gerarRelatorio(
    items: { name: string; event: string; status: string; date: string }[],
  ): Promise<Buffer> {
    const rows = items
      .map(
        (i) =>
          `<tr><td>${this.escapeHtml(i.name)}</td><td>${this.escapeHtml(i.event)}</td><td>${this.escapeHtml(i.status)}</td><td>${this.escapeHtml(i.date)}</td></tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background-color: #fafafa; }
  </style>
</head>
<body>
  <h1>Relatório de Participações</h1>
  <table>
    <thead>
      <tr><th>Nome</th><th>Evento</th><th>Status</th><th>Data</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      return pdfBuffer as Buffer;
    } finally {
      await browser.close();
    }
  }
}