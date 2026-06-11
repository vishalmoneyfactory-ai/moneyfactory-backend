require('dotenv').config();

const connectDb = require('../config/db');
const Course = require('../models/Course');
const AppSetting = require('../models/AppSetting');
const LegalPage = require('../models/LegalPage');
const Banner = require('../models/Banner');

const courses = [
  {
    title: 'Basics of Forex',
    shortDescription: 'Start with currency pairs, sessions, risk, and the trading language every student needs.',
    description: 'Basics of Forex gives beginners a clean foundation before advanced market-structure lessons. Students learn how currency markets move, how to read pairs, how sessions affect volatility, and how to approach risk with discipline.',
    price: 0,
    isFree: true,
    order: 1,
    outcomes: ['Understand currency pairs and pip value', 'Read sessions and market timing', 'Build a simple risk-first trading routine'],
  },
  {
    title: 'Candle & Chart Analysis',
    shortDescription: 'Decode candles, structure, trend, support, resistance, and clean chart context.',
    description: 'This course trains students to read chart behavior without clutter. It covers candle anatomy, momentum, rejection, trend quality, breakouts, fakeouts, and practical chart-marking habits.',
    price: 999,
    order: 2,
    outcomes: ['Read candle intent and momentum', 'Mark clean support and resistance', 'Separate strong trends from weak movement'],
  },
  {
    title: 'SMC (Smart Money Concepts)',
    shortDescription: 'Learn market structure, order blocks, imbalance, inducement, and institutional behavior.',
    description: 'SMC explains how liquidity, structure, and institutional order flow shape price. Students learn to identify high-probability zones and avoid emotional entries.',
    price: 999,
    order: 3,
    outcomes: ['Map break of structure and change of character', 'Use order blocks and imbalance responsibly', 'Build SMC-based trade scenarios'],
  },
  {
    title: 'CRT (Cycle Range Theory)',
    shortDescription: 'Understand accumulation, manipulation, distribution, and session-based range logic.',
    description: 'CRT teaches students to read price as a cycle. It focuses on range formation, liquidity engineering, expansion, and the timing of continuation or reversal moves.',
    price: 999,
    order: 4,
    outcomes: ['Identify range cycles', 'Understand manipulation and expansion', 'Time entries around liquidity sweeps'],
  },
  {
    title: 'Liquidity Mastery',
    shortDescription: 'Master liquidity pools, sweeps, equal highs/lows, and institutional target zones.',
    description: 'Liquidity Mastery goes deeper into where orders rest and why price seeks them. Students learn how to map liquidity and use it as context for trade planning.',
    price: 999,
    order: 5,
    outcomes: ['Map buy-side and sell-side liquidity', 'Avoid common liquidity traps', 'Use liquidity targets for trade management'],
  },
  {
    title: 'Money Factory Indicator',
    shortDescription: 'Apply the Money Factory Indicator System with BUY/SELL signals and liquidity confirmation.',
    description: 'The flagship course teaches the proprietary Money Factory Indicator System, combining signal behavior, liquidity confirmation, risk filters, and execution rules.',
    price: 2999,
    order: 6,
    outcomes: ['Use BUY and SELL signals correctly', 'Confirm signals with liquidity context', 'Build a complete Money Factory trading plan'],
  },
  {
    title: 'Full Bundle (All 6)',
    shortDescription: 'Complete trading mastery with all six Money Factory courses in one discounted purchase.',
    description: 'The full bundle unlocks every course: Forex basics, candle and chart analysis, SMC, CRT, Liquidity Mastery, and the Money Factory Indicator System.',
    price: 4999,
    isBundle: true,
    order: 7,
    outcomes: ['Unlock all six courses', 'Save 1996 compared with buying separately', 'Follow the complete beginner-to-system roadmap'],
  },
];

const legalPages = [
  ['privacy-policy', 'Privacy Policy', 'Money Factory respects your privacy. This page explains how account, payment, and learning data are used to operate the education platform.'],
  ['terms-and-conditions', 'Terms & Conditions', 'By using Money Factory, you agree to use the education content responsibly. Trading involves risk and course content is educational only.'],
  ['refund-policy', 'Refund Policy', 'Refund requests are reviewed according to payment status, access history, and applicable law. Contact support for assistance.'],
  ['contact-us', 'Contact Us', 'For help, email support@moneyfactory.com or contact the Money Factory support team through the app.'],
];

async function run() {
  await connectDb();
  for (const course of courses) {
    await Course.findOneAndUpdate({ title: course.title }, { ...course, category: 'Trading Education', isActive: true }, { upsert: true, new: true });
  }
  await AppSetting.findOneAndUpdate({ key: 'bundlePrice' }, { value: 4999 }, { upsert: true });
  await AppSetting.findOneAndUpdate({ key: 'company' }, {
    value: {
      description: 'Money Factory is a premium trading education platform for market structure, liquidity, and indicator-led execution.',
      mission: 'Help students build disciplined trading skill with practical education.',
      vision: 'Make professional trading education secure, structured, and mobile-first.',
      supportEmail: 'support@moneyfactory.com',
      supportPhone: '',
      whatsapp: '',
      socialLinks: {},
    },
  }, { upsert: true });
  await Promise.all(legalPages.map(([slug, title, content]) => LegalPage.findOneAndUpdate({ slug }, { slug, title, content, isActive: true }, { upsert: true })));
  const existingBanners = await Banner.countDocuments();
  if (!existingBanners) {
    await Banner.create([
      { title: 'Complete Trading Mastery', subtitle: 'Unlock all six Money Factory courses', imageUrl: '/uploads/banners/trading-mastery.jpg', linkType: 'bundle', order: 1 },
      { title: 'Money Factory Indicator', subtitle: 'Learn signal-based execution with liquidity context', imageUrl: '/uploads/banners/money-factory-indicator.jpg', linkType: 'course', order: 2 },
      { title: 'Liquidity Mastery', subtitle: 'Map institutional liquidity with confidence', imageUrl: '/uploads/banners/liquidity-mastery.jpg', linkType: 'course', order: 3 },
    ]);
  }
  console.log('Courses, settings, legal pages, and banners seeded');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
