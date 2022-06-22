import { IncomingMessage } from 'http'
import internal from 'stream'
import { v4 as uuidv4 } from 'uuid'
import { WebSocketServer } from 'ws'
import { exitSocket } from './main'
import { createGameRoom } from './game_server'
import {
	Action,
	JoinResult,
	MatchingRooms,
	CustomWebSocket,
	MatchingPlayer,
	MatchingResult,
} from './types'

const rooms: MatchingRooms = {}
const matching_server = new WebSocketServer<CustomWebSocket>({ noServer: true })

const createMatchingRoom = (player_name: string): JoinResult | null => {
	const room_id: string = uuidv4()
	const session_id: string = uuidv4()

	if (Object.keys(rooms).includes(room_id)) return null

	rooms[room_id] = {
		id: room_id,
		players: [{ player_name: player_name, session_id: session_id }],
	}
	return { room_id: room_id, session_id: session_id }
}

const joinMatchingRoom = (
	room_id: string,
	player_name: string
): JoinResult | MatchingResult | null => {
	const session_id: string = uuidv4()

	if (!Object.keys(rooms).includes(room_id)) return null
	if (rooms[room_id].players.length >= 2) return null

	rooms[room_id].players.push({ player_name: player_name, session_id: session_id })

	if (rooms[room_id].players.length == 2) {
		const room_url = createGameRoom(rooms[room_id].players)
		const players = JSON.parse(JSON.stringify(rooms[room_id].players))
		delete rooms[room_id]
		return { url: room_url, another_player: players[0], session_id: session_id }
	}

	return { room_id: room_id, session_id: session_id }
}

const leaveMatchingRoom = (room_id: string, session_id: string): boolean => {
	if (!Object.keys(rooms).includes(room_id)) return false
	if (!rooms[room_id].players.find((p: MatchingPlayer) => p.session_id == session_id)) return false

	rooms[room_id].players = rooms[room_id].players.filter(
		(p: MatchingPlayer) => p.session_id != session_id
	)
	if (rooms[room_id].players.length <= 0) delete rooms[room_id]
	return true
}

export const onUpgradedMatchingServer = (
	request: IncomingMessage,
	socket: internal.Duplex,
	head: Buffer,
	action: Action
): void => {
	let result: JoinResult | MatchingResult | null = null
	if (!action.data.player_name) {
		exitSocket(socket)
		return
	}

	switch (action.type) {
		case 'CREATE': {
			result = createMatchingRoom(action.data.player_name)
			break
		}
		case 'JOIN': {
			result = joinMatchingRoom(action.data.room_id, action.data.player_name)
			break
		}
	}
	if (result == null) {
		exitSocket(socket)
		return
	}

	matching_server.handleUpgrade(request, socket, head, (ws: CustomWebSocket) => {
		if (typeof (result! as MatchingResult).url === 'string') {
			ws.send(
				JSON.stringify({
					type: 'MATCHED',
					url: (result! as MatchingResult).url,
					session_id: (result! as MatchingResult).session_id,
				})
			)
			ws.close()
			for (const client of matching_server.clients) {
				if (client.session_id == (result! as MatchingResult).another_player.session_id) {
					client.send(
						JSON.stringify({
							type: 'MATCHED',
							url: (result! as MatchingResult).url,
							session_id: client.session_id,
						})
					)
					client.close()
					break
				}
			}
		} else {
			ws.session_id = (result! as JoinResult).session_id
			ws.room_id = (result! as JoinResult).room_id
			ws.send(JSON.stringify({ type: 'JOINED', ...result }))
			matching_server.emit('connection', ws, request)
		}
	})
}

matching_server.on('connection', (ws: CustomWebSocket) => {
	ws.on('close', (_code: number, _reason: Buffer) => {
		leaveMatchingRoom(ws.room_id!, ws.session_id!)
	})
})
