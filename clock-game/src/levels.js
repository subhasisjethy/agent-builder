// Level definitions: look, difficulty and the short mini-lesson that opens each level.
//
// Lesson text is trusted static HTML. `.hl-hour` / `.hl-minute` colour words to match the
// hands (hour = red, minute = blue) so kids can link words, hands and the digital display.

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const fives = [5, 10, 20, 25, 35, 40, 50, 55];

export const LEVELS = [
  {
    id: 'meadow',
    name: 'Meet the Hands',
    emoji: '🌼',
    blurb: 'Which hand is which?',
    theme: {
      skyTop: '#7fd0ff', skyBottom: '#eaf8ff', ground: '#7ed957', ground2: '#5bbf4a',
      rim: '#ff8fab', prop: 'meadow', stars: false,
    },
    face: { ticks: 'hours', minuteNumbers: false, wedge: false },
    snap: 5,
    plan: ['identify', 'pointsAt', 'identify', 'pointsAt', 'identify', 'identify'],
    optionCount: 3,
    lesson: [
      {
        time: [3, 0], focus: 'hour',
        text: 'Hi! This is a clock. It has two hands. The <b class="hl-hour">short red hand</b> is the <b>HOUR hand</b>. It tells us the hour.',
      },
      {
        time: [3, 0], focus: 'minute',
        text: 'The <b class="hl-minute">long blue hand</b> is the <b>MINUTE hand</b>. It tells us the minutes.',
      },
      {
        time: [3, 0], focus: 'hour',
        text: 'The numbers <b>1 to 12</b> go around the clock. The <b class="hl-hour">hour hand</b> points at them. Right now it points at <b>3</b>.',
      },
      {
        time: [12, 0], focus: 'minute', interactive: 'minute',
        text: 'Your turn! <b>Drag</b> the <b class="hl-minute">blue hand</b> all the way around the clock. Watch the <b class="hl-hour">red hand</b>!',
        try: {
          type: 'turn', minutes: 75,
          doneText: 'Wow! When the long hand goes all the way round, the short hand moves to the next number. That is <b>1 hour = 60 minutes</b>!',
        },
      },
    ],
  },

  {
    id: 'orchard',
    name: "O'Clock Orchard",
    emoji: '🍎',
    blurb: "Read o'clock times",
    theme: {
      skyTop: '#ffcf86', skyBottom: '#fff4d6', ground: '#8bd450', ground2: '#68b839',
      rim: '#ff6b6b', prop: 'orchard', stars: false,
    },
    face: { ticks: 'hours', minuteNumbers: false, wedge: false },
    snap: 5,
    minutes: [0],
    plan: ['read', 'set', 'read', 'set', 'read', 'set'],
    optionCount: 3,
    distract: () => [30, 15],
    lesson: [
      {
        time: [3, 0], focus: 'minute',
        text: 'When the <b class="hl-minute">long hand</b> points straight up at the <b>12</b>, it is an <b>o\'clock</b> time!',
      },
      {
        time: [3, 0], focus: 'hour',
        text: 'Now look at the <b class="hl-hour">short hand</b>. It points at <b>3</b>. So it is <b>3 o\'clock</b>. We write it like this: <b>3:00</b>.',
      },
      {
        time: [9, 0], focus: 'both',
        text: 'Long hand on 12. Short hand on 9. That is <b>9 o\'clock</b>!',
      },
      {
        time: [12, 0], focus: 'both', interactive: 'both',
        text: 'Your turn! Make the clock say <b>6 o\'clock</b>. <b>Drag</b> the hands!',
        try: { type: 'set', target: [6, 0], doneText: 'Perfect! <b>6 o\'clock!</b> You are a natural.' },
      },
    ],
  },

  {
    id: 'harbor',
    name: 'Half-Past Harbor',
    emoji: '⛵',
    blurb: 'Half past the hour',
    theme: {
      skyTop: '#68c8ff', skyBottom: '#dff4ff', ground: '#2fa4e7', ground2: '#1b8ad0',
      rim: '#ffb347', prop: 'harbor', stars: false,
    },
    face: { ticks: 'hours', minuteNumbers: false, wedge: true },
    snap: 5,
    minutes: [30, 30, 30, 0],
    plan: ['read', 'read', 'set', 'read', 'set', 'set'],
    optionCount: 4,
    distract: () => [0, 15, 45],
    lesson: [
      {
        time: [3, 30], focus: 'minute',
        text: 'Now the <b class="hl-minute">long hand</b> points down at the <b>6</b>. It has gone <b>half way</b> round the clock. We say <b>half past</b>!',
      },
      {
        time: [3, 30], focus: 'minute',
        text: 'Half an hour is <b>30 minutes</b>. So we write <b>:30</b>. See the blue slice? That is half of the clock.',
      },
      {
        time: [3, 30], focus: 'hour',
        text: 'The <b class="hl-hour">short hand</b> is between <b>3</b> and <b>4</b>. It has not reached 4 yet, so the hour is still <b>3</b>. It is <b>half past 3</b> (3:30).',
      },
      {
        time: [12, 0], focus: 'both', interactive: 'both',
        text: 'Your turn! Show <b>half past 7</b>. That is <b>7:30</b>.',
        try: { type: 'set', target: [7, 30], doneText: 'Brilliant! <b>Half past 7!</b>' },
      },
    ],
  },

  {
    id: 'castle',
    name: 'Quarter Quest',
    emoji: '🏰',
    blurb: 'Quarter past & quarter to',
    theme: {
      skyTop: '#b99cff', skyBottom: '#ffe6f6', ground: '#8fd694', ground2: '#6dc17a',
      rim: '#8c6bff', prop: 'castle', stars: true,
    },
    face: { ticks: 'hours', minuteNumbers: false, wedge: true },
    snap: 5,
    minutes: [15, 45, 15, 45, 30, 0],
    plan: ['read', 'set', 'read', 'read', 'set', 'set'],
    optionCount: 4,
    distract: () => [0, 15, 30, 45],
    lesson: [
      {
        time: [3, 15], focus: 'minute',
        text: 'When the <b class="hl-minute">long hand</b> points at <b>3</b>, it has gone a <b>quarter</b> of the way round. We say <b>quarter past</b>. That is <b>15 minutes</b>.',
      },
      {
        time: [3, 45], focus: 'minute',
        text: 'When it points at <b>9</b>, only a quarter is left. We say <b>quarter to</b> the next hour. <b>3:45</b> is <b>quarter to 4</b>.',
      },
      {
        time: [3, 45], focus: 'hour',
        text: 'See how the <b class="hl-hour">short hand</b> is almost at the <b>4</b>? It is nearly 4 o\'clock!',
      },
      {
        time: [12, 0], focus: 'both', interactive: 'both',
        text: 'Your turn! Show <b>quarter past 5</b>. That is <b>5:15</b>.',
        try: { type: 'set', target: [5, 15], doneText: 'Hooray! <b>Quarter past 5!</b>' },
      },
    ],
  },

  {
    id: 'forest',
    name: 'Five-Minute Forest',
    emoji: '🌲',
    blurb: 'Count by fives',
    theme: {
      skyTop: '#a8e6a1', skyBottom: '#f3ffe0', ground: '#4cb36d', ground2: '#2f9a55',
      rim: '#2fc4a2', prop: 'forest', stars: false,
    },
    face: { ticks: 'minutes', minuteNumbers: true, wedge: false },
    snap: 5,
    minutes: [...fives, 0, 15, 30, 45],
    plan: ['read', 'set', 'read', 'set', 'read', 'set'],
    optionCount: 4,
    distract: (m) => [m + 5, m - 5, m + 10, m - 10],
    lesson: [
      {
        time: [3, 0], focus: 'minute',
        text: 'Look at the little <b class="hl-minute">blue numbers</b>! For the long hand, each number counts <b>5 minutes</b>. 12 is 0, 1 is 5, 2 is 10, 3 is 15...',
      },
      {
        time: [3, 10], focus: 'minute',
        text: 'The long hand is on the <b>2</b>. Count by fives: 5, <b>10</b>. So it is <b>10 minutes past 3</b> (3:10).',
      },
      {
        time: [3, 25], focus: 'minute',
        text: 'Now it is on the <b>5</b>. Count by fives: 5, 10, 15, 20, <b>25</b>. That is <b>25 past 3</b> (3:25).',
      },
      {
        time: [4, 40], focus: 'both',
        text: 'After the 6, we count the minutes <b>to</b> the next hour. The long hand on 8 is 40 minutes. That is <b>20 to 5</b>. We write <b>4:40</b>.',
      },
      {
        time: [12, 0], focus: 'both', interactive: 'both',
        text: 'Your turn! Show <b>20 past 8</b>. That is <b>8:20</b>.',
        try: { type: 'set', target: [8, 20], doneText: 'Super! <b>8:20!</b>' },
      },
    ],
  },

  {
    id: 'mountain',
    name: 'Minute Mountain',
    emoji: '⛰️',
    blurb: 'Read any minute',
    theme: {
      skyTop: '#3c3c9c', skyBottom: '#ff9f8f', ground: '#6f8f7a', ground2: '#52725f',
      rim: '#ffc933', prop: 'mountain', stars: true,
    },
    face: { ticks: 'minutes', minuteNumbers: true, wedge: false },
    snap: 1,
    minutes: [...range(1, 59).filter((m) => m % 5 !== 0), ...fives],
    plan: ['read', 'set', 'read', 'set', 'read', 'set'],
    optionCount: 4,
    distract: (m) => [m + 1, m - 1, m + 2, m - 2, m + 5, m - 5, m + 10, m - 10],
    lesson: [
      {
        time: [3, 7], focus: 'minute',
        text: 'Look closely! Between the numbers there are <b>tiny marks</b>. Each tiny mark is <b>1 minute</b>.',
      },
      {
        time: [3, 27], focus: 'minute',
        text: 'Count by fives to the last number: 5, 10, 15, 20, <b>25</b>. Then count the tiny marks: <b>26, 27</b>. It is <b>3:27</b>!',
      },
      {
        time: [8, 52], focus: 'minute',
        text: 'Here the hand is 2 marks after the <b>10</b>. 50 and 2 more is <b>52</b>. It is <b>8:52</b>.',
      },
      {
        time: [12, 0], focus: 'both', interactive: 'both',
        text: 'Your turn! Show <b>2:41</b>. That is 40 minutes and 1 tiny mark.',
        try: { type: 'set', target: [2, 41], doneText: 'Amazing! <b>2:41!</b> You are a clock master!' },
      },
    ],
  },
];

export const levelIndex = (id) => LEVELS.findIndex((l) => l.id === id);
