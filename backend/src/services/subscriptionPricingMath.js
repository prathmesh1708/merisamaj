const money = value => Math.round((Number(value) || 0) * 100) / 100;

const calculateTotals = ({ listPrice, codeDiscount = 0, pointsRequested = 0, pointsRate = 0 }) => {
  const boundedCodeDiscount = Math.min(Math.max(0, money(codeDiscount)), Math.max(0, money(listPrice) - 1));
  const afterCode = money(money(listPrice) - boundedCodeDiscount);
  const rate = Math.max(0, Number(pointsRate) || 0);
  const maxPointsDiscount = Math.max(0, afterCode - 1);
  const pointsRedeemed = rate > 0 ? Math.min(Math.floor(Number(pointsRequested) || 0), Math.floor(maxPointsDiscount / rate)) : 0;
  const pointsDiscount = money(pointsRedeemed * rate);
  return { codeDiscount: boundedCodeDiscount, pointsRedeemed, pointsDiscount, finalAmount: money(Math.max(1, afterCode - pointsDiscount)) };
};

module.exports = { money, calculateTotals };
