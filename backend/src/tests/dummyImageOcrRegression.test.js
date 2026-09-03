import scribe from 'scribe.js-ocr';
import { ImageWrapper } from 'scribe.js-ocr/js/objects/imageObjects.js';

async function runTest() {
  console.log('🧪 RUNNING DUMMY IMAGE OCR PRE-RENDER BYPASS REGRESSION TEST');

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

  // Track native array updates
  let nativeRendersExecuted = [];

  // Pre-fill page 1 with dummy
  doc.images.native[1] = Promise.resolve(dummy);
  doc.images.nativeProps[1] = { colorMode: 'gray', rotated: false, upscaled: false, n: 1 };

  // Spy on getNative to see which pages get re-rendered (newNative = true)
  const originalGetNative = doc.images.getNative.bind(doc.images);
  doc.images.getNative = async (n, props) => {
    const isNewBefore = !doc.images.native[n];
    if (isNewBefore) {
      nativeRendersExecuted.push(n);
    }
    return originalGetNative(n, props);
  };

  // Call preRenderRange for range 0 to 1
  await doc.images.preRenderRange({ min: 0, max: 1, binary: false });

  console.log(`Pages requiring new PDF render during preRenderRange: [${nativeRendersExecuted.join(', ')}]`);

  if (nativeRendersExecuted.includes(1)) {
    throw new Error('FAILED: preRenderRange triggered new PDF render for non-target page 1!');
  }

  console.log('✅ TEST PASSED: Non-target page 1 was successfully bypassed without PDF rendering!');
  await doc.close();
}

runTest().catch((err) => {
  console.error('❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
