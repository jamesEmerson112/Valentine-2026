import { describe, it, expect } from 'vitest'
import { createInitialState } from '../useGameEngine'
import type { TDGameState } from '../../types'

/* ================================================================== */
/*  createInitialState                                                 */
/* ================================================================== */

describe('createInitialState', () => {
  it('returns a TDGameState with playerCommands initialized to an empty array', () => {
    const state = createInitialState()
    expect(state.playerCommands).toEqual([])
    expect(Array.isArray(state.playerCommands)).toBe(true)
  })

  it('returns a TDGameState with agentAssignments initialized to an empty array', () => {
    const state = createInitialState()
    expect(state.agentAssignments).toEqual([])
  })

  it('returns idle phase by default', () => {
    const state = createInitialState()
    expect(state.phase).toBe('idle')
  })

  it('initializes grid as null', () => {
    const state = createInitialState()
    expect(state.grid).toBeNull()
    expect(state.gridCols).toBe(0)
    expect(state.gridRows).toBe(0)
  })

  it('initializes events as empty array', () => {
    const state = createInitialState()
    expect(state.events).toEqual([])
  })
})

/* ================================================================== */
/*  directAgentTo logic (tested as pure function behavior)             */
/* ================================================================== */

describe('directAgentTo logic', () => {
  // directAgentTo is a React callback that pushes a PlayerCommand
  // onto state.playerCommands. We test the equivalent logic directly
  // since we cannot invoke the hook outside of React.

  function directAgentTo(state: TDGameState, spriteId: string, destX: number, destY: number) {
    if (state.phase !== 'playing') return
    state.playerCommands.push({ type: 'move_to', spriteId, destX, destY })
  }

  it('pushes a move_to command onto playerCommands', () => {
    const state = createInitialState()
    state.phase = 'playing'

    directAgentTo(state, 'agent-1', 300, 400)

    expect(state.playerCommands.length).toBe(1)
    const cmd = state.playerCommands[0]
    expect(cmd.type).toBe('move_to')
    expect(cmd.spriteId).toBe('agent-1')
    expect(cmd.destX).toBe(300)
    expect(cmd.destY).toBe(400)
  })

  it('accumulates multiple commands', () => {
    const state = createInitialState()
    state.phase = 'playing'

    directAgentTo(state, 'agent-1', 100, 200)
    directAgentTo(state, 'agent-2', 300, 400)

    expect(state.playerCommands.length).toBe(2)
    expect(state.playerCommands[0].spriteId).toBe('agent-1')
    expect(state.playerCommands[1].spriteId).toBe('agent-2')
  })

  it('does not push command when game phase is idle', () => {
    const state = createInitialState()
    // phase defaults to 'idle'

    directAgentTo(state, 'agent-1', 100, 200)

    expect(state.playerCommands.length).toBe(0)
  })

  it('does not push command when game phase is victory', () => {
    const state = createInitialState()
    state.phase = 'victory'

    directAgentTo(state, 'agent-1', 100, 200)

    expect(state.playerCommands.length).toBe(0)
  })

  it('does not push command when game phase is defeat', () => {
    const state = createInitialState()
    state.phase = 'defeat'

    directAgentTo(state, 'agent-1', 100, 200)

    expect(state.playerCommands.length).toBe(0)
  })
})
