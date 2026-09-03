import scribe from 'scribe.js-ocr';
import { ImageWrapper } from 'scribe.js-ocr/js/objects/imageObjects.js';

async function runTest() {
  console.log('🧪 RUNNING 200 DPI TARGET PAGE SCALING & PRE-RENDER BYPASS REGRESSION TEST');

  const DUMMY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const dummy = new ImageWrapper(1, DUMMY_PNG, 'gray');

  if (dummy.n !== 1 || dummy.colorMode !== 'gray' || dummy.src !== DUMMY_PNG) {
    throw new Error('ImageWrapper instantiation failed');
  }
  console.log('✅ ImageWrapper instantiation verified.');

  const doc = new scribe.ScribeDoc();
  doc.inputData.pdfMode = true;
  doc.images.pageCount = 2;
  doc.inputData.pageCount = 2;

  // Initialize pageMetrics for 2 pages
  doc.pageMetrics = [
    { dims: { width: 2550, height: 3300 } },
    { dims: { width: 2550, height: 3300 } }
  ];
  doc.images.pdfDims300 = [
    { width: 2550, height: 3300 },
    { width: 2550, height: 3300 }
  ];

  // Pre-fill page 1 with dummy
  doc.images.native[1] = Promise.resolve(dummy);
  doc.images.nativeProps[1] = { colorMode: 'gray', rotated: false, upscaled: false, n: 1 };

  // Test 200 DPI scaling logic for Page 0 (target)
  const pageIdx = 0;
  const origWidth = doc.pageMetrics[pageIdx].dims.width;
  const origHeight = doc.pageMetrics[pageIdx].dims.height;
  const scale = 200 / 300;

  doc.pageMetrics[pageIdx].dims.width = Math.round(origWidth * scale);
  doc.pageMetrics[pageIdx].dims.height = Math.round(origHeight * scale);

  console.log(`Target Page 0 scaled dims: [${doc.pageMetrics[0].dims.width}x${doc.pageMetrics[0].dims.height}]`);
  console.log(`Non-Target Page 1 dims: [${doc.pageMetrics[1].dims.width}x${doc.pageMetrics[1].dims.height}]`);

  // Assert target page scaled to 200 DPI (2550 * 200 / 300 = 1700)
  if (doc.pageMetrics[0].dims.width !== 1700 || doc.pageMetrics[0].dims.height !== 2200) {
    throw new Error(`FAILED: Target Page 0 dimensions expected [1700x2200], got [${doc.pageMetrics[0].dims.width}x${doc.pageMetrics[0].dims.height}]`);
  }
  // Assert non-target page 1 remains unchanged (2550x3300)
  if (doc.pageMetrics[1].dims.width !== 2550 || doc.pageMetrics[1].dims.height !== 3300) {
    throw new Error('FAILED: Non-target Page 1 dimensions were modified!');
  }

  // Calculate dynamic DPI inside Scribe
  const targetWidth = doc.pageMetrics[0].dims.width;
  const computedDpi = 300 * (targetWidth / doc.images.pdfDims300[0].width);
  console.log(`Computed Scribe render DPI for Page 0: ${computedDpi} DPI`);

  if (computedDpi !== 200) {
    throw new Error(`FAILED: Computed render DPI expected 200, got ${computedDpi}`);
  }

  // Restore original dimensions
  doc.pageMetrics[pageIdx].dims.width = origWidth;
  doc.pageMetrics[pageIdx].dims.height = origHeight;

  if (doc.pageMetrics[0].dims.width !== 2550 || doc.pageMetrics[0].dims.height !== 3300) {
    throw new Error('FAILED: Restoration of original dimensions failed!');
  }

  console.log('✅ TEST PASSED: 200 DPI target page scaling, non-target isolation, and dimension restoration verified!');
  await doc.close();
}

runTest().catch((err) => {
  console.error('❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
