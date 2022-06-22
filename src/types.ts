import WebSocket, { WebSocketServer } from 'ws'
import { Player, Stone } from './game'

export interface CustomWebSocket extends WebSocket {
	session_id?: string
	room_id?: string
}

export type ActionType = 'CREATE' | 'JOIN' | 'SET' | 'PASS'

export interface Action {
	type: ActionType
	data?: any
}

export interface JoinResult {
	room_id: string
	session_id: string
}

export interface MatchingResult {
	url: string
	another_player: MatchingPlayer
	session_id: string
}

export interface MatchingPlayer {
	session_id: string
	player_name: string
}

export interface MatchingRoom {
	id: string
	players: MatchingPlayer[]
}

export interface MatchingRooms {
	[room_id: string]: MatchingRoom
}

export class PlayerWithSession extends Player {
	session_id: string
	status: boolean

	constructor(name: string, color1: string, color2: string, session_id: string) {
		super(name, color1, color2)
		this.session_id = session_id
		this.status = false
	}
}

export interface GameRoom {
	id: string
	server: WebSocketServer
	turn: number
	players: PlayerWithSession[]
	field: Stone[][]
	score: number[]
}

export interface GameRooms {
	[room_id: string]: GameRoom
}

export interface PlayerData {
	name: string
	colors: string[]
}

export interface GameState {
	turn: number
	players: PlayerData[]
	field: Stone[][]
	score: number[]
}
