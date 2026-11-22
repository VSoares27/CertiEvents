import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CertificateOptions {
  fullName: string;
  eventName: string;
  eventDate: string;
  certificateId: string;
  templateId?: 'moderno' | 'classico' | 'minimalista' | 'custom' | string;
  // Campos de personalização visual e textual
  instituicao?: string;
  subInstituicao?: string;
  titulo?: string;
  subtitulo?: string;
  textoPersonalizado?: string;
  cargaHoraria?: string;
  assinaturaNome?: string;
  assinaturaCargo?: string;
  assinatura2Nome?: string;
  assinatura2Cargo?: string;
  // Estilos específicos para o modelo custom
  primaryColor?: string;
  secondaryColor?: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

@Injectable()
export class PdfService {
  // Localiza dinamicamente o executável do Chrome/Chromium no ambiente
  private getBrowserExecutablePath(): string | undefined {
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const homeDir = process.env.HOME || '';
    const puppeteerCache = path.join(homeDir, '.cache', 'puppeteer');

    if (fs.existsSync(puppeteerCache)) {
      const walk = (dir: string): string | undefined => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && (entry.name === 'chrome-headless-shell' || entry.name === 'chrome')) {
              try {
                fs.accessSync(fullPath, fs.constants.X_OK);
                return fullPath;
              } catch {}
            } else if (entry.isDirectory()) {
              const found = walk(fullPath);
              if (found) return found;
            }
          }
        } catch {}
        return undefined;
      };
      const found = walk(puppeteerCache);
      if (found) return found;
    }

    const systemPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const sp of systemPaths) {
      if (fs.existsSync(sp)) return sp;
    }

    return undefined;
  }

  // Localiza e compila o template Handlebars correspondente com os dados fornecidos
  private getTemplateHtml(options: CertificateOptions): string {
    const templateName = options.templateId || 'moderno';
    let templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);

    // Fallbacks para garantir que o template sempre seja encontrado
    if (!fs.existsSync(templatePath)) {
      const fallbackModern = path.join(__dirname, '..', 'templates', 'moderno.hbs');
      const fallbackLegacy = path.join(__dirname, '..', 'templates', 'certificado.hbs');
      templatePath = fs.existsSync(fallbackModern) ? fallbackModern : fallbackLegacy;
    }

    const templateStr = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateStr);

    return template({
      nome: options.fullName,
      evento: options.eventName,
      data: options.eventDate,
      certificadoId: options.certificateId,
      instituicao: options.instituicao,
      subInstituicao: options.subInstituicao,
      titulo: options.titulo,
      subtitulo: options.subtitulo,
      textoPersonalizado: options.textoPersonalizado,
      cargaHoraria: options.cargaHoraria,
      assinaturaNome: options.assinaturaNome,
      assinaturaCargo: options.assinaturaCargo,
      assinatura2Nome: options.assinatura2Nome,
      assinatura2Cargo: options.assinatura2Cargo,
      primaryColor: options.primaryColor,
      secondaryColor: options.secondaryColor,
      bgColor: options.bgColor,
      textColor: options.textColor,
      borderColor: options.borderColor,
    });
  }

  // Gera o PDF oficial do certificado em formato A4 paisagem
  async gerarCertificado(
    fullNameOrOptions: string | CertificateOptions,
    eventName?: string,
    eventDate?: string,
    certificateId?: string,
    extraOptions?: Partial<CertificateOptions>,
  ): Promise<Buffer> {
    const options: CertificateOptions =
      typeof fullNameOrOptions === 'string'
        ? {
            fullName: fullNameOrOptions,
            eventName: eventName || '',
            eventDate: eventDate || '',
            certificateId: certificateId || '',
            ...extraOptions,
          }
        : fullNameOrOptions;

    const html = this.getTemplateHtml(options);
    const executablePath = this.getBrowserExecutablePath();

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });

      return pdfBuffer as Buffer;
    } finally {
      await browser.close();
    }
  }

  // Gera uma pré-visualização instantânea (imagem JPEG de alta qualidade ou PDF) sem persistir dados
  async gerarPreview(
    options: Partial<CertificateOptions>,
    format: 'image' | 'pdf' = 'image',
  ): Promise<Buffer> {
    const previewOptions: CertificateOptions = {
      fullName: options.fullName || 'NOME DO PARTICIPANTE',
      eventName: options.eventName || 'Nome do Evento Exemplo',
      eventDate: options.eventDate || new Date().toLocaleDateString('pt-BR'),
      certificateId: 'PREVIEW-000000',
      ...options,
    };

    const html = this.getTemplateHtml(previewOptions);
    const executablePath = this.getBrowserExecutablePath();

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Viewport proporcional ao formato A4 paisagem a 96DPI (1123 x 794) com nitidez extra
      await page.setViewport({
        width: 1123,
        height: 794,
        deviceScaleFactor: 1.5,
      });

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      if (format === 'image') {
        const imageBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 85,
        });
        return imageBuffer as Buffer;
      }

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });

      return pdfBuffer as Buffer;
    } finally {
      await browser.close();
    }
  }

  // Escapa caracteres HTML especiais para evitar injeção de markup em relatórios
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

    const executablePath = this.getBrowserExecutablePath();
    const browser = await puppeteer.launch({
      executablePath,
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
