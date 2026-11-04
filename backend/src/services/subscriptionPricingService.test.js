const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTotals } = require('./subscriptionPricingMath');

test('percentage and fixed discounts cannot lower checkout below one rupee', () => {
  assert.deepEqual(calculateTotals({ listPrice: 100, codeDiscount: 25, pointsRequested: 0 }), {
    codeDiscount: 25, pointsRedeemed: 0, pointsDiscount: 0, finalAmount: 75
  });
  assert.deepEqual(calculateTotals({ listPrice: 100, codeDiscount: 500 }), {
    codeDiscount: 99, pointsRedeemed: 0, pointsDiscount: 0, finalAmount: 1
  });
});

test('points are limited to the requested amount and leave a payable balance', () => {
  assert.deepEqual(calculateTotals({ listPrice: 100, codeDiscount: 10, pointsRequested: 500, pointsRate: 0.1 }), {
    codeDiscount: 10, pointsRedeemed: 500, pointsDiscount: 50, finalAmount: 40
  });
  assert.deepEqual(calculateTotals({ listPrice: 100, pointsRequested: 2000, pointsRate: 1 }), {
    codeDiscount: 0, pointsRedeemed: 99, pointsDiscount: 99, finalAmount: 1
  });
});

test('no conversion rate means points do not create a discount', () => {
  assert.deepEqual(calculateTotals({ listPrice: 200, pointsRequested: 20, pointsRate: 0 }), {
    codeDiscount: 0, pointsRedeemed: 0, pointsDiscount: 0, finalAmount: 200
  });
});
