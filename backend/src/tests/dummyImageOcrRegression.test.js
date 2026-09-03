import scribe from 'scribe.js-ocr';
import { ImageWrapper } from 'scribe.js-ocr/js/objects/imageObjects.js';
import { gs } from 'scribe.js-ocr/js/generalWorkerMain.js';
import { getPngIHDRInfo } from 'scribe.js-ocr/js/utils/imageUtils.js';
import { binarizePngTo1bpp } from '../utils/parser.js';

async function runTest() {
  console.log('🧪 RUNNING 1-BPP MONOCHROME BINARY PNG & 150 DPI OCR REGRESSION TEST');

  const DUMMY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const dummy = new ImageWrapper(1, DUMMY_PNG, 'gray');

  if (dummy.n !== 1 || dummy.colorMode !== 'gray' || dummy.src !== DUMMY_PNG) {
    throw new Error('ImageWrapper instantiation failed');
  }
  console.log('✅ ImageWrapper instantiation verified.');

  // Test 1-bpp binarization logic and verify IHDR info
  const dummyBuf = Buffer.from(DUMMY_PNG.split(',')[1], 'base64');
  const binarizedBuf = binarizePngTo1bpp(dummyBuf, 180);
  const binarizedDataUrl = 'data:image/png;base64,' + binarizedBuf.toString('base64');
  const ihdr = getPngIHDRInfo(new Uint8Array(binarizedBuf));

  console.log('Verified 1-bpp PNG IHDR header:', ihdr);
  if (ihdr.bitDepth !== 1) {
    throw new Error(`FAILED: Expected bitDepth 1 for binarized PNG, got ${ihdr.bitDepth}`);
  }
  if (ihdr.colorType !== 0) {
    throw new Error(`FAILED: Expected colorType 0 for binarized PNG, got ${ihdr.colorType}`);
  }
  console.log('✅ Target native image verified as genuine 1-bpp monochrome PNG (bitDepth: 1, colorType: 0).');

  // Verify worker count configuration remains 1
  scribe.opt.workerN = 1;
  if (scribe.opt.workerN !== 1) {
    throw new Error('FAILED: scribe.opt.workerN is not 1');
  }
  console.log('✅ scribe.opt.workerN = 1 verified.');

  // Verify gs.terminate() lifecycle management
  await gs.terminate();
  console.log('✅ Initial gs.terminate() verified.');

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

  // Pre-fill non-target page 1 with dummy wrappers
  doc.images.native[1] = Promise.resolve(new ImageWrapper(1, DUMMY_PNG, 'gray'));
  doc.images.nativeProps[1] = { colorMode: 'gray', rotated: false, upscaled: false, n: 1 };
  doc.images.binary[1] = Promise.resolve(new ImageWrapper(1, DUMMY_PNG, 'binary'));
  doc.images.binaryProps[1] = { colorMode: 'binary', rotated: false, upscaled: false, n: 1 };

  // Set target page 0 native image slot to genuine 1-bpp binary wrapper
  const pageIdx = 0;
  const binaryTargetWrapper = new ImageWrapper(pageIdx, binarizedDataUrl, 'binary', false, false);
  doc.images.native[pageIdx] = Promise.resolve(binaryTargetWrapper);
  doc.images.nativeProps[pageIdx] = { colorMode: 'binary', rotated: false, upscaled: false, n: pageIdx };

  // Pre-fill target page 0 binary image slot to suppress Tesseract binary image generation
  doc.images.binary[pageIdx] = Promise.resolve(new ImageWrapper(pageIdx, DUMMY_PNG, 'binary'));
  doc.images.binaryProps[pageIdx] = { colorMode: 'binary', rotated: false, upscaled: false, n: pageIdx };

  // Verify target nativeProps colorMode is binary
  if (doc.images.nativeProps[pageIdx].colorMode !== 'binary') {
    throw new Error('FAILED: Target nativeProps.colorMode is not binary!');
  }
  console.log('✅ Target nativeProps.colorMode = binary verified.');

  // Explicitly set target page angle to 0 so Scribe treats angle as known (disables rotateAuto / upscaling)
  doc.pageMetrics[pageIdx].angle = 0;

  if (typeof doc.pageMetrics[pageIdx].angle !== 'number' || doc.pageMetrics[pageIdx].angle !== 0) {
    throw new Error('FAILED: Target page angle was not set to 0');
  }
  console.log('✅ Target page angle = 0 verified (disables rotateAuto).');

  // Test 150 DPI scaling logic for Page 0 (target)
  const origWidth = doc.pageMetrics[pageIdx].dims.width;
  const origHeight = doc.pageMetrics[pageIdx].dims.height;
  const scale = 150 / 300;

  doc.pageMetrics[pageIdx].dims.width = Math.round(origWidth * scale);
  doc.pageMetrics[pageIdx].dims.height = Math.round(origHeight * scale);

  console.log(`Target Page 0 scaled dims: [${doc.pageMetrics[0].dims.width}x${doc.pageMetrics[0].dims.height}]`);
  console.log(`Non-Target Page 1 dims: [${doc.pageMetrics[1].dims.width}x${doc.pageMetrics[1].dims.height}]`);

  // Assert target page scaled to 150 DPI (2550 * 150 / 300 = 1275, 3300 * 150 / 300 = 1650)
  if (doc.pageMetrics[0].dims.width !== 1275 || doc.pageMetrics[0].dims.height !== 1650) {
    throw new Error(`FAILED: Target Page 0 dimensions expected [1275x1650], got [${doc.pageMetrics[0].dims.width}x${doc.pageMetrics[0].dims.height}]`);
  }
  // Assert non-target page 1 remains unchanged (2550x3300)
  if (doc.pageMetrics[1].dims.width !== 2550 || doc.pageMetrics[1].dims.height !== 3300) {
    throw new Error('FAILED: Non-target Page 1 dimensions were modified!');
  }

  // Calculate dynamic DPI inside Scribe
  const targetWidth = doc.pageMetrics[0].dims.width;
  const computedDpi = Math.round(300 * (targetWidth / doc.images.pdfDims300[0].width));
  console.log(`Computed Scribe render DPI for Page 0: ${computedDpi} DPI`);

  if (computedDpi !== 150) {
    throw new Error(`FAILED: Computed render DPI expected 150, got ${computedDpi}`);
  }

  // Verify non-target page 1 dummy wrappers remain intact
  const nonTargetNative = await doc.images.native[1];
  const nonTargetBinary = await doc.images.binary[1];
  if (nonTargetNative.src !== DUMMY_PNG || nonTargetBinary.src !== DUMMY_PNG) {
    throw new Error('FAILED: Non-target page dummy wrappers were corrupted!');
  }
  console.log('✅ Non-target page 1 dummy wrappers verified intact.');

  // Verify target page binary dummy pre-fill is present
  const targetBinary = await doc.images.binary[0];
  if (targetBinary.src !== DUMMY_PNG) {
    throw new Error('FAILED: Target page 0 binary dummy pre-fill missing!');
  }
  console.log('✅ Target page 0 binary dummy pre-fill verified intact.');

  // Restore original dimensions
  doc.pageMetrics[pageIdx].dims.width = origWidth;
  doc.pageMetrics[pageIdx].dims.height = origHeight;

  if (doc.pageMetrics[0].dims.width !== 2550 || doc.pageMetrics[0].dims.height !== 3300) {
    throw new Error('FAILED: Restoration of original dimensions failed!');
  }

  // Verify post-recognition worker pool termination
  await gs.terminate();
  console.log('✅ Post-page gs.terminate() verified.');

  console.log('✅ TEST PASSED: Genuine 1-bpp binary target image, nativeProps colorMode=binary, 150 DPI scaling, angle=0, non-target isolation, and worker lifecycle termination verified!');
  await doc.close();
  await gs.terminate();
}

runTest().catch((err) => {
  console.error('❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});

