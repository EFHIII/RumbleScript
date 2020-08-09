const PreviewAfter = 3;
const MaxName = 6;

const MaxBestOf = 3;
const MinWinBy = 3;

const { spawn } = require('child_process');

sleep = a => new Promise((r) => { setTimeout(r, a) });

let queue = { on: 0, queue: [], after: [] };
let playing = false;
async function playGameQueue() {
  if(playing) { return; }
  playing = true;
  while(queue.queue.length > 0) {
    console.clear();
    if(queue.queue[0][1]) {
      console.log(queue.queue[0][1]);
    }
    console.log(drawBoard(queue.queue[0][0], queue.on++) + '\n');
    for(let i = Math.max(0, queue.after.length - PreviewAfter); i < queue.after.length; i++) { console.log(queue.after[i]); }
    await sleep(queue.on === 1 ? 800 : 100);
    if(queue.on >= queue.queue[0][0].turns.length) {
      queue.queue.shift();
      queue.on = 0;
      await sleep(800);
    }
  }
  playing = false;
  queue.after = [];
}

async function addToQueue(a, b, turns, title = '') {
  let val = await runMatch(a, b, turns);
  queue.queue.push([val, title]);
  playGameQueue();
  return val;
}

async function playGame(a, b, turns) {
  let val = await runMatch(a, b, turns);
  for(let i = 0; i < turns; i++) {
    console.clear();
    log(drawBoard(val, i));
    await sleep(50);
  }
}

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    let cmds = cmd.split(' ');
    const child = spawn(cmds.shift(), cmds);

    let output = '';

    child.stdout.on('data', (data) => {
      output += data;
    });

    child.stderr.on('data', (data) => {
      output += data;
      console.log('data:\n' + data);
    });

    child.on('close', function(code) {
      if(code === 0) {
        resolve(output);
      }
      reject(red('\n\n'+cmd+'\n\n'+output));
    });
  });
}

function winnerText(winner) {
  if(!winner) { return '   Draw'; }
  return `${winner=='Red'?red('Red'):blue('Blue')} won!`;
}

function blue(t) {
  return `\x1b[34m\x1b[1m${t}\x1b[0m`;
}

function red(t) {
  return `\x1b[31m\x1b[1m${t}\x1b[0m`;
}

function scoreText(val) {

  let turn = val.turns[val.turns.length - 1];
  let winner = val.winner;
  let score = '';
  let txt = '';

  let objs = turn.state.objs;
  let arr = [];

  for(let i in objs) {
    arr.push(objs[i]);
  }

  let lastCoord = [0, 0];
  let health = [0, 0];
  let points = [0, 0];
  for(let i = 0; i < arr.length; i++) {
    if(arr[i].obj_type !== 'Terrain') {
      switch (arr[i].team) {
        case ('Red'):
          points[0]++;
          health[0] += arr[i].health;
          break;
        case ('Blue'):
          points[1]++;
          health[1] += arr[i].health;
          break;
      }
    }
    //console.log(arr[i].coords);
    lastCoord = arr[i].coords;
  }
  return winnerText(winner) + ` - Units: ${blue(points[1])}-${red(points[0])} - Total Health: ${blue(health[1])}-${red(health[0])}`;
}

function drawBoard(val, Turn) {
  let turn = Turn !== undefined ? val.turns[Turn] : val.turns[val.turns.length - 1];
  let winner = val.winner;
  let score = '';
  let txt = '';

  let objs = turn.state.objs;
  let arr = [];

  for(let i in objs) {
    arr.push(objs[i]);
  }

  arr = arr.sort((a, b) => (a.coords[0] + a.coords[1] * 1000) - (b.coords[0] + b.coords[1] * 1000));

  let lastCoord = [0, 0];
  let health = [0, 0];
  let points = [0, 0];
  for(let i = 0; i < arr.length; i++) {
    for(let j = 1; j < arr[i].coords[0] - lastCoord[0]; j++) { txt += '  '; }
    if(arr[i].coords[1] > lastCoord[1]) { txt += '\n'; }
    if(arr[i].obj_type === 'Terrain') {
      txt += '\x1b[30m\x1b[1m██\x1b[0m';
    } else {
      switch (arr[i].team) {
        case ('Red'):
          points[0]++;
          health[0] += arr[i].health;
          txt += '\x1b[31m';
          break;
        case ('Blue'):
          points[1]++;
          health[1] += arr[i].health;
          txt += '\x1b[34m';
          break;
      }
      txt += ' \x1b[1m' + arr[i].health + '\x1b[0m';
    }
    //console.log(arr[i].coords);
    lastCoord = arr[i].coords;
  }

  score = `\n               ${winnerText(winner)}\n`;

  score += `                Units: ${blue((''+points[1]).padStart(3,' '))}-${red(points[0])}\n         Total Health: ${blue((''+health[1]).padStart(3,' '))}-${red(health[0])}`;

  return score + '\n' + txt;
}

let running = 0;

async function runMatch(a, b, turns = 100) {
  //console.log(`queued ${a} vs ${b}`);
  while(running > 10) {
    await sleep(10000);
  }
  //console.log(`starting ${a} vs ${b}`);
  running++;
  let val = await runCmd(`rumblebot.exe run term --raw -t=${turns} ${a}.js ${b}.js`);
  running--;
  try {
    return JSON.parse(val);
  } catch (e) {
    console.log(`${a} vs ${b} errored`);
    throw val;
  }
}

function limit1(x) {
  return -1 / (1 + x) + 1;
}

function log(txt) {
  if(playing) {
    return queue.after.push(txt);
  }
  console.log(txt);
}
async function bestOfX(a, b, x = 5, turns = 100, verbose = false, play = false) {
  let score = [0, 0];
  let i = 0;
  let matches = 0;
  for(let i = 0;
    (matches < x * MaxBestOf && i < x - 2) || (matches < x * MaxBestOf && Math.max(...score) - Math.min(...score) < MinWinBy); i++) {
    matches++;
    let val = play ? await addToQueue(a, b, turns, 'Match ' + matches) : await runMatch(a, b, turns);
    log(verbose ? drawBoard(val) : scoreText(val));
    if(!val.winner) { i--; }
    switch (val.winner) {
      case ('Blue'):
        score[0]++;
        break;
      case ('Red'):
        score[1]++;
        break;
      default:
        score[0] += 0.5;
        score[1] += 0.5;
    }
  }
  if(score[0] === score[1]) {
    log(`${x*2} matches without a decisive victor.`);
    return 0.5;
  }
  log(`\n${winnerText(score[0]>score[1]?'Blue':score[1]>score[0]?'Red':0)} ${Math.max(...score)}/${matches}`);
  return limit1(score[0] / score[1]);
}

async function match(a, b, turns = 100, verbose = true) {
  val = await runMatch(a, b, turns);
  return (verbose ? drawBoard(val) : scoreText(val));
}

async function superMatch(a, b, x = 5, turns) {
  let score = [0, 0];
  let i = 0;
  let matches = 0;
  for(let i = 0;
    (matches < x * MaxBestOf && i < x - 2) || (matches < x * MaxBestOf && Math.max(...score) - Math.min(...score) < MinWinBy); i++) {
    matches++;
    let val = await runMatch(a, b, turns);
    if(!val.winner) { i--; }
    switch (val.winner) {
      case ('Blue'):
        score[0]++;
        break;
      case ('Red'):
        score[1]++;
        break;
      default:
        score[0] += 0.5;
        score[1] += 0.5;
    }
  }
  return { winner: score[0] == score[1] ? false : (score[0] > score[1] ? 'Blue' : 'Red'), score: score };
}

async function veryVerboseMatch(a, b, turns = 100, verbose = true) {
  val = await runMatch(a, b, turns);
  for(let i = 0; i < turns; i++) {
    console.log(drawBoard(val, i));
  }
}

async function logRoundRobbin(matches, players) {
  let wins = {};
  for(let p in players) {
    wins[p] = [0, 0];
  }
  for(let i = 0; i < matches.length; i++) {
    matches[i].val = await matches[i].val;
    console.log(`${blue((''+matches[i].playerA).padStart(MaxName))} vs ${red((''+matches[i].playerB).padEnd(MaxName))} : ${winnerText(matches[i].val.winner).replace(/  +/g,'')}${matches[i].val.hasOwnProperty('score')?' '+matches[i].val.score:''}`);
    wins[matches[i].playerA][1]++;
    wins[matches[i].playerB][1]++;
    if(matches[i].val.winner === 'Blue') {
      wins[matches[i].playerA][0]++;
    } else if(matches[i].val.winner === 'Red') {
      wins[matches[i].playerB][0]++;
    } else {
      wins[matches[i].playerA][0] += 0.5;
      wins[matches[i].playerB][0] += 0.5;
    }
  }

  let winners = [];

  for(let p in wins) {
    winners.push([wins[p][0], `${(''+p).padStart(MaxName)} won ${wins[p][0]}/${wins[p][1]}`]);
  }
  console.log('\n' + winners.sort((a, b) => b[0] - a[0]).map(a => a[1]).join('\n'));
}

function roundRobbin(players, bestOf = 1, turns) {
  let matches = [];
  for(let a in players) {
    for(let b in players) {
      if(a === b) { continue; }
      matches.push({ playerA: a, playerB: b, val: bestOf<2?runMatch(players[a],players[b],turns):superMatch(players[a], players[b], bestOf, turns) });
    }
  }

  logRoundRobbin(matches, players);
}

var players = {
  //EnemyA: 'om',
  EnemyB: 'needle',
  EnemyC: 'knife',
  Flail: 'flail',
  //h2: 'h2'
};

let prefix = 'HA';
/*
const consts = {
  DistTo: [1, 4],
  Prox: [1, 4],
  FleeHealth:[1,3],
  CloseVal:[1,3],
  FriendlyProx:[1,4],
  HasEnemyD:[1,4]
};
const DistTo = 3;// 1-4
const Prox = 2;// 1-4
const FleeHealth = 2;//1-3
const CloseVal = 2;//1-3
const FriendlyProx = 2;//1-4
const HasEnemyD = 3; // 1-4

*/

const consts = {
  DistTo: [1, 4],
  Prox: [1, 4],
  FleeHealth: [1, 3],
  CloseVal: [2, 2],
  FriendlyProx: [2, 2],
  HasEnemyD: [3, 3]
};

let at = [];

for(let v in consts) {
  at.push([v, consts[v][0], consts[v][0], consts[v][1]]);
}

let done = false;
while(!done) {
  players[at.map(a => `${a[1]}`).join('')] = prefix + '-' + at.map(a => `${a[1]}`).join('-');

  let on = 0;
  while(on < at.length - 1 && at[on][1] === at[on][3]) {
    at[on][1] = at[on][2];
    on++;
  }
  if(on >= at.length - 1 && at[on][1] === at[on][3]) { done = true; continue; }
  at[on][1]++;
}

for(let i = 3; i <= 4; i++) {
  for(let j = 1; j <= 2; j++) {
    players['H-' + i + j] = '' + i + j;
  }
}


async function main() {
  roundRobbin(players, 1, 100);
  //roundRobbin(players, 5, 100);

  //console.log(await superMatch('om','flail',5))
  //veryVerboseMatch('testc','testb');
  //log(await bestOfX('h1', 'h1', 5, 100, false, true));
  //console.log(await match('h1', 'h1'));
}
main();
