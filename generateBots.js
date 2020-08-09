const fs = require('fs');

const prefix = 'HA';

const DistTo = 3; // 1-4
const Prox = 2; // 1-4
const FleeHealth = 2; //1-3
const CloseVal = 2; //1-3
const FriendlyProx = 2; //1-4
const HasEnemyD = 3; // 1-4

const consts = {
  DistTo: [1, 4],
  Prox: [1, 4],
  FleeHealth:[1,3],
  CloseVal:[1,3],
  FriendlyProx:[1,4],
  HasEnemyD:[1,4]
};

console.log('loading file. . .');

let boiler = fs.readFileSync(`./${prefix}.js`,{encoding:'utf8',flag:'r'});

//console.log(boiler);

let at=[];

for(let v in consts){
  at.push([v,consts[v][0],consts[v][0],consts[v][1]]);
}

let done=false;
while(!done){
  let fileName=prefix+'-'+at.map(a=>`${a[1]}`).join('-')+'.js';
  let loadConsts=at.map(a=>`const ${a[0]} = ${a[1]};`).join('\n')+'\n';
  console.log('writing '+fileName);
  fs.writeFileSync(fileName,loadConsts+boiler);

  let on=0;
  while(on<at.length-1&&at[on][1]===at[on][3]){
    at[on][1]=at[on][2];
    on++;
  }
  if(on>=at.length-1&&at[on][1]===at[on][3]){done=true;continue;}
  at[on][1]++;
}

//fs.writeFileSync(`./${prefix}${}.js`, JSON.stringify(tempData));
