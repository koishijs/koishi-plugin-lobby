import { Bot, Context, h, Logger, Random } from 'koishi'
import { install, InstalledClock } from '@sinonjs/fake-timers'
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

const client1 = app.mock.client('111')
const client2 = app.mock.client('222')
const client3 = app.mock.client('333')

const id = jest.spyOn(Random, 'id')
const send = app.bots[0].sendMessage = jest.fn<Bot['sendMessage']>(async () => [])

let clock: InstalledClock

before(async () => {
  logger.level = 3
  clock = install()
  await app.start()
  await app.mock.initUser('514')
})

after(async () => {
  await app.stop()
  clock.uninstall()
  logger.level = 2
})

describe('koishi-plugin-lobby', () => {
  it('basic usage', async () => {
    id.mockReturnValueOnce('114514')
    await client1.shouldReply('lobby create -c 2', '房间创建成功，编号为 114514。')
    await client1.shouldReply('lobby create', '你已在房间 114514 中。输入「room leave」以离开当前房间。')
    await client1.shouldReply('lobby room', [
      '房号：114514',
      '房主：111',
      '成员列表：',
      '    1. 111',
      '发送「:内容」可在房间内发言。',
    ].join('\n'))

    await client2.shouldReply('lobby join 1919810', '房间 1919810 不存在。')
    await client2.shouldNotReply('lobby join 114514')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(2)
    send.mockClear()
    await client2.shouldReply('lobby room', [
      '房号：114514',
      '房主：111',
      '成员列表：',
      '    1. 111',
      '    2. 222',
      '发送「:内容」可在房间内发言。',
    ].join('\n'))

    await client3.shouldReply('lobby join 114514', '该房间人数已满，无法加入。')
    await client1.shouldReply('lobby config -c 3', '设置修改成功！')
    await client3.shouldNotReply('lobby join 114514')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()
    await client3.shouldReply('lobby join 114514', '你已在房间 114514 中。输入「room leave」以离开当前房间。')
    await client1.shouldReply('lobby room', [
      '房号：114514',
      '房主：111',
      '成员列表：',
      '    1. 111',
      '    2. 222',
      '    3. 333',
      '发送「:内容」可在房间内发言。',
    ].join('\n'))

    await client1.shouldNotReply('test')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(0)
    send.mockClear()

    await client1.shouldNotReply(':test')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()

    await client2.shouldReply('lobby transfer 2', '只有房主可以进行此操作。')
    await client1.shouldNotReply('lobby transfer 2')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()
    await client2.shouldReply('lobby room', [
      '房号：114514',
      '房主：222',
      '成员列表：',
      '    1. 111',
      '    2. 222',
      '    3. 333',
      '发送「:内容」可在房间内发言。',
    ].join('\n'))

    await client1.shouldReply('lobby kick 3', '只有房主可以进行此操作。')
    await client2.shouldReply('lobby kick', '请输入要踢出的玩家编号。')
    await client2.shouldReply('lobby kick 2', '不能对房主进行此操作。')
    await client2.shouldNotReply('lobby kick 1')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(3)
    send.mockClear()
    await client1.shouldReply('lobby room', '你并不在任何房间中。')
    await client2.shouldReply('lobby room', [
      '房号：114514',
      '房主：222',
      '成员列表：',
      '    2. 222',
      '    3. 333',
      '发送「:内容」可在房间内发言。',
    ].join('\n'))

    await client2.shouldReply('lobby leave', [
      '离开房间前可选择将房间转移给其他人：',
      '    3. 333',
      '请输入玩家编号以转移房主。输入 0 将直接解散房间。输入任何其他内容将取消操作。',
    ].join('\n'))
    await client2.shouldReply('3', '已成功离开房间。')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(1)
    send.mockClear()
    await client3.shouldReply('lobby room', [
      '房号：114514',
      '房主：333',
      '成员列表：',
      '    3. 333',
      '发送「:内容」可在房间内发言。',
    ].join('\n'))

    await client3.shouldNotReply('lobby leave')
    await clock.runAllAsync()
    expect(send.mock.calls).to.have.length(1)
    send.mockClear()
  })
})
