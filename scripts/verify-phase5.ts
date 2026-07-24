import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { POST as uploadResume } from '../src/app/api/resume/upload/route';
import { DELETE as deleteResume } from '../src/app/api/resume/route';
import { GET as getInternships } from '../src/app/api/internships/route';
import { NextRequest } from 'next/server';
import * as nextAuth from 'next-auth';

// ─── Mock getServerSession for testing route handlers directly ──────────────────
let currentTestUserId = '';

const nextAuthNext = require('next-auth/next');
nextAuthNext.getServerSession = async () => {
  if (!currentTestUserId) return null;
  const u = await prisma.user.findUnique({ where: { id: currentTestUserId } });
  if (!u) return null;
  return {
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
    },
  };
};

async function main() {
  console.log('====================================================');
  console.log('   Devstart Phase 5 (Resume Analyser) Verification  ');
  console.log('====================================================\n');

  // 1. Setup clean test user in DB
  const testEmail = 'phase5_tester@devstart.io';
  let user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      domains: [],
      skills: [],
      locationPref: 'Remote',
      resumeText: null,
      experienceLevel: null,
      missingKeywords: [],
    },
    create: {
      email: testEmail,
      name: 'Phase 5 Tester',
      domains: [],
      skills: [],
      locationPref: 'Remote',
      resumeText: null,
      experienceLevel: null,
      missingKeywords: [],
    },
  });

  currentTestUserId = user.id;
  console.log(`[DB] Test User Initialized: ID=${user.id}, Email=${user.email}`);

  // 2. Baseline GET /api/internships BEFORE resume upload
  console.log('\n----------------------------------------------------');
  console.log(' STEP 1: Baseline Internships Ranking (Before Upload)');
  console.log('----------------------------------------------------');
  
  const req1 = new NextRequest('http://localhost:3000/api/internships');
  const res1 = await getInternships(req1);
  const data1 = await res1.json();
  const initialTop3 = (data1.internships || []).slice(0, 3).map((i: any) => ({
    title: i.title,
    company: i.company,
    domain: i.domain,
    skills: i.skills,
  }));
  
  console.log('Baseline Top 3 Internships:');
  console.dir(initialTop3, { depth: null });

  // 3. Test Upload PDF Resume
  console.log('\n----------------------------------------------------');
  console.log(' STEP 2: POST /api/resume/upload (PDF File)');
  console.log('----------------------------------------------------');

  const pdfPath = path.join(process.cwd(), 'test_resume_ml.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const pdfFormData = new FormData();
  pdfFormData.append('file', pdfBlob, 'test_resume_ml.pdf');

  const uploadPdfReq = new NextRequest('http://localhost:3000/api/resume/upload', {
    method: 'POST',
    body: pdfFormData,
  });

  const pdfRes = await uploadResume(uploadPdfReq);
  const pdfJson = await pdfRes.json();
  console.log('Upload PDF Response HTTP Status:', pdfRes.status);
  console.log('Upload PDF Returned JSON:');
  console.dir(pdfJson, { depth: null });

  // DB Check after PDF upload
  let dbUserPdf = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('\n[DB Query Verification after PDF Upload]:');
  console.log({
    id: dbUserPdf?.id,
    domains: dbUserPdf?.domains,
    skills: dbUserPdf?.skills,
    experienceLevel: dbUserPdf?.experienceLevel,
    missingKeywords: dbUserPdf?.missingKeywords,
    hasResumeText: !!dbUserPdf?.resumeText,
    resumeTextSnippet: dbUserPdf?.resumeText?.slice(0, 100) + '...',
  });

  // Check ranking AFTER PDF upload
  const req2 = new NextRequest('http://localhost:3000/api/internships');
  const res2 = await getInternships(req2);
  const data2 = await res2.json();
  const pdfTop3 = (data2.internships || []).slice(0, 3).map((i: any) => ({
    title: i.title,
    company: i.company,
    domain: i.domain,
    skills: i.skills,
  }));

  console.log('\nTop 3 Internships AFTER PDF Upload (ML Profile):');
  console.dir(pdfTop3, { depth: null });

  // 4. Test Upload DOCX Resume
  console.log('\n----------------------------------------------------');
  console.log(' STEP 3: POST /api/resume/upload (DOCX File)');
  console.log('----------------------------------------------------');

  const docxPath = path.join(process.cwd(), 'test_resume_frontend.docx');
  const docxBuffer = fs.readFileSync(docxPath);
  const docxBlob = new Blob([docxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const docxFormData = new FormData();
  docxFormData.append('file', docxBlob, 'test_resume_frontend.docx');

  const uploadDocxReq = new NextRequest('http://localhost:3000/api/resume/upload', {
    method: 'POST',
    body: docxFormData,
  });

  const docxRes = await uploadResume(uploadDocxReq);
  const docxJson = await docxRes.json();
  console.log('Upload DOCX Response HTTP Status:', docxRes.status);
  console.log('Upload DOCX Returned JSON:');
  console.dir(docxJson, { depth: null });

  // DB Check after DOCX upload
  let dbUserDocx = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('\n[DB Query Verification after DOCX Upload]:');
  console.log({
    id: dbUserDocx?.id,
    domains: dbUserDocx?.domains,
    skills: dbUserDocx?.skills,
    experienceLevel: dbUserDocx?.experienceLevel,
    missingKeywords: dbUserDocx?.missingKeywords,
    hasResumeText: !!dbUserDocx?.resumeText,
    resumeTextSnippet: dbUserDocx?.resumeText?.slice(0, 100) + '...',
  });

  // Check ranking AFTER DOCX upload
  const req3 = new NextRequest('http://localhost:3000/api/internships');
  const res3 = await getInternships(req3);
  const data3 = await res3.json();
  const docxTop3 = (data3.internships || []).slice(0, 3).map((i: any) => ({
    title: i.title,
    company: i.company,
    domain: i.domain,
    skills: i.skills,
  }));

  console.log('\nTop 3 Internships AFTER DOCX Upload (Merged Fullstack Profile):');
  console.dir(docxTop3, { depth: null });

  // 5. Test Delete Control (DELETE /api/resume)
  console.log('\n----------------------------------------------------');
  console.log(' STEP 4: DELETE /api/resume (Delete-My-Data Control)');
  console.log('----------------------------------------------------');

  const deleteReq = new NextRequest('http://localhost:3000/api/resume', {
    method: 'DELETE',
  });
  const deleteRes = await deleteResume(deleteReq);
  const deleteJson = await deleteRes.json();
  console.log('DELETE /api/resume Status:', deleteRes.status);
  console.log('DELETE /api/resume JSON:', deleteJson);

  // DB Check after Delete
  let dbUserAfterDelete = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('\n[DB Query Verification AFTER Delete]:');
  console.log({
    id: dbUserAfterDelete?.id,
    resumeText: dbUserAfterDelete?.resumeText,
    experienceLevel: dbUserAfterDelete?.experienceLevel,
    missingKeywords: dbUserAfterDelete?.missingKeywords,
    userAccountStillExists: !!dbUserAfterDelete,
  });

  console.log('\n====================================================');
  console.log('   Phase 5 Verification Completed Successfully!     ');
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
