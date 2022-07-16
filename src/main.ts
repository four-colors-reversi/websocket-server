import { createServer, Server, IncomingMessage } from 'http'
import internal from 'stream'
import { onUpgradedGameServer } from './game_server'
import { onUpgradedMatchingServer } from './matching_server'
import { Action } from './types'
import 'dotenv/config'

const http_server: Server = createServer()

export const exitSocket = (socket: internal.Duplex): void => {
	socket.write('invalid action\r\n')
	socket.destroy()
}

http_server.on('upgrade', (request: IncomingMessage, socket: internal.Duplex, head: Buffer) => {
	if (!request.url || !request.headers['sec-websocket-protocol']) {
		exitSocket(socket)
		return
	}

	const path = request.url.split('/')[1]

	const action_base64_str: string = request.headers['sec-websocket-protocol']
	let action: Action
	try {
		action = JSON.parse(Buffer.from(action_base64_str, 'base64').toString())
	} catch (e) {
		exitSocket(socket)
		return
	}

	switch (path) {
		case 'matching': {
			onUpgradedMatchingServer(request, socket, head, action)
			break
		}
		case 'game': {
			if (action.data == undefined) action.data = {}
			action.data.room_id = request.url.split('/')[2]
			onUpgradedGameServer(request, socket, head, action)
			break
		}
		default: {
			exitSocket(socket)
			return
		}
	}
})

http_server.listen(process.env.PORT, process.env.ADDRESS)
