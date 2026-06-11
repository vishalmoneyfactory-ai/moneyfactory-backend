function serializePricing(course) {
  const price = Number(course?.price || 0);
  const percent = Number(course?.offerPercent || 0);
  const hasOffer = course?.offerActive === true && percent > 0 && !course?.isFree;
  const offerDiscount = hasOffer ? Math.floor((price * percent) / 100) : 0;
  const effectivePrice = Math.max(price - offerDiscount, 0);

  return {
    originalPrice: price,
    effectivePrice,
    hasOffer,
    offerPercent: hasOffer ? percent : 0,
    offerDiscount,
  };
}

function applyPricing(json) {
  return Object.assign(json, serializePricing(json));
}

module.exports = { serializePricing, applyPricing };
