# websocket-server
4色オセロのWebsocketゲームサーバー

## paramの送信方法
websocket接続時に`sec-websocket-protocol`にjson文字列をbase64エンコードして末尾の=を全て削除した文字列をセットして送る<br>
例: `{player_name: "fazerog"} -> 'eyJwbGF5ZXJfbmFtZSI6ImZhemVyb2cifQ'`

## エンドポイント
### `http://{ip}/matching/create`
- param
  - player_name: string
- return
  - JOINED (他プレイヤーが参加したが定員に足りないとき．現状2人向けゲームなので送られてくることはない)
    - room_id: string
    - session_id: string
  - MATCHED (送られると同時に接続が切れる)
    - url: string
    - session_id: string

### `http://{ip}/matching/join/{room_id}`
- param
  - player_name: string
- return
  - JOINED (createの説明と同様)
    - room_id: string
    - session_id: string
  - MATCHED (送られると同時に接続が切れる)
    - url: string
    - session_id: string

### `http://{ip}/game/{room_id}`
- param
  - session_id: string
#### action
- SET
  - param
    - position
      - x: number
      - y: number

- PASS
