export interface Position {
	x: number
	y: number
}

export interface Stone {
	value: number
	color: string | null
}

export class Player {
	name: string
	colors: string[]

	constructor(name: string, color1: string, color2: string) {
		this.name = name
		this.colors = new Array<string>(2)
		this.colors[0] = color1
		this.colors[1] = color2
	}
}

export default class GameManager {
	// field[x][y]

	private static mod(a: number, b: number): number {
		if (a < 0) {
			return (a % b) + b
		} else {
			return a % b
		}
	}

	static createInitialField(players: Player[], size: number = 10): Stone[][] {
		const field: Stone[][] = JSON.parse(
			JSON.stringify(
				new Array<Array<Stone>>(size).fill(new Array<Stone>(size).fill({ value: 0, color: null }))
			)
		)
		const stone_num = 2
		const offset: number = Math.floor((size - stone_num * 2) / 2)
		for (let i = 0; i < stone_num * 2; i++) {
			// player1
			field[offset + i][offset + i] = { value: 1, color: players[0].colors[0] }
			field[offset + i][offset + this.mod(2 + i, stone_num * 2)] = {
				value: 1,
				color: players[0].colors[1],
			}

			// player2
			field[offset + i][offset + this.mod(-2 + stone_num * 2 - 1 - i, stone_num * 2)] = {
				value: 1,
				color: players[1].colors[0],
			}
			field[offset + i][offset + (stone_num * 2 - 1 - i)] = {
				value: 1,
				color: players[1].colors[1],
			}
		}
		return field
	}

	static calcScores(field: Stone[][], players: Player[]): number[] {
		const scores = new Array<number>(2).fill(0)
		for (let x = 0; x < field.length; x++) {
			for (let y = 0; y < field[0].length; y++) {
				if (field[x][y].color == null) continue
				if (players[0].colors.includes(field[x][y].color!)) {
					scores[0] += field[x][y].value ** 2
				} else {
					scores[1] += field[x][y].value ** 2
				}
			}
		}
		return scores
	}

	static getTurnPlayer(turn: number, players: Player[]): Player {
		return players[(turn - 1) % 2]
	}

	static getTurnColor(turn: number, players: Player[]): string {
		const color_i = (turn - 1) % 4
		return players[color_i % 2].colors[parseInt((color_i / 2).toString())]
	}

	private static getReversibleStones(
		field: Stone[][],
		position: Position,
		color: string
	): Position[] {
		if (field[position.x][position.y].color !== null) return []

		const directions: number[][] = [
			// [x, y]
			[0, -1],
			[1, -1],
			[1, 0],
			[1, 1],
			[0, 1],
			[-1, 1],
			[-1, 0],
			[-1, -1],
		]

		let now_x: number, now_y: number
		let reversible_stone_positions = new Array<Position>()
		let line_reversible_stone_positions: Array<Position>
		directions.forEach((direction: Array<number>) => {
			now_x = position.x + direction[0]
			now_y = position.y + direction[1]
			line_reversible_stone_positions = []
			while (
				0 <= now_x &&
				now_x <= field.length - 1 &&
				0 <= now_y &&
				now_y <= field[0].length - 1
			) {
				if (line_reversible_stone_positions.length == 0 && field[now_x][now_y].color == color) break
				if (field[now_x][now_y].color == null) break
				if (field[now_x][now_y].color == color) {
					reversible_stone_positions = reversible_stone_positions.concat(
						line_reversible_stone_positions
					)
					break
				}
				line_reversible_stone_positions.push({ x: now_x, y: now_y })
				now_x += direction[0]
				now_y += direction[1]
			}
		})
		return reversible_stone_positions
	}

	static getSettablePositions(field: Stone[][], color: string): Array<Position> {
		const settable_positions = new Array<Position>()
		for (let x = 0; x < field.length; x++) {
			for (let y = 0; y < field[0].length; y++) {
				if (field[x][y].color == null) {
					if (this.getReversibleStones(field, { x: x, y: y }, color).length > 0) {
						settable_positions.push({ x: x, y: y })
					}
				}
			}
		}
		return settable_positions
	}

	private static reverseStone(
		field: Stone[][],
		players: Player[],
		position: Position,
		color: string
	): void {
		if (field[position.x][position.y].color == null) return

		const is_player1_color = players[0].colors.includes(color)
		const owner_player = players[Number(!is_player1_color)]
		if (owner_player.colors.includes(field[position.x][position.y].color!)) {
			field[position.x][position.y] = {
				value: field[position.x][position.y].value + 1,
				color: color,
			}
			return
		}

		if (field[position.x][position.y].value > 1) {
			field[position.x][position.y] = {
				...field[position.x][position.y],
				value: field[position.x][position.y].value - 1,
			}
			return
		}
		field[position.x][position.y] = { value: 1, color: color }
	}

	static setStone(field: Stone[][], players: Player[], position: Position, color: string): boolean {
		const reversible_stone_positions = this.getReversibleStones(field, position, color)
		if (reversible_stone_positions.length == 0) return false

		field[position.x][position.y] = { value: 1, color: color }
		reversible_stone_positions.forEach((p: Position) => {
			this.reverseStone(field, players, p, color)
		})
		return true
	}

	static isGameEnd(field: Stone[][]): boolean {
		for (let x = 0; x < field.length; x++) {
			for (let y = 0; y < field[0].length; y++) {
				if (field[x][y].color == null) return false
			}
		}
		return true
	}
}
