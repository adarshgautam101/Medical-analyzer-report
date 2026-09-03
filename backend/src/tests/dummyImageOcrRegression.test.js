import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { binarizePngTo1bpp, extractDocumentText, ocrQueue } from '../utils/parser.js';

async function runRegressionSuite() {
  console.log('🧪 RUNNING LOW-MEMORY pdftoppm + TESSERACT.JS OCR REGRESSION TEST SUITE');

  // 1. Verify MAX_CONCURRENT_OCR = 1
  if (ocrQueue.concurrency !== 1) {
    throw new Error(`FAILED: ocrQueue concurrency expected 1, got ${ocrQueue.concurrency}`);
  }
  console.log('✅ OCR Queue concurrency = 1 verified.');

  // 2. Create a temporary 2-page test PDF for scanned OCR testing
  const pdfPath = path.resolve('test_scanned_ocr_temp.pdf');
  const pyScript = `from reportlab.lib.pagesizes import letter; from reportlab.pdfgen import canvas; c = canvas.Canvas('${pdfPath}', pagesize=letter); c.drawString(100, 750, 'SCAN_P1'); c.drawString(100, 700, 'Hemoglobin: 14.2 g/dL'); c.showPage(); c.drawString(100, 750, 'SCAN_P2'); c.drawString(100, 700, 'Platelets: 250 x10^3/uL'); c.save();`;
  
  execSync(`python3 -c "${pyScript}"`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error('FAILED to generate temporary test PDF');
  }
  console.log('✅ Generated 2-page test PDF for OCR regression testing.');

  try {
    // 3. Perform document text extraction (falling back to pdftoppm + Tesseract.js)
    console.log('Running extractDocumentText on 2-page test PDF...');
    const result = await extractDocumentText(pdfPath, 'application/pdf');

    console.log('Extraction Result rawText snippet:\n', result.rawText);

    if (!result || typeof result.rawText !== 'string') {
      throw new Error('FAILED: extractDocumentText did not return rawText string');
    }

    if (result.pageCount !== 2) {
      throw new Error(`FAILED: Expected pageCount 2, got ${result.pageCount}`);
    }

    // 4. Verify page ordering and page headers
    if (!result.rawText.includes('--- PAGE 1 ---') || !result.rawText.includes('--- PAGE 2 ---')) {
      throw new Error('FAILED: Page markers (--- PAGE 1 ---, --- PAGE 2 ---) missing from extracted text!');
    }

    const p1Index = result.rawText.indexOf('--- PAGE 1 ---');
    const p2Index = result.rawText.indexOf('--- PAGE 2 ---');

    if (p1Index >= p2Index) {
      throw new Error('FAILED: Page markers are out of sequential order!');
    }
    console.log('✅ Sequential page order (PAGE 1 -> PAGE 2) verified.');

    // 5. Verify no leftover pdftoppm temporary PNG files exist in directory
    const dirFiles = fs.readdirSync(path.dirname(pdfPath));
    const leftoverPngs = dirFiles.filter(f => f.startsWith('pdftoppm_') && f.endsWith('.png'));

    if (leftoverPngs.length > 0) {
      throw new Error(`FAILED: Temporary PNG files were left behind: ${leftoverPngs.join(', ')}`);
    }
    console.log('✅ Temporary PNG files cleanup verified (0 leftover files).');

    // 6. Test native PDF fast path preservation
    const nativePdfPath = path.resolve('test_native_fastpath.pdf');
    const pyScriptNative = `from reportlab.lib.pagesizes import letter; from reportlab.pdfgen import canvas; c = canvas.Canvas('${nativePdfPath}', pagesize=letter); c.drawString(100, 750, 'CLINICAL LABORATORY REPORT'); c.drawString(100, 720, 'Patient: John Doe   Age: 45   Gender: Male'); c.drawString(100, 690, 'Hemoglobin: 14.5 g/dL (Reference Range: 13.5 - 17.5 g/dL)'); c.drawString(100, 660, 'White Blood Cell Count: 6.8 x10^3/uL (Reference Range: 4.5 - 11.0 x10^3/uL)'); c.drawString(100, 630, 'Platelet Count: 250 x10^3/uL (Reference Range: 150 - 450 x10^3/uL)'); c.drawString(100, 600, 'Serum Glucose: 95 mg/dL (Reference Range: 70 - 99 mg/dL)'); c.drawString(100, 570, 'Blood Urea Nitrogen: 15 mg/dL (Reference Range: 7 - 20 mg/dL)'); c.drawString(100, 540, 'Serum Creatinine: 0.9 mg/dL (Reference Range: 0.7 - 1.3 mg/dL)'); c.save();`;

    execSync(`python3 -c "${pyScriptNative}"`);

    const nativeResult = await extractDocumentText(nativePdfPath, 'application/pdf');

    if (!nativeResult.rawText.includes('Hemoglobin: 14.5 g/dL')) {
      throw new Error('FAILED: Native PDF fast path text extraction failed');
    }
    console.log('✅ Native PDF fast-path preservation verified.');

    if (fs.existsSync(nativePdfPath)) fs.unlinkSync(nativePdfPath);

    console.log('✅ ALL REGRESSION TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }
}

runRegressionSuite().catch((err) => {
  console.error('❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
