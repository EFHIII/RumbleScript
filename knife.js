function getEnemyRobots(s) {
  return s
    .objsByTeam(s.otherTeam)
    .filter((o) => o.objType.toString() === 'ObjType.Unit');
}

function sqDistance(me, other) {
  return Math.pow(me.coords.x - other.coords.x, 2)
        + Math.pow(me.coords.y - other.coords.y, 2);
}

function closest(me, units) {
  return units.sort((a, b) => sqDistance(me, a) - sqDistance(me, b))[0];
}

function findAdjacentEnemyDirection(me, enemies) {
  return enemies
    .filter((e) => me.coords.distanceTo(e.coords) === 1)
    .map((e) => me.coords.directionTo(e.coords))[0] || null;
}


function robot(state, unit) {
  const enemies = getEnemyRobots(state);
  const adjacent = findAdjacentEnemyDirection(unit, enemies);

  if (adjacent) {
    console.log(unit, ' attacked ', adjacent);
    return Action.attack(adjacent);
  }

  const closestEnemy = closest(unit, enemies);
  return Action.move(unit.coords.directionTo(closestEnemy.coords));
}
