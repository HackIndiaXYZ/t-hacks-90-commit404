import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAge,
  extractState,
  extractOccupation,
  extractLandOwnership,
  extractIncome,
  extractGender,
  extractFullProfile,
} from './profileExtractor.js';

test('extractAge: extracts digits, words, and Hindi phrases', () => {
  assert.equal(extractAge('45'), 45);
  assert.equal(extractAge('मेरी उम्र 45 साल है'), 45);
  assert.equal(extractAge('I am 28 years old'), 28);
  assert.equal(extractAge('पैंतालीस'), 45);
  assert.equal(extractAge('पैंतीस'), 35);
  assert.equal(extractAge('thirty five'), 35);
  assert.equal(extractAge('twenty two'), 22);
  assert.equal(extractAge('age: 60'), 60);
  assert.equal(extractAge('invalid text without numbers'), null);
});

test('extractState: extracts English and Hindi state names', () => {
  assert.equal(extractState('मैं बिहार में रहता हूँ'), 'Bihar');
  assert.equal(extractState('Uttar Pradesh, Lucknow'), 'Uttar Pradesh');
  assert.equal(extractState('राजस्थान'), 'Rajasthan');
  assert.equal(extractState('Delhi NCR'), 'Delhi');
  assert.equal(extractState('Unknown place'), null);
});

test('extractOccupation: maps farmer, student, unemployed, vendor to standard keys', () => {
  assert.equal(extractOccupation('मैं एक किसान हूँ'), 'farmer');
  assert.equal(extractOccupation('खेती बाड़ी करता हूँ'), 'farmer');
  assert.equal(extractOccupation('I am a college student'), 'student');
  assert.equal(extractOccupation('कॉलेज में पढ़ाई करता हूँ'), 'student');
  assert.equal(extractOccupation('बेरोजगार युवा'), 'unemployed');
  assert.equal(extractOccupation('दुकानदार / स्ट्रीट वेंडर'), 'selfEmployed');
  assert.equal(extractOccupation('गांव में दुकान चलाता हूँ'), 'selfEmployed');
  assert.equal(extractOccupation('प्राइवेट नौकरी'), 'employed');
});

test('extractLandOwnership: detects yes, no, landless, acres', () => {
  assert.equal(extractLandOwnership('हाँ, 2 एकड़ ज़मीन है'), 'yes');
  assert.equal(extractLandOwnership('नहीं, भूमिहीन मजदूर'), 'no');
  assert.equal(extractLandOwnership('landless farmer'), 'no');
  assert.equal(extractLandOwnership('yes I have farmland'), 'yes');
});

test('extractIncome: parses lakh, thousand, plain numbers, and unsure', () => {
  assert.equal(extractIncome('1.5 लाख'), 150000);
  assert.equal(extractIncome('80,000 प्रति वर्ष'), 80000);
  assert.equal(extractIncome('2 lakh'), 200000);
  assert.equal(extractIncome('50 हजार'), 50000);
  assert.equal(extractIncome('पता नहीं / याद नहीं'), 'unsure');
});

test('extractGender: parses male and female in Hindi and English', () => {
  assert.equal(extractGender('महिला'), 'female');
  assert.equal(extractGender('female applicant'), 'female');
  assert.equal(extractGender('पुरुष किसान'), 'male');
  assert.equal(extractGender('male'), 'male');
});

test('extractFullProfile: parses complete conversational sentence', () => {
  const text = 'मेरी उम्र 45 साल है, बिहार का रहने वाला किसान हूँ, 2 एकड़ ज़मीन है और वार्षिक आय 1.2 लाख है';
  const profile = extractFullProfile(text);
  assert.equal(profile.age, 45);
  assert.equal(profile.state, 'Bihar');
  assert.equal(profile.occupation, 'farmer');
  assert.equal(profile.ownsLand, 'yes');
  assert.equal(profile.annualIncome, 120000);
});
