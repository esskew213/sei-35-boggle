class BoggleGame {
	constructor() {
		this.menu = new Menu(this);
		this.timer = new Timer(this);
		this.boggleBoard = new BoggleBoard(this);
		this.scorer = new Scorer();
	}

	start = () => {
		this.menu.disable();
		this.timer.reset();
		this.boggleBoard.reset();
		this.scorer.reset();
	};

	end = () => {
		this.menu.enable();
		this.boggleBoard.freeze();
	};
}

class Menu {
	constructor(boggleGame) {
		this.boggleGame = boggleGame;
		this.playButton = document.querySelector('#play-button');
		this.instructionButton = document.querySelector('#instruction-button');
		this.instructionPopup = new InstructionPopup();

		this.playButton.addEventListener('click', this.boggleGame.start);
		this.instructionButton.addEventListener('click', this.instructionPopup.open);
	}

	enable = () => {
		this.playButton.disabled = false;
		this.instructionButton.disabled = false;
	};

	disable = () => {
		this.playButton.disabled = true;
		this.instructionButton.disabled = true;
		this.instructionPopup.hide();
	};
}

class InstructionPopup {
	constructor() {
		this.container = document.querySelector('#instruction-popup');
		this.closeButton = document.querySelector('#instruction-popup-close-button');

		this.closeButton.addEventListener('click', this.hide);
	}

	open = () => {
		this.container.style.display = `block`;
		this.closeButton.disabled = false;
	};

	hide = () => {
		this.container.style.display = `none`;
		this.closeButton.disabled = true;
	};
}

class Timer {
	constructor(boggleGame) {
		this.boggleGame = boggleGame;
		this.maxSeconds = 10;
		this.circle = document.querySelector('circle');
		this.perimeter = this.circle.getAttribute('r') * 2 * Math.PI;
		this.circle.setAttribute('stroke-dasharray', this.perimeter);
	}

	reset = () => {
		this.currentSeconds = this.maxSeconds;
		this.tick();
		this.timerID = setInterval(this.tick, 1000);
	};

	tick = () => {
		this.currentSeconds -= 1;
		this.circle.setAttribute(
			'stroke-dashoffset',
			this.perimeter * this.currentSeconds / this.maxSeconds - this.perimeter
		);
		if (this.currentSeconds === 0) {
			this.finished();
		}
	};

	finished = () => {
		clearInterval(this.timerID);
		this.boggleGame.end();
	};
}

class BoggleBoard {
	constructor(boggleGame) {
		// Create internal representation of tiles
		this.tiles = [];
		this.DIAMETER = 4;
		this.boggleDice = [
			'RIFOBX',
			'IFEHEY',
			'DENOWS',
			'UTOKND',
			'HMSRAO',
			'LUPETS',
			'ACITOA',
			'YLGKUE',
			'QBMJOA',
			'EHISPN',
			'VETIGN',
			'BALIYT',
			'EZAVND',
			'RALESC',
			'UWILRG',
			'PACEMD'
		];

		for (let idx = 0; idx < this.DIAMETER ** 2; idx++) {
			this.tiles.push(new Tile(idx, this));
		}

		// Create display representation of tiles
		this.boggleGridContainer = document.querySelector('#boggle-container');
		for (let row_idx = 0; row_idx < this.DIAMETER; row_idx++) {
			let row = document.createElement('div');
			for (let col_idx = 0; col_idx < this.DIAMETER; col_idx++) {
				let tile = this.tiles[row_idx * this.DIAMETER + col_idx];
				row.append(tile.getHTMLButton());
			}
			this.boggleGridContainer.append(row);
		}

		this.boggleGame = boggleGame;
		this.currentTilesHolder = new CurrentTilesHolder();

		document.addEventListener('mouseup', this.endWord);
	}

	reset = () => {
		this.currentTilesHolder.reset();
		Utils.shuffle(this.boggleDice);

		for (let i = 0; i < this.tiles.length; i++) {
			let tile = this.tiles[i];
			let randomLetter = this.boggleDice[i][Math.floor(Math.random() * 6)];
			tile.setLetter(randomLetter);
			tile.enable();
		}
	};

	freeze = () => {
		for (const tile of this.tiles) {
			tile.disable();
		}
	};

	getNeighbours = (tile) => {
		let neighbourIndices = [
			tile.idx - this.DIAMETER - 1,
			tile.idx - this.DIAMETER,
			tile.idx - this.DIAMETER + 1,
			tile.idx - 1,
			tile.idx + 1,
			tile.idx + this.DIAMETER - 1,
			tile.idx + this.DIAMETER,
			tile.idx + this.DIAMETER + 1
		];
		let validIndices = neighbourIndices.filter((idx) => idx >= 0 && idx < this.tiles.length);
		return new Set(validIndices.map((idx) => this.tiles[idx]));
	};

	setBoardStateFromTile = (currentTile) => {
		let neighbours = this.getNeighbours(currentTile);
		console.log(neighbours);
		for (let tile of this.tiles) {
			if (!neighbours.has(tile) && !tile === currentTile) {
				console.log(`disable tile ${tile.getLetter()}`);
				tile.disable();
			} else {
				console.log(`enable tile ${tile.getLetter()}`);
				tile.enable();
			}
		}
		currentTile.highlight();
	};

	startWord = (tile) => {
		this.setBoardStateFromTile(tile);
		this.currentTilesHolder.addTile(tile);
		console.log(tile.getLetter());
	};

	addLetterToWord = (tile) => {
		if (this.currentTilesHolder.hasWordStarted()) {
			let is_undo = this.currentTilesHolder.numTiles() > 1 && this.currentTilesHolder.getTileBefore() === tile;
			if (is_undo) {
				this.setBoardStateFromTile(tile);
				let prevTile = this.currentTilesHolder.popTile();
				prevTile.reset();
			} else {
				this.setBoardStateFromTile(tile);
				this.currentTilesHolder.addTile(tile);
			}
		}
	};

	endWord = () => {
		if (this.currentTilesHolder.hasWordStarted()) {
			this.boggleGame.scoreWord(this.currentTilesHolder.getWord());
			this.currentTilesHolder.reset();
			for (let tile of this.tiles) {
				tile.reset();
			}
		}
	};
}

class CurrentTilesHolder {
	constructor() {
		this.currentTiles = [];
		this.currentLettersHolder = document.querySelector('#current-letters-holder');
	}

	reset = () => {
		this.currentTiles = [];
		this.currentLettersHolder.innerText = '';
	};

	numTiles = () => {
		return this.currentTiles.length;
	};

	hasWordStarted = () => {
		this.numTiles() > 0;
	};

	addTile = (tile) => {
		this.currentTiles.push(tile);
		this.currentLettersHolder.innerText += tile.getLetter;
	};

	popTile = () => {
		this.currentTiles.pop();
		this.currentLettersHolder.innerText = this.currentLettersHolder.innerText.slice(0, -1);
	};

	getTileBefore = () => {
		return this.currentTiles.at(-2);
	};

	getWord = () => {
		return this.currentTiles.map((tile) => tile.getLetter).join('');
	};
}

class Tile {
	constructor(idx, boggleBoard) {
		this.boggleBoard = boggleBoard;
		this.idx = idx;
		this.button = document.createElement('button');
		this.button.setAttribute('id', `tile-button-${idx}`);
		this.button.classList.add(`tile-button`);
		this.button.addEventListener('mousedown', () => this.boggleBoard.startWord(this));
		this.button.addEventListener('mouseover', () => this.boggleBoard.addLetterToWord(this));
	}

	setLetter = (letter) => {
		if (letter === 'Q') {
			letter = 'Qu';
		}
		this.letter = letter;
		this.button.innerText = letter;
	};

	getLetter = () => {
		return this.letter;
	};

	enable = () => {
		this.button.disabled = false;
	};

	disable = () => {
		this.button.disabled = true;
	};

	getHTMLButton = () => {
		return this.button;
	};

	highlight = () => {
		this.button.classList.add('selected');
	};

	reset = () => {
		this.enable();
		this.button.classList.remove('selected');
	};
}

class Utils {
	static shuffle = (array) => {
		for (let idx = array.length - 1; idx > 0; idx--) {
			let random_idx_before = Math.floor(Math.random() * (idx + 1));
			[ array[idx], array[random_idx_before] ] = [ array[idx], array[random_idx_before] ];
		}
	};
}

class Scorer {
	constructor() {
		WordSetGetter.fetchAndParse().then((wordSet) => {
			this.wordSet = wordSet;
			this.SCORING = { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 3, 7: 5, 8: 11 };
		});
	}

	scoreWord = (word) => {
		if (this.wordSet.has(word)) {
			let score = this.SCORING[`${Math.max(word.length, 8)}`];
			console.log(score);
		}
	};

	reset = () => {};
}

class WordSetGetter {
	static fetchAndParse = () => {
		const DICTIONARY_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json';
		return fetch(DICTIONARY_URL)
			.then((response) => response.json())
			.then((responseJSON) => new Set(Object.keys(responseJSON)));
	};
}

let game = new BoggleGame();
