#!/usr/bin/env node

/**
 * Test script to verify email functionality with Mailpit
 * 
 * Run with: node test-email.mjs
 * Make sure Mailpit is running (docker compose up -d mailpit)
 * View emails at: http://localhost:8025
 */

const testSimpleEmail = async () => {
  console.log('\n📧 Testing simple email...');

  const response = await fetch('http://localhost:3000/api/email/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'test@example.com',
      subject: 'Test Email from QueryProctor',
      text: 'This is a plain text test email.',
      html: '<h1>Test Email</h1><p>This is a <strong>test email</strong> from QueryProctor.</p>',
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log('✅ Simple email sent successfully!');
  } else {
    console.error('❌ Failed to send simple email:', data.error);
  }

  return data.success;
};

const testInvitationEmail = async () => {
  console.log('\n📧 Testing invitation email...');

  const response = await fetch('http://localhost:3000/api/email/test-invitation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'student@example.com',
      studentName: 'John Doe',
      assessmentTitle: 'SQL Fundamentals Assessment',
      inviteLink: 'http://localhost:5173/assessment/123',
      dueDate: '2024-12-31',
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log('✅ Invitation email sent successfully!');
  } else {
    console.error('❌ Failed to send invitation email:', data.error);
  }

  return data.success;
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting email tests...');
  console.log('Make sure:');
  console.log('  1. Mailpit is running: docker compose ps');
  console.log('  2. Server is running: pnpm run dev:server');
  console.log('  3. View emails at: http://localhost:8025\n');

  try {
    // Wait a moment to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const simpleSuccess = await testSimpleEmail();
    const invitationSuccess = await testInvitationEmail();

    console.log('\n' + '='.repeat(50));

    if (simpleSuccess && invitationSuccess) {
      console.log('✅ All email tests passed!');
      console.log('\n📬 View your emails at: http://localhost:8025');
      process.exit(0);
    } else {
      console.log('❌ Some email tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error running tests:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  - Is Mailpit running? Run: docker compose up -d mailpit');
    console.log('  - Is the server running? Run: pnpm run dev:server');
    console.log('  - Check server logs for errors');
    process.exit(1);
  }
};

runTests();
