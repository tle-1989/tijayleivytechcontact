"use strict";

// Existing calculators; the page's HTML and CSS classes remain unchanged.
function heart() {
  const age = Number(document.getElementById('age').value);
  const result = document.getElementById('hrmax');
  const zones = document.getElementById('zones');
  if (!Number.isFinite(age) || age < 18 || age > 100) {
    result.textContent = 'Enter age 18–100'; zones.replaceChildren(); return;
  }
  const max = document.getElementById('hrformula').value === 'tanaka' ? 208 - 0.7 * age : 220 - age;
  result.textContent = Math.round(max) + ' bpm';
  zones.replaceChildren();
  for (const percent of [50, 60, 70, 80, 90]) {
    const row = document.createElement('div');
    const label = document.createElement('span'); label.textContent = percent + '% intensity';
    const value = document.createElement('b'); value.textContent = Math.round(max * percent / 100) + ' bpm';
    row.append(label, value); zones.append(row);
  }
}

function onerm() {
  const weight = Number(document.getElementById('weight').value);
  const reps = Number(document.getElementById('reps').value);
  const unit = document.getElementById('unit').value;
  const result = document.getElementById('one-result');
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps < 1 || reps > 10) {
    result.textContent = 'Enter valid values'; document.getElementById('one-note').textContent = 'Use 1–10 whole-number repetitions.'; return;
  }
  const estimate = weight * 36 / (37 - reps);
  result.textContent = estimate.toFixed(1) + ' ' + unit;
  document.getElementById('one-note').textContent = `Based on ${weight} ${unit} × ${reps} repetitions`;
}

function relative() {
  const lifted = Number(document.getElementById('rel-lift').value);
  const bodyweight = Number(document.getElementById('rel-body').value);
  document.getElementById('rel-result').textContent = lifted > 0 && bodyweight > 0 && Number.isFinite(lifted) && Number.isFinite(bodyweight)
    ? (lifted / bodyweight).toFixed(2) + '×' : 'Enter valid weights';
}

// The gym population is deliberately selected; never silently substitute verified competition data.
const LIFT_SLUGS = {
  'Bench Press': 'bench-press', 'Squat': 'squat',
  'Deadlift': 'deadlift', 'Shoulder Press': 'overhead-press'
};
let selectedStrengthLift = 'bench-press';
let activeRequest = 0;
const strengthTier = document.getElementById('strength-tier');
const strengthDescription = document.getElementById('strength-description');
const strengthButton = document.getElementById('strength-calculate');

function displayStrength(tier, message) {

  // Update the displayed ranking and description
  strengthTier.textContent = tier;
  strengthDescription.textContent = message;

  // Remove previous tier colors
  strengthTier.classList.remove(
    "tier-beginner",
    "tier-novice",
    "tier-intermediate",
    "tier-advanced",
    "tier-elite"
  );

  // Determine the correct color class
  const tierColors = {
    "Beginner": "tier-beginner",
    "Novice": "tier-novice",
    "Intermediate": "tier-intermediate",
    "Advanced": "tier-advanced",
    "Elite": "tier-elite"
  };

  // Apply the color only when a valid tier is returned
  if (tierColors[tier]) {
    strengthTier.classList.add(tierColors[tier]);
  }
}

// These boundaries are the site's clearly disclosed percentile categories, not FitnessVolt's own tier labels.
function siteTier(percentile) {
  if (percentile >= 95) return 'Elite';
  if (percentile >= 80) return 'Advanced';
  if (percentile >= 50) return 'Intermediate';
  if (percentile >= 20) return 'Novice';
  return 'Beginner';
}

for (const button of document.querySelectorAll('[data-lift]')) {
  button.addEventListener('click', () => {
    for (const b of document.querySelectorAll('[data-lift]')) b.classList.remove('selected');
    button.classList.add('selected');
    selectedStrengthLift = LIFT_SLUGS[button.dataset.lift];
    activeRequest++;
    displayStrength('—', 'Enter your information and calculate your strength tier.');
  });
}

async function calculateStrength() {
  const sex = document.getElementById('strength-sex').value;
  const bwField = document.getElementById('strength-bodyweight');
  const maxField = document.getElementById('strength-max');
  const bodyweight = Number(bwField.value);
  const max = Number(maxField.value);
  if (!['female', 'male'].includes(sex) || !bwField.value.trim() || !maxField.value.trim() ||
      !Number.isFinite(bodyweight) || !Number.isFinite(max) || bodyweight <= 0 || max <= 0) {
    displayStrength('—', 'Choose a comparison category and enter positive body weight and 1RM values.');
    return;
  }
  const requestId = ++activeRequest;
  strengthButton.disabled = true;
  displayStrength('Checking…', 'Retrieving self-reported recreational gym-lifter percentiles.');
  try {
    // Versioned FitnessVolt Strength Standards API. One repetition means the weight is the 1RM.
    const response = await fetch('https://fitnessvolt.com/wp-json/fvss/v1/percentile', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        lift: selectedStrengthLift, weight: max, reps: 1,
        bodyweight, sex, unit: 'lb'
      })
    });
    if (!response.ok) throw new Error('Reference service returned HTTP ' + response.status);
    const data = await response.json();
    if (requestId !== activeRequest) return;
    // The provider explicitly separates 'gym' from 'verified' competition results.
    const gym = data && data.gym;
    const percentile = gym && Number(gym.percentile);
    if (!gym || gym.percentile === null || gym.percentile === undefined || !Number.isFinite(percentile) || percentile < 0 || percentile > 100) {
      displayStrength('Unavailable', 'No sufficiently supported recreational gym percentile was returned for this comparison.');
      return;
    }
    const sample = Number(gym.sample_size);
    const sampleText = Number.isFinite(sample) && sample > 0 ? ` (reference sample: ${sample.toLocaleString()})` : '';
    displayStrength(siteTier(percentile),
      `${percentile.toFixed(1)}th percentile among self-reported recreational gym lifters${sampleText}. ` +
      `Your relative strength is ${(max / bodyweight).toFixed(2)}× body weight. ` +
      'Tier boundaries are defined by this website.');
  } catch (error) {
    if (requestId === activeRequest) {
      displayStrength('Unavailable', 'Could not retrieve recreational reference data. Check your connection or try again later.');
      console.error('Strength standards request failed:', error);
    }
  } finally {
    if (requestId === activeRequest) strengthButton.disabled = false;
  }
}
strengthButton.addEventListener('click', calculateStrength);
heart();
onerm();
relative();
