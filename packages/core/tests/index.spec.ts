import { Bot, Context, h, Logger, Random } from 'koishi'
import lobby from 'koishi-plugin-lobby'
import mock from '@koishijs/plugin-mock'
import memory from '@koishijs/plugin-database-memory'
import * as jest from 'jest-mock'
import { expect } from 'chai'

const logger = new Logger('lobby')

const app = new Context()
app.plugin(lobby)
app.plugin(mock)
app.plugin(memory)

const client1 = app.mock.client('111')
const client2 = app.mock.client('222')
const client3 = app.mock.client('333')

const id = jest.spyOn(Random, 'id')
const send = app.mock.bots[0].sendPrivateMessage = jest.fn<Bot['sendPrivateMessage']>(async (userId, fragment, options) => {
  const elements = h.normalize(fragment)
  await options?.session?.transform(elements)
  return []
})

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
    await client2.shouldNotReply('room join 114514')
    expect(send.mock.calls).to.have.length(2)
    send.mockClear()

    await client3.shouldNotReply('room join 114514')
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()
    await client3.shouldReply('room join 114514', '你已在房间 114514 中。')

    await client1.shouldNotReply('room kick 2')
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()

    await client3.shouldReply('room leave', '已成功离开房间。')
    expect(send.mock.calls).to.have.length(1)
    send.mockClear()
    await client3.shouldReply('room leave', '你并不在任何房间中。')
  })
})
