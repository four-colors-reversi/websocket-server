# websocket-server
4色オセロのWebsocketゲームサーバー

## エンドポイント
### `http://{ip}/matching`
#### 接続方法
websocket接続時に`sec-websocket-protocol`に{type: string, data: {param: any}}`の形式のjson文字列をbase64エンコードして末尾の=を全て削除した文字列をセットして送る
##### type一覧
- CREATE
  - param
    - player_name: string
  - return
    - JOINED
      - room_id: string
      - session_id: string
    - MATCHED
      - url: string
      - session_id: string
- JOIN
  - param
    - player_name: string
    - room_id: string
  - return
    - JOINED
      - room_id: string
      - session_id: string
    - MATCHED
      - url: string
      - session_id: string


### `http://{ip}/game/{room_id}`
#### 接続方法
`http://{ip}/matching`と同じような方法でparamにsession_idをセットして接続する
#### action
- SET
  - param
    - position
      - x: number
      - y: number

- PASS
