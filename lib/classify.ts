// lib/classify.ts - UPDATED VERSION

export interface TestValues {
  PTH: number;           // Current iPTH (C-PTH)
  prevPTH?: number;      // Previous consecutive iPTH (P-PTH)
  Ca: number;            // Calcium (mg/dL)
  CaCorrected: number;   // Corrected Calcium
  Phos: number;          // Phosphate (mg/dL)
  Echo: boolean;         // Echocardiogram result
  LARad: number;         // Lateral Abdominal Radiography
}

export interface ClassificationResult {
  group: 1 | 2;
  bucket: 1 | 2 | 3;
  situation: string;     // T1..T33
}

export function classifyPatientSituation(values: TestValues): ClassificationResult {
  const { PTH, prevPTH, Ca, CaCorrected, Phos, Echo, LARad } = values;

  // ---- STEP 1: Determine Group ----
  const group: 1 | 2 = (LARad > 5 || Echo) ? 1 : 2;

  // ---- STEP 2: Determine Bucket ----
  const bucket =
    group === 1
      ? classifyBucketGroup1(PTH, prevPTH)
      : classifyBucketGroup2(PTH, prevPTH);

  // ---- STEP 3: Determine Situation ----
  const situation = determineSituation(group, bucket, CaCorrected, Phos);

  return { group, bucket, situation };
}

/* ------------------------------
   GROUP 1 BUCKET LOGIC
-------------------------------- */
function classifyBucketGroup1(cpth: number, ppth?: number): 1 | 2 | 3 {
  if (!ppth) ppth = cpth; // If first visit, consider current as previous

  if (cpth > 300) {
    if (ppth > 300) return 1;
    if (cpth > 200 && cpth >= ppth * 1.5) return 1;
    return 2; // fallback
  } else if (cpth < 100) {
    if (ppth < 100) return 3;
    if (cpth < 150 && cpth <= ppth * 0.5) return 3;
    return 2; // fallback
  } else {
    // 100 <= cpth <= 300
    if (cpth > 200 && cpth >= ppth * 1.5) return 1;
    if (cpth < 150 && cpth <= ppth * 0.5) return 3;
    return 2;
  }
}

/* ------------------------------
   GROUP 2 BUCKET LOGIC
-------------------------------- */
function classifyBucketGroup2(cpth: number, ppth?: number): 1 | 2 | 3 {
  if (!ppth) ppth = cpth; // If first visit, consider current as previous

  if (cpth > 585) {
    if (ppth > 585) return 1;
    if (cpth > 450 && cpth >= ppth * 3) return 1;
    return 2; // fallback
  } else if (cpth < 130) {
    if (ppth < 130) return 3;
    if (cpth < 180 && cpth <= ppth * 0.75) return 3;
    return 2; // fallback
  } else {
    // 130 <= cpth <= 585
    if (cpth > 450 && cpth >= ppth * 3) return 1;
    if (cpth < 180 && cpth <= ppth * 0.75) return 3;
    return 2;
  }
}

/* ------------------------------
   DETERMINE SITUATION (T1-T33)
   UPDATED: Different logic for Bucket 2
-------------------------------- */
function determineSituation(group: 1 | 2, bucket: 1 | 2 | 3, CaCorrected: number, Phos: number): string {
  // UPDATED: Use different category functions based on bucket
  let caCategory: number;
  let pCategory: number;
  
  if (bucket === 2) {
    // Bucket 2 has different CaCorrected categories for both Group 1 and Group 2
    caCategory = getCaCategoryBucket2(CaCorrected);
    pCategory = getPCategoryBucket2(Phos);
  } else {
    // Bucket 1 and Bucket 3 use standard categories
    caCategory = getCaCategoryStandard(CaCorrected);
    pCategory = getPCategoryStandard(Phos);
  }

  // Map CaCorrected/P combination to 1-based index inside the bucket
  const caIndex = caCategory; // 0..2 for bucket 2, 0..3 for bucket 1&3
  const pIndex = pCategory;   // 0..2 for all buckets

  let situationIndex: number;
  let base: number;

  if (bucket === 2) {
    // Bucket 2: Has only 9 situations (T13-T21) with 3x3 matrix
    situationIndex = caIndex * 3 + pIndex + 1; // 1..9
    base = 12; // T13-T21
  } else {
    // Bucket 1 & 3: Have 12 situations each with 4x3 matrix
    situationIndex = caIndex * 3 + pIndex + 1; // 1..12
    base = (bucket === 1) ? 0 : 21; // Bucket 1: T1-T12, Bucket 3: T22-T33
  }

  return `T${base + situationIndex}`;
}

/* ------------------------------
   STANDARD CATEGORIES (for Bucket 1 & 3)
-------------------------------- */
function getCaCategoryStandard(CaCorrected: number): 0 | 1 | 2 | 3 {
  if (CaCorrected > 10.2) return 0;    // Ca > 10.2
  if (CaCorrected >= 8.4) return 1;    // Ca 8.4-10.2
  if (CaCorrected >= 7.5) return 2;    // Ca 7.5-8.4
  return 3;                            // Ca < 7.5
}

function getPCategoryStandard(P: number): 0 | 1 | 2 {
  if (P > 5.5) return 0;       // P > 5.5
  if (P >= 3.5) return 1;      // P 3.5-5.5
  return 2;                    // P < 3.5
}

/* ------------------------------
   BUCKET 2 CATEGORIES (different CaCorrected ranges)
-------------------------------- */
function getCaCategoryBucket2(CaCorrected: number): 0 | 1 | 2 {
  if (CaCorrected > 10.2) return 0;    // Ca > 10.2
  if (CaCorrected >= 7.5) return 1;    // Ca 7.5-10.2 (MERGED RANGE!)
  return 2;                            // Ca < 7.5
}

function getPCategoryBucket2(P: number): 0 | 1 | 2 {
  if (P > 5.5) return 0;       // P > 5.5
  if (P >= 3.5) return 1;      // P 3.5-5.5
  return 2;                    // P < 3.5
}
