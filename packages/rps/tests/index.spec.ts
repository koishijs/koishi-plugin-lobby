import { Bot, Context, h, Logger, Random } from 'koishi'
import { install, InstalledClock } from '@sinonjs/fake-timers'
import rps from 'koishi-plugin-rps'
import lobby from 'koishi-plugin-lobby'
import mock from '@koishijs/plugin-mock'
import memory from '@koishijs/plugin-database-memory'
import * as jest from 'jest-mock'
import { expect } from 'chai'

const logger = new Logger('lobby')

const app = new Context()
app.plugin(mock)
app.plugin(memory)
app.plugin(lobby)
app.plugin(rps)

const client1 = app.mock.client('111')
const client2 = app.mock.client('222')

const id = jest.spyOn(Random, 'id')
const send = app.mock.bots[0].sendPrivateMessage = jest.fn<Bot['sendPrivateMessage']>(async (userId, fragment, options) => {
  const elements = h.normalize(fragment)
  await options?.session?.transform(elements)
  return []
})

let clock: InstalledClock

before(async () => {
  logger.level = 3
  clock = install({})
  await app.start()
})

after(async () => {
  await app.stop()
  clock.uninstall()
  logger.level = 2
})

describe('koishi-plugin-rps', () => {
  it('basic usage', async () => {
    id.mockReturnValueOnce('114514')
    await client1.shouldReply('rps', '房间创建成功，编号为 114514。')
    await client2.shouldNotReply('lobby join 114514')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()
    await client1.shouldNotReply('rps')
    await client1.shouldNotReply('lobby start')
    await clock.tickAsync(1000)
    expect(send.mock.calls).to.have.length(4)
    send.mockClear()
    await client1.shouldNotReply('R')
    await client2.shouldNotReply('P')
    await clock.tickAsync(1000)
    expect(send.mock.calls).to.have.length(6)
    send.mockClear()
  })
})
