import { Context, Logger, Random } from 'koishi'
import lobby from 'koishi-plugin-lobby'
import mock from '@koishijs/plugin-mock'
import memory from '@koishijs/plugin-database-memory'
import * as jest from 'jest-mock'

const logger = new Logger('lobby')

const app = new Context()
app.plugin(lobby)
app.plugin(mock)
app.plugin(memory)

const client1 = app.mock.client('111')
const client2 = app.mock.client('222')
const client3 = app.mock.client('333')

const id = jest.spyOn(Random, 'id')

before(async () => {
  logger.level = 3
  await app.start()
})

after(async () => {
  await app.stop()
  logger.level = 2
})

describe('koishi-plugin-lobby', () => {
  it('basic usage', async () => {
    id.mockReturnValueOnce('114514')
    await client1.shouldReply('room create', '房间创建成功，编号为 114514。')
    await client1.shouldReply('room create', '你已在房间 114514 中。')
    await client2.shouldReply('room join 1919810', '房间 1919810 不存在。')
    await client2.shouldReply('room join 114514', '加入房间成功！')
    await client2.shouldReply('room join 114514', '你已在房间 114514 中。')
    await client2.shouldReply('room leave', '已离开房间。')
    await client2.shouldReply('room leave', '你并不在任何房间中。')
  })
})
