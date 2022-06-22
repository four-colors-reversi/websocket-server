import { IncomingMessage } from 'http'
import internal from 'stream'
import { v4 as uuidv4 } from 'uuid'
import { WebSocketServer, RawData } from 'ws'
import GameManager from './game'
import { exitSocket } from './main'
import {
	CustomWebSocket,
	GameRooms,
	MatchingPlayer,
	PlayerWithSession,
	Action,
	GameState,
	GameRoom,
} from './types'

const rooms: GameRooms = {}

const coinToss = (): boolean => {
	return Math.random() >= 0.5 ? true : false
}

const executeGameAction = (room: GameRoom, action: Action): boolean => {
	let result: boolean = false
	switch (action.type) {
		case 'SET': {
			const color = GameManager.getTurnColor(room.turn, room.players)
			result = GameManager.setStone(room.field, room.players, action.data.position, color)
			room.score = GameManager.calcScores(room.field, room.players)
			break
		}
		case 'PASS': {
			result = true
			break
		}
	}
	if (result) {
		room.turn += 1
	}
	return result
}

const broadcastToRoom = (room: GameRoom, msg: string) => {
	room.server.clients.forEach((client: CustomWebSocket) => {
		client.send(msg)
	})
}

const endGame = (room: GameRoom) => {
	broadcastToRoom(room, JSON.stringify({ type: 'UPDATE', ...roomToGameState(room) }))
	broadcastToRoom(room, JSON.stringify({ type: 'END' }))
	room.server.close()
	delete rooms[room.id]
}

export const createGameRoom = (players: MatchingPlayer[]): string => {
	const room_id: string = uuidv4()
	if (Object.keys(rooms).includes(room_id)) return ''

	if (coinToss()) players.reverse()

	rooms[room_id] = {
		id: room_id,
		turn: 1,
		server: new WebSocketServer<CustomWebSocket>({ noServer: true }),
		players: [
			new PlayerWithSession(players[0].player_name, '#000000', '#0000ff', players[0].session_id),
			new PlayerWithSession(players[1].player_name, '#ff0000', '#00ff00', players[1].session_id),
		],
		field: [],
		score: [0, 0],
	}
	const room = rooms[room_id]
	room.field = GameManager.createInitialField(room.players)
	room.score = GameManager.calcScores(room.field, room.players)

	room.server.on('connection', (ws: CustomWebSocket) => {
		ws.on('close', (_code: number, _reason: Buffer) => {
			const player_index = room.players.findIndex(
				(p: PlayerWithSession) => p.session_id == ws.session_id
			)
			if (player_index == -1) return

			room.players[player_index].status = false

			let nonactive = true
			room.players.forEach((p: PlayerWithSession) => {
				if (p.status) nonactive = false
			})
			if (nonactive) endGame(room)
		})
		ws.on('message', (data: Buffer | ArrayBuffer | Buffer[], _is_binary: boolean) => {
			try {
				const player = GameManager.getTurnPlayer(room.turn, room.players) as PlayerWithSession
				const action = JSON.parse(data.toString())
				if (player.session_id == ws.session_id) {
					if (executeGameAction(room, action)) {
						if (GameManager.isGameEnd(room.field)) {
							endGame(room)
						}
						broadcastToRoom(room, JSON.stringify({ type: 'UPDATE', ...roomToGameState(room) }))
					} else {
						ws.send(JSON.stringify({ type: 'FAILED' }))
					}
				}
			} catch (e) {
				ws.send(JSON.stringify({ type: 'FAILED' }))
			}
		})
	})

	return `ws://localhost:8080/game/${room_id}`
}

const roomToGameState = (room: GameRoom): GameState => {
	return {
		turn: room.turn,
		players: [
			{
				name: room.players[0].name,
				colors: room.players[0].colors,
			},
			{
				name: room.players[1].name,
				colors: room.players[1].colors,
			},
		],
		field: room.field,
		score: room.score,
	}
}

export const onUpgradedGameServer = (
	request: IncomingMessage,
	socket: internal.Duplex,
	head: Buffer,
	action: Action
): void => {
	if (!Object.keys(rooms).includes(action.data.room_id)) {
		exitSocket(socket)
		return
	}

	const player: PlayerWithSession | undefined = rooms[action.data.room_id].players.find(
		(p: PlayerWithSession) => p.session_id == action.data.session_id
	)
	if (!player) {
		exitSocket(socket)
		return
	}
	if (player.status) {
		exitSocket(socket)
		return
	}

	rooms[action.data.room_id].server.handleUpgrade(request, socket, head, (ws: CustomWebSocket) => {
		player.status = true
		ws.session_id = player.session_id
		ws.room_id = action.data.room_id
		ws.send(JSON.stringify({ type: 'UPDATE', ...roomToGameState(rooms[action.data.room_id]) }))
		rooms[action.data.room_id].server.emit('connection', ws, request)
	})
}
