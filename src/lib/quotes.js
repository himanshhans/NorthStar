// Curated growth/motivation quotes. One per day, deterministic by day-of-year.
const QUOTES = [
  { t: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
  { t: 'It does not matter how slowly you go as long as you do not stop.', a: 'Confucius' },
  { t: 'Well done is better than well said.', a: 'Benjamin Franklin' },
  { t: 'Discipline is choosing between what you want now and what you want most.', a: 'Abraham Lincoln' },
  { t: 'You do not have to be great to start, but you have to start to be great.', a: 'Zig Ziglar' },
  { t: 'Small daily improvements over time lead to stunning results.', a: 'Robin Sharma' },
  { t: 'A year from now you may wish you had started today.', a: 'Karen Lamb' },
  { t: 'Motivation gets you going, but discipline keeps you growing.', a: 'John C. Maxwell' },
  { t: 'The best way to predict the future is to create it.', a: 'Peter Drucker' },
  { t: 'Either you run the day or the day runs you.', a: 'Jim Rohn' },
  { t: 'Success is the sum of small efforts repeated day in and day out.', a: 'Robert Collier' },
  { t: 'Do something today that your future self will thank you for.', a: 'Sean Patrick Flanery' },
  { t: 'Fall seven times, stand up eight.', a: 'Japanese Proverb' },
  { t: 'What you do every day matters more than what you do once in a while.', a: 'Gretchen Rubin' },
  { t: 'The journey of a thousand miles begins with a single step.', a: 'Lao Tzu' },
  { t: 'Don’t watch the clock; do what it does. Keep going.', a: 'Sam Levenson' },
  { t: 'We are what we repeatedly do. Excellence, then, is a habit.', a: 'Will Durant' },
  { t: 'Action is the foundational key to all success.', a: 'Pablo Picasso' },
  { t: 'Your limitation—it’s only your imagination.', a: 'Unknown' },
  { t: 'Great things never come from comfort zones.', a: 'Unknown' },
  { t: 'Dream it. Wish it. Do it.', a: 'Unknown' },
  { t: 'Push yourself, because no one else is going to do it for you.', a: 'Unknown' },
  { t: 'Little by little, one travels far.', a: 'J.R.R. Tolkien' },
  { t: 'Energy and persistence conquer all things.', a: 'Benjamin Franklin' },
  { t: 'Progress, not perfection.', a: 'Unknown' },
  { t: 'The man who moves a mountain begins by carrying away small stones.', a: 'Confucius' },
  { t: 'Start where you are. Use what you have. Do what you can.', a: 'Arthur Ashe' },
  { t: 'Consistency is what transforms average into excellence.', a: 'Unknown' },
  { t: 'Focus on being productive instead of busy.', a: 'Tim Ferriss' },
  { t: 'The future depends on what you do today.', a: 'Mahatma Gandhi' },
]

export function quoteOfDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date - start) / 86400000)
  return QUOTES[day % QUOTES.length]
}
