import { createServer, Server, IncomingMessage } from 'http'
import internal from 'stream'
import { onUpgradedGameServer } from './game_server'
import { onUpgradedMatchingServer } from './matching_server'
import { Action, ActionType } from './types'
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

	const top_path = request.url.split('/')[1]
	const sub_path = request.url.split('/')[2]

	const custom_data_base64_str: string = request.headers['sec-websocket-protocol']
	let custom_data: any
	try {
		custom_data = JSON.parse(Buffer.from(custom_data_base64_str, 'base64').toString())
		if (custom_data == undefined) custom_data = {}
	} catch (e) {
		exitSocket(socket)
		return
	}

	switch (top_path) {
		case 'matching': {
			if (sub_path != 'create' && sub_path != 'join') {
				exitSocket(socket)
				return
			}

			const matching_type: ActionType = sub_path == 'create' ? 'CREATE' : 'JOIN'
			const action: Action = { type: matching_type, data: custom_data }

			onUpgradedMatchingServer(request, socket, head, action)
			break
		}
		case 'game': {
			custom_data.room_id = sub_path
			onUpgradedGameServer(request, socket, head, custom_data)
			break
		}
		default: {
			exitSocket(socket)
			return
		}
	}
})

http_server.listen(process.env.PORT, process.env.ADDRESS)
