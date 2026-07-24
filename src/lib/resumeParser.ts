import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParseResumeResult {
  text: string;
}

/**
 * Extracts raw plain text from PDF or DOCX file buffer.
 * Uploaded buffers are kept purely in-memory and discarded after text extraction.
 */
export async function parseResumeBuffer(
  buffer: Buffer,
  fileType: 'pdf' | 'docx',
): Promise<ParseResumeResult> {
  if (fileType === 'pdf') {
    let extractedText = '';
    try {
      const pdfParser = new PDFParse({ data: buffer });
      const textResult = await pdfParser.getText();
      extractedText = typeof textResult === 'string' ? textResult : (textResult as any)?.text || '';
    } catch (pdfErr) {
      // Fallback attempt for older CJS module compatibility
      try {
        const legacyPdf = require('pdf-parse');
        const legacyFn = typeof legacyPdf === 'function' ? legacyPdf : legacyPdf.default;
        if (typeof legacyFn === 'function') {
          const res = await legacyFn(buffer);
          extractedText = res?.text || '';
        }
      } catch {
        throw pdfErr;
      }
    }

    const text = extractedText.trim();
    if (!text) {
      throw new Error('PDF file appears to be empty or image-only without selectable text.');
    }
    return { text };
  }

  if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : '';
    if (!text) {
      throw new Error('DOCX file appears to be empty or unreadable.');
    }
    return { text };
  }

  throw new Error('Unsupported file type. Only PDF and DOCX files are allowed.');
}
