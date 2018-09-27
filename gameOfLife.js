/* ----- GLOBAL ----- */

const ROWS = 250, COLS = 250
const indices = R.xprod(R.range(0, ROWS), R.range(0, COLS))
const n = Math.floor(ROWS / 2)
const pieces = {
  single: [[0,0]],
  box: [[0,0],[0,1],[1,0],[1,1]],
  glider:[[0,0],     [2,0],
               [1,1],[2,1],
               [1,2]      ],
  line: line(Math.floor(ROWS/2))
}

/* ----- MAIN ----- */

let state;

function main(action) {
  state = update(state, action)
  render(document.querySelector('#canvas').getContext('2d'), state)

}
main({type:"reset"})

/* ----- UPDATE ----- */
function update(state, action){
  console.log(state);
  switch (action.type) {
    case "reset":
      return initialState()
    case "click":
      return click(state)
    case "tick":
      return tick(state)
    case "mouseIndex":
      return updateMouseIndex(state, action.value)
    case "pieceSelect":
      return pieceSelect(state, action)
    case "mouseOff":
      return mouseOff(state)
    case "keydown":
      return keydown(state, action.value)
    default:
      return state
  }
}

function initialState(){
  return {
    environment: make2dArray(ROWS, COLS),
    mouseIndex: [0,0],
    pieceIndices: [],
    pieceName: String(document.getElementById("PIECESELECT").value),
    mouseOn: false
  }
}

function click(state){
  const isInEnvironment = ([i, j]) =>
    i >= 0 && i < state.environment.length &&
    j >= 0 && j < state.environment[0].length

  const birth = ([i, j]) =>
    state.environment[i][j] = state.environment[i][j] == 0 ? 1 : 0

  R.pipe(
    R.prop("pieceIndices"),
    R.filter(isInEnvironment),
    R.forEach(birth)
  )(state)
  return state
}

function tick(state) {
  const
    rows = state.environment.length,
    cols = state.environment[0].length,
    nextGeneration = make2dArray(rows, cols),
    prevGeneration = state.environment

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let n = 0
      for (let ii = Math.max(0, i-1); ii <= Math.min(i+1, rows-1); ii++) {
        for (let jj = Math.max(0, j-1); jj <= Math.min(j+1, cols-1); jj++) {
          if((ii != i || jj != j) && prevGeneration[ii][jj]){
            n++
          }
        }
      }
      nextGeneration[i][j] = prevGeneration[i][j]==1 && n==2 || n==3
    }
  }
  return {
    ...state,
    environment: nextGeneration
  }
}

function updateMouseIndex(state, index){
  const piece = pieces[state.pieceName]
  return {
    ...state,
    mouseOn: true,
    mouseIndex: index,
    pieceIndices: translate(index, piece)
  }
}

function pieceSelect(state, action) {
  return {
    ...state,
    pieceName: String(action.value.target.value),
    pieceIndices: pieces[String(action.value.target.value)]
  }
}

function mouseOff(state){
  return {
    ...state,
    mouseOn: false
  }
}

function keydown(state, evt){
  switch (evt.keyCode) {
    case 39:
      return state
    case 37:
      return state
    default:
      return state
  }
}

/* ----- RENDER ----- */

function render(ctx, state){
  ctx.canvas.width = 600
  ctx.canvas.height = 600

  const
    CELLWIDTH = canvas.width/state.environment.length,
    CELLHEIGHT = canvas.height/state.environment[0].length

  const drawCell = ([i, j]) =>
    ctx.rect(i*CELLWIDTH, j*CELLHEIGHT, CELLWIDTH, CELLHEIGHT)

  const isAlive = ([i, j]) =>
    state.environment[i][j]

  ctx.beginPath();

  /* background */
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if(state.mouseOn) {
    R.forEach(drawCell, state.pieceIndices)
  }

  /* cells */
  ctx.fillStyle = "white"
  R.forEach(R.when(isAlive, drawCell), indices)
  ctx.fill()

  ctx.closePath()
  ctx.lineWidth=1
  ctx.strokeStyle = "white"
  ctx.strokeRect(0,0,canvas.width-1,canvas.height-1)
}

/* ----- DOM & CANVAS INPUTS ------ */

//BUTTONS
const playPauseButton = document.getElementById("PLAY/PAUSE")
const frameButton = document.getElementById("FRAME")
const resetButton = document.getElementById("RESET")
const selector = document.getElementById("PIECESELECT")
const frameRateSlider = document.getElementById("FPS")
const fpsView = document.getElementById("FPSVIEW")

//EVENTS
document.addEventListener("keydown",
  function(evt) {
    main({type:"keydown", value: evt})
  })

playPauseButton.addEventListener("click",
  function() {
    if(this.innerHTML == "PLAY"){
      startAnimating(FRAMERATE)
    } else{
      cancelAnimationFrame(ticks)
    }
    this.innerHTML = this.innerHTML === "PLAY" ? "PAUSE" : "PLAY"
  })

frameButton.addEventListener("click",
  function() {
    main({type:"tick"})
  })

resetButton.addEventListener("click",
  function() {
    main({type:"reset"})
    cancelAnimationFrame(ticks)
    playPauseButton.innerHTML = "PLAY"
  })

selector.addEventListener("change",
  function(evt){
    main({type:"pieceSelect", value: evt})
  })

frameRateSlider.oninput =
  function() {
    playPauseButton.click()
    FRAMERATE = this.value
    fpsView.innerHTML = this.value
    playPauseButton.click()
  }

fpsView.innerHTML = frameRateSlider.value

//TIME
let FRAMERATE = frameRateSlider.value
let frameCount = 0, fps, fpsInterval, startTime, now, then, elapsed, ticks
function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
}
function animate() {
    ticks = requestAnimationFrame(animate);
    now = Date.now();
    elapsed = now - then;
    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        main({type:"tick"})
    }
}

//MOUSE
canvas.onmousemove =
  function(e) {
    let index = posToIndex(getMousePos(this, e), ROWS, COLS)
    main({type:"mouseIndex", value: index})
    main({type:"mouseOut"})
  }

canvas.onmousedown =
  function(e) {
    main({type:"click"})
  }

canvas.onmouseout =
function(e) {
  main({type:"mouseOff"})
}

function getMousePos(canvas, e) {
  let rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor(e.clientX - rect.left),
    y: Math.floor(e.clientY - rect.top),
  }
}

/* ----- HELPER  FUNCITONS ----- */
function make2dArray(rows, cols) {
  return R.times((i) => R.times((j) => 0, rows), cols)
}

function posToIndex(pos, rows, cols){
  return (
    [Math.floor((pos.x/canvas.width) * rows),
     Math.floor((pos.y/canvas.height) * cols)]
  )
}

function line(n) {
  return R.map(R.pair(R.__, 0), R.range(0, n))
}

function translate(index, piece) {
  return R.map(R.zipWith(R.add, index), piece)
}
